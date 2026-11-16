# Cantill ProcureAI — Project Context & Status

## 1. Executive Summary
**Cantill ProcureAI** is an enterprise-grade, policy-driven procurement intelligence platform built for **Corvo Engineering** as part of the **Cantill.ai Full-Stack Intern Coding Challenge (Straightops Global)**.

Employees raise purchase requisitions (PRs) conversationally through an intelligent Chat Intake assistant or batch CSV uploads. The core decision engine strictly interprets a **versioned policy schema (stored as data, not code)** to determine whether each line becomes an automated Purchase Order (`CONTRACT_PO`, `EMERGENCY_PO`, `SPOT_PO`) or triggers sourcing (`RFQ`, `RFP`, `CAPEX_SOURCING`, `NEW_ITEM_SOURCING`). When Procurement uploads an amendment document, the system diffs, versions, and hot-activates the new policy without code redeployment.

---

## 2. Fixed Data & Folder Structure

```text
cantill-procure-ai/
├── AGENTS.md                          # Authoritative operational instructions
├── PROJECT_CONTEXT.md                 # System overview and status handoff
├── .gitignore                         # Excludes data files, secrets, build artifacts
├── docker-compose.yml                 # Multi-service local production stack
├── requirements.txt                   # Verified Python dependencies
├── app/
│   ├── __init__.py
│   ├── main.py                        # FastAPI entry point & API routes
│   ├── config.py                      # Environment and path settings
│   ├── models/                        # Pydantic schemas & SQL models
│   │   ├── policy.py                  # Policy-as-data schema (limits, clauses, rules)
│   │   ├── procurement.py             # Item, Supplier, Contract, PR, PO models
│   │   └── decisions.py               # Output schemas matching Cantill spec
│   ├── engine/                        # Deterministic Core Procurement Engine
│   │   ├── matcher.py                 # Item matching (code & fuzzy description)
│   │   ├── clubber.py                 # 14-day creation / 7-day need-by requirement clubbing
│   │   ├── valuation.py               # Pricing priority: contract rate > 365d PO > std price
│   │   ├── contracts.py               # Ceiling tracking, rate selection, PDF parser
│   │   ├── rules.py                   # Sequential rule interpreter (Clauses 5.1-5.7)
│   │   ├── supplier_ranker.py         # Preferred supplier multi-metric ranking
│   │   └── consolidator.py            # PO consolidation within 24h (Clause 7)
│   ├── policy_manager/                # Policy as Data Management
│   │   ├── store.py                   # Versioned policy registry
│   │   ├── amendment_parser.py        # PDF/text amendment reader & diff generator
│   │   └── diff_viewer.py             # Natural language change explanation
│   ├── assistant/                     # Conversational Intake
│   │   ├── chat.py                    # Follow-up questions, entity extraction
│   │   └── llm_provider.py            # Local Ollama / Gemini / OpenAI adapter
│   └── static/                        # Production Buyer Workspace UI
│       ├── index.html                 # Single-page workspace with Chat & Dashboard
│       ├── app.css                    # Professional enterprise styling
│       └── app.js                     # State management, batch upload, live diffing
├── data/                              # Task kit data (LOCAL ONLY, GITIGNORED)
│   ├── master_data/                   # item_master, supplier_master, po_history, plants
│   ├── contracts/                     # contract_register, contract_lines, pdf/
│   └── pr_batches/                    # sample_pr_batch.csv
├── submission/                        # Final blind test outputs
│   ├── aditya_kumar__run1.csv
│   ├── aditya_kumar__run2.csv
│   └── aditya_kumar__preferred.csv
├── docs/                              # Architecture, Decisions, Approach
│   ├── ARCHITECTURE.md                # System map and data flow diagrams
│   ├── TECH_STACK.md                  # Component justifications
│   ├── DECISIONS.md                   # 14 worked decisions & ambiguity rationales
│   ├── APPROACH.md                    # Coding tools & methodology used
│   ├── PHASE_GATES.md                 # 5 phases with pass/fail criteria
│   ├── NEXT_TASK.md                   # Immediate active task
│   └── PROGRESS.md                    # Work completed and verification logs
├── scripts/                           # Cross-platform automation
│   ├── setup.sh / setup.ps1           # One-command installer
│   ├── start_dev.sh / start_dev.ps1   # Multi-service launcher
│   └── status.sh / status.ps1         # System health diagnostic
└── tests/                             # Comprehensive test suites
    ├── test_engine_worked_examples.py # 14/14 ground-truth worked examples
    ├── test_supplier_ranking.py       # Preferred supplier validation
    ├── test_policy_amendment.py       # Dynamic policy change without code
    └── test_batch_api.py              # Output CSV format & endpoint checks
```

---

## 3. Technology Stack

| Layer | Component | Version / Identifier | Rationale |
|---|---|---|---|
| Runtime | Python | 3.12 / 3.13 | High performance, typed ecosystem |
| API Framework | FastAPI + Uvicorn | >=0.110.0 | Async ASGI, auto OpenAPI docs, high speed |
| Data Validation | Pydantic v2 | >=2.6.0 | Strict schema enforcement, fast C-core |
| Storage & Ingestion | Pandas / DuckDB / SQLite | Native / in-process | Blazing fast CSV and relational data querying |
| Text Similarity | RapidFuzz / SentenceTransformers | Built-in | Sub-millisecond item description fuzzy matching |
| Policy & PDF Parser | PyPDF / pdfplumber | Built-in | Contract PDF and policy amendment extraction |
| Frontend | Vanilla Modern HTML5/CSS3/JS | Native | Zero-build, fast, embeddable, lightweight |
| AI Integration | Ollama / Gemini / OpenAI Adapter | Configurable | Zero paid dependency default + cloud fallback |
| Testing | Pytest | >=8.0.0 | Automated regression testing |
| Containerization | Docker Compose | Standard | One-command local run (`docker compose up`) |

---

## 4. Phase Status Overview

- [x] **Phase 0: Workspace Setup & Specification**: Initialized repo, `.gitignore`, task data isolation, `AGENTS.md`, and `PROJECT_CONTEXT.md`.
- [ ] **Phase 1: Architecture, Decisions & Data Foundation**: Master data loaders, contract PDF reader, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`.
- [ ] **Phase 2: Deterministic Policy Engine (v5.0 as Data)**: Item matching, 14-day clubbing, valuation, rule evaluation (5.1-5.7), PO consolidation, and 14/14 worked example tests.
- [ ] **Phase 3: Preferred Supplier Ranking & Batch Processing API**: Multi-factor supplier ranking, `POST /api/process-batch`, CSV export formatting.
- [ ] **Phase 4: Policy as Data & Conversational Chat Intake**: Dynamic policy amendment reader, visual diff preview, chat-based PR creator with follow-ups.
- [ ] **Phase 5: Buyer Workspace UI, Packaging & Cloud Deployment**: Interactive UI, `docker-compose.yml`, setup scripts, public GitHub repo, and live cloud deployment.
- [ ] **Phase 6: Blind Test Execution (Thursday Nov 19, 10:00 AM - 12:00 PM IST)**: Execute Run 1, Run 2, and Preferred Supplier export; push to `submission/`.
