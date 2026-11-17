"""
Cantill ProcureAI Policy as Data Schema
"""
import copy
from dataclasses import dataclass, field
from datetime import date
from typing import List, Dict, Any, Optional, Union

@dataclass
class PolicyRule:
    rule_id: str
    clause: str
    name: str
    outcome: str           # 'PO' or 'SOURCING_REQUEST'
    route: str             # 'CAPEX_SOURCING', 'CONTRACT_PO', 'EMERGENCY_PO', 'SPOT_PO', 'RFQ', 'RFP', 'NEW_ITEM_SOURCING'
    max_value_inr: Optional[float] = None
    max_value_inclusive: bool = False
    min_value_inr: Optional[float] = None
    item_type: Optional[str] = None       # e.g., 'Capex'
    plant: Optional[str] = None           # e.g., 'CHK1', or None for all
    category: Optional[str] = None
    requires_emergency: Optional[bool] = None
    requires_contract: Optional[bool] = None
    requires_history_365d: Optional[bool] = None
    suggest_suppliers_count: int = 0
    supplier_strategy: str = "none"       # 'contract', 'first_preferred', 'suggest_preferred_and_category'
    priority: int = 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "clause": self.clause,
            "name": self.name,
            "outcome": self.outcome,
            "route": self.route,
            "max_value_inr": self.max_value_inr,
            "max_value_inclusive": self.max_value_inclusive,
            "min_value_inr": self.min_value_inr,
            "item_type": self.item_type,
            "plant": self.plant,
            "category": self.category,
            "requires_emergency": self.requires_emergency,
            "requires_contract": self.requires_contract,
            "requires_history_365d": self.requires_history_365d,
            "suggest_suppliers_count": self.suggest_suppliers_count,
            "supplier_strategy": self.supplier_strategy,
            "priority": self.priority,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "PolicyRule":
        return cls(
            rule_id=d["rule_id"],
            clause=d.get("clause", ""),
            name=d.get("name", ""),
            outcome=d.get("outcome", "SOURCING_REQUEST"),
            route=d.get("route", "RFQ"),
            max_value_inr=float(d["max_value_inr"]) if d.get("max_value_inr") is not None else None,
            max_value_inclusive=bool(d.get("max_value_inclusive", False)),
            min_value_inr=float(d["min_value_inr"]) if d.get("min_value_inr") is not None else None,
            item_type=d.get("item_type"),
            plant=d.get("plant"),
            category=d.get("category"),
            requires_emergency=d.get("requires_emergency"),
            requires_contract=d.get("requires_contract"),
            requires_history_365d=d.get("requires_history_365d"),
            suggest_suppliers_count=int(d.get("suggest_suppliers_count", 0)),
            supplier_strategy=d.get("supplier_strategy", "none"),
            priority=int(d.get("priority", 100)),
        )

@dataclass
class ProcurementPolicy:
    version: str
    effective_date: date
    document_id: str = "CORVO-PROC-POL-04"
    clubbing_window_days: int = 14
    need_by_window_days: int = 7
    emergency_po_limit: float = 500000.0
    spot_po_limit: float = 200000.0
    rfq_limit: float = 1000000.0
    active_history_days: int = 365
    preferred_history_days: int = 548
    po_consolidation_window_hours: int = 24
    ranking_weights: Dict[str, float] = field(default_factory=lambda: {
        "recency": 40.0,
        "contract": 15.0,
        "volume_per_po": 5.0,
        "max_volume_pos": 10.0,
        "on_time": 10.0,
        "quality": 10.0
    })
    rules: List[PolicyRule] = field(default_factory=list)

    def sync_rules(self) -> "ProcurementPolicy":
        """
        Explicit, validated synchronization of scalar thresholds to PolicyRule objects.
        Explicit mappings:
          - emergency_po_limit -> RULE-5.3 (max_value_inr)
          - spot_po_limit      -> RULE-5.4 (max_value_inr)
          - rfq_limit          -> RULE-5.5 (max_value_inr) & RULE-5.6 (min_value_inr)
        """
        for r in self.rules:
            if r.rule_id == "RULE-5.3" or (r.clause == "5.3" and r.route == "EMERGENCY_PO"):
                r.max_value_inr = float(self.emergency_po_limit)
            elif r.rule_id == "RULE-5.4" or (r.clause == "5.4" and r.route == "SPOT_PO"):
                r.max_value_inr = float(self.spot_po_limit)
            elif r.rule_id == "RULE-5.5" or (r.clause == "5.5" and r.route == "RFQ"):
                r.max_value_inr = float(self.rfq_limit)
            elif r.rule_id == "RULE-5.6" or (r.clause == "5.6" and r.route == "RFP"):
                r.min_value_inr = float(self.rfq_limit)
        return self

    def deep_copy(self) -> "ProcurementPolicy":
        """Returns an independent deep copy of the policy, including all rules and weights."""
        copied_rules = [PolicyRule.from_dict(r.to_dict()) for r in self.rules]
        return ProcurementPolicy(
            version=self.version,
            effective_date=self.effective_date,
            document_id=self.document_id,
            clubbing_window_days=self.clubbing_window_days,
            need_by_window_days=self.need_by_window_days,
            emergency_po_limit=float(self.emergency_po_limit),
            spot_po_limit=float(self.spot_po_limit),
            rfq_limit=float(self.rfq_limit),
            active_history_days=self.active_history_days,
            preferred_history_days=self.preferred_history_days,
            po_consolidation_window_hours=self.po_consolidation_window_hours,
            ranking_weights=dict(self.ranking_weights),
            rules=copied_rules
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "effective_date": self.effective_date.strftime("%Y-%m-%d"),
            "document_id": self.document_id,
            "clubbing_window_days": self.clubbing_window_days,
            "need_by_window_days": self.need_by_window_days,
            "emergency_po_limit": self.emergency_po_limit,
            "spot_po_limit": self.spot_po_limit,
            "rfq_limit": self.rfq_limit,
            "active_history_days": self.active_history_days,
            "preferred_history_days": self.preferred_history_days,
            "po_consolidation_window_hours": self.po_consolidation_window_hours,
            "ranking_weights": self.ranking_weights,
            "rules": [r.to_dict() for r in self.rules],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ProcurementPolicy":
        eff_date = d["effective_date"]
        if isinstance(eff_date, str):
            eff_date = date.fromisoformat(eff_date)
        rules = [PolicyRule.from_dict(r) for r in d.get("rules", [])]
        policy = cls(
            version=d["version"],
            effective_date=eff_date,
            document_id=d.get("document_id", "CORVO-PROC-POL-04"),
            clubbing_window_days=int(d.get("clubbing_window_days", 14)),
            need_by_window_days=int(d.get("need_by_window_days", 7)),
            emergency_po_limit=float(d.get("emergency_po_limit", 500000.0)),
            spot_po_limit=float(d.get("spot_po_limit", 200000.0)),
            rfq_limit=float(d.get("rfq_limit", 1000000.0)),
            active_history_days=int(d.get("active_history_days", 365)),
            preferred_history_days=int(d.get("preferred_history_days", 548)),
            po_consolidation_window_hours=int(d.get("po_consolidation_window_hours", 24)),
            ranking_weights=d.get("ranking_weights", {
                "recency": 40.0,
                "contract": 15.0,
                "volume_per_po": 5.0,
                "max_volume_pos": 10.0,
                "on_time": 10.0,
                "quality": 10.0
            }),
            rules=rules
        )
        policy.sync_rules()
        return policy

def synchronize_policy_amendment(
    base_policy: ProcurementPolicy,
    version: str,
    effective_date: Optional[Union[date, str]] = None,
    spot_po_limit: Optional[float] = None,
    emergency_po_limit: Optional[float] = None,
    rfq_limit: Optional[float] = None,
    clubbing_window_days: Optional[int] = None,
    need_by_window_days: Optional[int] = None,
    active_history_days: Optional[int] = None,
    preferred_history_days: Optional[int] = None,
    po_consolidation_window_hours: Optional[int] = None,
    ranking_weights: Optional[Dict[str, float]] = None,
    additional_rules: Optional[List[PolicyRule]] = None,
) -> ProcurementPolicy:
    """
    Centralized policy amendment synchronization function.

    Guarantees:
      1. Deep-copies base_policy rules before modification so historical versions are never mutated.
      2. Updates corresponding policy rules using explicit, validated mappings:
         - emergency_po_limit -> RULE-5.3 (max_value_inr)
         - spot_po_limit      -> RULE-5.4 (max_value_inr)
         - rfq_limit          -> RULE-5.5 (max_value_inr) & RULE-5.6 (min_value_inr)
      3. Validates the resulting policy using validate_policy().
      4. Does not duplicate or create contradictory rules.
      5. Raises ValueError on any invalid configuration.
    """
    if not version or not str(version).strip():
        raise ValueError("Policy version identifier cannot be blank.")

    # 1. Deep-copy rules from base_policy
    new_rules = [PolicyRule.from_dict(r.to_dict()) for r in base_policy.rules]

    # 2. Resolve effective date
    if effective_date is None:
        eff_date = base_policy.effective_date
    elif isinstance(effective_date, str):
        eff_date = date.fromisoformat(effective_date)
    else:
        eff_date = effective_date

    # 3. Resolve scalar thresholds
    final_spot = float(spot_po_limit) if spot_po_limit is not None else float(base_policy.spot_po_limit)
    final_emg = float(emergency_po_limit) if emergency_po_limit is not None else float(base_policy.emergency_po_limit)
    final_rfq = float(rfq_limit) if rfq_limit is not None else float(base_policy.rfq_limit)
    final_clubbing = int(clubbing_window_days) if clubbing_window_days is not None else base_policy.clubbing_window_days
    final_need_by = int(need_by_window_days) if need_by_window_days is not None else base_policy.need_by_window_days
    final_active_hist = int(active_history_days) if active_history_days is not None else base_policy.active_history_days
    final_pref_hist = int(preferred_history_days) if preferred_history_days is not None else base_policy.preferred_history_days
    final_consolidation = int(po_consolidation_window_hours) if po_consolidation_window_hours is not None else base_policy.po_consolidation_window_hours
    final_weights = dict(ranking_weights) if ranking_weights is not None else dict(base_policy.ranking_weights)

    # 4. Integrate additional rules if provided
    if additional_rules:
        existing_rule_ids = {r.rule_id for r in new_rules}
        for ar in additional_rules:
            ar_copy = PolicyRule.from_dict(ar.to_dict()) if hasattr(ar, "to_dict") else copy.deepcopy(ar)
            if ar_copy.rule_id in existing_rule_ids:
                new_rules = [ar_copy if r.rule_id == ar_copy.rule_id else r for r in new_rules]
            else:
                new_rules.append(ar_copy)
                existing_rule_ids.add(ar_copy.rule_id)

    # 5. Build amended policy
    amended = ProcurementPolicy(
        version=str(version).strip(),
        effective_date=eff_date,
        document_id=base_policy.document_id,
        clubbing_window_days=final_clubbing,
        need_by_window_days=final_need_by,
        emergency_po_limit=final_emg,
        spot_po_limit=final_spot,
        rfq_limit=final_rfq,
        active_history_days=final_active_hist,
        preferred_history_days=final_pref_hist,
        po_consolidation_window_hours=final_consolidation,
        ranking_weights=final_weights,
        rules=new_rules
    )

    # 6. Synchronize rules with scalar limits
    amended.sync_rules()

    # 7. Validate amendment
    errors = validate_policy(amended)
    if errors:
        raise ValueError(f"Invalid policy amendment: {'; '.join(errors)}")

    return amended

def validate_policy(policy: ProcurementPolicy) -> List[str]:
    """
    Validates policy parameters and rules before activation.
    Returns list of error messages (empty if valid).
    """
    errors = []
    if not policy.version or not str(policy.version).strip():
        errors.append("Policy version identifier cannot be blank.")
    if policy.spot_po_limit <= 0:
        errors.append("Spot PO limit must be a positive number.")
    if policy.emergency_po_limit <= 0:
        errors.append("Emergency PO limit must be a positive number.")
    if policy.rfq_limit <= 0:
        errors.append("RFQ threshold must be a positive number.")
    if policy.spot_po_limit > policy.rfq_limit:
        errors.append(
            f"Inconsistent policy thresholds: Spot PO limit (₹{policy.spot_po_limit:,.0f}) cannot exceed RFQ limit (₹{policy.rfq_limit:,.0f})."
        )

    valid_outcomes = {"PO", "SOURCING_REQUEST", "NOT_PROCESSED"}
    valid_routes = {
        "CONTRACT_PO", "SPOT_PO", "EMERGENCY_PO", "RFQ", "RFP",
        "CAPEX_SOURCING", "NEW_ITEM_SOURCING", "NOT_PROCESSED"
    }

    seen_ids = set()
    for r in policy.rules:
        if not r.rule_id or not r.rule_id.strip():
            errors.append("All rules must have a non-empty rule_id.")
        elif r.rule_id in seen_ids:
            errors.append(f"Duplicate rule_id '{r.rule_id}' detected. Rule IDs must be unique.")
        seen_ids.add(r.rule_id)

        if r.outcome not in valid_outcomes:
            errors.append(f"Rule '{r.rule_id}' has invalid outcome '{r.outcome}'. Must be one of {valid_outcomes}.")
        if r.route not in valid_routes:
            errors.append(f"Rule '{r.rule_id}' has invalid route '{r.route}'. Must be one of {valid_routes}.")

        if r.min_value_inr is not None and r.min_value_inr < 0:
            errors.append(f"Rule '{r.rule_id}' min_value_inr cannot be negative.")
        if r.max_value_inr is not None and r.max_value_inr <= 0:
            errors.append(f"Rule '{r.rule_id}' max_value_inr must be positive.")
        if r.min_value_inr is not None and r.max_value_inr is not None:
            if r.min_value_inr > r.max_value_inr:
                errors.append(
                    f"Rule '{r.rule_id}' has min_value_inr (₹{r.min_value_inr:,.0f}) exceeding max_value_inr (₹{r.max_value_inr:,.0f})."
                )

        # Explicit synchronization validation between standard rules and scalar thresholds
        if r.rule_id == "RULE-5.4" and r.max_value_inr != policy.spot_po_limit:
            errors.append(
                f"RULE-5.4 max_value_inr (₹{r.max_value_inr:,.0f}) is out of sync with policy spot_po_limit (₹{policy.spot_po_limit:,.0f})."
            )
        if r.rule_id == "RULE-5.3" and r.max_value_inr != policy.emergency_po_limit:
            errors.append(
                f"RULE-5.3 max_value_inr (₹{r.max_value_inr:,.0f}) is out of sync with policy emergency_po_limit (₹{policy.emergency_po_limit:,.0f})."
            )
        if r.rule_id == "RULE-5.5" and r.max_value_inr != policy.rfq_limit:
            errors.append(
                f"RULE-5.5 max_value_inr (₹{r.max_value_inr:,.0f}) is out of sync with policy rfq_limit (₹{policy.rfq_limit:,.0f})."
            )
        if r.rule_id == "RULE-5.6" and r.min_value_inr != policy.rfq_limit:
            errors.append(
                f"RULE-5.6 min_value_inr (₹{r.min_value_inr:,.0f}) is out of sync with policy rfq_limit (₹{policy.rfq_limit:,.0f})."
            )

    return errors

def get_default_policy_v5() -> ProcurementPolicy:
    """Returns the baseline Procurement Policy v5.0 effective 1 April 2026."""
    return ProcurementPolicy(
        version="v5.0",
        effective_date=date(2026, 4, 1),
        clubbing_window_days=14,
        need_by_window_days=7,
        emergency_po_limit=500000.0,
        spot_po_limit=200000.0,
        rfq_limit=1000000.0,
        active_history_days=365,
        preferred_history_days=548,
        po_consolidation_window_hours=24,
        rules=[
            PolicyRule(
                rule_id="RULE-5.1",
                clause="5.1",
                name="Capex Sourcing",
                outcome="SOURCING_REQUEST",
                route="CAPEX_SOURCING",
                item_type="Capex",
                suggest_suppliers_count=5,
                supplier_strategy="suggest_preferred_and_category",
                priority=10
            ),
            PolicyRule(
                rule_id="RULE-5.2",
                clause="5.2",
                name="Contract Purchase Order",
                outcome="PO",
                route="CONTRACT_PO",
                requires_contract=True,
                supplier_strategy="contract",
                priority=20
            ),
            PolicyRule(
                rule_id="RULE-5.3",
                clause="5.3",
                name="Emergency Direct Purchase Order",
                outcome="PO",
                route="EMERGENCY_PO",
                requires_emergency=True,
                max_value_inr=500000.0,
                max_value_inclusive=True,
                requires_history_365d=True,
                supplier_strategy="first_preferred",
                priority=30
            ),
            PolicyRule(
                rule_id="RULE-5.4",
                clause="5.4",
                name="Spot Purchase Order",
                outcome="PO",
                route="SPOT_PO",
                max_value_inr=200000.0,
                requires_history_365d=True,
                supplier_strategy="first_preferred",
                priority=40
            ),
            PolicyRule(
                rule_id="RULE-5.5",
                clause="5.5",
                name="Request for Quotation (RFQ)",
                outcome="SOURCING_REQUEST",
                route="RFQ",
                max_value_inr=1000000.0,
                suggest_suppliers_count=3,
                supplier_strategy="suggest_preferred_and_category",
                priority=50
            ),
            PolicyRule(
                rule_id="RULE-5.6",
                clause="5.6",
                name="Request for Proposal (RFP)",
                outcome="SOURCING_REQUEST",
                route="RFP",
                min_value_inr=1000000.0,
                suggest_suppliers_count=5,
                supplier_strategy="suggest_preferred_and_category",
                priority=60
            )
        ]
    )
