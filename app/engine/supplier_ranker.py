"""
Clause 6: Preferred Supplier Ranking & Sourcing Suggestion Engine
Ranks suppliers based on PO history, recency, contract status, on-time delivery, and quality.
"""
from typing import Dict, List, Optional
from datetime import date, timedelta
from app.models.procurement import Supplier, Item, POHistoryRecord, Contract

class SupplierRanker:
    def __init__(
        self,
        suppliers: Dict[str, Supplier],
        items: Dict[str, Item],
        po_history: List[POHistoryRecord],
        contracts: Dict[str, Contract],
        history_window_days: int = 548,
        ranking_weights: Optional[Dict[str, float]] = None,
    ):
        self.suppliers = suppliers
        self.items = items
        self.po_history = po_history
        self.contracts = contracts
        self.history_window_days = history_window_days
        self.ranking_weights = ranking_weights or {
            "recency": 40.0,
            "contract": 15.0,
            "volume": 5.0,
            "otd": 10.0,
            "quality": 10.0
        }

    def get_preferred_suppliers_ranked(
        self,
        item_code: str,
        as_of_date: date
    ) -> List[Dict]:
        """
        Clause 6.1 & 6.2:
        Builds and ranks the preferred supplier list for an item as of requirement date.
        Only Active suppliers are included.
        """
        cutoff_548 = as_of_date - timedelta(days=self.history_window_days)
        cutoff_90 = as_of_date - timedelta(days=90)
        cutoff_365 = as_of_date - timedelta(days=365)

        candidates: Dict[str, Dict] = {}

        # 1. Check POs in last 548 days
        for po in self.po_history:
            if po.item_code == item_code and (cutoff_548 <= po.po_date <= as_of_date):
                supp = self.suppliers.get(po.supplier_id)
                if not supp or not supp.is_active:
                    continue

                if po.supplier_id not in candidates:
                    candidates[po.supplier_id] = {
                        "pos": 0,
                        "last_date": po.po_date,
                        "ref_price": po.unit_price,
                        "has_contract": False,
                    }
                c = candidates[po.supplier_id]
                c["pos"] += 1
                if po.po_date >= c["last_date"]:
                    c["last_date"] = po.po_date
                    c["ref_price"] = po.unit_price

        # 2. Check contracts covering the item that started on or before requirement date
        for cid, contract in self.contracts.items():
            if item_code in contract.lines and contract.start_date <= as_of_date:
                supp = self.suppliers.get(contract.supplier_id)
                if not supp or not supp.is_active:
                    continue

                contract_rate = contract.lines[item_code].rate
                if contract.supplier_id not in candidates:
                    candidates[contract.supplier_id] = {
                        "pos": 0,
                        "last_date": date(2000, 1, 1),
                        "ref_price": contract_rate,
                        "has_contract": True,
                    }
                else:
                    candidates[contract.supplier_id]["has_contract"] = True

        ranked = []
        for sid, data in candidates.items():
            supp = self.suppliers[sid]

            # Recency calculation (Worked Examples page 5)
            # 1.0 = last PO <= 90 days; 0.5 = within a year (91-365 days); 0.0 = older
            if data["last_date"] >= cutoff_90:
                recency = 1.0
            elif data["last_date"] >= cutoff_365:
                recency = 0.5
            else:
                recency = 0.0

            # Composite Score driven by configurable ranking_weights policy
            w = self.ranking_weights
            score = (
                recency * w.get("recency", 40.0) +
                (w.get("contract", 15.0) if data["has_contract"] else 0.0) +
                min(data["pos"], 10) * w.get("volume", 5.0) +
                (supp.on_time_pct / 100.0) * w.get("otd", 10.0) +
                (supp.quality_rating / 5.0) * w.get("quality", 10.0)
            )

            ranked.append({
                "supplier_id": sid,
                "name": supp.name,
                "pos_548d": data["pos"],
                "recency": recency,
                "has_contract": data["has_contract"],
                "reference_price": data["ref_price"],
                "on_time_pct": supp.on_time_pct,
                "quality_rating": supp.quality_rating,
                "score": score,
            })

        # Deterministic ranking: score desc, pos_548d desc, recency desc, supplier_id asc
        ranked.sort(key=lambda x: (-x["score"], -x["pos_548d"], -x["recency"], x["supplier_id"]))
        return ranked

    def get_sourcing_suggestions(
        self,
        item_code: str,
        as_of_date: date,
        needed_count: int
    ) -> List[str]:
        """
        Clause 6.4:
        Take preferred list in order. If fewer than needed (3 or 5), add other Active suppliers
        that list the item's category in supplier master, best delivery and quality record first.
        New items get no suggestions.
        """
        if item_code == "NEW":
            return []

        # 1. Start with preferred suppliers
        preferred = self.get_preferred_suppliers_ranked(item_code, as_of_date)
        suggested = [p["supplier_id"] for p in preferred]

        if len(suggested) >= needed_count:
            return suggested[:needed_count]

        # 2. Top up from category
        item = self.items.get(item_code)
        category = item.category if item else ""
        if not category:
            return suggested

        already_chosen = set(suggested)
        cat_candidates = [
            s for s in self.suppliers.values()
            if s.is_active and (category in s.categories) and (s.supplier_id not in already_chosen)
        ]

        # Sort category candidates by delivery and quality record: on_time_pct * quality_rating descending
        cat_candidates.sort(
            key=lambda s: (s.on_time_pct * s.quality_rating, s.on_time_pct, s.quality_rating),
            reverse=True
        )

        for s in cat_candidates:
            suggested.append(s.supplier_id)
            if len(suggested) >= needed_count:
                break

        return suggested[:needed_count]
