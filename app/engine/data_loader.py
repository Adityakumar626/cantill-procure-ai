"""
Cantill ProcureAI Master Data and Contract Loaders
"""
import csv
import re
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Optional
import pypdf

from app.config import (
    PLANTS_CSV,
    SUPPLIER_MASTER_CSV,
    ITEM_MASTER_CSV,
    PO_HISTORY_CSV,
    CONTRACT_REGISTER_CSV,
    CONTRACT_LINES_CSV,
    CONTRACTS_PDF_DIR,
)
from app.models.procurement import (
    Plant,
    Item,
    Supplier,
    POHistoryRecord,
    Contract,
    ContractLine,
)

def parse_date(date_str: str) -> date:
    """Parse YYYY-MM-DD string to date."""
    return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()

def parse_datetime(dt_str: str) -> datetime:
    """Parse YYYY-MM-DD HH:MM string to datetime."""
    dt_str = dt_str.strip()
    try:
        return datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    except ValueError:
        return datetime.strptime(dt_str, "%Y-%m-%d")

class MasterDataLoader:
    def __init__(
        self,
        plants_path: Path = PLANTS_CSV,
        suppliers_path: Path = SUPPLIER_MASTER_CSV,
        items_path: Path = ITEM_MASTER_CSV,
        po_history_path: Path = PO_HISTORY_CSV,
        contract_register_path: Path = CONTRACT_REGISTER_CSV,
        contract_lines_path: Path = CONTRACT_LINES_CSV,
        pdf_contracts_dir: Path = CONTRACTS_PDF_DIR,
    ):
        self.plants_path = plants_path
        self.suppliers_path = suppliers_path
        self.items_path = items_path
        self.po_history_path = po_history_path
        self.contract_register_path = contract_register_path
        self.contract_lines_path = contract_lines_path
        self.pdf_contracts_dir = pdf_contracts_dir

        self.plants: Dict[str, Plant] = {}
        self.suppliers: Dict[str, Supplier] = {}
        self.items: Dict[str, Item] = {}
        self.po_history: List[POHistoryRecord] = []
        self.contracts: Dict[str, Contract] = {}

    def load_all(self):
        """Load and link all master data and contracts."""
        self.load_plants()
        self.load_suppliers()
        self.load_items()
        self.load_po_history()
        self.load_contracts()
        self.augment_pdf_contracts()

    def load_synthetic_demo_data(self):
        """Loads non-confidential synthetic demo master data for cloud inspection when task data is absent."""
        demo_dir = Path(__file__).resolve().parent.parent / "demo_data"
        if not demo_dir.exists():
            return
        demo_loader = MasterDataLoader(
            plants_path=demo_dir / "master_data" / "plants.csv",
            suppliers_path=demo_dir / "master_data" / "supplier_master.csv",
            items_path=demo_dir / "master_data" / "item_master.csv",
            po_history_path=demo_dir / "master_data" / "po_history.csv",
            contract_register_path=demo_dir / "contracts" / "contract_register.csv",
            contract_lines_path=demo_dir / "contracts" / "contract_lines.csv",
            pdf_contracts_dir=demo_dir / "contracts" / "pdf"
        )
        demo_loader.load_all()
        self.plants = demo_loader.plants
        self.suppliers = demo_loader.suppliers
        self.items = demo_loader.items
        self.po_history = demo_loader.po_history
        self.contracts = demo_loader.contracts

    def load_plants(self) -> Dict[str, Plant]:
        self.plants = {}
        if not self.plants_path.exists():
            return self.plants
        with open(self.plants_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                p = Plant(plant=row["plant"].strip(), name=row["name"].strip())
                self.plants[p.plant] = p
        return self.plants

    def load_suppliers(self) -> Dict[str, Supplier]:
        self.suppliers = {}
        if not self.suppliers_path.exists():
            return self.suppliers
        with open(self.suppliers_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Categories can be separated by semicolon or comma
                cats = [c.strip() for c in re.split(r"[,;]", row["categories"]) if c.strip()]
                s = Supplier(
                    supplier_id=row["supplier_id"].strip(),
                    name=row["name"].strip(),
                    city=row["city"].strip(),
                    categories=cats,
                    status=row["status"].strip(),
                    on_time_pct=float(row["on_time_pct"]),
                    quality_rating=float(row["quality_rating"]),
                )
                self.suppliers[s.supplier_id] = s
        return self.suppliers

    def load_items(self) -> Dict[str, Item]:
        self.items = {}
        if not self.items_path.exists():
            return self.items
        with open(self.items_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                it = Item(
                    item_code=row["item_code"].strip(),
                    description=row["description"].strip(),
                    uom=row["uom"].strip(),
                    category=row["category"].strip(),
                    item_type=row["item_type"].strip(),
                    standard_price=float(row["standard_price"]),
                )
                self.items[it.item_code] = it
        return self.items

    def load_po_history(self) -> List[POHistoryRecord]:
        self.po_history = []
        if not self.po_history_path.exists():
            return self.po_history
        with open(self.po_history_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rec = POHistoryRecord(
                    po_number=row["po_number"].strip(),
                    po_date=parse_date(row["po_date"]),
                    supplier_id=row["supplier_id"].strip(),
                    item_code=row["item_code"].strip(),
                    quantity=float(row["quantity"]),
                    uom=row["uom"].strip(),
                    unit_price=float(row["unit_price"]),
                    plant=row["plant"].strip(),
                    delivered_on_time=(row["delivered_on_time"].strip().lower() == "true"),
                )
                self.po_history.append(rec)
        return self.po_history

    def load_contracts(self) -> Dict[str, Contract]:
        self.contracts = {}
        if not self.contract_register_path.exists():
            return self.contracts

        with open(self.contract_register_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c = Contract(
                    contract_id=row["contract_id"].strip(),
                    supplier_id=row["supplier_id"].strip(),
                    supplier_name=row["supplier_name"].strip(),
                    start_date=parse_date(row["start_date"]),
                    end_date=parse_date(row["end_date"]),
                    value_cap=float(row["value_cap"]),
                    consumed_value=float(row["consumed_value"]),
                    lines={},
                )
                self.contracts[c.contract_id] = c

        if self.contract_lines_path.exists():
            with open(self.contract_lines_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cid = row["contract_id"].strip()
                    if cid in self.contracts:
                        cl = ContractLine(
                            contract_id=cid,
                            item_code=row["item_code"].strip(),
                            description=row["description"].strip(),
                            uom=row["uom"].strip(),
                            rate=float(row["rate"]),
                        )
                        self.contracts[cid].lines[cl.item_code] = cl

        return self.contracts

    def parse_pdf_contract(self, pdf_path: Path) -> Optional[Contract]:
        """Extract contract metadata and Schedule A items from a PDF."""
        try:
            reader = pypdf.PdfReader(pdf_path)
            if not reader.pages:
                return None
            text = reader.pages[0].extract_text()
            if not text:
                return None

            cid_m = re.search(r"Contract No\.\s*([A-Z0-9-]+)", text)
            if not cid_m:
                return None
            contract_id = cid_m.group(1).strip()

            supp_m = re.search(r"and\s+([^\n,]+).*?\(Supplier ID\s+([A-Z0-9]+)\)", text, re.DOTALL)
            if not supp_m:
                return None
            supplier_name = supp_m.group(1).strip()
            supplier_id = supp_m.group(2).strip()

            term_m = re.search(r"valid from\s+([0-9]{4}-[0-9]{2}-[0-9]{2})\s+to\s+([0-9]{4}-[0-9]{2}-[0-9]{2})", text)
            if not term_m:
                return None
            start_date = parse_date(term_m.group(1))
            end_date = parse_date(term_m.group(2))

            cap_m = re.search(r"not exceed INR\s+([0-9,]+)", text)
            if not cap_m:
                return None
            value_cap = float(cap_m.group(1).replace(",", ""))

            contract = Contract(
                contract_id=contract_id,
                supplier_id=supplier_id,
                supplier_name=supplier_name,
                start_date=start_date,
                end_date=end_date,
                value_cap=value_cap,
                consumed_value=0.0,
                lines={},
            )

            # Parse lines from Schedule A table
            for line in text.split("\n"):
                m = re.match(r"^\s*\d+\s+(ITM-\d+)\s+(.+?)\s+([A-Z]+)\s+([0-9,]+\.[0-9]{2})\s*$", line)
                if m:
                    cl = ContractLine(
                        contract_id=contract_id,
                        item_code=m.group(1).strip(),
                        description=m.group(2).strip(),
                        uom=m.group(3).strip(),
                        rate=float(m.group(4).replace(",", "")),
                    )
                    contract.lines[cl.item_code] = cl

            return contract
        except Exception:
            return None

    def augment_pdf_contracts(self):
        """Scan pdf/ directory and add any contracts signed after register update (e.g. RC-2026-031)."""
        if not self.pdf_contracts_dir.exists():
            return

        for pdf_path in self.pdf_contracts_dir.glob("*.pdf"):
            parsed = self.parse_pdf_contract(pdf_path)
            if parsed:
                if parsed.contract_id not in self.contracts:
                    # New contract signed after register update (starts at consumed_value = 0)
                    self.contracts[parsed.contract_id] = parsed
                else:
                    # If lines are missing in CSV, populate them from PDF
                    existing = self.contracts[parsed.contract_id]
                    if not existing.lines:
                        existing.lines = parsed.lines
