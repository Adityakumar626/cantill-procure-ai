# Cantill ProcureAI — Architectural & Business Decisions Register (DECISIONS.md)

This document records the foundational assumptions, rule interpretations, and algorithmic design choices made where the Corvo Procurement Policy v5.0 or raw datasets are silent, ambiguous, or require design synthesis.

---

## 1. Summary of Key Decision Registers

| ID | Domain | Policy Context / Ambiguity | Decision & Rationale | Verified By |
|---|---|---|---|---|
| **D-01** | **Item Matching** | Requesters provide short-form descriptions without item codes (Clause 1.1). | Exact code lookup takes precedence. For free text, normalize strings (lowercase, punctuation stripped) and apply fuzzy token ratio matching against `item_master`. If similarity $\ge 82\%$, match to item code. Below threshold, flag as `NEW_ITEM_SOURCING`. | Worked Example #7 (`hyd hose 1/2 inch 2 wire` $\rightarrow$ `ITM-1035`) & #13 (`water purifier` $\rightarrow$ `NEW`) |
| **D-02** | **New Item Handling** | Lines with no matching item code (Clause 1.2). | Line is routed immediately to `NEW_ITEM_SOURCING`, never clubbed, valued at $\text{qty} \times \text{estimated\_price}$, and provides zero supplier suggestions (buyer must source). | Worked Example #13 |
| **D-03** | **Clubbing Ordering** | Sequence in which lines are evaluated for clubbing (Clause 2.2). | Strict sort by `creation_time ASC`, then `pr_no ASC`, then `pr_line ASC`. This guarantees deterministic requirement formation across repeated runs. | Worked Example #5 & #6 |
| **D-04** | **Clubbing Date Windows** | Joining an existing requirement vs starting a new one (Clause 2.2). | A line joins an existing requirement iff: (1) Same resolved item code, (2) Same plant, (3) `creation_date` is within 14 calendar days of requirement's first line, and (4) `need_by_date` is within $\pm 7$ calendar days of requirement's first line `need_by_date`. If it could join multiple, it joins the earliest requirement. | Worked Example #5 (3 PRs clubbed) & #6 (different plant $\rightarrow$ separate) |
| **D-05** | **Emergency Propagation** | Requirement level urgency determination (Clause 2.3). | If ANY single PR line inside a clubbed requirement is marked `Emergency`, the entire requirement is classified as `Emergency`. | Worked Example #8 |
| **D-06** | **Requirement Valuation Priority** | Determining unit price for valuing the requirement (Clause 3.1). | Cascading waterfall: (1) Rate of contract that will be used (lowest rate with remaining ceiling), OR if all applicable contracts out of ceiling, lowest applicable contract rate; (2) Price on most recent PO in the 365 days prior to requirement date; (3) Item master standard price. | Worked Example #3 (ceiling exceeded $\rightarrow$ valued at lowest contract rate ₹1,048.84) |
| **D-07** | **Contract Applicability & Ceilings** | Selecting valid contracts and consuming value ceilings (Clause 4.1–4.3). | Contract must cover item, supplier must be `Active`, and `requirement_date` $\in [\text{start\_date}, \text{end\_date}]$. If multiple contracts apply, select the one with the lowest rate that still has room: $\text{consumed\_value} + \text{req\_value} \le \text{ceiling}$. Ceilings update atomically in order of requirement date. | Worked Example #1, #2, #3, #4 |
| **D-08** | **PDF-Only Contracts** | Contracts signed after register update (Clause 4.4). | Automatically parse `contracts/pdf/*.pdf` during system startup. Any contract present in `pdf/` with start date $\le \text{requirement\_date}$ is treated as valid with starting consumed value = ₹0. | Worked Example #2 (`RC-2026-031` applies for Nov 18 requirement) |
| **D-09** | **Capex Precedence** | Sourcing rule precedence order (Clause 5.1). | Rule 5.1 is evaluated FIRST. Any item marked Capex (`item_type == 'Capex'`) immediately routes to `CAPEX_SOURCING` with 5 suggested suppliers, regardless of contracts or value. | Worked Example #12 |
| **D-10** | **Preferred Supplier Ranking Formula** | Exact weighting for ranking preferred suppliers (Clause 6.2). | Normalized composite scoring formula balancing recency, order volume, contract history, on-time delivery, and quality. (See detailed formula below). | Matches Worked Examples on Page 5 for `ITM-1048`, `ITM-1036`, `ITM-1016` |
| **D-11** | **Supplier Sourcing Suggestions Top-Up** | Clause 6.4: suggesting 3 or 5 suppliers for RFQ/RFP. | Start with the item's preferred supplier list. If fewer than needed (3 for RFQ, 5 for RFP/Capex), top up with other Active suppliers that list the item's category in `supplier_master`, sorted by $\text{on\_time\_delivery} \times \text{quality\_rating}$ descending. | Worked Example #9 & #10 |
| **D-12** | **PO Consolidation Time Boundary** | Grouping requirements into a single PO (Clause 7.1–7.2). | Requirements ending in a PO are merged if they have: (1) Same supplier, (2) Same plant, (3) Same route, and (4) $\text{creation\_time} \le \text{first\_req\_creation\_time} + 24\text{ hours}$. Sourcing requests are never consolidated. | Worked Example #14 (4 requirements merged into PO-0003) |

---

## 2. Preferred Supplier Ranking Formula (Clause 6.2 Specification)

The policy specifies that ranking must consider:
1. **Order Frequency**: Number of POs in the last 548 days ($\text{pos\_548d}$).
2. **Recency Factor**: 
   - $1.0$ if most recent PO $\le 90$ days.
   - $0.5$ if most recent PO $\le 365$ days.
   - $0.0$ if older or no PO.
3. **Contract History**: Has held a contract for the item on or before the requirement date ($1.0$ if true, else $0.0$).
4. **On-Time Delivery**: Percentage from `supplier_master` (e.g., $81\% = 0.81$).
5. **Quality Score**: Rating out of $5.0$ from `supplier_master` (normalized: $\text{quality} / 5.0$).

### Mathematical Ranking Composite Score:
$$\text{Score} = (0.35 \times \text{Recency}) + (0.25 \times \text{ContractHeld}) + \left(0.20 \times \min\left(1.0, \frac{\text{pos\_548d}}{5}\right)\right) + (0.10 \times \text{OnTime}) + \left(0.10 \times \frac{\text{Quality}}{5.0}\right)$$

### Verification against `Worked_Examples.pdf` (Page 5):
1. **`ITM-1048` (Nitrile coated gloves)**:
   - S029: 7 POs, Recency 1.0, Contract: YES, On-Time 81%, Quality 3.1 $\rightarrow$ **Rank 1**
   - S030: 4 POs, Recency 1.0, Contract: NO, On-Time 72%, Quality 3.4 $\rightarrow$ **Rank 2**
   - S031: Inactive $\rightarrow$ **EXCLUDED**
2. **`ITM-1036` (Pneumatic cylinder)**:
   - S023: 2 POs, Recency 1.0, Contract: NO $\rightarrow$ **Rank 1**
   - S022: 2 POs, Recency 0.5, Contract: NO $\rightarrow$ **Rank 2**
   - S024: 1 PO, Recency 0.0, Contract: NO $\rightarrow$ **Rank 3**
3. **`ITM-1016` (MIG wire)**:
   - S009: 1 PO, Recency 0.5, Contract: YES $\rightarrow$ **Rank 1**
   - S010: 1 PO, Recency 0.5, Contract: NO $\rightarrow$ **Rank 2**

---

## 3. Policy-as-Data Architecture Design

To ensure the engine can adapt to amendments on Thursday **without code changes**:
- Policy v5.0 rules are stored as a structured JSON/Pydantic schema (`app/models/policy.py`).
- Every clause has:
  - `clause_id`: e.g. `"5.3"`
  - `name`: e.g. `"Emergency Direct PO"`
  - `condition_expr`: structured filters (`urgency == "Emergency"`, `value <= 500000`, `bought_in_365d == True`)
  - `action`: `route: "EMERGENCY_PO"`, `supplier_strategy: "first_preferred"`
  - `precedence`: integer rank
- Amendment Ingestion:
  - An uploaded PDF or chat prompt is parsed into diff proposals (e.g. *"Raise Spot PO limit from ₹2,00,000 to ₹3,00,000 for Plant CHK1"*).
  - The UI presents the plain-language diff and effective date.
  - On approval, a new version (e.g. `v5.1`) is persisted with its effective timestamp, and the engine automatically queries the policy version matching the requirement date.
