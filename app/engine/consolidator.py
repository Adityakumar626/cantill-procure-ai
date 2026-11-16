"""
Clause 7: Purchase Order Consolidation Engine
Combines qualifying PO requirements into consolidated multi-line Purchase Orders.
"""
from typing import List, Dict, Optional
from datetime import timedelta
from app.models.procurement import Requirement

class POConsolidator:
    def __init__(self, consolidation_window_hours: int = 24):
        self.consolidation_window_hours = consolidation_window_hours

    def consolidate_pos(self, requirements: List[Requirement]) -> List[Requirement]:
        """
        Clause 7.1 & 7.2:
        Takes requirements in order of creation time.
        Requirements that end in a PO join an open PO if:
        1. Same supplier
        2. Same plant
        3. Same route
        4. Raised within 24 hours of the first requirement on that PO
        Sourcing requests are never combined.
        """
        # Sort requirements deterministically by first line's creation time
        sorted_reqs = sorted(requirements, key=lambda r: (r.first_line_created_at, r.group_id))

        open_pos: List[Dict] = []
        po_counter = 1

        for req in sorted_reqs:
            # Only POs can be consolidated (Clause 7.2)
            if req.decision != "PO" or not req.supplier_id:
                req.po_id = ""
                continue

            joined_po = False
            for po in open_pos:
                if po["supplier_id"] != req.supplier_id:
                    continue
                if po["plant"] != req.plant:
                    continue
                if po["route"] != req.route:
                    continue

                # Check 24-hour window from the first requirement's creation time
                time_diff = (req.first_line_created_at - po["first_creation_time"]).total_seconds()
                if 0 <= time_diff <= (self.consolidation_window_hours * 3600):
                    req.po_id = po["po_id"]
                    po["requirements"].append(req)
                    joined_po = True
                    break

            if not joined_po:
                new_po_id = f"PO-{po_counter:04d}"
                req.po_id = new_po_id
                open_pos.append({
                    "po_id": new_po_id,
                    "supplier_id": req.supplier_id,
                    "plant": req.plant,
                    "route": req.route,
                    "first_creation_time": req.first_line_created_at,
                    "requirements": [req]
                })
                po_counter += 1

        return requirements
