"""
Conversational PR Intake Assistant
Parses employee requests, resolves items, asks missing follow-up questions, and drafts PRs.
"""
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from app.engine.matcher import ItemMatcher
from app.models.procurement import Item, PRLine

class ChatIntakeAssistant:
    def __init__(self, matcher: ItemMatcher, items: Dict[str, Item]):
        self.matcher = matcher
        self.items = items
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.pr_counter = 5000

    def get_session(self, session_id: str) -> Dict[str, Any]:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "item_code": None,
                "description": None,
                "quantity": None,
                "uom": "NOS",
                "plant": None,
                "need_by_date": None,
                "urgency": "Normal",
                "requester": "Employee",
                "department": "Production",
                "confirmed": False
            }
        return self.sessions[session_id]

    def process_message(self, session_id: str, message: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        msg_lower = message.lower().strip()

        # Check for confirmation
        if session["item_code"] and session["quantity"] and session["plant"] and session["need_by_date"]:
            if any(w in msg_lower for w in ["yes", "confirm", "proceed", "create", "ok", "submit"]):
                self.pr_counter += 1
                pr_no = f"PR-26-{self.pr_counter:05d}"
                created_pr = {
                    "pr_no": pr_no,
                    "pr_line": 1,
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "item_code": session["item_code"],
                    "description": session["description"],
                    "quantity": session["quantity"],
                    "uom": session["uom"],
                    "plant": session["plant"],
                    "need_by_date": session["need_by_date"].strftime("%Y-%m-%d"),
                    "urgency": session["urgency"],
                }
                # Reset session
                self.sessions.pop(session_id, None)
                return {
                    "reply": f"✅ Purchase Requisition **{pr_no}** has been created successfully for **{created_pr['quantity']} {created_pr['uom']}** of `{created_pr['item_code']}` at plant **{created_pr['plant']}** (Need-by: {created_pr['need_by_date']}).",
                    "pr": created_pr,
                    "status": "created"
                }

        # 1. Extract Quantity
        qty_m = re.search(r"\b(\d+)\s*(nos|kg|mtr|pair|ltr|job|bkt|units?)?\b", msg_lower)
        if qty_m and not session["quantity"]:
            session["quantity"] = float(qty_m.group(1))
            if qty_m.group(2):
                session["uom"] = qty_m.group(2).upper()

        # 2. Extract Plant
        if "chakan" in msg_lower or "chk1" in msg_lower or "chk" in msg_lower:
            session["plant"] = "CHK1"
        elif "bhosari" in msg_lower or "pun1" in msg_lower or "pune" in msg_lower:
            session["plant"] = "PUN1"

        # 3. Extract Urgency
        if any(w in msg_lower for w in ["emergency", "critical", "breakdown", "sos"]):
            session["urgency"] = "Emergency"
        elif "urgent" in msg_lower:
            session["urgency"] = "Emergency"

        # 4. Extract Need-by Date
        date_m = re.search(r"\b(202[6-7]-[0-1]\d-[0-3]\d)\b", message)
        if date_m:
            try:
                session["need_by_date"] = datetime.strptime(date_m.group(1), "%Y-%m-%d").date()
            except ValueError:
                pass
        else:
            weekday_map = {
                "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
                "friday": 4, "saturday": 5, "sunday": 6
            }
            today = date.today()
            found_day = False
            for day_name, day_idx in weekday_map.items():
                if day_name in msg_lower:
                    days_ahead = (day_idx - today.weekday() + 7) % 7
                    if days_ahead == 0 or "next" in msg_lower:
                        days_ahead += 7
                    session["need_by_date"] = today + timedelta(days=days_ahead)
                    found_day = True
                    break
            if not found_day:
                if "tomorrow" in msg_lower:
                    session["need_by_date"] = today + timedelta(days=1)
                elif "next week" in msg_lower:
                    session["need_by_date"] = today + timedelta(days=7)

        # 5. Extract Item Description
        # Filter out numbers, plants, dates, and intent words
        stopwords_pattern = r"\b(need|want|order|purchase|for|by|please|req|urgently|urgent|emergency|tomorrow|next week|next|chakan|bhosari|chk1|pun1|plant|factory|site|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(nos|kg|mtr|pair|ltr|job|bkt|units?)?)\b"
        cleaned_msg = re.sub(stopwords_pattern, "", msg_lower)
        cleaned_msg = " ".join(cleaned_msg.split()).strip()
        if cleaned_msg and len(cleaned_msg) >= 3 and not session["item_code"]:
            resolved = self.matcher.resolve(None, cleaned_msg)
            if resolved != "NEW":
                session["item_code"] = resolved
                matched_item = self.items[resolved]
                session["description"] = matched_item.description
                session["uom"] = matched_item.uom
            else:
                session["item_code"] = "NEW"
                session["description"] = cleaned_msg.title()

        # Check missing attributes and formulate smart follow-up question
        missing = []
        if not session["item_code"]:
            missing.append("item description")
        if not session["quantity"]:
            missing.append("quantity")
        if not session["plant"]:
            missing.append("plant (PUN1 Bhosari or CHK1 Chakan)")
        if not session["need_by_date"]:
            missing.append("need-by date (e.g. YYYY-MM-DD or next Friday)")

        if missing:
            follow_up = f"I've noted your request. To finalize the PR, please specify the **{missing[0]}**."
            if session["item_code"] and session["item_code"] != "NEW":
                follow_up = f"Matched item `{session['item_code']}` ({session['description']}). " + follow_up
            return {
                "reply": follow_up,
                "session": session,
                "status": "collecting"
            }

        # All fields present: Ask confirmation
        item_label = f"`{session['item_code']}` ({session['description']})" if session['item_code'] != "NEW" else f"New Item ({session['description']})"
        summary = (
            f"Here is your draft Purchase Requisition:\n\n"
            f"- **Item:** {item_label}\n"
            f"- **Quantity:** {session['quantity']:.0f} {session['uom']}\n"
            f"- **Plant:** {session['plant']}\n"
            f"- **Need-by Date:** {session['need_by_date'].strftime('%Y-%m-%d')}\n"
            f"- **Urgency:** {session['urgency']}\n\n"
            f"Shall I confirm and create this PR?"
        )
        return {
            "reply": summary,
            "session": session,
            "status": "ready_to_confirm"
        }
