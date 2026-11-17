"""
Policy Amendment and Rule Synchronization Regression Suite
Verifies that Web UI and API policy activations synchronize scalar policy thresholds
with their corresponding PolicyRule objects without source-code modifications.

Mandatory Regression Tests:
TEST A: Activate v5.1 with spot_po_limit = ₹300,000 through the API.
        Verify:
        - ProcurementPolicy.spot_po_limit == 300000
        - RULE-5.4.max_value_inr == 300000
        - Active policy store contains v5.1
        - Newly initialized RuleEngine uses ₹300,000
TEST B: Submit a PR worth ~₹250,000 that otherwise qualifies for SPOT_PO.
        Verify:
        - Under v5.0, it follows the original RFQ routing
        - Under v5.1, it follows SPOT_PO routing
TEST C: Restart the backend completely.
        Verify:
        - v5.1 remains active and the amended decision still works
TEST D: Verify v5.0 remains unchanged after activating v5.1.
TEST E: Verify CLI and Web UI produce equivalent decisions for the same input batch and policy.
TEST F: Verify an invalid amendment is rejected without changing the currently active policy.
"""
import io
import json
import csv
import sys
import subprocess
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app, state
from app.config import BASE_DIR, SAMPLE_PR_BATCH_CSV
from app.models.policy import ProcurementPolicy, PolicyRule
from app.models.procurement import PRLine
from app.engine.data_loader import MasterDataLoader, parse_datetime, parse_date
from app.engine.pipeline import ProcurementPipeline
from app.engine.rules import RuleEngine
from app.policy_manager.store import PolicyStore

client = TestClient(app)

def test_regression_test_a_api_activation_synchronizes_rules():
    """
    TEST A: Activate v5.1 with spot_po_limit = ₹300,000 through the API.
    Verify:
    1. ProcurementPolicy.spot_po_limit == 300000
    2. RULE-5.4.max_value_inr == 300000
    3. Active policy store contains v5.1
    4. Newly initialized RuleEngine uses ₹300,000
    """
    res = client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "500000",
        "rfq_limit": "1000000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })
    assert res.status_code == 200, f"Activation failed: {res.text}"
    body = res.json()
    assert body["status"] == "activated"
    assert body["active_version"] == "v5.1"

    # 1. Verify ProcurementPolicy.spot_po_limit == 300000
    active_policy = state.policy_store.get_active_policy()
    assert active_policy.version == "v5.1"
    assert active_policy.spot_po_limit == 300000.0

    # 2. Verify RULE-5.4.max_value_inr == 300000
    rule_5_4 = next((r for r in active_policy.rules if r.rule_id == "RULE-5.4"), None)
    assert rule_5_4 is not None, "RULE-5.4 not found in active policy"
    assert rule_5_4.max_value_inr == 300000.0, f"Expected 300000, got {rule_5_4.max_value_inr}"

    # 3. Verify Active policy store contains v5.1
    assert "v5.1" in state.policy_store.policies
    assert state.policy_store.active_version == "v5.1"

    # 4. Verify Newly initialized RuleEngine uses ₹300,000
    engine = RuleEngine(
        policy=active_policy,
        items=state.loader.items,
        suppliers=state.loader.suppliers,
        po_history=state.loader.po_history,
        contract_manager=state.pipeline.contract_manager,
        supplier_ranker=state.pipeline.supplier_ranker
    )
    engine_rule = next((r for r in engine.policy.rules if r.rule_id == "RULE-5.4"), None)
    assert engine_rule is not None
    assert engine_rule.max_value_inr == 300000.0, f"RuleEngine rule threshold expected 300000, got {engine_rule.max_value_inr}"


def test_regression_test_b_pr_250k_routing_under_v50_and_v51():
    """
    TEST B: Submit a PR worth ~₹250,000 that otherwise qualifies for SPOT_PO.
    Verify:
    1. Under v5.0, it follows the original RFQ routing.
    2. Under v5.1, it follows SPOT_PO routing.
    """
    # Item ITM-1005 (MS angle 50x50x5) has no contract, active purchase history in last 365 days,
    # reference price ₹74.34. Quantity 3,363 -> total ₹250,005.42 (between ₹200,000 and ₹300,000).
    pr_csv = """pr_no,pr_line,created_at,requester,department,plant,item_code,description,quantity,uom,estimated_unit_price,need_by_date,urgency
PR-REG-250K,1,2026-11-10 10:00,Aditya Kumar,Manufacturing,PUN1,ITM-1005,MS angle 50x50x5,3363,MTR,74.34,2026-11-25,Normal
"""
    # Step 1: Ensure v5.0 is active
    client.post("/api/policy/activate", data={"version_name": "v5.0"})
    assert state.policy_store.active_version == "v5.0"
    assert state.policy_store.get_active_policy().spot_po_limit == 200000.0

    # Process under v5.0 -> must route to RFQ
    res_v50 = client.post(
        "/api/process-batch",
        files={"file": ("test_250k.csv", io.BytesIO(pr_csv.encode("utf-8")), "text/csv")}
    )
    assert res_v50.status_code == 200, res_v50.text
    rows_v50 = res_v50.json()["rows"]
    row_v50 = next(r for r in rows_v50 if r["pr_no"] == "PR-REG-250K")
    assert row_v50["decision"] == "SOURCING_REQUEST"
    assert row_v50["route"] == "RFQ"
    assert 200000.0 < float(row_v50["group_value_inr"]) < 300000.0
    assert row_v50["policy_version"] == "v5.0"

    # Step 2: Activate v5.1 with spot_po_limit = 300,000 via API
    res_act = client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "500000",
        "rfq_limit": "1000000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })
    assert res_act.status_code == 200
    assert state.policy_store.active_version == "v5.1"

    # Process under v5.1 -> must route to SPOT_PO!
    res_v51 = client.post(
        "/api/process-batch",
        files={"file": ("test_250k.csv", io.BytesIO(pr_csv.encode("utf-8")), "text/csv")}
    )
    assert res_v51.status_code == 200, res_v51.text
    rows_v51 = res_v51.json()["rows"]
    row_v51 = next(r for r in rows_v51 if r["pr_no"] == "PR-REG-250K")
    assert row_v51["decision"] == "PO"
    assert row_v51["route"] == "SPOT_PO"
    assert row_v51["supplier_id"] == "S003"
    assert 200000.0 < float(row_v51["group_value_inr"]) < 300000.0
    assert row_v51["policy_version"] == "v5.1"


def test_regression_test_c_backend_restart_persistence():
    """
    TEST C: Restart the backend completely.
    Verify v5.1 remains active and the amended decision still works.
    """
    # 1. Activate v5.1 first
    client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "500000",
        "rfq_limit": "1000000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })

    # 2. Simulate complete backend restart by initializing a clean PolicyStore from disk
    restarted_store = PolicyStore()
    assert restarted_store.active_version == "v5.1", f"Expected active v5.1 after restart, got {restarted_store.active_version}"

    restarted_policy = restarted_store.get_active_policy()
    assert restarted_policy.version == "v5.1"
    assert restarted_policy.spot_po_limit == 300000.0

    rule_5_4 = next(r for r in restarted_policy.rules if r.rule_id == "RULE-5.4")
    assert rule_5_4.max_value_inr == 300000.0

    # 3. Verify newly started pipeline evaluates 250k PR to SPOT_PO
    loader = MasterDataLoader()
    loader.load_all()
    pipeline = ProcurementPipeline(loader, restarted_policy)

    pr = PRLine(
        pr_no="PR-RESTART-TEST",
        pr_line=1,
        created_at=parse_datetime("2026-11-10 10:00"),
        requester="Aditya Kumar",
        department="Manufacturing",
        plant="PUN1",
        item_code="ITM-1005",
        description="MS angle 50x50x5",
        quantity=3363.0,
        uom="MTR",
        estimated_unit_price=74.34,
        need_by_date=parse_date("2026-11-25"),
        urgency="Normal"
    )

    reqs, output_rows = pipeline.process_pr_lines([pr])
    assert len(output_rows) == 1
    assert output_rows[0].decision == "PO"
    assert output_rows[0].route == "SPOT_PO"
    assert output_rows[0].supplier_id == "S003"
    assert 200000.0 < float(output_rows[0].group_value_inr) < 300000.0
    assert output_rows[0].policy_version == "v5.1"


def test_regression_test_d_v50_remains_unchanged_after_activating_v51():
    """
    TEST D: Verify v5.0 remains unchanged after activating v5.1.
    """
    # Activate v5.1
    client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "500000",
        "rfq_limit": "1000000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })

    # Check v5.0 in memory
    v50_memory = state.policy_store.policies.get("v5.0")
    assert v50_memory is not None
    assert v50_memory.spot_po_limit == 200000.0
    rule_5_4_v50 = next(r for r in v50_memory.rules if r.rule_id == "RULE-5.4")
    assert rule_5_4_v50.max_value_inr == 200000.0

    # Check v5.0 persisted file on disk
    v50_file = state.policy_store.storage_dir / "v5.0.json"
    assert v50_file.exists()
    with open(v50_file, "r", encoding="utf-8") as f:
        disk_json = json.load(f)
    assert disk_json["version"] == "v5.0"
    assert disk_json["spot_po_limit"] == 200000.0
    rule_disk = next(r for r in disk_json["rules"] if r["rule_id"] == "RULE-5.4")
    assert rule_disk["max_value_inr"] == 200000.0


def test_regression_test_e_cli_and_web_ui_equivalence(tmp_path):
    """
    TEST E: Verify CLI and Web UI produce equivalent decisions for the same input batch and policy.
    """
    # 1. Activate v5.1 via API
    client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "500000",
        "rfq_limit": "1000000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })

    # 2. Process batch via Web UI
    with open(SAMPLE_PR_BATCH_CSV, "rb") as f:
        res_web = client.post("/api/process-batch", files={"file": ("sample.csv", f, "text/csv")})
    assert res_web.status_code == 200
    web_rows = res_web.json()["rows"]

    # 3. Process batch via CLI runner
    cli_out = tmp_path / "cli_output.csv"
    cmd = [
        sys.executable,
        str(BASE_DIR / "scripts" / "run_batch.py"),
        "--input", str(SAMPLE_PR_BATCH_CSV),
        "--output", str(cli_out),
        "--policy", "v5.1"
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    assert proc.returncode == 0, f"CLI runner failed: {proc.stderr}"
    assert cli_out.exists()

    with open(cli_out, "r", encoding="utf-8") as f:
        cli_rows = list(csv.DictReader(f))

    assert len(web_rows) == len(cli_rows), f"Row count mismatch: Web={len(web_rows)}, CLI={len(cli_rows)}"

    for i, (w, c) in enumerate(zip(web_rows, cli_rows)):
        assert w["pr_no"] == c["pr_no"], f"Row {i} PR no mismatch: {w['pr_no']} != {c['pr_no']}"
        assert w["pr_line"] == int(c["pr_line"]), f"Row {i} line mismatch"
        assert w["decision"] == c["decision"], f"Row {i} decision mismatch for {w['pr_no']}: {w['decision']} != {c['decision']}"
        assert w["route"] == c["route"], f"Row {i} route mismatch for {w['pr_no']}: {w['route']} != {c['route']}"
        assert (w["supplier_id"] or "") == (c["supplier_id"] or ""), f"Row {i} supplier mismatch"
        assert w["policy_version"] == c["policy_version"], f"Row {i} version mismatch"


def test_regression_test_f_invalid_amendment_rejected_without_changing_active_policy():
    """
    TEST F: Verify an invalid amendment is rejected without changing the currently active policy.
    """
    # 1. Start with v5.0 active
    client.post("/api/policy/activate", data={"version_name": "v5.0"})
    assert state.policy_store.active_version == "v5.0"

    # Attempt A: Negative spot limit
    res_neg = client.post("/api/policy/activate", data={
        "spot_po_limit": "-50000",
        "version_name": "v_invalid_neg"
    })
    assert res_neg.status_code == 400
    assert "positive number" in res_neg.json()["detail"].lower()
    # Verify active policy was NOT modified
    assert state.policy_store.active_version == "v5.0"
    assert state.policy_store.get_active_policy().version == "v5.0"

    # Attempt B: spot_po_limit > rfq_limit
    res_inconsistent = client.post("/api/policy/activate", data={
        "spot_po_limit": "1500000",
        "rfq_limit": "1000000",
        "version_name": "v_invalid_inconsistent"
    })
    assert res_inconsistent.status_code == 400
    assert "cannot exceed rfq limit" in res_inconsistent.json()["detail"].lower()
    assert state.policy_store.active_version == "v5.0"

    # Attempt C: Blank version name
    res_blank = client.post("/api/policy/activate", data={
        "version_name": "   ",
        "spot_po_limit": "300000"
    })
    assert res_blank.status_code == 400
    assert "blank" in res_blank.json()["detail"].lower()
    assert state.policy_store.active_version == "v5.0"

    # Attempt D: In preview endpoint (amend)
    res_amend_invalid = client.post("/api/policy/amend", data={
        "spot_po_limit": "2000000",
        "rfq_limit": "1000000",
        "new_version_name": "v_preview_invalid"
    })
    assert res_amend_invalid.status_code == 400
    assert state.policy_store.active_version == "v5.0"

    # Verify on-disk active pointer is untouched
    with open(state.policy_store.active_file, "r", encoding="utf-8") as f:
        assert f.read().strip() == "v5.0"
