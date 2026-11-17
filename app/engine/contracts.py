"""
Clause 4: Contract Applicability & Ceiling Management Engine
Tracks contract eligibility, ceiling consumption, and lowest rate selection.
"""
import copy
from typing import Dict, List, Optional, Tuple
from datetime import date
from app.models.procurement import Contract, Supplier

class ContractManager:
    def __init__(self, contracts: Dict[str, Contract], suppliers: Dict[str, Supplier]):
        # Keep an isolated deep copy of contracts so ceiling consumption does not mutate master data in-place
        self.contracts = {k: copy.deepcopy(v) for k, v in contracts.items()}
        self.suppliers = suppliers

    def get_applicable_contracts(self, item_code: str, req_date: date) -> List[Contract]:
        """
        Clause 4.1: A rate contract applies to a requirement if:
        1. Contract covers the item
        2. requirement_date falls between start_date and end_date (inclusive)
        3. Contract supplier is Active in supplier master
        """
        applicable = []
        for c in self.contracts.values():
            if item_code not in c.lines:
                continue
            if not (c.start_date <= req_date <= c.end_date):
                continue
            supplier = self.suppliers.get(c.supplier_id)
            if not supplier or not supplier.is_active:
                continue
            applicable.append(c)
        return applicable

    def evaluate_contract_for_requirement(
        self,
        item_code: str,
        total_quantity: float,
        req_date: date
    ) -> Tuple[Optional[Contract], Optional[float], List[Contract]]:
        """
        Clause 4.2 & 4.3:
        Returns:
        - usable_contract: Contract with lowest rate that still has enough ceiling room, or None
        - lowest_rate: The lowest applicable contract rate (even if out of ceiling) for valuation 3.1(a)
        - applicable_contracts: All applicable contracts
        """
        applicable = self.get_applicable_contracts(item_code, req_date)
        if not applicable:
            return None, None, []

        # Sort applicable contracts by rate ascending
        sorted_by_rate = sorted(applicable, key=lambda c: c.lines[item_code].rate)
        lowest_applicable_rate = sorted_by_rate[0].lines[item_code].rate

        usable_contract = None
        for c in sorted_by_rate:
            rate = c.lines[item_code].rate
            req_value_at_rate = total_quantity * rate
            # Clause 4.2: consumed_value + req_value <= value_cap
            if (c.consumed_value + req_value_at_rate) <= c.value_cap:
                usable_contract = c
                break

        return usable_contract, lowest_applicable_rate, applicable

    def consume_ceiling(self, contract_id: str, value: float):
        """Atomically updates consumed ceiling when a CONTRACT_PO is awarded."""
        if contract_id in self.contracts:
            self.contracts[contract_id].consumed_value += value
