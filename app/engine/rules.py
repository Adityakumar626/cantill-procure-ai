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
        self.policy.sync_rules()
        self.items = items
        self.suppliers = suppliers
        self.po_history = po_history
        self.contract_manager = contract_manager
        self.supplier_ranker = supplier_ranker

    def evaluate_requirement(self, req: Requirement) -> Requirement:
        """
        Evaluates a requirement against Policy Clause 5 rules in strict precedence order
        using a constrained rule interpreter over self.policy.rules.
        Populates decision, route, supplier_id, unit_price, suggested_supplier_ids, and reason.
        """
        # Clause 1.2: New Item Sourcing (Always uncataloged, never clubbed, no suggestions)
        if req.resolved_item_code == "NEW":
            req.decision = "SOURCING_REQUEST"
            req.route = "NEW_ITEM_SOURCING"
            req.supplier_id = None
            req.suggested_supplier_ids = []
            req.policy_version = self.policy.version
            req.reason = "Clause 1.2: Item not found in item master"
            return req

        item = self.items.get(req.resolved_item_code)
        item_type = (item.item_type if item else "Material").strip()
        category = (item.category if item else "").strip()

        # Check if item has purchase history from an Active supplier in the last 365 days
        has_history_365d = self._has_active_purchase_history_365d(req.resolved_item_code, req.requirement_date)

        # Pre-fetch preferred suppliers list as of requirement date
        preferred_list = self.supplier_ranker.get_preferred_suppliers_ranked(
            req.resolved_item_code, req.requirement_date
        )
        first_preferred = preferred_list[0] if preferred_list else None

        # Execute Constrained Rule Interpreter over self.policy.rules sorted by priority
        sorted_rules = sorted(self.policy.rules, key=lambda r: r.priority)

        for rule in sorted_rules:
            # 1. Plant scope predicate
            if rule.plant and rule.plant.strip():
                if req.plant.upper() != rule.plant.strip().upper():
                    continue

            # 2. Category predicate
            if rule.category and rule.category.strip():
                if category.lower() != rule.category.strip().lower():
                    continue

            # 3. Item type predicate (e.g. Capex)
            if rule.item_type and rule.item_type.strip():
                if item_type.lower() != rule.item_type.strip().lower():
                    continue

            # 4. Emergency predicate
            if rule.requires_emergency is True and not req.is_emergency:
                continue
            if rule.requires_emergency is False and req.is_emergency:
                continue

            # 5. Contract requirement predicate
            if rule.requires_contract is True and not req.assigned_contract_id:
                continue

            # 6. Proven active purchase history in 365 days predicate
            if rule.requires_history_365d is True and not has_history_365d:
                continue
            if rule.requires_history_365d is False and has_history_365d:
                continue

            # 7. Minimum value predicate (inclusive)
            if rule.min_value_inr is not None:
                if req.group_value_inr < rule.min_value_inr:
                    continue

            # 8. Maximum value predicate
            if rule.max_value_inr is not None:
                if rule.max_value_inclusive:
                    if req.group_value_inr > rule.max_value_inr:
                        continue
                else:
                    if req.group_value_inr >= rule.max_value_inr:
                        continue

            # --- MATCH FOUND: Execute Rule Action ---
            if rule.supplier_strategy == "contract":
                contract = self.contract_manager.contracts.get(req.assigned_contract_id)
                if not contract:
                    continue
                req.decision = rule.outcome
                req.route = rule.route
                req.supplier_id = contract.supplier_id
                req.unit_price = contract.lines[req.resolved_item_code].rate
                req.group_value_inr = req.total_quantity * req.unit_price
                req.policy_version = self.policy.version
                req.reason = f"Clause {rule.clause} via contract {contract.contract_id}"
                self.contract_manager.consume_ceiling(contract.contract_id, req.group_value_inr)
                return req

            elif rule.supplier_strategy == "first_preferred":
                if not first_preferred:
                    # Cannot award direct PO without a proven preferred supplier; continue to sourcing rules
                    continue
                req.decision = rule.outcome
                req.route = rule.route
                req.supplier_id = first_preferred["supplier_id"]
                req.unit_price = first_preferred["reference_price"]
                req.group_value_inr = req.total_quantity * req.unit_price
                req.policy_version = self.policy.version
                req.reason = f"Clause {rule.clause}: {rule.name} to 1st preferred supplier {first_preferred['supplier_id']}"
                return req

            elif rule.supplier_strategy == "suggest_preferred_and_category":
                req.decision = rule.outcome
                req.route = rule.route
                req.supplier_id = None
                count = rule.suggest_suppliers_count or (5 if rule.route in ["RFP", "CAPEX_SOURCING"] else 3)
                req.suggested_supplier_ids = self.supplier_ranker.get_sourcing_suggestions(
                    req.resolved_item_code, req.requirement_date, count
                )
                req.policy_version = self.policy.version
                if rule.clause == "5.5":
                    if not has_history_365d:
                        req.reason = "Clause 5.5: Sourcing RFQ (item unproven in last 365 days)"
                    else:
                        req.reason = "Clause 5.5: Sourcing RFQ (value between spot and RFQ limit)"
                elif rule.clause == "5.1":
                    req.reason = "Clause 5.1: Item type is Capex"
                elif rule.clause == "5.6":
                    req.reason = "Clause 5.6: Sourcing RFP (high value requirement >= 10 Lakh)"
                else:
                    req.reason = f"Clause {rule.clause}: {rule.name}"
                return req

            else:
                req.decision = rule.outcome
                req.route = rule.route
                req.supplier_id = None
                req.suggested_supplier_ids = []
                req.policy_version = self.policy.version
                req.reason = f"Clause {rule.clause}: {rule.name}"
                return req

        # Fallback if no configured rule matched
        req.decision = "SOURCING_REQUEST"
        req.route = "RFQ"
        req.supplier_id = None
        req.suggested_supplier_ids = self.supplier_ranker.get_sourcing_suggestions(
            req.resolved_item_code, req.requirement_date, 3
        )
        req.policy_version = self.policy.version
        req.reason = "Clause 5.5: Default fallback sourcing"
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
