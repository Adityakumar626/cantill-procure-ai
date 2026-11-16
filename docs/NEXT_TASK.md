# Cantill ProcureAI — Next Active Task

## Current Active Task: Phase 6 — Blind-Test Readiness & Submission Preparation

### Objective:
Maintain standby readiness for the Blind-Test dataset release on **Thursday 19 Nov, 10:00 AM IST**.

### Immediate Checklist for Thursday 10:00 AM – 12:00 noon IST:
1. **Download Email Artifacts**:
   - Save the blind test batch CSV to `blind_test_batch.csv`.
   - Read the policy amendment details from the recruitment email.
2. **Execute Run 1 (Under Policy v5.0)**:
   ```bash
   python scripts/run_batch.py --input blind_test_batch.csv --output submission/aditya_kumar__run1.csv --policy v5.0
   ```
3. **Execute Preferred Suppliers Export**:
   ```bash
   python scripts/export_preferred.py --date 2026-11-01 --output submission/aditya_kumar__preferred.csv
   ```
4. **Apply Policy Amendment via Web UI / API**:
   - Open Buyer Workspace -> Policy as Data -> Enter amended thresholds -> Preview -> Click "Approve & Activate".
5. **Execute Run 2 (Under Policy Amendment v5.1)**:
   ```bash
   python scripts/run_batch.py --input blind_test_batch.csv --output submission/aditya_kumar__run2.csv --policy v5.1
   ```
6. **Push Submission Files**:
   - Verify all 3 CSVs exist in `submission/`:
     - `submission/aditya_kumar__run1.csv`
     - `submission/aditya_kumar__run2.csv`
     - `submission/aditya_kumar__preferred.csv`
   - Commit and push before 12:00 noon IST!
