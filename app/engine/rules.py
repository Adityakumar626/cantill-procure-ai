"""
Clause 5: Decision Rules Engine
Interprets the active Procurement Policy (v5.0 or dynamic amendment) to assign route and supplier.
"""
from typing import Dict, Optional, Tuple, List
from datetime import date, timedelta
from app.models.procurement import Requirement, Item, Supplier, POHistoryRecord
from app.models.policy import ProcurementPolicy
from app.engine.supplier_ranker import SupplierRanker
from app.engine.contracts import ContractManager

class RuleEngine:
    def __init__(
        self,
        policy: ProcurementPolicy,
        items: Dict[str, Item],
        suppliers: Dict[str, Supplier],
        po_history: List[POHistoryRecord],
        contract_manager: ContractManager,
        supplier_ranker: SupplierRanker,
    ):
        self.policy = policy
        self.items = items
        self.suppliers = suppliers
        self.po_history = po_history
        self.contract_manager = contract_manager
        self.supplier_ranker = supplier_ranker

    def evaluate_requirement(self, req: Requirement) -> Requirement:
        """
        Evaluates a requirement against Policy Clause 5 rules in strict precedence order.
        Populates decision, route, supplier_id, unit_price, suggested_supplier_ids, and reason.
        """
        # Clause 1.2: New Item Sourcing
        if req.resolved_item_code == "NEW":
            req.decision = "SOURCING_REQUEST"
            req.route = "NEW_ITEM_SOURCING"
            req.supplier_id = None
            req.suggested_supplier_ids = []
            req.policy_version = self.policy.version
            req.reason = "Clause 1.2: Item not found in item master"
            return req

        item = self.items.get(req.resolved_item_code)
        item_type = item.item_type if item else "Material"

        # Check if item has purchase history from an Active supplier in the last 365 days
        has_history_365d = self._has_active_purchase_history_365d(req.resolved_item_code, req.requirement_date)

        # Rule 5.1: Capex items always go to sourcing (Checked BEFORE contracts and value limits)
        if item_type.lower() == "capex":
            req.decision = "SOURCING_REQUEST"
            req.route = "CAPEX_SOURCING"
            req.supplier_id = None
            req.suggested_supplier_ids = self.supplier_ranker.get_sourcing_suggestions(
                req.resolved_item_code, req.requirement_date, 5
            )
            req.policy_version = self.policy.version
            req.reason = "Clause 5.1: Item type is Capex"
            return req

        # Rule 5.2: A contract can be used (Clause 4.1 to 4.3)
        if req.assigned_contract_id:
            contract = self.contract_manager.contracts.get(req.assigned_contract_id)
            if contract:
                req.decision = "PO"
                req.route = "CONTRACT_PO"
                req.supplier_id = contract.supplier_id
                # Unit price is the contract rate
                req.unit_price = contract.lines[req.resolved_item_code].rate
                req.group_value_inr = req.total_quantity * req.unit_price
                req.policy_version = self.policy.version
                req.reason = f"Clause 5.2 via contract {contract.contract_id}"
                # Atomically consume contract ceiling
                self.contract_manager.consume_ceiling(contract.contract_id, req.group_value_inr)
                return req

        # Get preferred supplier list for direct PO or sourcing suggestions
        preferred_list = self.supplier_ranker.get_preferred_suppliers_ranked(
            req.resolved_item_code, req.requirement_date
        )
        first_preferred = preferred_list[0] if preferred_list else None

        # Rule 5.3: Emergency PO (Value <= emergency_po_limit AND bought from Active supplier in 365d)
        if req.is_emergency and req.group_value_inr <= self.policy.emergency_po_limit and has_history_365d:
            if first_preferred:
                req.decision = "PO"
                req.route = "EMERGENCY_PO"
                req.supplier_id = first_preferred["supplier_id"]
                req.unit_price = first_preferred["reference_price"]
                req.group_value_inr = req.total_quantity * req.unit_price
                req.policy_version = self.policy.version
                req.reason = f"Clause 5.3: Emergency PO to 1st preferred supplier {first_preferred['supplier_id']}"
                return req

        # Rule 5.4: Spot PO (Value < spot_po_limit AND bought from Active supplier in 365d)
        if req.group_value_inr < self.policy.spot_po_limit and has_history_365d:
            if first_preferred:
                req.decision = "PO"
                req.route = "SPOT_PO"
                req.supplier_id = first_preferred["supplier_id"]
                req.unit_price = first_preferred["reference_price"]
                req.group_value_inr = req.total_quantity * req.unit_price
                req.policy_version = self.policy.version
                req.reason = f"Clause 5.4: Spot PO to 1st preferred supplier {first_preferred['supplier_id']}"
                return req

        # Rule 5.5: RFQ (Value < rfq_limit, including small items never bought in last 365 days)
        if req.group_value_inr < self.policy.rfq_limit:
            req.decision = "SOURCING_REQUEST"
            req.route = "RFQ"
            req.supplier_id = None
            req.suggested_supplier_ids = self.supplier_ranker.get_sourcing_suggestions(
                req.resolved_item_code, req.requirement_date, 3
            )
            req.policy_version = self.policy.version
            if not has_history_365d:
                req.reason = "Clause 5.5: Sourcing RFQ (item unproven in last 365 days)"
            else:
                req.reason = "Clause 5.5: Sourcing RFQ (value between spot and RFQ limit)"
            return req

        # Rule 5.6: RFP (Value >= rfq_limit)
        req.decision = "SOURCING_REQUEST"
        req.route = "RFP"
        req.supplier_id = None
        req.suggested_supplier_ids = self.supplier_ranker.get_sourcing_suggestions(
            req.resolved_item_code, req.requirement_date, 5
        )
        req.policy_version = self.policy.version
        req.reason = "Clause 5.6: Sourcing RFP (high value requirement >= 10 Lakh)"
        return req

    def _has_active_purchase_history_365d(self, item_code: str, req_date: date) -> bool:
        """Checks if item was bought from an Active supplier in the 365 days before requirement date."""
        cutoff_365 = req_date - timedelta(days=self.policy.active_history_days)
        for po in self.po_history:
            if po.item_code == item_code and (cutoff_365 <= po.po_date <= req_date):
                supp = self.suppliers.get(po.supplier_id)
                if supp and supp.is_active:
                    return True
        return False
