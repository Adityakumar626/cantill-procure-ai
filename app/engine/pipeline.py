"""
Cantill ProcureAI End-to-End Decision Pipeline
Orchestrates Item Matching, Clubbing, Valuation, Contract Selection, Rules, Ranking, and PO Consolidation.
"""
from typing import List, Dict, Tuple
from app.models.procurement import PRLine, Requirement, OutputDecisionRow
from app.models.policy import ProcurementPolicy, get_default_policy_v5
from app.engine.data_loader import MasterDataLoader
from app.engine.matcher import ItemMatcher
from app.engine.clubber import RequirementClubber
from app.engine.contracts import ContractManager
from app.engine.valuation import RequirementValuator
from app.engine.supplier_ranker import SupplierRanker
from app.engine.rules import RuleEngine
from app.engine.consolidator import POConsolidator

class ProcurementPipeline:
    def __init__(self, data_loader: MasterDataLoader, policy: ProcurementPolicy = None):
        self.loader = data_loader
        self.policy = policy or get_default_policy_v5()

        # Initialize engine components
        self.matcher = ItemMatcher(self.loader.items)
        self.clubber = RequirementClubber(
            clubbing_window_days=self.policy.clubbing_window_days,
            need_by_window_days=self.policy.need_by_window_days
        )
        self.contract_manager = ContractManager(self.loader.contracts, self.loader.suppliers)
        self.valuator = RequirementValuator(
            self.loader.items,
            self.loader.po_history,
            self.contract_manager,
            active_history_days=self.policy.active_history_days
        )
        self.supplier_ranker = SupplierRanker(
            self.loader.suppliers,
            self.loader.items,
            self.loader.po_history,
            self.contract_manager.contracts,
            history_window_days=self.policy.preferred_history_days
        )
        self.rule_engine = RuleEngine(
            self.policy,
            self.loader.items,
            self.loader.suppliers,
            self.loader.po_history,
            self.contract_manager,
            self.supplier_ranker
        )
        self.consolidator = POConsolidator(
            consolidation_window_hours=self.policy.po_consolidation_window_hours
        )

    def process_pr_lines(self, pr_lines: List[PRLine]) -> Tuple[List[Requirement], List[OutputDecisionRow]]:
        """
        Executes the full procurement pipeline on incoming PR lines.
        Returns:
        - List of evaluated Requirements
        - List of OutputDecisionRows formatted for final CSV export
        """
        # Step 1: Item Resolution (Clause 1)
        resolved_pairs = []
        for line in pr_lines:
            resolved_code = self.matcher.resolve(line.item_code, line.description)
            resolved_pairs.append((resolved_code, line))

        # Step 2: Requirement Clubbing (Clause 2)
        requirements = self.clubber.club_lines(resolved_pairs)

        # Sort requirements deterministically by requirement date, then first line creation
        requirements.sort(key=lambda r: (r.requirement_date, r.first_line_created_at, r.group_id))

        # Step 3, 4, 5: Valuation, Contract Selection, and Rule Evaluation
        for req in requirements:
            # Value requirement (Clause 3 & 4)
            unit_price, group_val, source, assigned_contract = self.valuator.value_requirement(req)
            req.unit_price = unit_price
            req.group_value_inr = group_val
            req.pricing_source = source
            req.assigned_contract_id = assigned_contract

            # Evaluate decision rules (Clause 5)
            self.rule_engine.evaluate_requirement(req)

        # Step 6: PO Consolidation (Clause 7)
        self.consolidator.consolidate_pos(requirements)

        # Step 7: Map back to 13-column Output Decision Rows (Section 4 Output Format)
        output_rows = []
        for req in requirements:
            suggested_str = ";".join(req.suggested_supplier_ids) if req.suggested_supplier_ids else ""
            supp_id_str = req.supplier_id if req.supplier_id else ""
            unit_price_str = f"{req.unit_price:.2f}" if req.unit_price else ""
            group_val_str = f"{req.group_value_inr:.2f}" if req.group_value_inr else "0.00"
            po_id_str = req.po_id if req.po_id else ""

            for line in req.lines:
                row = OutputDecisionRow(
                    pr_no=line.pr_no,
                    pr_line=line.pr_line,
                    resolved_item_code=req.resolved_item_code,
                    group_id=req.group_id,
                    po_id=po_id_str,
                    decision=req.decision,
                    route=req.route,
                    supplier_id=supp_id_str,
                    unit_price=unit_price_str,
                    group_value_inr=group_val_str,
                    suggested_supplier_ids=suggested_str,
                    policy_version=req.policy_version,
                    reason=req.reason
                )
                output_rows.append(row)

        return requirements, output_rows
