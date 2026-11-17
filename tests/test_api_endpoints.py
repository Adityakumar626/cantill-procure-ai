"""
Unit and Integration Tests for Cantill ProcureAI FastAPI Application Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app, state

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["active_policy"] == "v5.0"
    assert data["items_count"] == 73
    assert data["contracts_count"] == 12  # 10 register + 2 PDF contracts

def test_contracts_endpoint():
    response = client.get("/api/contracts")
    assert response.status_code == 200
    data = response.json()
    assert "contracts" in data
    assert len(data["contracts"]) == 12
    # Verify PDF ingested contracts are present
    contract_ids = [c["contract_id"] for c in data["contracts"]]
    assert "RC-2026-031" in contract_ids
    assert "RC-2026-033" in contract_ids

def test_preferred_suppliers_endpoints():
    # Test JSON summary
    res_json = client.get("/api/suppliers/preferred?as_of_date=2026-11-01")
    assert res_json.status_code == 200
    data = res_json.json()
    assert "summary" in data
    assert "ITM-1048" in data["summary"]
    # Check ITM-1048 rankings match worked example: S029 first, S030 second
    assert data["summary"]["ITM-1048"][0]["supplier_id"] == "S029"

    # Test CSV export
    res_csv = client.get("/api/suppliers/preferred?format=csv&as_of_date=2026-11-01")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    csv_text = res_csv.text
    assert "item_code,rank,supplier_id,reference_price" in csv_text
    assert "ITM-1048,1,S029" in csv_text

def test_process_batch_and_export():
    # Process default sample batch
    res = client.post("/api/process-batch")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["total_pr_lines"] == 186
    assert data["summary"]["total_requirements"] == 151
    assert data["summary"]["direct_pos"] == 96
    assert data["summary"]["sourcing_requests"] == 55

    # Test CSV export
    res_exp = client.get("/api/export/batch?filename=aditya_kumar__run1.csv")
    assert res_exp.status_code == 200
    assert "text/csv" in res_exp.headers["content-type"]
    lines = res_exp.text.strip().split("\n")
    assert len(lines) == 187  # 1 header + 186 data rows
    assert "pr_no,pr_line,resolved_item_code" in lines[0]

def test_buyer_override_endpoint():
    # Process batch first so state.last_processed_rows is populated
    client.post("/api/process-batch")
    
    # Perform override on group REQ-0001
    res = client.post("/api/override", data={
        "group_id": "REQ-0001",
        "new_route": "RFQ",
        "comment": "Testing buyer manual override for RFP reduction",
        "buyer_name": "Aditya Kumar"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["new_route"] == "RFQ"
    assert data["updated_rows"] > 0

    # Re-fetch exported batch and verify override comment
    res_exp = client.get("/api/export/batch")
    assert "BUYER OVERRIDE by Aditya Kumar" in res_exp.text

def test_policy_amendment_and_activation():
    # 1. Preview amendment
    res_preview = client.post("/api/policy/amend", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "800000",
        "new_version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })
    assert res_preview.status_code == 200
    preview_data = res_preview.json()
    assert preview_data["status"] == "preview"
    assert any("Spot PO Limit" in ch for ch in preview_data["changes"])

    # 2. Activate amendment
    res_activate = client.post("/api/policy/activate", data={
        "spot_po_limit": "300000",
        "emergency_po_limit": "800000",
        "version_name": "v5.1",
        "effective_date_str": "2026-11-19"
    })
    assert res_activate.status_code == 200
    assert state.policy_store.active_version == "v5.1"

    # Reset back to v5.0
    state.policy_store.activate_version("v5.0")
    assert state.policy_store.active_version == "v5.0"

def test_chat_intake_assistant():
    # User asks for nitrile gloves
    res = client.post("/api/chat/intake", data={
        "message": "need 200 nitrile gloves for Chakan plant by next Monday",
        "session_id": "pytest_test_session"
    })
    assert res.status_code == 200
    data = res.json()
    assert "ITM-1048" in data["assistant_reply"] or (data["draft_pr"] and data["draft_pr"]["resolved_item_code"] == "ITM-1048")
    assert data["draft_pr"]["plant"] == "CHK1"
    assert data["draft_pr"]["quantity"] == 200

def test_spa_page_routes_and_reload_persistence():
    """Verify that every dedicated page route returns 200 OK HTML for browser reloads."""
    routes = ["/", "/workspace", "/chat", "/policy", "/suppliers", "/contracts", "/batch"]
    for r in routes:
        res = client.get(r)
        assert res.status_code == 200
        assert "html" in res.headers.get("content-type", "").lower()
        assert "<div id=\"root\">" in res.text or "html" in res.text.lower()

def test_chat_confirm_and_intake_persistence():
    """Verify that confirming a chat PR persists it and routes it into the Buyer Workspace."""
    res = client.post("/api/chat/confirm", data={
        "description": "Nitrile coated gloves for Chakan line 1",
        "quantity": "500",
        "uom": "NOS",
        "plant": "CHK1",
        "need_by_date": "2026-11-20",
        "urgency": "Normal",
        "item_code": "ITM-1048",
        "requester": "Aditya Kumar",
        "department": "Safety & Operations"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "PR-26-CHAT" in data["pr_no"]

    # Re-run batch and assert chat PR is ingested and clubbed/evaluated
    res_batch = client.post("/api/process-batch")
    assert res_batch.status_code == 200
    batch_data = res_batch.json()
    assert batch_data["summary"]["total_pr_lines"] == 187  # 186 base + 1 chat PR

def test_buyer_approve_endpoint():
    """Verify buyer approval workflow per Section 3.6."""
    res_app = client.post("/api/approve", data={
        "group_id": "REQ-0001",
        "buyer_name": "Aditya Kumar"
    })
    assert res_app.status_code == 200
    app_data = res_app.json()
    assert app_data["status"] == "success"
    assert app_data["group_id"] == "REQ-0001"

    # Re-process batch and check approval status
    res_batch = client.post("/api/process-batch")
    batch_data = res_batch.json()
    req1 = next(r for r in batch_data["requirements"] if r["group_id"] == "REQ-0001")
    assert req1["is_approved"] is True
    assert req1["approved_by"] == "Aditya Kumar"

def test_manual_contract_registration():
    """Verify manual contract registration into live ceiling engine."""
    res = client.post("/api/contracts/manual", data={
        "contract_id": "RC-MANUAL-001",
        "supplier_id": "S001",
        "start_date": "2026-11-01",
        "end_date": "2027-10-31",
        "value_cap": "500000"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

    # Verify contract appears in /api/contracts
    res_list = client.get("/api/contracts")
    contracts = res_list.json()["contracts"]
    assert any(c["contract_id"] == "RC-MANUAL-001" for c in contracts)

def test_upload_policy_document():
    """Verify policy upload endpoint parses JSON and registers policy."""
    import json
    from app.models.policy import get_default_policy_v5
    pol = get_default_policy_v5()
    pol.version = "v5.99-test"
    pol_json = json.dumps(pol.to_dict()).encode("utf-8")
    res = client.post(
        "/api/policy/upload",
        files={"file": ("policy_v5.99.json", pol_json, "application/json")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "uploaded"
    assert data["version"] == "v5.99-test"
