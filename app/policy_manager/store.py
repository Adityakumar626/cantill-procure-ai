"""
Policy as Data Store & Amendment Diff Engine
Manages versioned policies and generates plain-language diffs without code modification.
"""
import json
from pathlib import Path
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple, Any
from app.config import BASE_DIR
from app.models.policy import ProcurementPolicy, PolicyRule, get_default_policy_v5, validate_policy

class PolicyStore:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or (BASE_DIR / "app" / "storage" / "policies")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.active_file = self.storage_dir.parent / "active_policy.txt"

        self.policies: Dict[str, ProcurementPolicy] = {}

        # 1. Baseline Policy v5.0 always initialized
        v5 = get_default_policy_v5()
        self.policies[v5.version] = v5
        self.active_version = "v5.0"

        # 2. Persist v5.0 baseline JSON if not already on disk
        v5_json_path = self.storage_dir / "v5.0.json"
        if not v5_json_path.exists():
            with open(v5_json_path, "w", encoding="utf-8") as f:
                json.dump(v5.to_dict(), f, indent=2)

        # 3. Load all persisted versioned policy JSON files from disk
        self._load_all_from_disk()

        # 4. Check active_policy.txt
        if self.active_file.exists():
            with open(self.active_file, "r", encoding="utf-8") as f:
                saved_active = f.read().strip()
                if saved_active in self.policies:
                    self.active_version = saved_active

    def _load_all_from_disk(self):
        """Scans storage directory and deserializes all versioned policies."""
        for p_file in self.storage_dir.glob("*.json"):
            try:
                with open(p_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    policy = ProcurementPolicy.from_dict(data)
                    self.policies[policy.version] = policy
            except Exception as e:
                pass

    def get_active_policy(self) -> ProcurementPolicy:
        active = self.policies.get(self.active_version, get_default_policy_v5())
        active.sync_rules()
        return active

    def get_policy_as_of_date(self, target_date: date) -> ProcurementPolicy:
        """Finds the policy version effective as of target_date."""
        matching = [p for p in self.policies.values() if p.effective_date <= target_date]
        if not matching:
            return self.get_active_policy()
        # Sort by effective_date descending
        matching.sort(key=lambda p: p.effective_date, reverse=True)
        policy = matching[0]
        policy.sync_rules()
        return policy

    def register_policy(self, policy: ProcurementPolicy):
        """Registers a policy in memory and persists to disk after validation."""
        policy.sync_rules()
        errors = validate_policy(policy)
        if errors:
            raise ValueError(f"Invalid policy '{policy.version}': {'; '.join(errors)}")
        self.policies[policy.version] = policy
        try:
            target_path = self.storage_dir / f"{policy.version}.json"
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(policy.to_dict(), f, indent=2)
        except Exception as e:
            pass

    def activate_version(self, version: str):
        """Activates a policy version and writes active version flag to disk."""
        if version not in self.policies:
            target_path = self.storage_dir / f"{version}.json"
            if target_path.exists():
                self.load_policy_from_file(target_path)
            else:
                raise KeyError(
                    f"Policy version '{version}' not found. Available versions: {list(self.policies.keys())}"
                )
        self.active_version = version
        try:
            with open(self.active_file, "w", encoding="utf-8") as f:
                f.write(version)
        except Exception:
            pass

    def load_policy_from_file(self, file_path: Path) -> ProcurementPolicy:
        """Loads and registers an external policy JSON file."""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        policy = ProcurementPolicy.from_dict(data)
        self.register_policy(policy)
        return policy

    def compute_policy_diff(self, new_policy: ProcurementPolicy) -> List[str]:
        """Generates plain-language explanation of what changes between active policy and new_policy."""
        active = self.get_active_policy()
        changes = []

        if new_policy.emergency_po_limit != active.emergency_po_limit:
            changes.append(
                f"Emergency PO Limit changed from ₹{active.emergency_po_limit:,.0f} to ₹{new_policy.emergency_po_limit:,.0f}."
            )

        if new_policy.spot_po_limit != active.spot_po_limit:
            changes.append(
                f"Spot PO Limit changed from ₹{active.spot_po_limit:,.0f} to ₹{new_policy.spot_po_limit:,.0f}."
            )

        if new_policy.rfq_limit != active.rfq_limit:
            changes.append(
                f"RFQ Sourcing Threshold changed from ₹{active.rfq_limit:,.0f} to ₹{new_policy.rfq_limit:,.0f}."
            )

        if new_policy.clubbing_window_days != active.clubbing_window_days:
            changes.append(
                f"Requirement Clubbing Window changed from {active.clubbing_window_days} to {new_policy.clubbing_window_days} calendar days."
            )

        if new_policy.need_by_window_days != active.need_by_window_days:
            changes.append(
                f"Need-by Date Window changed from ±{active.need_by_window_days} to ±{new_policy.need_by_window_days} days."
            )

        # Check for added or modified rules
        active_rule_ids = {r.rule_id: r for r in active.rules}
        for nr in new_policy.rules:
            if nr.rule_id not in active_rule_ids:
                changes.append(f"Added new rule '{nr.name}' (Clause {nr.clause}) with route {nr.route}.")
            else:
                ar = active_rule_ids[nr.rule_id]
                if nr.max_value_inr != ar.max_value_inr:
                    changes.append(f"Rule '{nr.name}' ceiling changed from ₹{ar.max_value_inr} to ₹{nr.max_value_inr}.")
                if nr.plant != ar.plant:
                    changes.append(f"Rule '{nr.name}' plant scope changed from {ar.plant or 'All'} to {nr.plant}.")

        return changes
