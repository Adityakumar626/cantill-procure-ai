"""
Phase 1 Tests: Data Loaders and Contract Parsing Verification
"""
import pytest
from app.engine.data_loader import MasterDataLoader

def test_master_data_loading():
    loader = MasterDataLoader()
    loader.load_all()

    # 1. Verify Plants
    assert len(loader.plants) == 2
    assert "PUN1" in loader.plants
    assert "CHK1" in loader.plants

    # 2. Verify Items
    assert len(loader.items) == 73
    assert "ITM-1002" in loader.items
    assert loader.items["ITM-1002"].category == "Steel & Metals"
    assert loader.items["ITM-1002"].standard_price == 9900.0

    # 3. Verify Suppliers
    assert len(loader.suppliers) == 48
    assert "S001" in loader.suppliers
    assert loader.suppliers["S001"].name == "Bhosari Steel Traders"
    assert loader.suppliers["S001"].is_active is True

    # 4. Verify PO History
    assert len(loader.po_history) == 468

    # 5. Verify Contracts (10 from CSV register + 2 from PDF)
    assert len(loader.contracts) == 12
    assert "RC-2025-011" in loader.contracts
    assert "RC-2026-031" in loader.contracts
    assert "RC-2026-033" in loader.contracts

    # 6. Verify PDF-Only Contract RC-2026-031 details
    c31 = loader.contracts["RC-2026-031"]
    assert c31.supplier_id == "S021"
    assert c31.value_cap == 2000000.0
    assert c31.consumed_value == 0.0
    assert "ITM-1037" in c31.lines
    assert c31.lines["ITM-1037"].rate == 2439.01
