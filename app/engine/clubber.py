"""
Clause 2: Requirement Clubbing Engine (Anti-Splitting)
Groups related PR lines into requirements to enforce procurement limits.
"""
from typing import List, Dict
from datetime import timedelta
from app.models.procurement import PRLine, Requirement

class RequirementClubber:
    def __init__(self, clubbing_window_days: int = 14, need_by_window_days: int = 7):
        self.clubbing_window_days = clubbing_window_days
        self.need_by_window_days = need_by_window_days

    def club_lines(self, resolved_pr_lines: List[tuple]) -> List[Requirement]:
        """
        Takes a list of (resolved_item_code, pr_line).
        Sorts lines deterministically and clubs them into Requirements according to Clause 2.
        """
        # Clause 2.2: Order lines by creation time, then PR number, then line number
        sorted_pairs = sorted(
            resolved_pr_lines,
            key=lambda x: (x[1].created_at, x[1].pr_no, x[1].pr_line)
        )

        requirements: List[Requirement] = []
        req_counter = 1

        for resolved_code, line in sorted_pairs:
            # Clause 1.2: A new item is NEVER clubbed with other lines
            if resolved_code == "NEW":
                req = Requirement(
                    group_id=f"REQ-{req_counter:04d}",
                    resolved_item_code="NEW",
                    plant=line.plant,
                    first_line_created_at=line.created_at,
                    requirement_date=line.created_at.date(),
                    first_need_by_date=line.need_by_date,
                    is_emergency=line.is_emergency,
                    lines=[line],
                    total_quantity=line.quantity,
                )
                requirements.append(req)
                req_counter += 1
                continue

            # Check if line can join an existing requirement (Clause 2.2)
            joined = False
            for req in requirements:
                if req.resolved_item_code != resolved_code:
                    continue
                if req.plant != line.plant:
                    continue

                # Creation date within 14 calendar days of requirement's first line
                creation_diff = (line.created_at.date() - req.requirement_date).days
                if not (0 <= creation_diff <= self.clubbing_window_days):
                    continue

                # Need-by date within 7 days (either side) of first line's need-by date
                need_by_diff = abs((line.need_by_date - req.first_need_by_date).days)
                if need_by_diff > self.need_by_window_days:
                    continue

                # Line qualifies: Joins the earliest matching requirement
                req.lines.append(line)
                req.total_quantity += line.quantity
                if line.is_emergency:
                    req.is_emergency = True
                joined = True
                break

            if not joined:
                # Start new requirement
                req = Requirement(
                    group_id=f"REQ-{req_counter:04d}",
                    resolved_item_code=resolved_code,
                    plant=line.plant,
                    first_line_created_at=line.created_at,
                    requirement_date=line.created_at.date(),
                    first_need_by_date=line.need_by_date,
                    is_emergency=line.is_emergency,
                    lines=[line],
                    total_quantity=line.quantity,
                )
                requirements.append(req)
                req_counter += 1

        return requirements
