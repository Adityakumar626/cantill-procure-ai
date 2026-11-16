#!/usr/bin/env python3
"""
CLI Batch Runner for Cantill ProcureAI
Processes a PR batch CSV file and writes the official 13-column decision CSV.
Usage:
    python scripts/run_batch.py --input data/pr_batches/sample_pr_batch.csv --output submission/aditya_kumar__run1.csv
    python scripts/run_batch.py --input blind_test_batch.csv --output submission/aditya_kumar__run2.csv --policy v5.1
"""
import argparse
import csv
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.engine.data_loader import MasterDataLoader, parse_datetime, parse_date
from app.engine.pipeline import ProcurementPipeline
from app.policy_manager.store import PolicyStore
from app.models.procurement import PRLine

def run():
    parser = argparse.ArgumentParser(description="Cantill ProcureAI Batch Runner")
    parser.add_argument("--input", "-i", required=True, help="Path to input PR batch CSV")
    parser.add_argument("--output", "-o", required=True, help="Path to destination output CSV")
    parser.add_argument("--policy", "-p", default="v5.0", help="Policy version to run (default: v5.0)")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist.", file=sys.stderr)
        sys.exit(1)

    print(f"⚡ Loading master data & PDF contracts...")
    loader = MasterDataLoader()
    loader.load_all()

    policy_store = PolicyStore()
    if args.policy not in policy_store.policies:
        print(f"Notice: Policy {args.policy} not found in store; using default active {policy_store.active_version}.")
    else:
        policy_store.activate_version(args.policy)

    active_policy = policy_store.get_active_policy()
    print(f"✔ Active Policy: {active_policy.version} (effective {active_policy.effective_date})")

    pipeline = ProcurementPipeline(loader, active_policy)

    print(f"Ingesting PR lines from {input_path}...")
    pr_lines = []
    with open(input_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
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

    print(f"Processing {len(pr_lines)} PR lines through 8-clause decision pipeline...")
    reqs, output_rows = pipeline.process_pr_lines(pr_lines)

    # Ensure parent output dir exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "pr_no", "pr_line", "resolved_item_code", "group_id", "po_id",
        "decision", "route", "supplier_id", "unit_price", "group_value_inr",
        "suggested_supplier_ids", "policy_version", "reason"
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in output_rows:
            writer.writerow(row.__dict__)

    print(f"🎉 Success! Generated {len(output_rows)} decision rows across {len(reqs)} requirements.")
    print(f"📁 Output saved to: {output_path}")

if __name__ == "__main__":
    run()
