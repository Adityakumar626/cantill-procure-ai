"""
Cantill ProcureAI FastAPI Application Backend
Provides REST endpoints for Batch Processing, Chat Intake, Policy-as-Data Versioning, and Exports.
"""
import csv
import io
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import SAMPLE_PR_BATCH_CSV, ACTIVE_POLICY_VERSION
from app.models.procurement import PRLine, OutputDecisionRow
from app.models.policy import ProcurementPolicy, PolicyRule
from app.engine.data_loader import MasterDataLoader, parse_datetime, parse_date
from app.engine.pipeline import ProcurementPipeline
from app.policy_manager.store import PolicyStore
from app.assistant.chat import ChatIntakeAssistant

app = FastAPI(
    title="Cantill ProcureAI",
    description="Policy-Driven PR-to-PO Procurement Intelligence Engine for Corvo Engineering",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
        self.last_processed_rows: List[OutputDecisionRow] = []

state = AppState()

# Mount Static Assets
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("app/static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "active_policy": state.policy_store.active_version,
        "items_count": len(state.loader.items),
        "contracts_count": len(state.loader.contracts),
        "suppliers_count": len(state.loader.suppliers),
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
        # Fallback to sample batch
        if not SAMPLE_PR_BATCH_CSV.exists():
            raise HTTPException(status_code=400, detail="No PR batch uploaded and sample batch missing.")
        with open(SAMPLE_PR_BATCH_CSV, "r", encoding="utf-8") as f:
            content = f.read()

    pr_lines = parse_pr_csv(content)
    # Re-initialize pipeline with active policy and fresh baseline contracts
    state.loader.load_contracts()
    state.loader.augment_pdf_contracts()
    pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())

    reqs, output_rows = pipeline.process_pr_lines(pr_lines)
    state.last_processed_rows = output_rows

    # Calculate summary metrics
    summary = {
        "total_pr_lines": len(pr_lines),
        "total_requirements": len(reqs),
        "direct_pos": sum(1 for r in reqs if r.decision == "PO"),
        "sourcing_requests": sum(1 for r in reqs if r.decision == "SOURCING_REQUEST"),
        "total_spend_inr": sum(r.group_value_inr for r in reqs if r.decision == "PO"),
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
                "lines_count": len(r.lines)
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
        with open(SAMPLE_PR_BATCH_CSV, "r", encoding="utf-8") as f:
            content = f.read()
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
    spot_po_limit: Optional[float] = Form(None),
    emergency_po_limit: Optional[float] = Form(None),
    rfq_limit: Optional[float] = Form(None),
    new_version_name: str = Form("v5.1"),
    effective_date_str: str = Form("2026-11-19")
):
    """
    Previews or drafts an amendment to the active policy.
    Returns the natural-language diff preview.
    """
    active = state.policy_store.get_active_policy()
    eff_date = parse_date(effective_date_str)

    # Clone active policy into new version
    new_policy = ProcurementPolicy(
        version=new_version_name,
        effective_date=eff_date,
        clubbing_window_days=active.clubbing_window_days,
        need_by_window_days=active.need_by_window_days,
        emergency_po_limit=emergency_po_limit if emergency_po_limit is not None else active.emergency_po_limit,
        spot_po_limit=spot_po_limit if spot_po_limit is not None else active.spot_po_limit,
        rfq_limit=rfq_limit if rfq_limit is not None else active.rfq_limit,
        active_history_days=active.active_history_days,
        preferred_history_days=active.preferred_history_days,
        po_consolidation_window_hours=active.po_consolidation_window_hours,
        rules=[r for r in active.rules]
    )

    diff = state.policy_store.compute_policy_diff(new_policy)
    return {
        "status": "preview",
        "new_version": new_version_name,
        "effective_date": effective_date_str,
        "changes": diff,
        "ready_to_activate": True
    }

@app.post("/api/policy/activate")
async def activate_policy(
    spot_po_limit: Optional[float] = Form(None),
    emergency_po_limit: Optional[float] = Form(None),
    rfq_limit: Optional[float] = Form(None),
    version_name: str = Form("v5.1"),
    effective_date_str: str = Form("2026-11-19")
):
    """Activates the new policy version hot in memory without restarting."""
    active = state.policy_store.get_active_policy()
    new_policy = ProcurementPolicy(
        version=version_name,
        effective_date=parse_date(effective_date_str),
        emergency_po_limit=emergency_po_limit if emergency_po_limit is not None else active.emergency_po_limit,
        spot_po_limit=spot_po_limit if spot_po_limit is not None else active.spot_po_limit,
        rfq_limit=rfq_limit if rfq_limit is not None else active.rfq_limit,
        rules=[r for r in active.rules]
    )
    state.policy_store.register_policy(new_policy)
    state.policy_store.activate_version(version_name)
    # Refresh pipeline
    state.pipeline = ProcurementPipeline(state.loader, new_policy)

    return {
        "status": "activated",
        "active_version": state.policy_store.active_version,
        "effective_date": effective_date_str,
        "message": f"Policy {version_name} is now actively driving all procurement decisions."
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

# --- Buyer Decision Override Endpoint ---

@app.post("/api/override")
async def override_decision(
    group_id: str = Form(...),
    new_route: str = Form(...),
    comment: str = Form(...),
    buyer_name: str = Form("Aditya Kumar")
):
    """
    Records a human buyer override with mandatory audit trail.
    Updates the route and policy reason in the current run results.
    """
    if not comment or not comment.strip():
        raise HTTPException(status_code=400, detail="Mandatory written comment required for audit compliance.")

    updated_count = 0
    new_decision = "PO" if "PO" in new_route else "SOURCING_REQUEST"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

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
        "message": f"Successfully recorded override for requirement {group_id}."
    }

