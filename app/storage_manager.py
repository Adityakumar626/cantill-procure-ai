"""
Cantill ProcureAI Persistent Storage Manager
Manages persistence for Buyer Overrides, Approvals, Chat Requisitions, and Custom Contracts.
Guarantees audit records survive service reloads and sequential batches.
"""
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from app.config import BASE_DIR

STORAGE_DIR = BASE_DIR / "app" / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

OVERRIDES_FILE = STORAGE_DIR / "overrides.json"
APPROVALS_FILE = STORAGE_DIR / "approvals.json"
CHAT_PRS_FILE = STORAGE_DIR / "chat_prs.json"
CUSTOM_CONTRACTS_FILE = STORAGE_DIR / "custom_contracts.json"

class StorageManager:
    def __init__(self, storage_dir: Path = STORAGE_DIR):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.overrides_file = self.storage_dir / "overrides.json"
        self.approvals_file = self.storage_dir / "approvals.json"
        self.chat_prs_file = self.storage_dir / "chat_prs.json"
        self.custom_contracts_file = self.storage_dir / "custom_contracts.json"

    # --- Overrides ---
    def load_overrides(self) -> Dict[str, Dict[str, Any]]:
        """Loads buyer overrides mapping group_id -> override record."""
        if not self.overrides_file.exists():
            return {}
        try:
            with open(self.overrides_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_override(
        self,
        group_id: str,
        new_route: str,
        new_decision: str,
        comment: str,
        buyer_name: str = "Aditya Kumar",
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """Saves a buyer override with mandatory audit comment and timestamp."""
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M")
        record = {
            "group_id": group_id,
            "new_route": new_route,
            "new_decision": new_decision,
            "comment": comment.strip(),
            "buyer_name": buyer_name.strip(),
            "timestamp": ts
        }
        overrides = self.load_overrides()
        overrides[group_id] = record
        with open(self.overrides_file, "w", encoding="utf-8") as f:
            json.dump(overrides, f, indent=2)
        return record

    # --- Approvals ---
    def load_approvals(self) -> Dict[str, Dict[str, Any]]:
        """Loads buyer approvals mapping group_id -> approval record."""
        if not self.approvals_file.exists():
            return {}
        try:
            with open(self.approvals_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_approval(
        self,
        group_id: str,
        buyer_name: str = "Aditya Kumar",
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """Records approval for a requirement (or 'ALL') with who and when."""
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M")
        record = {
            "group_id": group_id,
            "buyer_name": buyer_name.strip(),
            "timestamp": ts,
            "status": "APPROVED"
        }
        approvals = self.load_approvals()
        approvals[group_id] = record
        with open(self.approvals_file, "w", encoding="utf-8") as f:
            json.dump(approvals, f, indent=2)
        return record

    # --- Chat Requisitions ---
    def load_chat_prs(self) -> List[Dict[str, Any]]:
        """Loads confirmed chat requisitions."""
        if not self.chat_prs_file.exists():
            return []
        try:
            with open(self.chat_prs_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def save_chat_pr(self, pr_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Appends a confirmed chat requisition to persistent store."""
        prs = self.load_chat_prs()
        if not pr_dict.get("pr_no"):
            pr_dict["pr_no"] = f"PR-26-CHAT-{len(prs)+1:04d}"
        if not pr_dict.get("pr_line"):
            pr_dict["pr_line"] = 1
        if not pr_dict.get("created_at"):
            pr_dict["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        prs.append(pr_dict)
        with open(self.chat_prs_file, "w", encoding="utf-8") as f:
            json.dump(prs, f, indent=2)
        return pr_dict

    # --- Custom Contracts ---
    def load_custom_contracts(self) -> List[Dict[str, Any]]:
        """Loads manually registered or uploaded custom contracts."""
        if not self.custom_contracts_file.exists():
            return []
        try:
            with open(self.custom_contracts_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def save_custom_contract(self, contract_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Appends a custom contract to persistent store."""
        contracts = self.load_custom_contracts()
        # Replace if same contract_id exists
        contracts = [c for c in contracts if c.get("contract_id") != contract_dict.get("contract_id")]
        contracts.append(contract_dict)
        with open(self.custom_contracts_file, "w", encoding="utf-8") as f:
            json.dump(contracts, f, indent=2)
        return contract_dict

storage_manager = StorageManager()
