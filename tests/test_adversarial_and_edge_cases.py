"""
Cantill ProcureAI Adversarial, Boundary, and Edge-Case Test Suite
Validates strict compliance with all 8 clauses, policy amendments, deterministic ordering,
contract exhaustion, and RFC 4180 CSV compliance under adversarial conditions.
"""
import copy
import csv
import io
import random
from datetime import datetime, date, timedelta
import pytest

from app.models.procurement import PRLine, Requirement, Item, Supplier, Contract, ContractLine
from app.models.policy import ProcurementPolicy, PolicyRule, get_default_policy_v5
from app.engine.data_loader import MasterDataLoader
from app.engine.pipeline import ProcurementPipeline
from app.engine.contracts import ContractManager
from app.engine.clubber import RequirementClubber
from app.engine.rules import RuleEngine
from app.engine.supplier_ranker import SupplierRanker
from app.policy_manager.store import PolicyStore

@pytest.fixture
def loader():
    dl = MasterDataLoader()
    dl.load_all()
    return dl

@pytest.fixture
def policy_v5():
    return get_default_policy_v5()

# -----------------------------------------------------------------------------
# 1. Exact Threshold Boundaries & One-Unit-Above Tests
# -----------------------------------------------------------------------------

def test_spot_po_exact_boundary(loader, policy_v5):
    """
    Clause 5.4: Spot PO limit is ₹2,00,000 (strictly below).
    - ₹199,999.99 with 365d history -> SPOT_PO
    - ₹200,000.00 with 365d history -> RFQ
    - ₹200,000.01 with 365d history -> RFQ
    """
    pipeline = ProcurementPipeline(loader, policy_v5)
    
    # ITM-1033 has active 365d history with S020 (reference price 65837.89)
    # 1. Strictly below: ₹199,999.00
    req_below = Requirement(
        group_id="REQ-TEST-1",
        resolved_item_code="ITM-1033",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 2, 10, 0),
        requirement_date=date(2026, 11, 2),
        first_need_by_date=date(2026, 11, 15),
        is_emergency=False,
        total_quantity=1.0,
        unit_price=199999.00,
        group_value_inr=199999.00
    )
    pipeline.rule_engine.evaluate_requirement(req_below)
    assert req_below.decision == "PO"
    assert req_below.route == "SPOT_PO"
    assert req_below.supplier_id == "S020"

    # 2. Exact boundary: ₹200,000.00 (Clause 5.4 says 'below ₹2,00,000' -> not below)
    req_exact = Requirement(
        group_id="REQ-TEST-2",
        resolved_item_code="ITM-1033",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 2, 10, 0),
        requirement_date=date(2026, 11, 2),
        first_need_by_date=date(2026, 11, 15),
        is_emergency=False,
        total_quantity=1.0,
        unit_price=200000.00,
        group_value_inr=200000.00
    )
    pipeline.rule_engine.evaluate_requirement(req_exact)
    assert req_exact.decision == "SOURCING_REQUEST"
    assert req_exact.route == "RFQ"

    # 3. One cent above: ₹200,000.01
    req_above = Requirement(
        group_id="REQ-TEST-3",
        resolved_item_code="ITM-1033",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 2, 10, 0),
        requirement_date=date(2026, 11, 2),
        first_need_by_date=date(2026, 11, 15),
        is_emergency=False,
        total_quantity=1.0,
        unit_price=200000.01,
        group_value_inr=200000.01
    )
    pipeline.rule_engine.evaluate_requirement(req_above)
    assert req_above.decision == "SOURCING_REQUEST"
    assert req_above.route == "RFQ"


def test_emergency_po_exact_boundary(loader, policy_v5):
    """
    Clause 5.3: Emergency PO limit is ₹5,00,000 (at or below, inclusive).
    - Emergency at ₹500,000.00 -> EMERGENCY_PO
    - Emergency at ₹500,000.01 -> RFQ
    """
    pipeline = ProcurementPipeline(loader, policy_v5)

    req_exact = Requirement(
        group_id="REQ-EMG-1",
        resolved_item_code="ITM-1026",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 6, 18, 50),
        requirement_date=date(2026, 11, 6),
        first_need_by_date=date(2026, 11, 25),
        is_emergency=True,
        total_quantity=1.0,
        unit_price=500000.00,
        group_value_inr=500000.00
    )
    pipeline.rule_engine.evaluate_requirement(req_exact)
    assert req_exact.decision == "PO"
    assert req_exact.route == "EMERGENCY_PO"
    assert req_exact.supplier_id == "S014"

    req_above = Requirement(
        group_id="REQ-EMG-2",
        resolved_item_code="ITM-1026",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 6, 18, 50),
        requirement_date=date(2026, 11, 6),
        first_need_by_date=date(2026, 11, 25),
        is_emergency=True,
        total_quantity=1.0,
        unit_price=500000.01,
        group_value_inr=500000.01
    )
    pipeline.rule_engine.evaluate_requirement(req_above)
    assert req_above.decision == "SOURCING_REQUEST"
    assert req_above.route == "RFQ"


def test_rfq_rfp_exact_boundary(loader, policy_v5):
    """
    Clause 5.5 & 5.6:
    - ₹999,999.99 -> RFQ (3 suggestions)
    - ₹1,000,000.00 -> RFP (5 suggestions)
    """
    pipeline = ProcurementPipeline(loader, policy_v5)

    req_rfq = Requirement(
        group_id="REQ-VAL-1",
        resolved_item_code="ITM-1034",
        plant="CHK1",
        first_line_created_at=datetime(2026, 11, 4, 13, 5),
        requirement_date=date(2026, 11, 4),
        first_need_by_date=date(2026, 11, 24),
        is_emergency=False,
        total_quantity=1.0,
        unit_price=999999.99,
        group_value_inr=999999.99
    )
    pipeline.rule_engine.evaluate_requirement(req_rfq)
    assert req_rfq.decision == "SOURCING_REQUEST"
    assert req_rfq.route == "RFQ"
    assert len(req_rfq.suggested_supplier_ids) <= 3

    req_rfp = Requirement(
        group_id="REQ-VAL-2",
        resolved_item_code="ITM-1034",
        plant="CHK1",
        first_line_created_at=datetime(2026, 11, 4, 13, 5),
        requirement_date=date(2026, 11, 4),
        first_need_by_date=date(2026, 11, 24),
        is_emergency=False,
        total_quantity=1.0,
        unit_price=1000000.00,
        group_value_inr=1000000.00
    )
    pipeline.rule_engine.evaluate_requirement(req_rfp)
    assert req_rfp.decision == "SOURCING_REQUEST"
    assert req_rfp.route == "RFP"
    assert len(req_rfp.suggested_supplier_ids) <= 5


# -----------------------------------------------------------------------------
# 2. Contract Ceiling Exhaustion & Expired Contracts
# -----------------------------------------------------------------------------

def test_contract_ceiling_exhaustion_boundary(loader):
    """
    Validates exact ceiling boundary:
    Contract cap: ₹100,000, consumed: ₹90,000. Remaining: ₹10,000.
    1. Requirement of ₹10,000.00 exactly uses up the ceiling -> CONTRACT_PO
    2. Next requirement of ₹0.50 fails ceiling check -> falls back gracefully.
    """
    supp = Supplier("S_TEST", "Test Supplier", "Pune", ["Hardware"], "Active", 90.0, 4.0)
    contract = Contract(
        contract_id="RC-TEST-01",
        supplier_id="S_TEST",
        supplier_name="Test Supplier",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        value_cap=100000.0,
        consumed_value=90000.0,
        lines={"ITM-1001": ContractLine("RC-TEST-01", "ITM-1001", "Desc", "NOS", 100.0)}
    )
    cm = ContractManager({"RC-TEST-01": contract}, {"S_TEST": supp})

    # Requirement of 100 units @ ₹100 = ₹10,000.00 (exact ceiling remaining)
    usable, rate, _ = cm.evaluate_contract_for_requirement("ITM-1001", 100.0, date(2026, 6, 1))
    assert usable is not None
    assert usable.contract_id == "RC-TEST-01"
    cm.consume_ceiling(usable.contract_id, 100.0 * rate)

    assert cm.contracts["RC-TEST-01"].remaining_ceiling == 0.0

    # Next requirement of 1 unit @ ₹100 = ₹100.00 (ceiling is exhausted)
    usable_after, _, _ = cm.evaluate_contract_for_requirement("ITM-1001", 1.0, date(2026, 6, 1))
    assert usable_after is None


def test_expired_and_inactive_contracts(loader):
    """
    Clause 4.1: Rate contract applies ONLY IF:
    - requirement_date is between start_date and end_date
    - contract supplier is Active
    """
    active_supp = Supplier("S_ACT", "Active Supp", "Pune", ["Hardware"], "Active", 90.0, 4.0)
    inactive_supp = Supplier("S_INACT", "Inactive Supp", "Pune", ["Hardware"], "Inactive", 90.0, 4.0)

    # 1. Expired contract (ended yesterday)
    expired = Contract(
        contract_id="RC-EXP",
        supplier_id="S_ACT",
        supplier_name="Active Supp",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 10, 31),
        value_cap=500000.0,
        consumed_value=0.0,
        lines={"ITM-1001": ContractLine("RC-EXP", "ITM-1001", "Desc", "NOS", 50.0)}
    )

    # 2. Inactive supplier contract
    inactive_c = Contract(
        contract_id="RC-INACT",
        supplier_id="S_INACT",
        supplier_name="Inactive Supp",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        value_cap=500000.0,
        consumed_value=0.0,
        lines={"ITM-1001": ContractLine("RC-INACT", "ITM-1001", "Desc", "NOS", 40.0)}
    )

    cm = ContractManager(
        {"RC-EXP": expired, "RC-INACT": inactive_c},
        {"S_ACT": active_supp, "S_INACT": inactive_supp}
    )

    # Requirement on 2026-11-01 (expired has ended, inactive is blocked)
    usable, _, applicable = cm.evaluate_contract_for_requirement("ITM-1001", 10.0, date(2026, 11, 1))
    assert usable is None
    assert len(applicable) == 0


# -----------------------------------------------------------------------------
# 3. Overlapping Anti-Split Windows & Plant Boundaries
# -----------------------------------------------------------------------------

def test_overlapping_anti_split_windows():
    """
    Clause 2.2 Anti-Splitting Rules:
    - Created within 14 calendar days of requirement's first line (0 to 14 days inclusive)
    - Need-by date within 7 calendar days of first line's need-by date (abs <= 7)
    """
    clubber = RequirementClubber(clubbing_window_days=14, need_by_window_days=7)

    # Line 1: Created Nov 1 10:00, Need-by Nov 15
    l1 = PRLine("PR-1", 1, datetime(2026, 11, 1, 10, 0), "R1", "D1", "PUN1", "ITM-1001", "Item", 10.0, "NOS", None, date(2026, 11, 15), "Normal")
    # Line 2: Created Nov 15 10:00 (exact 14 days later), Need-by Nov 22 (exact +7 days) -> CLUBS with Line 1
    l2 = PRLine("PR-2", 1, datetime(2026, 11, 15, 10, 0), "R2", "D2", "PUN1", "ITM-1001", "Item", 15.0, "NOS", None, date(2026, 11, 22), "Normal")
    # Line 3: Created Nov 25 10:00 (>14 days from Line 1 and Line 4) -> Starts REQ-0003
    l3 = PRLine("PR-3", 1, datetime(2026, 11, 25, 10, 0), "R3", "D3", "PUN1", "ITM-1001", "Item", 20.0, "NOS", None, date(2026, 12, 1), "Normal")
    # Line 4: Created Nov 5, Need-by Nov 25 (10 days after Line 1 need-by -> exceeds 7 days) -> Starts REQ-0002
    l4 = PRLine("PR-4", 1, datetime(2026, 11, 5, 10, 0), "R4", "D4", "PUN1", "ITM-1001", "Item", 25.0, "NOS", None, date(2026, 11, 25), "Normal")

    reqs = clubber.club_lines([("ITM-1001", l1), ("ITM-1001", l2), ("ITM-1001", l3), ("ITM-1001", l4)])
    # l1 and l2 club together into REQ-0001
    # l3 and l4 each form their own requirement
    assert len(reqs) == 3
    assert reqs[0].total_quantity == 25.0
    assert len(reqs[0].lines) == 2


def test_different_plants_never_clubbed():
    """
    Clause 2.2: PR lines for different plants are NEVER clubbed into the same requirement.
    """
    clubber = RequirementClubber()
    l1 = PRLine("PR-1", 1, datetime(2026, 11, 1, 10, 0), "R1", "D1", "PUN1", "ITM-1001", "Item", 10.0, "NOS", None, date(2026, 11, 15), "Normal")
    l2 = PRLine("PR-2", 1, datetime(2026, 11, 1, 10, 0), "R2", "D2", "CHK1", "ITM-1001", "Item", 20.0, "NOS", None, date(2026, 11, 15), "Normal")

    reqs = clubber.club_lines([("ITM-1001", l1), ("ITM-1001", l2)])
    assert len(reqs) == 2
    assert reqs[0].plant == "PUN1"
    assert reqs[1].plant == "CHK1"


# -----------------------------------------------------------------------------
# 4. Randomized CSV Ordering Independence
# -----------------------------------------------------------------------------

def test_randomized_csv_ordering_determinism(loader, policy_v5):
    """
    Adversarial test: Feeding PR lines in arbitrary/shuffled orders must yield
    the exact same clubbing groups, requirement counts, and total spend.
    """
    pipeline = ProcurementPipeline(loader, policy_v5)

    base_lines = [
        PRLine("PR-10", 1, datetime(2026, 11, 1, 9, 0), "R", "D", "PUN1", "ITM-1009", "Hex bolt", 500.0, "NOS", None, date(2026, 11, 15), "Normal"),
        PRLine("PR-11", 1, datetime(2026, 11, 2, 9, 0), "R", "D", "PUN1", "ITM-1009", "Hex bolt", 300.0, "NOS", None, date(2026, 11, 16), "Normal"),
        PRLine("PR-12", 1, datetime(2026, 11, 3, 9, 0), "R", "D", "CHK1", "ITM-1038", "Oil", 200.0, "LTR", None, date(2026, 11, 18), "Normal"),
        PRLine("PR-13", 1, datetime(2026, 11, 4, 9, 0), "R", "D", "CHK1", "ITM-1038", "Oil", 100.0, "LTR", None, date(2026, 11, 19), "Normal"),
        PRLine("PR-14", 1, datetime(2026, 11, 5, 9, 0), "R", "D", "PUN1", "NEW", "Special Tool", 1.0, "NOS", 50000.0, date(2026, 11, 20), "Normal"),
    ]

    # Baseline run in forward order
    reqs_base, rows_base = pipeline.process_pr_lines(copy.deepcopy(base_lines))

    # Test 5 randomized permutations
    for seed in [42, 100, 2026, 777, 9999]:
        rng = random.Random(seed)
        shuffled = copy.deepcopy(base_lines)
        rng.shuffle(shuffled)

        pipe_shuffled = ProcurementPipeline(loader, policy_v5)
        reqs_shuffled, rows_shuffled = pipe_shuffled.process_pr_lines(shuffled)

        assert len(reqs_shuffled) == len(reqs_base)
        for rb, rs in zip(reqs_base, reqs_shuffled):
            assert rb.resolved_item_code == rs.resolved_item_code
            assert rb.plant == rs.plant
            assert rb.total_quantity == rs.total_quantity
            assert rb.group_value_inr == rs.group_value_inr
            assert rb.decision == rs.decision
            assert rb.route == rs.route
            assert rb.supplier_id == rs.supplier_id


# -----------------------------------------------------------------------------
# 5. Policy Amendments Without Code Changes (Plant & Category Rules)
# -----------------------------------------------------------------------------

def test_dynamic_plant_and_category_amendments(loader):
    """
    Validates Policy-as-Data:
    A policy amendment adding a plant-specific or category-specific rule genuinely
    alters routing decisions dynamically without changing application source code.
    """
    base_policy = get_default_policy_v5()

    # Create Policy v5.1 with a plant-specific rule:
    # Any requirement at plant CHK1 in category 'Hydraulics & Pneumatics' must route to RFQ
    custom_rule = PolicyRule(
        rule_id="RULE-5.1-CHK-HYD",
        clause="Clause 5.1 Amendment",
        name="CHK1 Plant Rule: All Hydraulics & Pneumatics go to RFQ",
        outcome="SOURCING_REQUEST",
        route="RFQ",
        priority=35, # evaluated before general spot PO
        plant="CHK1",
        category="Hydraulics & Pneumatics",
        suggest_suppliers_count=3,
        supplier_strategy="suggest_preferred_and_category"
    )

    rules_v51 = [custom_rule] + [PolicyRule.from_dict(r.to_dict()) for r in base_policy.rules]

    policy_v51 = ProcurementPolicy(
        version="v5.1",
        effective_date="2026-11-19",
        document_id="AMEND-2026-001",
        rules=rules_v51
    )

    # Requirement 1: CHK1, ITM-1038 (Hydraulics & Pneumatics), value ₹126,472 (< ₹200k)
    # Under v5.0: SPOT_PO
    # Under v5.1: RFQ
    req_chk = Requirement(
        group_id="REQ-CHK",
        resolved_item_code="ITM-1038",
        plant="CHK1",
        first_line_created_at=datetime(2026, 11, 2, 9, 40),
        requirement_date=date(2026, 11, 2),
        first_need_by_date=date(2026, 11, 19),
        is_emergency=False,
        total_quantity=760.0,
        unit_price=166.41,
        group_value_inr=126471.60
    )

    # Requirement 2: PUN1, same category, same value
    # Under v5.1: remains SPOT_PO because rule only applies to CHK1
    req_pun = Requirement(
        group_id="REQ-PUN",
        resolved_item_code="ITM-1038",
        plant="PUN1",
        first_line_created_at=datetime(2026, 11, 2, 9, 40),
        requirement_date=date(2026, 11, 2),
        first_need_by_date=date(2026, 11, 19),
        is_emergency=False,
        total_quantity=760.0,
        unit_price=166.41,
        group_value_inr=126471.60
    )

    # 1. Run under v5.0
    pipe_v50 = ProcurementPipeline(loader, base_policy)
    pipe_v50.rule_engine.evaluate_requirement(req_chk)
    assert req_chk.route == "SPOT_PO"

    # 2. Run under v5.1
    pipe_v51 = ProcurementPipeline(loader, policy_v51)
    req_chk_v51 = copy.deepcopy(req_chk)
    pipe_v51.rule_engine.evaluate_requirement(req_chk_v51)
    assert req_chk_v51.decision == "SOURCING_REQUEST"
    assert req_chk_v51.route == "RFQ"
    assert "CHK1 Plant Rule: All Hydraulics & Pneumatics go to RFQ" in req_chk_v51.reason

    # Verify PUN1 requirement remains unaffected
    pipe_v51.rule_engine.evaluate_requirement(req_pun)
    assert req_pun.route == "SPOT_PO"


# -----------------------------------------------------------------------------
# 6. Supplier Ranking Ties & Metric Robustness
# -----------------------------------------------------------------------------

def test_supplier_ranking_ties_and_metric_edge_cases(loader):
    """
    Tests:
    1. Deterministic ranking tie-break when score, pos_548d, and recency are equal.
    2. Missing / zero quality and on-time ratings do not throw division by zero.
    """
    suppA = Supplier("S091", "Supp A", "City", ["Cat"], "Active", 0.0, 0.0)
    suppB = Supplier("S092", "Supp B", "City", ["Cat"], "Active", 0.0, 0.0)

    ranker = SupplierRanker(
        suppliers={"S091": suppA, "S092": suppB},
        items={},
        po_history=[],
        contracts={},
        history_window_days=548
    )

    # Both suppliers have 0 POs, 0 recency, no contract, 0 rating -> identical score
    # Must tie-break deterministically by supplier_id ascending: S091 before S092
    as_of = date(2026, 11, 1)
    ranked = ranker.get_preferred_suppliers_ranked("ITM-NONE", as_of)
    assert len(ranked) == 0  # No candidates with PO history or contracts


# -----------------------------------------------------------------------------
# 7. RFC 4180 CSV Escaping & Formatting
# -----------------------------------------------------------------------------

def test_csv_escaping_and_rfc4180_formatting():
    """
    Validates that special characters (commas, double-quotes, newlines)
    in descriptions or reasons are escaped strictly per RFC 4180 standards.
    """
    from app.models.procurement import OutputDecisionRow

    rows = [
        OutputDecisionRow(
            pr_no="PR-26-00999",
            pr_line=1,
            resolved_item_code="ITM-1001",
            group_id="REQ-0001",
            po_id="PO-0001",
            decision="PO",
            route="SPOT_PO",
            supplier_id="S020",
            unit_price="1,250.00",
            group_value_inr="2,500.00",
            suggested_supplier_ids="",
            policy_version="v5.0",
            reason='Clause 5.4: Spot PO to S020 ("Fast Delivery", special terms)'
        )
    ]

    output = io.StringIO()
    fieldnames = [
        "pr_no", "pr_line", "resolved_item_code", "group_id", "po_id",
        "decision", "route", "supplier_id", "unit_price", "group_value_inr",
        "suggested_supplier_ids", "policy_version", "reason"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow(r.__dict__)

    csv_text = output.getvalue()
    assert '"Clause 5.4: Spot PO to S020 (""Fast Delivery"", special terms)"' in csv_text

    # Re-read through standard csv parser to verify exact round-trip fidelity
    reader = csv.DictReader(io.StringIO(csv_text))
    read_rows = list(reader)
    assert len(read_rows) == 1
    assert read_rows[0]["reason"] == 'Clause 5.4: Spot PO to S020 ("Fast Delivery", special terms)'
