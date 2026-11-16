# Cantill ProcureAI — Phase Gates & Exit Criteria

To ensure complete production robustness, the project is executed across 6 strict phases. Advancing to the next phase requires 100% of the previous phase's exit criteria to pass.

---

### Phase 1: Data Ingestion & Contract Parser Foundation
* **Scope**:
  - Ingest `master_data/` (`item_master.csv`, `supplier_master.csv`, `plants.csv`, `po_history.csv`).
  - Ingest `contracts/` (`contract_register.csv`, `contract_lines.csv`).
  - Implement PDF contract extractor in `app/engine/contracts.py` to parse signed contracts in `contracts/pdf/*.pdf` (e.g. `RC-2026-031`).
* **Gate 1 Exit Criteria**:
  - [ ] 73 items, 48 suppliers, 2 plants, and ~525 historical POs loaded cleanly into typed models.
  - [ ] Contract register loaded and merged with PDF-only contracts.
  - [ ] Automated tests in `tests/test_data_loaders.py` pass with 100%.

---

### Phase 2: Deterministic Policy Engine & 14 Worked Examples
* **Scope**:
  - Implement Item Matching (code & fuzzy text).
  - Implement Requirement Clubbing (14-day creation / 7-day need-by window).
  - Implement Requirement Valuation (priority waterfall).
  - Implement Contract Ceiling tracking (atomic consumption).
  - Implement Decision Rules (Clauses 5.1 to 5.7).
  - Implement PO Consolidation (24h window).
* **Gate 2 Exit Criteria**:
  - [ ] Automated test suite `tests/test_engine_worked_examples.py` covering ALL 14 worked decisions from `Worked_Examples.pdf`.
  - [ ] **14 / 14 tests pass** with exact route, supplier, unit price, and clubbed group value.

---

### Phase 3: Preferred Supplier Ranking & Batch API
* **Scope**:
  - Implement multi-factor supplier ranking algorithm (548d POs, recency, contract bonus, on-time delivery %, quality).
  - Match the 3 example rankings from `Worked_Examples.pdf` (`ITM-1048`, `ITM-1036`, `ITM-1016`).
  - Implement `POST /api/process-batch` endpoint taking PR batch CSV and returning decisions.
  - Implement export CSV endpoint matching Section 4 schema.
* **Gate 3 Exit Criteria**:
  - [ ] Automated tests in `tests/test_supplier_ranking.py` match worked example rankings.
  - [ ] `POST /api/process-batch` processes `sample_pr_batch.csv` (186 lines) in <1.5 seconds.
  - [ ] Output CSV validated against required 13 columns.

---

### Phase 4: Policy as Data & Chat Intake Assistant
* **Scope**:
  - Implement versioned `Policy` data store (`app/models/policy.py`, `app/policy_manager/`).
  - Implement amendment reader: parses natural language / PDF amendments, generates plain-language diff, and hot-swaps active policy version without code deployment.
  - Implement Chat Intake Assistant: handles natural language requests (*"need 200 nitrile gloves for Chakan by next Friday"*), asks follow-ups, and creates PRs.
* **Gate 4 Exit Criteria**:
  - [ ] Amendment test: dynamically modify limits (e.g., raise Spot PO threshold) and verify that decisions change automatically.
  - [ ] Chat intake handles vague descriptions, rejects unmatchable items, and validates required fields.
  - [ ] Automated tests in `tests/test_policy_amendment.py` pass 100%.

---

### Phase 5: Buyer Workspace UI, Packaging & Cloud Deployment
* **Scope**:
  - Build modern, restrained Buyer Workspace UI (Approve, Override with mandatory comment, Audit logs).
  - Multi-service `docker-compose.yml` with health checks.
  - Cross-platform setup scripts (`scripts/setup.sh`, `scripts/setup.ps1`, `scripts/start_dev.sh`).
  - Deploy to free cloud platform (Render / Railway / Vercel) and verify public URL.
* **Gate 5 Exit Criteria**:
  - [ ] Local one-command run verified: `docker compose up` starts app and passes healthcheck.
  - [ ] Hosted public URL live and accessible.
  - [ ] `README.md`, `DECISIONS.md`, and `APPROACH.md` completed.

---

### Phase 6: Blind Test Execution (Thursday Nov 19, 10:00 AM – 12:00 PM IST)
* **Scope**:
  - Ingest blind test PR batch and policy amendment.
  - Generate `submission/aditya_kumar__run1.csv` (v5.0).
  - Upload amendment through UI, activate, and generate `submission/aditya_kumar__run2.csv` (v5.x).
  - Export `submission/aditya_kumar__preferred.csv` as of the specified date.
  - Commit and push to public GitHub repo before 12:00 noon IST.
