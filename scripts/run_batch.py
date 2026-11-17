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
from app.models.policy import ProcurementPolicy, PolicyRule, synchronize_policy_amendment

def run():
    parser = argparse.ArgumentParser(description="Cantill ProcureAI Batch Runner")
    parser.add_argument("--input", "-i", required=True, help="Path to input PR batch CSV")
    parser.add_argument("--output", "-o", required=True, help="Path to destination output CSV")
    parser.add_argument("--policy", "-p", default="v5.0", help="Policy version (e.g. v5.0, v5.1) or path to policy JSON file")
    parser.add_argument("--spot-limit", type=float, default=None, help="Optional override for spot PO limit")
    parser.add_argument("--emergency-limit", type=float, default=None, help="Optional override for emergency PO limit")
    parser.add_argument("--rfq-limit", type=float, default=None, help="Optional override for RFQ threshold")
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
    
    # 1. Check if --policy is a path to a JSON policy file
    candidate_file = Path(args.policy)
    if candidate_file.exists() and candidate_file.suffix.lower() == ".json":
        active_policy = policy_store.load_policy_from_file(candidate_file)
        policy_store.activate_version(active_policy.version)
    elif args.policy in policy_store.policies:
        policy_store.activate_version(args.policy)
        active_policy = policy_store.get_active_policy()
    else:
        # Check if version exists in app/storage/policies/{args.policy}.json
        disk_policy_path = policy_store.storage_dir / f"{args.policy}.json"
        if disk_policy_path.exists():
            active_policy = policy_store.load_policy_from_file(disk_policy_path)
            policy_store.activate_version(active_policy.version)
        else:
            print(f"Error: Requested policy '{args.policy}' not found in store or at {disk_policy_path}.", file=sys.stderr)
            print(f"Available policy versions: {list(policy_store.policies.keys())}", file=sys.stderr)
            sys.exit(1)

    # 2. Apply any CLI threshold overrides if explicitly passed
    if args.spot_limit is not None or args.emergency_limit is not None or args.rfq_limit is not None:
        active_policy = synchronize_policy_amendment(
            base_policy=active_policy,
            version=args.policy,
            spot_po_limit=args.spot_limit,
            emergency_po_limit=args.emergency_limit,
            rfq_limit=args.rfq_limit,
        )
        policy_store.register_policy(active_policy)
        policy_store.activate_version(active_policy.version)

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
