"""
Pytest configuration and global test isolation fixtures.
"""
import pytest
from pathlib import Path
from app.storage_manager import STORAGE_DIR

@pytest.fixture(autouse=True)
def clean_test_storage():
    """Ensures test runs start and finish with clean persistence state and v5.0 active."""
    files_to_clean = [
        STORAGE_DIR / "overrides.json",
        STORAGE_DIR / "approvals.json",
        STORAGE_DIR / "chat_prs.json",
        STORAGE_DIR / "custom_contracts.json"
    ]
    for f in files_to_clean:
        if f.exists():
            f.unlink()

    # Reset active policy pointer to v5.0
    active_policy_file = STORAGE_DIR / "active_policy.txt"
    with open(active_policy_file, "w", encoding="utf-8") as f:
        f.write("v5.0")

    from app.main import state
    from app.engine.pipeline import ProcurementPipeline
    if hasattr(state, "policy_store"):
        state.policy_store.activate_version("v5.0")
        state.pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())

    yield

    for f in files_to_clean:
        if f.exists():
            f.unlink()
    with open(active_policy_file, "w", encoding="utf-8") as f:
        f.write("v5.0")
    if hasattr(state, "policy_store"):
        state.policy_store.activate_version("v5.0")
        state.pipeline = ProcurementPipeline(state.loader, state.policy_store.get_active_policy())
