"""
Clause 1: Item Resolution Engine
Matches PR line descriptions and codes against Corvo Engineering Item Master.
"""
import re
import difflib
from typing import Dict, Optional, Tuple
from app.models.procurement import Item

NOISE_WORDS = {
    "for", "maintenance", "urgent", "urgently", "requirement", "req",
    "stores", "spare", "spares", "plant", "shop", "floor", "dept"
}

ABBREVIATIONS = {
    r"\bbrg\b": "ball bearing",
    r"\bhyd\b": "hydraulic",
    r"\bpneu\b": "pneumatic",
    r"\bqty\b": "",
    r"\bnos\b": "",
}

def normalize_text(text: str) -> str:
    """Normalize text by expanding abbreviations, removing noise and standardizing spacing."""
    if not text:
        return ""
    text = text.lower().strip()
    for pattern, replacement in ABBREVIATIONS.items():
        text = re.sub(pattern, replacement, text)
    text = re.sub(r"[-/]", " ", text)
    text = re.sub(r"[^a-z0-9\s]", "", text)
    tokens = [w for w in text.split() if w not in NOISE_WORDS]
    return " ".join(tokens)

class ItemMatcher:
    def __init__(self, items: Dict[str, Item]):
        self.items = items
        self.normalized_catalog: Dict[str, Tuple[str, set]] = {}
        for code, item in items.items():
            norm_str = normalize_text(item.description)
            norm_tokens = set(norm_str.split())
            self.normalized_catalog[code] = (norm_str, norm_tokens)

    def resolve(self, item_code: Optional[str], description: str) -> str:
        """
        Resolves a PR line to a valid item_code in Item Master, or 'NEW'.
        Clause 1.1: If requester gave item code, use it. If not, match description.
        Clause 1.2: A line matching no item master item is 'NEW'.
        """
        # 1. Exact code provided and valid
        if item_code and item_code.strip():
            code = item_code.strip()
            if code in self.items:
                return code

        if not description or not description.strip():
            return "NEW"

        norm_input = normalize_text(description)
        tokens_input = set(norm_input.split())
        if not tokens_input:
            return "NEW"

        # 2. Exact normalized match
        for code, (norm_it, _) in self.normalized_catalog.items():
            if norm_input == norm_it:
                return code

        # 3. Token containment (all item tokens are in the input description)
        best_code: Optional[str] = None
        best_score = 0.0

        for code, (norm_it, tokens_it) in self.normalized_catalog.items():
            if not tokens_it:
                continue

            overlap = len(tokens_input & tokens_it)

            # Check if all tokens of the item are covered by the input
            if overlap == len(tokens_it):
                score = 0.90 + (len(tokens_it) / (len(tokens_input) + 1)) * 0.09
            # Check if all tokens of the input are covered by the item
            elif overlap == len(tokens_input):
                score = 0.85 + (len(tokens_input) / (len(tokens_it) + 1)) * 0.09
            else:
                score = difflib.SequenceMatcher(None, norm_input, norm_it).ratio()

            if score > best_score:
                best_score = score
                best_code = code

        # Threshold for fuzzy acceptance
        if best_score >= 0.72 and best_code:
            return best_code

        return "NEW"
