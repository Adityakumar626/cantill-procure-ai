"""
Conversational PR Intake Assistant
Integrates Google Gemini 2.0 Flash with In-Context Catalog Grounding,
backed by an offline deterministic regex & fuzzy matcher fail-safe.
"""
import os
import re
import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import httpx

from app.config import GEMINI_API_KEY, GEMINI_MODEL
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

    def _call_gemini_llm(self, session: Dict[str, Any], user_message: str) -> Optional[Dict[str, Any]]:
        """Calls Google Gemini 2.0 Flash REST API with in-context catalog grounding."""
        api_key = os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY
        if not api_key:
            return None

        model = os.environ.get("GEMINI_MODEL") or GEMINI_MODEL or "gemini-2.0-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        # In-context catalog representation (~1,500 tokens)
        catalog_lines = [
            f"- {code}: {item.description} ({item.uom}, Category: {item.category})"
            for code, item in self.items.items()
        ]
        catalog_text = "\n".join(catalog_lines)
        today_str = date.today().strftime("%Y-%m-%d")

        system_prompt = f"""You are the Corvo Engineering Procurement Assistant for manufacturing plants PUN1 (Bhosari, Pune) and CHK1 (Chakan, Pune).
Today's evaluation date is: {today_str}.

Corvo Engineering Master Catalog (73 items):
{catalog_text}

Task:
Parse the employee's natural language request and output a strict JSON object:
1. Match requested item to the closest catalog item code (e.g. ITM-1048 for gloves, ITM-1036 for bearings). If uncataloged new item, set item_code to "NEW".
2. Extract quantity (float) and UOM (e.g. NOS, PAIR, KG, MTR).
3. Extract plant: "CHK1" (Chakan) or "PUN1" (Bhosari / Pune).
4. Extract need-by date in YYYY-MM-DD format (resolve relative dates like "next Friday", "tomorrow" starting from {today_str}).
5. Determine urgency: "Emergency" if breakdown/urgent/critical/sos, else "Normal".
6. Formulate a helpful, conversational assistant_reply. If any fields (item, quantity, plant, need-by date) are missing, politely ask the user for them.
7. Status: "ready_to_confirm" when all 4 core fields (item, qty, plant, need-by) exist; otherwise "collecting".

Respond ONLY with valid JSON matching this schema:
{{
  "assistant_reply": "string",
  "item_code": "string or null",
  "description": "string or null",
  "quantity": number or null,
  "uom": "string",
  "plant": "string or null",
  "need_by_date": "YYYY-MM-DD or null",
  "urgency": "Normal or Emergency",
  "status": "collecting or ready_to_confirm",
  "missing_fields": ["array of strings"]
}}"""

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"Current Draft Requisition: {json.dumps(session, default=str)}\n\nUser Message: {user_message}"}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }

        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return json.loads(raw_text)
                else:
                    logging.warning(f"Gemini API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logging.warning(f"Gemini API request failed or timed out: {e}")
            return None

        return None

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
                    "status": "created",
                    "engine_mode": "gemini_2.0_flash" if (os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY) else "offline_deterministic"
                }

        # 1. Attempt Gemini 2.0 Flash LLM Call if configured
        gemini_result = self._call_gemini_llm(session, message)
        if gemini_result:
            # Update session state with LLM extracted entities
            if gemini_result.get("item_code"):
                session["item_code"] = gemini_result["item_code"]
                if session["item_code"] in self.items:
                    matched = self.items[session["item_code"]]
                    session["description"] = matched.description
                    session["uom"] = matched.uom
                else:
                    session["description"] = gemini_result.get("description", "New Item")

            if gemini_result.get("quantity") is not None:
                session["quantity"] = float(gemini_result["quantity"])
            if gemini_result.get("uom"):
                session["uom"] = gemini_result["uom"]
            if gemini_result.get("plant"):
                session["plant"] = gemini_result["plant"]
            if gemini_result.get("urgency"):
                session["urgency"] = gemini_result["urgency"]
            if gemini_result.get("need_by_date"):
                try:
                    session["need_by_date"] = datetime.strptime(gemini_result["need_by_date"], "%Y-%m-%d").date()
                except (ValueError, TypeError):
                    pass

            status = gemini_result.get("status", "collecting")
            if session["item_code"] and session["quantity"] and session["plant"] and session["need_by_date"]:
                status = "ready_to_confirm"

            return {
                "reply": gemini_result.get("assistant_reply", "Understood."),
                "session": session,
                "status": status,
                "engine_mode": "gemini_2.0_flash"
            }

        # 2. Fallback: Deterministic Regex & Fuzzy Matcher Engine
        # Extract Quantity
        qty_m = re.search(r"\b(\d+)\s*(nos|kg|mtr|pair|ltr|job|bkt|units?)?\b", msg_lower)
        if qty_m and not session["quantity"]:
            session["quantity"] = float(qty_m.group(1))
            if qty_m.group(2):
                session["uom"] = qty_m.group(2).upper()

        # Extract Plant
        if "chakan" in msg_lower or "chk1" in msg_lower or "chk" in msg_lower:
            session["plant"] = "CHK1"
        elif "bhosari" in msg_lower or "pun1" in msg_lower or "pune" in msg_lower:
            session["plant"] = "PUN1"

        # Extract Urgency
        if any(w in msg_lower for w in ["emergency", "critical", "breakdown", "sos", "urgent"]):
            session["urgency"] = "Emergency"

        # Extract Need-by Date
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

        # Extract Item Description
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

        # Check missing attributes
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
                "status": "collecting",
                "engine_mode": "offline_deterministic"
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
            "status": "ready_to_confirm",
            "engine_mode": "offline_deterministic"
        }
