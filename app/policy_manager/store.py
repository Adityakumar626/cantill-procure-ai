"""
Policy as Data Store & Amendment Diff Engine
Manages versioned policies and generates plain-language diffs without code modification.
"""
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple, Any
from app.models.policy import ProcurementPolicy, PolicyRule, get_default_policy_v5

class PolicyStore:
    def __init__(self):
        # In-memory registry of versioned policies
        self.policies: Dict[str, ProcurementPolicy] = {}
        # Default active policy is v5.0
        v5 = get_default_policy_v5()
        self.policies[v5.version] = v5
        self.active_version = "v5.0"

    def get_active_policy(self) -> ProcurementPolicy:
        return self.policies.get(self.active_version, get_default_policy_v5())

    def get_policy_as_of_date(self, target_date: date) -> ProcurementPolicy:
        """Finds the policy version effective as of target_date."""
        matching = [p for p in self.policies.values() if p.effective_date <= target_date]
        if not matching:
            return self.get_active_policy()
        # Sort by effective_date descending
        matching.sort(key=lambda p: p.effective_date, reverse=True)
        return matching[0]

    def register_policy(self, policy: ProcurementPolicy):
        self.policies[policy.version] = policy

    def activate_version(self, version: str):
        if version in self.policies:
            self.active_version = version

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
