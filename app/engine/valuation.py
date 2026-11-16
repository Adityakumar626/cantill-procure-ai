"""
Clause 3: Requirement Valuation Engine
Calculates requirement value based on contract rates, PO history, and item master standard prices.
"""
from typing import Dict, List, Optional, Tuple
from datetime import date, timedelta
from app.models.procurement import Item, POHistoryRecord, Requirement
from app.engine.contracts import ContractManager

class RequirementValuator:
    def __init__(
        self,
        items: Dict[str, Item],
        po_history: List[POHistoryRecord],
        contract_manager: ContractManager,
        active_history_days: int = 365,
    ):
        self.items = items
        self.po_history = po_history
        self.contract_manager = contract_manager
        self.active_history_days = active_history_days

    def value_requirement(self, req: Requirement) -> Tuple[float, float, str, Optional[str]]:
        """
        Determines the unit price, group value, pricing source, and assigned contract (if any).
        Clause 3.1:
        (a) Contract rate to be used, or lowest applicable contract rate if out of ceiling
        (b) Most recent PO price in 365 days before requirement date
        (c) Item master standard price
        For NEW items (Clause 1.2): Requester estimated unit price
        """
        # Clause 1.2: New Item
        if req.resolved_item_code == "NEW":
            est_price = 0.0
            for line in req.lines:
                if line.estimated_unit_price and line.estimated_unit_price > 0:
                    est_price = line.estimated_unit_price
                    break
            unit_price = est_price
            group_value = req.total_quantity * unit_price
            return unit_price, group_value, "Requester Estimate", None

        # Clause 3.1(a): Check applicable contracts
        usable_contract, lowest_rate, applicable = (
            self.contract_manager.evaluate_contract_for_requirement(
                req.resolved_item_code, req.total_quantity, req.requirement_date
            )
        )

        if usable_contract:
            rate = usable_contract.lines[req.resolved_item_code].rate
            group_value = req.total_quantity * rate
            return rate, group_value, f"Contract {usable_contract.contract_id}", usable_contract.contract_id

        if lowest_rate is not None:
            # All applicable contracts out of ceiling: use lowest applicable contract rate for valuation
            group_value = req.total_quantity * lowest_rate
            return lowest_rate, group_value, "Lowest Contract Rate (Ceiling Exceeded)", None

        # Clause 3.1(b): Most recent PO in 365 days before requirement date
        recent_po_price = self._get_most_recent_po_price(req.resolved_item_code, req.requirement_date)
        if recent_po_price is not None:
            group_value = req.total_quantity * recent_po_price
            return recent_po_price, group_value, "Recent PO (365d)", None

        # Clause 3.1(c): Item Master Standard Price
        item = self.items.get(req.resolved_item_code)
        if item:
            std_price = item.standard_price
            group_value = req.total_quantity * std_price
            return std_price, group_value, "Item Master Standard Price", None

        return 0.0, 0.0, "Zero Default", None

    def _get_most_recent_po_price(self, item_code: str, req_date: date) -> Optional[float]:
        """Finds unit price on the most recent PO for the item in the 365 days before req_date."""
        cutoff_date = req_date - timedelta(days=self.active_history_days)
        candidates = [
            po for po in self.po_history
            if po.item_code == item_code and (cutoff_date <= po.po_date <= req_date)
        ]
        if not candidates:
            return None
        # Sort by po_date descending, then po_number descending
        candidates.sort(key=lambda p: (p.po_date, p.po_number), reverse=True)
        return candidates[0].unit_price
