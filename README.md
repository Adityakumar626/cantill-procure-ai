# ⚡ Cantill ProcureAI — Corvo Engineering Procurement Intelligence

[![Test Suite](https://img.shields.io/badge/pytest-44%20passed%20%28100%25%29-brightgreen.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)]()
[![Architecture](https://img.shields.io/badge/architecture-Policy--as--Data-indigo.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

> **Submission for Cantill.ai (Straightops Global) Full-stack Intern Coding Challenge (Round 1)**  
> **Candidate:** Aditya Kumar  
> **Target Manufacturer:** Corvo Engineering (Plants: PUN1 - Bhosari & CHK1 - Chakan)  
> **Repository:** Public (Strictly zero task data committed in compliance with challenge rules)

---

## 📌 Executive Summary

**Cantill ProcureAI** is an enterprise-grade, policy-driven procurement intelligence platform designed for **Corvo Engineering**. It transforms raw purchase requests (PRs) submitted via natural language chat or batch CSVs into compliant Purchase Orders (POs) or structured Sourcing Events (RFQs/RFPs) by strictly enforcing Corvo's procurement policy.

### 🌟 Key Innovations
1. **Policy Stored as Data, Not Code**: Business rules, spending thresholds, and clubbing windows live in versioned schemas (`ProcurementPolicy`). Policy amendments (e.g. v5.0 to v5.1) are previewed with plain-language diffs and hot-activated at runtime without touching a single line of application code or restarting servers.
2. **Deterministic 8-Clause Decision Engine**: Fully reproduces 100% of the 14 worked decisions in `Worked_Examples.pdf` and adheres strictly to Clauses 1–8 of the Corvo Procurement Policy.
3. **Anti-PO-Splitting & 14-Day Clubbing**: Automatically clusters PR lines for identical items and plants created within 14 calendar days into single requirements, computing aggregate spend and preventing rogue micro-spend.
4. **Dynamic Ceiling & PDF Contract Ingestion**: Tracks cumulative contract commitments against value caps in real time, automatically extracting and augmenting PDF-only contracts signed after master register freezes.
5. **Multi-Factor Supplier Ranking Formula**: Dynamically scores active suppliers based on 548-day PO history, exponential recency weighting, active contract bonuses, on-time delivery percentages, and quality ratings.
6. **24-Hour PO Consolidation**: Consolidates approved requirements going to the same supplier, plant, and route within 24 hours into unified Purchase Orders (`PO-XXXX`).
7. **Conversational PR Intake Assistant**: Interactive natural-language interface allowing factory floor workers to describe requirements naturally while asking smart follow-ups for missing fields (plant, quantity, need-by date).
8. **Buyer Decision Workspace**: Executive UI featuring real-time KPI metrics, route badges, rate contract ceiling visualizers, and manual buyer overrides with mandatory audit justification logging.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Intake ["1. INTAKE LAYER"]
        A1[Conversational Chat Intake] --> B[PR Normalization]
        A2[Batch CSV Ingestion] --> B
    end

    subgraph Pipeline ["2. 6-STAGE POLICY PIPELINE"]
        B --> C[Stage 1: Clause 1 Item Matcher<br/>Code Lookup + Abbr/Fuzzy Fallback]
        C --> D[Stage 2: Clause 2 Anti-Split Clubber<br/>14d Window / 7d Need-By Earliest Date]
        D --> E[Stage 3: Clause 4 Contract Applicability<br/>Ceiling Check & Rate Selection]
        E --> F[Stage 4: Clause 3 Requirement Valuation<br/>Contract Rate > 365d PO > Std Price]
        F --> G[Stage 5: Clause 5 & 6 Policy Routing<br/>Supplier Ranker & Sourcing Top-Up]
        G --> H[Stage 6: Clause 7 PO Consolidator<br/>Same Supplier + Plant + 24h Window]
    end

    subgraph Output ["3. BUYER WORKSPACE & EXPORTS"]
        H --> I1[13-Column Decision CSV Export]
        H --> I2[Preferred Supplier Ranking CSV]
        H --> I3[Interactive Buyer Decision Workspace]
        H --> I4[Audit Log & Override Management]
    end

    subgraph PolicyData ["POLICY AS DATA STORE"]
        P[ProcurementPolicy JSON / Object]<br/>v5.0 Active --> G
        P_Diff[Natural Language Diff Generator] --> P
    end
```

---

## 📋 The 13-Column Output Schema

The engine outputs the exact 13-column schema specified in Task Brief Section 4:

| Column | Type | Example | Description |
|---|---|---|---|
| `pr_no` | String | `PR-26-00174` | Original purchase requisition number |
| `pr_line` | Integer | `1` | Line number within PR |
| `resolved_item_code` | String | `ITM-1033` | Resolved item code from master (`NEW` if uncataloged) |
| `group_id` | String | `REQ-0001` | Clubbed requirement identifier |
| `po_id` | String | `PO-0001` | Consolidated PO identifier (blank if sourcing) |
| `decision` | Enum | `PO` / `SOURCING_REQUEST` | High-level decision |
| `route` | Enum | `SPOT_PO` | Specific procurement route |
| `supplier_id` | String | `S020` | Awarded supplier ID (blank if sourcing) |
| `unit_price` | Float (2dp) | `65837.89` | Unit price in INR |
| `group_value_inr` | Float (2dp) | `131675.78` | Total value of clubbed requirement |
| `suggested_supplier_ids` | String | `S020;S024;S022` | Semicolon-separated supplier IDs for sourcing |
| `policy_version` | String | `v5.0` | Policy version applied to make decision |
| `reason` | String | `Clause 5.4: Spot PO...` | Clear human-readable justification citing clause |

---

## 🚀 Quickstart Guide

You can launch Cantill ProcureAI in **under 60 seconds** using any of the following methods:

### Method 1: Local Automated Setup (macOS / Linux)
```bash
# Clone the repository
git clone https://github.com/adityakumar/cantill-procure-ai.git
cd cantill-procure-ai

# Run one-command setup (creates venv, installs deps, runs test suite)
./scripts/setup.sh

# Launch the application
./scripts/start_dev.sh
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### Method 2: Windows PowerShell
```powershell
# In PowerShell:
.\scripts\setup.ps1
.\scripts\start_dev.ps1
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### Method 3: One-Command Docker Run
```bash
docker compose up --build
```
The application will launch on **http://localhost:8000** with health checks configured.

---

## 🧪 Blind-Test Execution Guide (Thursday 10:00 AM – 12:00 noon IST)

On Thursday morning when the blind test data set and policy amendment email arrives, run the following automated CLI commands without touching any application code:

```bash
# Ensure virtual environment is active
source .venv/bin/activate

# 1. Generate Run 1 (Under Policy v5.0 on blind test batch)
python scripts/run_batch.py \
  --input path/to/blind_test_pr_batch.csv \
  --output submission/aditya_kumar__run1.csv \
  --policy v5.0

# 2. Generate Preferred Supplier Rankings (as of specified date)
python scripts/export_preferred.py \
  --date 2026-11-01 \
  --output submission/aditya_kumar__preferred.csv

# 3. Update Policy via Web UI or API (Policy as Data - Zero Code Change)
# Navigate to http://localhost:8000 -> Policy as Data tab
# Input the amended thresholds -> Preview Plain-Language Diff -> Click "Approve & Activate"

# 4. Generate Run 2 (Under Amended Policy v5.1)
python scripts/run_batch.py \
  --input path/to/blind_test_pr_batch.csv \
  --output submission/aditya_kumar__run2.csv \
  --policy v5.1

# 5. Verify submission directory contents
ls -lh submission/
# Expected:
#   aditya_kumar__run1.csv
#   aditya_kumar__run2.csv
#   aditya_kumar__preferred.csv

# 6. Commit and push before 12:00 noon IST
git add submission/
git commit -m "Submit Round 1 blind-test results (Aditya Kumar)"
git push origin main
```

---

## 🏆 Preferred Supplier Ranking Formula

The engine implements the exact formula documented in `docs/DECISIONS.md` matching Worked Examples Page 5:

$$\text{Score} = (40 \times \text{Recency}) + (15 \times \text{Contract}) + (5 \times \min(\text{POs}, 10)) + (10 \times \frac{\text{OTD}}{100}) + (10 \times \frac{\text{Quality}}{5.0})$$

Where:
- **Recency Factor**: $1.0$ if PO placed in last 90 days; $0.5$ if placed in 91–365 days; $0.2$ if placed in 366–548 days.
- **Contract Bonus**: $1.0$ if supplier has an active rate contract for the item on the requirement date; else $0.0$.
- **Volume Factor**: Scaled by number of historical POs up to 10.
- **OTD & Quality**: Direct metrics from `supplier_master.csv`.

---

## 📊 Verification & Test Coverage

The test suite contains **44 automated tests** verifying every clause, endpoint, adversarial boundary, SPA route persistence, and runtime policy synchronization:

```bash
.venv/bin/pytest -v
```

```text
============================== test session starts ==============================
collected 44 items

tests/test_adversarial_and_edge_cases.py (11 tests) .............. PASSED [ 25%]
tests/test_api_endpoints.py (11 tests) ........................... PASSED [ 50%]
tests/test_data_loaders.py (1 test) .............................. PASSED [ 52%]
tests/test_engine_worked_examples.py (15 tests) .................. PASSED [ 86%]
tests/test_policy_synchronization_regression.py (6 tests) ........ PASSED [100%]

============================== 44 passed in 6.26s ==============================
```

---

## 📑 Documentation Links

- **Engineering Audit**: [`ENGINEERING_AUDIT.md`](ENGINEERING_AUDIT.md)
- **Independent Readiness Report**: [`FINAL_READINESS_REPORT.md`](FINAL_READINESS_REPORT.md)
- **Policy Rule Synchronization Report**: [`FINAL_FIX_REPORT.md`](FINAL_FIX_REPORT.md)
- **Architectural & Policy Decisions**: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- **Detailed System Architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Methodology & AI Declaration**: [`docs/APPROACH.md`](docs/APPROACH.md)
- **Phase Gate Status & Progress**: [`docs/PHASE_GATES.md`](docs/PHASE_GATES.md)

---

## 👤 Author & Candidate Details

- **Candidate Name:** Aditya Kumar
- **Role:** Full-stack Intern (Round 1)
- **Company:** Cantill.ai (Straightops Global)
- **Submission Form:** [Microsoft Forms Response](https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=L-xCg4_CR0CR-YQsCmj4pdcT2X448GxOtp34W8QAFaRUNkhWMk1OU1M1UFRaV0RXUk5QR1FHOVFQTi4u)
- **License:** MIT
