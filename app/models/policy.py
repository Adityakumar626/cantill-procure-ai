"""
Cantill ProcureAI Policy as Data Schema
"""
from dataclasses import dataclass, field
from datetime import date
from typing import List, Dict, Any, Optional

@dataclass
class PolicyRule:
    rule_id: str
    clause: str
    name: str
    outcome: str           # 'PO' or 'SOURCING_REQUEST'
    route: str             # 'CAPEX_SOURCING', 'CONTRACT_PO', 'EMERGENCY_PO', 'SPOT_PO', 'RFQ', 'RFP', 'NEW_ITEM_SOURCING'
    max_value_inr: Optional[float] = None
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
    rules: List[PolicyRule] = field(default_factory=list)

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
