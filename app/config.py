"""
Cantill ProcureAI Configuration & Path Settings
"""
import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", BASE_DIR / "data"))

# Subdirectory Paths
MASTER_DATA_DIR = DATA_DIR / "master_data"
CONTRACTS_DIR = DATA_DIR / "contracts"
CONTRACTS_PDF_DIR = CONTRACTS_DIR / "pdf"
PR_BATCHES_DIR = DATA_DIR / "pr_batches"
SUBMISSION_DIR = BASE_DIR / "submission"

# Master Data Files
PLANTS_CSV = MASTER_DATA_DIR / "plants.csv"
SUPPLIER_MASTER_CSV = MASTER_DATA_DIR / "supplier_master.csv"
ITEM_MASTER_CSV = MASTER_DATA_DIR / "item_master.csv"
PO_HISTORY_CSV = MASTER_DATA_DIR / "po_history.csv"

# Contract Files
CONTRACT_REGISTER_CSV = CONTRACTS_DIR / "contract_register.csv"
CONTRACT_LINES_CSV = CONTRACTS_DIR / "contract_lines.csv"

# Sample PR Batch
SAMPLE_PR_BATCH_CSV = PR_BATCHES_DIR / "sample_pr_batch.csv"

# Policy v5.0 Constants
ACTIVE_POLICY_VERSION = "v5.0"
POLICY_EFFECTIVE_DATE = "2026-04-01"
