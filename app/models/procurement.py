"""
Cantill ProcureAI Data Models
"""
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional, List, Dict, Any

@dataclass
class Plant:
    plant: str
    name: str

@dataclass
class Item:
    item_code: str
    description: str
    uom: str
    category: str
    item_type: str  # 'Material', 'Capex', 'Service'
    standard_price: float

@dataclass
class Supplier:
    supplier_id: str
    name: str
    city: str
    categories: List[str]
    status: str  # 'Active', 'Inactive', 'Blocked'
    on_time_pct: float
    quality_rating: float

    @property
    def is_active(self) -> bool:
        return self.status.strip().lower() == "active"

@dataclass
class POHistoryRecord:
    po_number: str
    po_date: date
    supplier_id: str
    item_code: str
    quantity: float
    uom: str
    unit_price: float
    plant: str
    delivered_on_time: bool

@dataclass
class ContractLine:
    contract_id: str
    item_code: str
    description: str
    uom: str
    rate: float

@dataclass
class Contract:
    contract_id: str
    supplier_id: str
    supplier_name: str
    start_date: date
    end_date: date
    value_cap: float
    consumed_value: float = 0.0
    lines: Dict[str, ContractLine] = field(default_factory=dict)  # item_code -> ContractLine

    @property
    def remaining_ceiling(self) -> float:
        return max(0.0, self.value_cap - self.consumed_value)

    def can_cover(self, item_code: str, req_value: float) -> bool:
        return (item_code in self.lines) and ((self.consumed_value + req_value) <= self.value_cap)

@dataclass
class PRLine:
    pr_no: str
    pr_line: int
    created_at: datetime
    requester: str
    department: str
    plant: str
    item_code: Optional[str]
    description: str
    quantity: float
    uom: str
    estimated_unit_price: Optional[float]
    need_by_date: date
    urgency: str  # 'Normal', 'Emergency'

    @property
    def is_emergency(self) -> bool:
        return self.urgency.strip().lower() == "emergency"

@dataclass
class Requirement:
    group_id: str
    resolved_item_code: str
    plant: str
    first_line_created_at: datetime
    requirement_date: date
    first_need_by_date: date
    is_emergency: bool
    lines: List[PRLine] = field(default_factory=list)
    total_quantity: float = 0.0
    unit_price: float = 0.0
    group_value_inr: float = 0.0
    pricing_source: str = ""
    assigned_contract_id: Optional[str] = None
    decision: str = ""  # 'PO' or 'SOURCING_REQUEST'
    route: str = ""  # 'CONTRACT_PO', 'EMERGENCY_PO', 'SPOT_PO', 'RFQ', 'RFP', 'CAPEX_SOURCING', 'NEW_ITEM_SOURCING'
    supplier_id: Optional[str] = None
    suggested_supplier_ids: List[str] = field(default_factory=list)
    po_id: Optional[str] = None
    policy_version: str = "v5.0"
    reason: str = ""
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    is_overridden: bool = False
    override_comment: Optional[str] = None
    override_by: Optional[str] = None
    override_at: Optional[str] = None

@dataclass
class OutputDecisionRow:
    pr_no: str
    pr_line: int
    resolved_item_code: str
    group_id: str
    po_id: str
    decision: str
    route: str
    supplier_id: str
    unit_price: str
    group_value_inr: str
    suggested_supplier_ids: str
    policy_version: str
    reason: str
