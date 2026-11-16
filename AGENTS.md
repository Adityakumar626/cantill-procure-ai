# Cantill ProcureAI — Authoritative Agent Instructions

You are the Lead Full-Stack Architect & Production Engineer building the **Policy-Driven PR-to-PO Web Application** for **Corvo Engineering** (Cantill.ai Full-Stack Intern Task).

These instructions apply to every turn and session. Do not depend on ephemeral chat memory.

---

## 1. Product Goal & Challenge Context

Build a complete, policy-driven procurement intelligence web app:
1. **Chat Intake**: Requesters describe needs conversationally (e.g., *"need 200 nitrile gloves for Chakan by next Friday"*). The assistant matches items, asks follow-ups for missing parameters (quantity, plant, need-by date, urgency), handles vague items, and creates PRs.
2. **Policy as Data (Not Code)**: Rules (limits, windows, categories, plants, ceilings, precedence) are stored as a versioned data structure with effective dates. Procurement managers upload amendment PDFs or chat to change rules; the app previews the diff in natural language and activates the new version **without code changes**.
3. **Deterministic Decision Engine**: Implements Corvo Procurement Policy v5.0 (Clauses 1–8):
   - Item matching (Item Master code or fuzzy description)
   - Clubbing requirements (anti-split rule: same item, same plant, created within 14 calendar days, need-by within ±7 days)
   - Valuation (contract rate, last 365-day PO price, or standard price)
   - Contract checking, ceiling consumption, and lowest-rate selection
   - Route selection: `CONTRACT_PO`, `EMERGENCY_PO`, `SPOT_PO`, `RFQ`, `RFP`, `CAPEX_SOURCING`, `NEW_ITEM_SOURCING`, `NOT_PROCESSED`
   - PO Consolidation (combining requirements with same supplier, plant, route within 24h)
4. **Preferred Supplier Ranking**: Recalculated dynamically as of each requirement date based on PO history (548d), recency, contracts, on-time delivery %, and quality rating.
5. **Buyer Workspace**: Review requirements, see decision rationale, view policy clause & contract citations, approve or override with written audit logs.
6. **Batch Processing API**: `POST /api/process-batch` taking PR batch CSV and returning the exact required output schema.

---

## 2. Reading Order at Session Start

At the start of EVERY turn, read in this order:
1. `AGENTS.md` (this file)
2. `PROJECT_CONTEXT.md`
3. `docs/NEXT_TASK.md`
4. `docs/PROGRESS.md`
5. `docs/DECISIONS.md`
6. `docs/PHASE_GATES.md`

---

## 3. Strict Development Rules

1. **Test-Driven Progression**:
   - Every phase must have automated tests in `tests/`.
   - The engine must pass **100% of the 14 worked examples** from `Worked_Examples.pdf` and match the 3 worked preferred supplier lists before advancing.
2. **Policy as Data Strictness**:
   - Hardcoded `if/else` rules for business thresholds are **strictly prohibited**.
   - Rules must be driven by the active `Policy` schema in database/JSON.
3. **Task Data Isolation**:
   - The public repository must **NEVER** commit task dataset files (`master_data/`, `contracts/`, `pr_batches/`, `*.pdf`). Keep them in `.gitignore`.
4. **DECISIONS.md as an Evaluated Deliverable**:
   - Where the policy or data is silent or ambiguous, make a principled business decision, implement it, and document it thoroughly in `docs/DECISIONS.md`.
5. **Cross-Platform & Deployment**:
   - Provide one-command local runs (`docker-compose.yml`, `scripts/setup.sh`, `scripts/setup.ps1`).
   - Maintain a free hosted deployment (Render / Railway / Vercel) ready for the Thursday blind test.
