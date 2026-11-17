"""
Cantill ProcureAI FastAPI Application Backend
Provides REST endpoints for Batch Processing, Chat Intake, Policy-as-Data Versioning, and Exports.
"""
import os
import csv
import io
from pathlib import Path
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Response, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import SAMPLE_PR_BATCH_CSV, ACTIVE_POLICY_VERSION, GEMINI_API_KEY, GEMINI_MODEL
from app.models.procurement import PRLine, OutputDecisionRow, Contract, ContractLine
from app.models.policy import ProcurementPolicy, PolicyRule, synchronize_policy_amendment, validate_policy
from app.engine.data_loader import MasterDataLoader, parse_datetime, parse_date
from app.engine.pipeline import ProcurementPipeline
from app.policy_manager.store import PolicyStore
from app.assistant.chat import ChatIntakeAssistant
from app.storage_manager import storage_manager

app = FastAPI(
    title="Cantill ProcureAI",
    description="Policy-Driven PR-to-PO Procurement Intelligence Engine for Corvo Engineering",
    version="1.0.0"
)

ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "")

def verify_admin_access(x_admin_key: Optional[str] = None):
    if ADMIN_API_KEY and x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing x-admin-key header.")

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost:8000,http://127.0.0.1:8000,http://127.0.0.1:5173,https://cantill-procure-ai.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[orig.strip() for orig in ALLOWED_ORIGINS if orig.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global State Container
class AppState:
    def __init__(self):
        self.loader = MasterDataLoader()
        self.loader.load_all()
        self.policy_store = PolicyStore()
        self.pipeline = ProcurementPipeline(self.loader, self.policy_store.get_active_policy())
        self.chat_assistant = ChatIntakeAssistant(self.pipeline.matcher, self.loader.items)
        self.storage = storage_manager
        self.last_processed_rows: List[OutputDecisionRow] = []

state = AppState()

# Mount Static Assets & React Frontend Build
REACT_DIST = Path("frontend/dist")
if REACT_DIST.exists():
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

app.mount("/static", StaticFiles(directory="app/static"), name="static")

def get_spa_html() -> str:
    if (REACT_DIST / "index.html").exists():
        with open(REACT_DIST / "index.html", "r", encoding="utf-8") as f:
            return f.read()
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/", response_class=HTMLResponse)
@app.head("/", response_class=HTMLResponse)
@app.get("/workspace", response_class=HTMLResponse)
@app.get("/chat", response_class=HTMLResponse)
@app.get("/policy", response_class=HTMLResponse)
@app.get("/suppliers", response_class=HTMLResponse)
@app.get("/contracts", response_class=HTMLResponse)
@app.get("/batch", response_class=HTMLResponse)
async def serve_spa_page():
    return get_spa_html()

@app.get("/health")
@app.head("/health")
async def health_check():
    has_gemini = bool(os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY)
    items_cnt = len(state.loader.items)
    return {
        "status": "online",
        "active_policy": state.policy_store.active_version,
        "items_count": items_cnt,
        "contracts_count": len(state.loader.contracts),
        "suppliers_count": len(state.loader.suppliers),
        "master_data_status": "loaded" if items_cnt > 0 else "empty_or_uninitialized",
        "llm_mode": "gemini_2.0_flash" if has_gemini else "offline_deterministic"
    }

@app.post("/api/admin/initialize-demo-data")
async def initialize_demo_data(x_admin_key: Optional[str] = Header(None)):
    verify_admin_access(x_admin_key)
    state.loader.load_synthetic_demo_data()
    state.pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())
    return {
        "status": "success",
        "message": "Synthetic demo master data loaded successfully.",
        "items_count": len(state.loader.items),
        "suppliers_count": len(state.loader.suppliers),
        "contracts_count": len(state.loader.contracts)
    }

# --- Batch Processing Endpoints ---

def parse_pr_csv(content: str) -> List[PRLine]:
    """Parse CSV text into PRLine objects."""
    reader = csv.DictReader(io.StringIO(content))
    pr_lines = []
    for row in reader:
        est_price = float(row["estimated_unit_price"]) if row.get("estimated_unit_price") and row["estimated_unit_price"].strip() else None
        item_code = row["item_code"].strip() if row.get("item_code") and row["item_code"].strip() else None
        pr_lines.append(PRLine(
            pr_no=row["pr_no"].strip(),
            pr_line=int(row["pr_line"]),
            created_at=parse_datetime(row["created_at"]),
            requester=row.get("requester", "Requester").strip(),
            department=row.get("department", "General").strip(),
            plant=row["plant"].strip(),
            item_code=item_code,
            description=row["description"].strip(),
            quantity=float(row["quantity"]),
            uom=row["uom"].strip(),
            estimated_unit_price=est_price,
            need_by_date=parse_date(row["need_by_date"]),
            urgency=row.get("urgency", "Normal").strip()
        ))
    return pr_lines

@app.post("/api/process-batch")
async def process_batch(file: Optional[UploadFile] = File(None)):
    """
    Task Kit Section 3.7:
    POST /api/process-batch takes a PR batch CSV and returns the decisions.
    """
    if file:
        content = (await file.read()).decode("utf-8")
    else:
        # Fallback to sample batch or synthetic demo batch
        content = ""
        if SAMPLE_PR_BATCH_CSV.exists():
            with open(SAMPLE_PR_BATCH_CSV, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            demo_sample = Path(__file__).resolve().parent / "demo_data" / "pr_batches" / "sample_pr_batch.csv"
            if demo_sample.exists():
                with open(demo_sample, "r", encoding="utf-8") as f:
                    content = f.read()

    # If neither file was uploaded nor sample batch found, check chat PRs
    if not content.strip() and not storage_manager.load_chat_prs():
        return {
            "summary": {
                "total_pr_lines": 0,
                "total_requirements": 0,
                "direct_pos": 0,
                "sourcing_requests": 0,
                "total_spend_inr": 0.0,
                "approved_count": 0,
                "active_policy": state.policy_store.active_version,
            },
            "requirements": [],
            "rows": []
        }

    pr_lines = parse_pr_csv(content) if content.strip() else []

    # Ingest any confirmed chat requisitions from persistent storage
    chat_prs = storage_manager.load_chat_prs()
    for cp in chat_prs:
        pr_lines.append(PRLine(
            pr_no=cp["pr_no"],
            pr_line=int(cp.get("pr_line", 1)),
            created_at=parse_datetime(cp["created_at"]),
            requester=cp.get("requester", "Chat Requester").strip(),
            department=cp.get("department", "Manufacturing").strip(),
            plant=cp["plant"].strip(),
            item_code=cp.get("item_code", "").strip() or None,
            description=cp["description"].strip(),
            quantity=float(cp["quantity"]),
            uom=cp.get("uom", "NOS").strip(),
            estimated_unit_price=float(cp["estimated_unit_price"]) if cp.get("estimated_unit_price") else None,
            need_by_date=parse_date(cp["need_by_date"]),
            urgency=cp.get("urgency", "Normal").strip()
        ))

    # Re-initialize pipeline with active policy and fresh baseline contracts
    state.loader.load_contracts()
    state.loader.augment_pdf_contracts()

    # Load custom registered contracts
    custom_contracts = storage_manager.load_custom_contracts()
    for cc in custom_contracts:
        lines_dict = {}
        for l in cc.get("lines", []):
            lines_dict[l["item_code"]] = ContractLine(
                contract_id=cc["contract_id"],
                item_code=l["item_code"],
                description=l.get("description", ""),
                uom=l.get("uom", "NOS"),
                rate=float(l["rate"])
            )
        contract_obj = Contract(
            contract_id=cc["contract_id"],
            supplier_id=cc["supplier_id"],
            supplier_name=cc.get("supplier_name", cc["supplier_id"]),
            start_date=parse_date(cc["start_date"]),
            end_date=parse_date(cc["end_date"]),
            value_cap=float(cc["value_cap"]),
            consumed_value=float(cc.get("consumed_value", 0.0)),
            lines=lines_dict
        )
        state.loader.contracts[contract_obj.contract_id] = contract_obj

    pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())

    reqs, output_rows = pipeline.process_pr_lines(pr_lines)

    # Re-apply persistent buyer overrides and approvals (Clause 8.1 compliance)
    overrides = storage_manager.load_overrides()
    approvals = storage_manager.load_approvals()

    for r in reqs:
        if r.group_id in overrides:
            ov = overrides[r.group_id]
            r.route = ov["new_route"]
            r.decision = ov["new_decision"]
            r.reason = f"[BUYER OVERRIDE by {ov['buyer_name']} at {ov['timestamp']}]: {ov['comment']} (Original: {r.reason})"
            r.is_overridden = True
            r.override_comment = ov["comment"]
            r.override_by = ov["buyer_name"]
            r.override_at = ov["timestamp"]
        else:
            r.is_overridden = False

        if r.group_id in approvals or "ALL" in approvals:
            ap = approvals.get(r.group_id, approvals.get("ALL", {}))
            r.is_approved = True
            r.approved_by = ap.get("buyer_name", "Aditya Kumar")
            r.approved_at = ap.get("timestamp", "")
        else:
            r.is_approved = False
            r.approved_by = None
            r.approved_at = None

    for row in output_rows:
        if row.group_id in overrides:
            ov = overrides[row.group_id]
            row.route = ov["new_route"]
            row.decision = ov["new_decision"]
            row.reason = f"[BUYER OVERRIDE by {ov['buyer_name']} at {ov['timestamp']}]: {ov['comment']} (Original: {row.reason})"

    state.last_processed_rows = output_rows

    # Calculate summary metrics
    summary = {
        "total_pr_lines": len(pr_lines),
        "total_requirements": len(reqs),
        "direct_pos": sum(1 for r in reqs if r.decision == "PO"),
        "sourcing_requests": sum(1 for r in reqs if r.decision == "SOURCING_REQUEST"),
        "total_spend_inr": sum(r.group_value_inr for r in reqs if r.decision == "PO"),
        "approved_count": sum(1 for r in reqs if r.is_approved),
        "active_policy": state.policy_store.active_version,
    }

    return {
        "summary": summary,
        "requirements": [
            {
                "group_id": r.group_id,
                "resolved_item_code": r.resolved_item_code,
                "plant": r.plant,
                "requirement_date": r.requirement_date.strftime("%Y-%m-%d"),
                "total_quantity": r.total_quantity,
                "decision": r.decision,
                "route": r.route,
                "supplier_id": r.supplier_id,
                "unit_price": r.unit_price,
                "group_value_inr": r.group_value_inr,
                "suggested_suppliers": r.suggested_supplier_ids,
                "po_id": r.po_id,
                "reason": r.reason,
                "is_approved": r.is_approved,
                "approved_by": r.approved_by,
                "approved_at": r.approved_at,
                "is_overridden": r.is_overridden,
                "override_comment": r.override_comment,
                "lines_count": len(r.lines),
                "lines": [
                    {
                        "pr_no": line.pr_no,
                        "pr_line": line.pr_line,
                        "requester": line.requester,
                        "department": line.department,
                        "quantity": line.quantity,
                        "uom": line.uom,
                        "created_at": line.created_at.strftime("%Y-%m-%d %H:%M"),
                        "need_by_date": line.need_by_date.strftime("%Y-%m-%d"),
                        "urgency": line.urgency,
                    }
                    for line in r.lines
                ]
            }
            for r in reqs
        ],
        "rows": [r.__dict__ for r in output_rows]
    }

@app.get("/api/export/batch")
async def export_batch_csv(filename: str = "decisions.csv"):
    """Downloads the latest processed batch as official 13-column CSV."""
    if not state.last_processed_rows:
        # Run sample batch if not yet processed
        content = ""
        if SAMPLE_PR_BATCH_CSV.exists():
            with open(SAMPLE_PR_BATCH_CSV, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            demo_sample = Path(__file__).resolve().parent / "demo_data" / "pr_batches" / "sample_pr_batch.csv"
            if demo_sample.exists():
                with open(demo_sample, "r", encoding="utf-8") as f:
                    content = f.read()
        if content.strip():
            pr_lines = parse_pr_csv(content)
            pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())
            _, state.last_processed_rows = pipeline.process_pr_lines(pr_lines)

    output = io.StringIO()
    fieldnames = [
        "pr_no", "pr_line", "resolved_item_code", "group_id", "po_id",
        "decision", "route", "supplier_id", "unit_price", "group_value_inr",
        "suggested_supplier_ids", "policy_version", "reason"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in state.last_processed_rows:
        writer.writerow(row.__dict__)

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- Preferred Supplier Export Endpoint ---

@app.get("/api/suppliers/preferred")
async def get_preferred_suppliers(
    item_code: Optional[str] = Query(None),
    as_of_date: str = Query("2026-11-01"),
    format: str = Query("json")
):
    """
    Clause 6: Returns preferred supplier ranking.
    If format=csv, exports (item_code, rank, supplier_id, reference_price, top 3) as of date.
    """
    target_date = parse_date(as_of_date)
    ranker = state.pipeline.supplier_ranker

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["item_code", "rank", "supplier_id", "reference_price"])

        for it_code in sorted(state.loader.items.keys()):
            ranked = ranker.get_preferred_suppliers_ranked(it_code, target_date)
            for rank_idx, supp_data in enumerate(ranked[:3], 1):
                ref_price_str = f"{supp_data['reference_price']:.2f}" if supp_data.get("reference_price") else ""
                writer.writerow([it_code, rank_idx, supp_data["supplier_id"], ref_price_str])

        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=aditya_kumar__preferred.csv"}
        )

    if item_code:
        ranked = ranker.get_preferred_suppliers_ranked(item_code, target_date)
        return {"item_code": item_code, "as_of_date": as_of_date, "rankings": ranked}

    # All items summary
    all_summary = {}
    for it_code in sorted(state.loader.items.keys()):
        all_summary[it_code] = ranker.get_preferred_suppliers_ranked(it_code, target_date)[:3]
    return {"as_of_date": as_of_date, "summary": all_summary}

# --- Policy as Data Management Endpoints ---

@app.post("/api/policy/amend")
async def amend_policy(
    request: Request,
    spot_po_limit: Optional[float] = Form(None),
    emergency_po_limit: Optional[float] = Form(None),
    rfq_limit: Optional[float] = Form(None),
    new_version_name: Optional[str] = Form(None),
    effective_date_str: Optional[str] = Form(None)
):
    """
    Previews or drafts an amendment to the active policy.
    Returns the natural-language diff preview.
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            spot_po_limit = body.get("spot_po_limit", spot_po_limit)
            emergency_po_limit = body.get("emergency_po_limit", emergency_po_limit)
            rfq_limit = body.get("rfq_limit", rfq_limit)
            new_version_name = body.get("new_version_name", new_version_name)
            effective_date_str = body.get("effective_date_str", effective_date_str)
        except Exception:
            pass

    ver_name = str(new_version_name or "v5.1").strip()
    eff_str = str(effective_date_str or "2026-11-19").strip()
    active = state.policy_store.get_active_policy()

    try:
        new_policy = synchronize_policy_amendment(
            base_policy=active,
            version=ver_name,
            effective_date=parse_date(eff_str),
            spot_po_limit=spot_po_limit,
            emergency_po_limit=emergency_po_limit,
            rfq_limit=rfq_limit,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    diff = state.policy_store.compute_policy_diff(new_policy)
    return {
        "status": "preview",
        "new_version": ver_name,
        "effective_date": eff_str,
        "changes": diff,
        "ready_to_activate": True
    }

@app.post("/api/policy/activate")
async def activate_policy(
    request: Request,
    spot_po_limit: Optional[float] = Form(None),
    emergency_po_limit: Optional[float] = Form(None),
    rfq_limit: Optional[float] = Form(None),
    version_name: Optional[str] = Form(None),
    effective_date_str: Optional[str] = Form(None),
    x_admin_key: Optional[str] = Header(None)
):
    """Activates the new policy version hot in memory and persists to disk."""
    verify_admin_access(x_admin_key)

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            spot_po_limit = body.get("spot_po_limit", spot_po_limit)
            emergency_po_limit = body.get("emergency_po_limit", emergency_po_limit)
            rfq_limit = body.get("rfq_limit", rfq_limit)
            version_name = body.get("version_name", version_name)
            effective_date_str = body.get("effective_date_str", effective_date_str)
        except Exception:
            pass

    ver_name = str(version_name or "v5.1").strip()
    eff_str = str(effective_date_str or "2026-11-19").strip()
    active = state.policy_store.get_active_policy()

    # If any scalar limits were explicitly supplied, perform a synchronized amendment
    if spot_po_limit is not None or emergency_po_limit is not None or rfq_limit is not None:
        try:
            new_policy = synchronize_policy_amendment(
                base_policy=active,
                version=ver_name,
                effective_date=parse_date(eff_str),
                spot_po_limit=spot_po_limit,
                emergency_po_limit=emergency_po_limit,
                rfq_limit=rfq_limit,
            )
            state.policy_store.register_policy(new_policy)
            state.policy_store.activate_version(ver_name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Activating an existing registered policy version by name
        try:
            state.policy_store.activate_version(ver_name)
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Synchronize pipeline with newly activated policy
    active_policy = state.policy_store.get_active_policy()
    state.pipeline = ProcurementPipeline(state.loader, active_policy)

    return {
        "status": "activated",
        "active_version": state.policy_store.active_version,
        "effective_date": eff_str,
        "message": f"Policy {state.policy_store.active_version} is now actively driving all procurement decisions."
    }

@app.post("/api/policy/upload")
async def upload_policy_document(file: UploadFile = File(...)):
    """Uploads a versioned policy JSON file and validates it before registration."""
    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
        policy = ProcurementPolicy.from_dict(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid policy JSON schema: {e}")

    try:
        state.policy_store.register_policy(policy)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    diff = state.policy_store.compute_policy_diff(policy)
    return {
        "status": "uploaded",
        "version": policy.version,
        "effective_date": policy.effective_date.strftime("%Y-%m-%d"),
        "changes": diff,
        "message": f"Policy {policy.version} validated and registered. Ready to activate."
    }

# --- Conversational Intake Endpoint ---

@app.post("/api/chat/intake")
async def chat_intake(message: str = Form(...), session_id: str = Form("default_session")):
    """Conversational intake endpoint for factory employees."""
    result = state.chat_assistant.process_message(session_id, message)
    session = result.get("session")
    draft_pr = None
    if session:
        draft_pr = {
            "resolved_item_code": session.get("item_code"),
            "item_description": session.get("description"),
            "quantity": session.get("quantity"),
            "uom": session.get("uom"),
            "plant": session.get("plant"),
            "need_by_date": session.get("need_by_date").strftime("%Y-%m-%d") if session.get("need_by_date") else None,
            "urgency": session.get("urgency"),
            "estimated_unit_price": 450.0,
            "ready_to_submit": result.get("status") == "ready_to_confirm"
        }
    return {
        "reply": result.get("reply"),
        "assistant_reply": result.get("reply"),
        "status": result.get("status"),
        "engine_mode": result.get("engine_mode", "offline_deterministic"),
        "session": session,
        "pr": result.get("pr"),
        "draft_pr": draft_pr
    }

# --- Contracts & Master Data Endpoints ---

@app.get("/api/contracts")
async def list_contracts():
    contracts_list = []
    for c in state.loader.contracts.values():
        contracts_list.append({
            "contract_id": c.contract_id,
            "supplier_id": c.supplier_id,
            "supplier_name": c.supplier_name,
            "start_date": c.start_date.strftime("%Y-%m-%d"),
            "end_date": c.end_date.strftime("%Y-%m-%d"),
            "value_cap": c.value_cap,
            "consumed_value": c.consumed_value,
            "remaining_ceiling": c.remaining_ceiling,
            "lines_count": len(c.lines)
        })
    return {"contracts": contracts_list}

@app.post("/api/contracts/upload-pdf")
async def upload_pdf_contract(file: UploadFile = File(...)):
    """Uploads and parses a PDF rate contract into the live ceiling engine."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF contracts are supported.")
    
    upload_dir = Path("app/storage/pdf_contracts")
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest_path = upload_dir / file.filename
    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    contract = state.loader.parse_pdf_contract(dest_path)
    if not contract:
        raise HTTPException(status_code=400, detail="Could not parse contract details from PDF.")

    state.loader.contracts[contract.contract_id] = contract
    # Persist as custom contract
    lines_list = [
        {"item_code": cl.item_code, "description": cl.description, "uom": cl.uom, "rate": cl.rate}
        for cl in contract.lines.values()
    ]
    storage_manager.save_custom_contract({
        "contract_id": contract.contract_id,
        "supplier_id": contract.supplier_id,
        "supplier_name": contract.supplier_name,
        "start_date": contract.start_date.strftime("%Y-%m-%d"),
        "end_date": contract.end_date.strftime("%Y-%m-%d"),
        "value_cap": contract.value_cap,
        "consumed_value": contract.consumed_value,
        "lines": lines_list
    })

    return {
        "status": "success",
        "contract_id": contract.contract_id,
        "supplier_id": contract.supplier_id,
        "supplier_name": contract.supplier_name,
        "value_cap": contract.value_cap,
        "lines_count": len(contract.lines),
        "message": f"Contract {contract.contract_id} uploaded and activated into ceiling engine."
    }

@app.post("/api/contracts/manual")
async def register_manual_contract(
    contract_id: str = Form(...),
    supplier_id: str = Form(...),
    start_date: str = Form("2026-11-01"),
    end_date: str = Form("2027-10-31"),
    value_cap: float = Form(...)
):
    """Manually registers a rate contract into the live ceiling engine."""
    supp = state.loader.suppliers.get(supplier_id)
    supp_name = supp.name if supp else supplier_id
    contract_obj = Contract(
        contract_id=contract_id.strip(),
        supplier_id=supplier_id.strip(),
        supplier_name=supp_name,
        start_date=parse_date(start_date),
        end_date=parse_date(end_date),
        value_cap=float(value_cap),
        consumed_value=0.0,
        lines={}
    )
    state.loader.contracts[contract_obj.contract_id] = contract_obj
    storage_manager.save_custom_contract({
        "contract_id": contract_obj.contract_id,
        "supplier_id": contract_obj.supplier_id,
        "supplier_name": contract_obj.supplier_name,
        "start_date": start_date,
        "end_date": end_date,
        "value_cap": float(value_cap),
        "consumed_value": 0.0,
        "lines": []
    })
    return {
        "status": "success",
        "contract_id": contract_id,
        "message": f"Contract {contract_id} manually registered into ceiling engine."
    }

# --- Conversational Intake Confirmation Endpoint ---

@app.post("/api/chat/confirm")
async def confirm_chat_pr(
    description: str = Form(...),
    quantity: float = Form(...),
    uom: str = Form("NOS"),
    plant: str = Form("PUN1"),
    need_by_date: str = Form(...),
    urgency: str = Form("Normal"),
    item_code: Optional[str] = Form(None),
    requester: str = Form("Employee (Chat)"),
    department: str = Form("Manufacturing"),
    estimated_unit_price: Optional[float] = Form(None)
):
    """Confirms a chat-created PR and stores it persistently so it enters the Buyer Workspace."""
    pr_record = {
        "item_code": item_code.strip() if item_code and item_code.strip() else None,
        "description": description.strip(),
        "quantity": float(quantity),
        "uom": uom.strip(),
        "plant": plant.strip(),
        "need_by_date": need_by_date.strip(),
        "urgency": urgency.strip(),
        "requester": requester.strip(),
        "department": department.strip(),
        "estimated_unit_price": float(estimated_unit_price) if estimated_unit_price else None,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    saved_pr = storage_manager.save_chat_pr(pr_record)
    return {
        "status": "success",
        "pr_no": saved_pr["pr_no"],
        "message": f"Requisition {saved_pr['pr_no']} created and routed to Buyer Workspace."
    }

# --- Buyer Decision Override & Approval Endpoints ---

@app.post("/api/override")
async def override_decision(
    group_id: str = Form(...),
    new_route: str = Form(...),
    comment: str = Form(...),
    buyer_name: str = Form("Aditya Kumar")
):
    """
    Clause 8.1: Records a human buyer override with mandatory audit trail.
    Persists to disk so reloads and subsequent batches preserve the justification.
    """
    if not comment or not comment.strip():
        raise HTTPException(status_code=400, detail="Mandatory written comment required for audit compliance.")

    new_decision = "PO" if "PO" in new_route else "SOURCING_REQUEST"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Persist override to disk
    storage_manager.save_override(
        group_id=group_id,
        new_route=new_route,
        new_decision=new_decision,
        comment=comment.strip(),
        buyer_name=buyer_name.strip(),
        timestamp=timestamp
    )

    updated_count = 0
    for row in state.last_processed_rows:
        if row.group_id == group_id:
            row.route = new_route
            row.decision = new_decision
            row.reason = f"[BUYER OVERRIDE by {buyer_name} at {timestamp}]: {comment.strip()} (Original: {row.reason})"
            updated_count += 1

    return {
        "status": "success",
        "group_id": group_id,
        "new_route": new_route,
        "new_decision": new_decision,
        "updated_rows": updated_count,
        "message": f"Successfully recorded persistent override for requirement {group_id}."
    }

@app.post("/api/approve")
async def approve_requirement(
    group_id: str = Form(...),
    buyer_name: str = Form("Aditya Kumar")
):
    """
    Task Brief Section 3.6: Approve creates the PO or RFQ/RFP.
    Records who approved and when with full audit compliance.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    storage_manager.save_approval(group_id, buyer_name=buyer_name, timestamp=timestamp)
    return {
        "status": "success",
        "group_id": group_id,
        "buyer_name": buyer_name,
        "timestamp": timestamp,
        "message": f"Requirement {group_id} approved. PO or Sourcing Request created."
    }

# --- Fallback Catch-all SPA Handler for Direct URL Reloads ---

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def catch_all_spa(full_path: str):
    if full_path.startswith(("api", "assets", "static", "health")):
        raise HTTPException(status_code=404, detail="Resource not found")
    return get_spa_html()

