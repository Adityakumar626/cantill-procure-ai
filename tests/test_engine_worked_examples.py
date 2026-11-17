"""
Phase 2 Test Suite: Verifies all 14 Ground-Truth Worked Examples from Worked_Examples.pdf
"""
import pytest
from datetime import datetime, date
from app.models.procurement import PRLine
from app.engine.data_loader import MasterDataLoader
from app.engine.pipeline import ProcurementPipeline

@pytest.fixture
def pipeline():
    loader = MasterDataLoader()
    loader.load_all()
    return ProcurementPipeline(loader)

def test_example_1_contract_po(pipeline):
    # Example 1: Contract PO
    line = PRLine(
        pr_no="PR-26-00019", pr_line=1,
        created_at=datetime(2026, 11, 4, 12, 40),
        requester="R. Sharma", department="Production", plant="PUN1",
        item_code="ITM-1002", description="MS sheet 3mm 1250x2500",
        quantity=15.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 15), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    assert len(reqs) == 1
    req = reqs[0]
    assert req.decision == "PO"
    assert req.route == "CONTRACT_PO"
    assert req.supplier_id == "S001"
    assert round(req.unit_price) == 9169
    assert round(req.group_value_inr) == 137531

def test_example_2_contract_from_pdf(pipeline):
    # Example 2: Contract that exists only as a PDF (RC-2026-031)
    line = PRLine(
        pr_no="PR-26-00045", pr_line=1,
        created_at=datetime(2026, 11, 18, 10, 50),
        requester="K. Verma", department="Maintenance", plant="CHK1",
        item_code="ITM-1037", description="Solenoid valve 5/2 1/4 inch",
        quantity=11.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 12, 13), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "PO"
    assert req.route == "CONTRACT_PO"
    assert req.supplier_id == "S021"
    assert round(req.unit_price) == 2439
    assert round(req.group_value_inr) == 26829

def test_example_3_contract_ceiling_nearly_used_up(pipeline):
    # Example 3: Contract ceiling nearly used up (RC-2026-002)
    l1 = PRLine(
        pr_no="PR-26-00004", pr_line=1,
        created_at=datetime(2026, 11, 2, 15, 15),
        requester="A. Kulkarni", department="Stores", plant="CHK1",
        item_code=None, description="brg 6308 ZZ for maintenance",
        quantity=210.0, uom="NOS", estimated_unit_price=715.25,
        need_by_date=date(2026, 11, 26), urgency="Normal"
    )
    l2 = PRLine(
        pr_no="PR-26-00026", pr_line=1,
        created_at=datetime(2026, 11, 2, 15, 20),
        requester="A. Kulkarni", department="Stores", plant="CHK1",
        item_code="ITM-1022", description="Ball bearing 6308-ZZ",
        quantity=170.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 23), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([l1, l2])
    assert len(reqs) == 1
    req = reqs[0]
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "RFQ"
    assert round(req.group_value_inr) == 220256
    assert req.suggested_supplier_ids[:3] == ["S014", "S013", "S016"]

def test_example_5_split_prs_clubbed(pipeline):
    # Example 5: Split PRs clubbed into one requirement
    l1 = PRLine(
        pr_no="PR-26-00146", pr_line=1,
        created_at=datetime(2026, 11, 2, 9, 40),
        requester="M. Shinde", department="Maintenance", plant="CHK1",
        item_code="ITM-1038", description="Hydraulic oil HLP 68",
        quantity=270.0, uom="LTR", estimated_unit_price=None,
        need_by_date=date(2026, 11, 19), urgency="Normal"
    )
    l2 = PRLine(
        pr_no="PR-26-00144", pr_line=1,
        created_at=datetime(2026, 11, 3, 9, 30),
        requester="M. Shinde", department="Maintenance", plant="CHK1",
        item_code="ITM-1038", description="Hydraulic oil HLP 68",
        quantity=190.0, uom="LTR", estimated_unit_price=None,
        need_by_date=date(2026, 11, 15), urgency="Normal"
    )
    l3 = PRLine(
        pr_no="PR-26-00145", pr_line=1,
        created_at=datetime(2026, 11, 5, 8, 40),
        requester="M. Shinde", department="Maintenance", plant="CHK1",
        item_code="ITM-1038", description="Hydraulic oil HLP 68",
        quantity=300.0, uom="LTR", estimated_unit_price=None,
        need_by_date=date(2026, 11, 21), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([l1, l2, l3])
    assert len(reqs) == 1
    req = reqs[0]
    assert req.decision == "PO"
    assert req.route == "SPOT_PO"
    assert req.supplier_id == "S024"
    assert round(req.unit_price) == 166
    assert round(req.group_value_inr) == 126472

def test_example_7_free_text_item_matched(pipeline):
    # Example 7: Free-text item matched
    line = PRLine(
        pr_no="PR-26-00088", pr_line=1,
        created_at=datetime(2026, 11, 6, 15, 0),
        requester="V. Rao", department="Stores", plant="PUN1",
        item_code=None, description="hyd hose 1/2 inch 2 wire",
        quantity=250.0, uom="MTR", estimated_unit_price=None,
        need_by_date=date(2026, 11, 28), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.resolved_item_code == "ITM-1035"
    assert req.decision == "PO"
    assert req.route == "SPOT_PO"
    assert req.supplier_id == "S023"
    assert round(req.unit_price) == 392
    assert round(req.group_value_inr) == 97955

def test_example_8_emergency_po(pipeline):
    # Example 8: Emergency PO
    line = PRLine(
        pr_no="PR-26-00059", pr_line=1,
        created_at=datetime(2026, 11, 6, 18, 50),
        requester="S. More", department="Production", plant="PUN1",
        item_code="ITM-1026", description="Gearbox oil seal 45x62x8",
        quantity=2380.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 25), urgency="Emergency"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "PO"
    assert req.route == "EMERGENCY_PO"
    assert req.supplier_id == "S014"
    assert round(req.unit_price) == 106
    assert round(req.group_value_inr) == 253184

def test_example_9_rfq_above_po_limit(pipeline):
    # Example 9: RFQ above PO limit
    line = PRLine(
        pr_no="PR-26-00089", pr_line=1,
        created_at=datetime(2026, 11, 5, 18, 40),
        requester="D. Mehta", department="Quality", plant="PUN1",
        item_code=None, description="CMM calibration service",
        quantity=5.0, uom="JOB", estimated_unit_price=None,
        need_by_date=date(2026, 11, 30), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "RFQ"
    assert round(req.group_value_inr) == 336562
    assert req.suggested_supplier_ids[:3] == ["S043", "S044", "S042"]

def test_example_10_rfq_small_never_bought(pipeline):
    # Example 10: RFQ small but never bought
    line = PRLine(
        pr_no="PR-26-00050", pr_line=1,
        created_at=datetime(2026, 11, 2, 10, 20),
        requester="T. Deshmukh", department="Stores", plant="PUN1",
        item_code="ITM-1006", description="Aluminium plate 6061 10mm",
        quantity=220.0, uom="KG", estimated_unit_price=None,
        need_by_date=date(2026, 11, 15), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "RFQ"
    assert round(req.group_value_inr) == 80300
    assert req.suggested_supplier_ids[:3] == ["S003", "S002", "S005"]

def test_example_11_rfp(pipeline):
    # Example 11: RFP
    line = PRLine(
        pr_no="PR-26-00100", pr_line=1,
        created_at=datetime(2026, 11, 4, 13, 5),
        requester="A. Thorat", department="Production", plant="CHK1",
        item_code="ITM-1034", description="Encoder for CNC spindle (Vertex)",
        quantity=50.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 24), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "RFP"
    assert round(req.group_value_inr) == 2070780
    assert req.suggested_supplier_ids[:4] == ["S020", "S017", "S019", "S018"]

def test_example_12_capex(pipeline):
    # Example 12: Capex
    line = PRLine(
        pr_no="PR-26-00047", pr_line=1,
        created_at=datetime(2026, 11, 3, 14, 0),
        requester="P. Pawar", department="Projects", plant="PUN1",
        item_code=None, description="eot crane 5 ton",
        quantity=4.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 12, 1), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "CAPEX_SOURCING"
    assert round(req.group_value_inr) == 6036704
    assert req.suggested_supplier_ids[:5] == ["S045", "S047", "S020", "S048", "S046"]

def test_example_13_new_item(pipeline):
    # Example 13: New item
    line = PRLine(
        pr_no="PR-26-00170", pr_line=1,
        created_at=datetime(2026, 11, 5, 10, 40),
        requester="H. Kadam", department="Admin", plant="PUN1",
        item_code=None, description="Drinking water purifier 50 LPH",
        quantity=1.0, uom="NOS", estimated_unit_price=141100.0,
        need_by_date=date(2026, 11, 13), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([line])
    req = reqs[0]
    assert req.resolved_item_code == "NEW"
    assert req.decision == "SOURCING_REQUEST"
    assert req.route == "NEW_ITEM_SOURCING"
    assert round(req.group_value_inr) == 141100
    assert len(req.suggested_supplier_ids) == 0


def test_example_4_two_contracts_lowest_rate_with_room(pipeline):
    # Example 4: Two contracts for same item (RC-2026-015 ceiling full -> RC-2026-013 used)
    l1 = PRLine(
        pr_no="PR-26-00034", pr_line=1,
        created_at=datetime(2026, 11, 2, 14, 5),
        requester="P. Shinde", department="Production", plant="PUN1",
        item_code="ITM-1009", description="Hex bolt M10x40 GR 8.8",
        quantity=3920.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 25), urgency="Normal"
    )
    l2 = PRLine(
        pr_no="PR-26-00032", pr_line=1,
        created_at=datetime(2026, 11, 9, 18, 10),
        requester="P. Shinde", department="Production", plant="PUN1",
        item_code="ITM-1009", description="Hex bolt M10x40 GR 8.8",
        quantity=690.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2026, 11, 29), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([l1, l2])
    assert len(reqs) == 1
    req = reqs[0]
    assert req.decision == "PO"
    assert req.route == "CONTRACT_PO"
    assert req.supplier_id == "S007"
    assert round(req.unit_price) == 7
    assert round(req.group_value_inr) == 32547

def test_example_6_same_item_different_plants_not_clubbed(pipeline):
    # Example 6: Same item, but different plants -> not clubbed
    l1 = PRLine(
        pr_no="PR-26-00106", pr_line=1,
        created_at=datetime(2026, 11, 2, 12, 0),
        requester="R. Jagtap", department="Stores", plant="PUN1",
        item_code="ITM-1044", description="VCI bag 600x900",
        quantity=7370.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2027, 2, 19), urgency="Normal"
    )
    l2 = PRLine(
        pr_no="PR-26-00103", pr_line=1,
        created_at=datetime(2026, 11, 5, 8, 50),
        requester="S. Gaikwad", department="Stores", plant="CHK1",
        item_code=None, description="vci bag 600x900",
        quantity=6480.0, uom="NOS", estimated_unit_price=None,
        need_by_date=date(2027, 3, 4), urgency="Normal"
    )
    reqs, rows = pipeline.process_pr_lines([l1, l2])
    # Must form 2 separate requirements
    assert len(reqs) == 2
    for r in reqs:
        assert r.decision == "PO"
        assert r.route == "SPOT_PO"
        assert r.supplier_id == "S027"
        assert round(r.unit_price) == 22

def test_example_14_po_consolidation(pipeline):
    """
    Worked Example 14: Several requirements on one PO.
    Lines PR-26-00034/1, PR-26-00032/1, PR-26-00031/1, PR-26-00035/1.
    Requirements for same supplier (S007), plant (PUN1), route (CONTRACT_PO),
    raised within 24 hours of first requirement on that PO, are placed as one PO with several lines.
    """
    l34 = PRLine(
        pr_no="PR-26-00034", pr_line=1, created_at=datetime(2026, 11, 2, 14, 5),
        requester="R1", department="D1", plant="PUN1", item_code="ITM-1009",
        description="Hex bolt M10x40 GR 8.8", quantity=3920.0, uom="NOS",
        estimated_unit_price=None, need_by_date=date(2026, 11, 25), urgency="Normal"
    )
    l31 = PRLine(
        pr_no="PR-26-00031", pr_line=1, created_at=datetime(2026, 11, 3, 10, 30),
        requester="R2", department="D2", plant="PUN1", item_code="ITM-1009",
        description="Hex bolt M10x40 GR 8.8", quantity=1140.0, uom="NOS",
        estimated_unit_price=None, need_by_date=date(2026, 11, 12), urgency="Normal"
    )
    l35 = PRLine(
        pr_no="PR-26-00035", pr_line=1, created_at=datetime(2026, 11, 8, 10, 5),
        requester="R3", department="D3", plant="PUN1", item_code="ITM-1009",
        description="Hex bolt M10x40 GR 8.8", quantity=2150.0, uom="NOS",
        estimated_unit_price=None, need_by_date=date(2026, 11, 17), urgency="Normal"
    )
    l32 = PRLine(
        pr_no="PR-26-00032", pr_line=1, created_at=datetime(2026, 11, 9, 18, 10),
        requester="R4", department="D4", plant="PUN1", item_code="ITM-1009",
        description="Hex bolt M10x40 GR 8.8", quantity=690.0, uom="NOS",
        estimated_unit_price=None, need_by_date=date(2026, 11, 29), urgency="Normal"
    )

    reqs, rows = pipeline.process_pr_lines([l34, l31, l35, l32])
    # PR-34 and PR-32 club together (REQ 1: need-by 11-25 and 11-29 are 4 days apart <= 7)
    # PR-31 and PR-35 club together (REQ 2: need-by 11-12 and 11-17 are 5 days apart <= 7)
    assert len(reqs) == 2
    for r in reqs:
        assert r.decision == "PO"
        assert r.route == "CONTRACT_PO"
        assert r.supplier_id == "S007"
        assert round(r.unit_price, 2) == 7.06
    
    # Both requirements must share the exact same PO number (PO consolidation)
    assert reqs[0].po_id != ""
    assert reqs[0].po_id == reqs[1].po_id

def test_preferred_supplier_rankings_page_5(pipeline):
    # Test preferred supplier rankings from Page 5 of Worked Examples as of 2026-11-01
    ranker = pipeline.supplier_ranker
    as_of = date(2026, 11, 1)

    # 1. ITM-1048: Rank 1 S029, Rank 2 S030, S031 excluded (Inactive)
    r_1048 = ranker.get_preferred_suppliers_ranked("ITM-1048", as_of)
    assert len(r_1048) == 2
    assert r_1048[0]["supplier_id"] == "S029"
    assert r_1048[1]["supplier_id"] == "S030"

    # 2. ITM-1036: Rank 1 S023, Rank 2 S022, Rank 3 S024
    r_1036 = ranker.get_preferred_suppliers_ranked("ITM-1036", as_of)
    assert len(r_1036) == 3
    assert r_1036[0]["supplier_id"] == "S023"
    assert r_1036[1]["supplier_id"] == "S022"
    assert r_1036[2]["supplier_id"] == "S024"

    # 3. ITM-1016: Rank 1 S009, Rank 2 S010
    r_1016 = ranker.get_preferred_suppliers_ranked("ITM-1016", as_of)
    assert len(r_1016) == 2
    assert r_1016[0]["supplier_id"] == "S009"
    assert r_1016[1]["supplier_id"] == "S010"
