#!/usr/bin/env python3
"""
CLI Preferred Supplier Ranking Exporter for Cantill ProcureAI
Generates aditya_kumar__preferred.csv for all items as of a target date.
Usage:
    python scripts/export_preferred.py --date 2026-11-01 --output submission/aditya_kumar__preferred.csv
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.engine.data_loader import MasterDataLoader, parse_date
from app.engine.supplier_ranker import SupplierRanker

def run():
    parser = argparse.ArgumentParser(description="Export preferred supplier rankings")
    parser.add_argument("--date", "-d", default="2026-11-01", help="Target evaluation date (YYYY-MM-DD)")
    parser.add_argument("--output", "-o", default="submission/aditya_kumar__preferred.csv", help="Destination CSV path")
    args = parser.parse_args()

    target_date = parse_date(args.date)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading master data and contracts...")
    loader = MasterDataLoader()
    loader.load_all()

    ranker = SupplierRanker(loader.suppliers, loader.items, loader.po_history, loader.contracts)
    print(f"Evaluating top 3 preferred suppliers for all {len(loader.items)} items as of {target_date}...")

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["item_code", "rank", "supplier_id", "reference_price"])

        for it_code in sorted(loader.items.keys()):
            ranked = ranker.get_preferred_suppliers_ranked(it_code, target_date)
            for rank_idx, supp_data in enumerate(ranked[:3], 1):
                ref_price_str = f"{supp_data['reference_price']:.2f}" if supp_data.get("reference_price") else ""
                writer.writerow([it_code, rank_idx, supp_data["supplier_id"], ref_price_str])

    print(f"🎉 Saved preferred supplier rankings to: {output_path}")

if __name__ == "__main__":
    run()
