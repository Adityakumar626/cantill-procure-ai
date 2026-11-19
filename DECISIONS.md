# Cantill ProcureAI — Blind Test Evaluation Notes

**Candidate**: Aditya Kumar  
**Evaluated Plants**: PUN1 & CHK1  
**Batch Size**: 190 PR lines (23 Nov 2026 – 11 Dec 2026)  
**Output Directory**: `submission/`  

---

## 1. Overview of Test Execution

The unseen blind-test batch (`hidden_pr_batch.csv`) was evaluated across both baseline and amended policy states without modifying any application source code, leveraging our policy-as-data rule interpreter and persistent pipeline.

| Run | Policy Version | Effective Date | Output File | Decision Delta |
|:---|:---|:---|:---|:---:|
| **Run 1** | **v5.0** (Baseline) | 2026-04-01 | `submission/aditya_kumar__run1.csv` | Baseline (155 reqs, 190 rows) |
| **Run 2** | **v5.1** (Amendment 1) | 2026-12-01 | `submission/aditya_kumar__run2.csv` | **37 PR lines shifted routing** |
| **Rankings** | **v5.1** | As of 2026-12-01 | `submission/aditya_kumar__preferred.csv` | 155 items, top-3 ranked suppliers |

---

## 2. Policy Amendment No. 1 (v5.1) Analysis

Corvo Engineering Procurement Policy Amendment No. 1 introduced three major policy changes effective 1 December 2026:

### A1: Packaging Spot Limit (₹2,00,000 → ₹1,00,000)
* **Policy Rule**: For items in the `Packaging` category, the spot PO limit under Rule 5.4 is reduced to ₹1,00,000. Any packaging requirement $\ge$ ₹1,00,000 must be sourced.
* **Observed Impact**: Requirements for packaging items (e.g. `ITM-1042`, `ITM-1043`, `ITM-1044`, `ITM-1045`) between ₹1,00,000 and ₹2,00,000 that were previously awarded as `SPOT_PO` in Run 1 were automatically routed to `RFQ` in Run 2. Packaging requirements under ₹1,00,000 (such as `PR-26-00578` for ₹51,168.30) correctly remained `SPOT_PO`.

### A2: RFP Threshold Reduction (₹10,00,000 → ₹8,00,000)
* **Policy Rule**: The threshold for a formal Request for Proposal (Rules 5.5 and 5.6) was lowered from ₹10 Lakh to ₹8 Lakh.
* **Observed Impact**: Sourcing requirements between ₹8,00,000 and ₹10,00,000 (such as `PR-26-00589` & `PR-26-00667` for `ITM-1066` at ₹8,07,749, `PR-26-00622` for `ITM-1018` at ₹8,04,636, `PR-26-00621` for `ITM-1017` at ₹9,65,826, `PR-26-00623` for `ITM-1008` at ₹8,96,536, and `PR-26-00625` for `ITM-1051` at ₹8,19,673) automatically transitioned from `RFQ` to `RFP`.

### A3: Chakan Electrical Safety (Rule 5.2A)
* **Policy Rule**: At Chakan (`CHK1`), all requirements in the `Electrical Spares` category $\ge$ ₹50,000 must be sourced via RFQ/RFP to collect necessary certification documents, even if they would otherwise qualify for an Emergency PO (Rule 5.3) or Spot PO (Rule 5.4). Contract POs (Rule 5.2) remain unaffected.
* **Observed Impact**:
  * Emergency PR `PR-26-00558` for `ITM-1031` (₹1,81,850.40) at `CHK1` was diverted from `EMERGENCY_PO` to `RFQ` under Rule 5.2A.
  * Routine spot requirements at `CHK1` in Electrical Spares (`ITM-1028`, `ITM-1029`, `ITM-1030`, `ITM-1031`, `ITM-1033`, `ITM-1034`) with values between ₹50,000 and ₹2,00,000 were strictly diverted to `RFQ` (`Clause 5.2A: Chakan Electrical Safety Sourcing (RFQ)`).

---

## 3. Preferred Supplier Rankings (As of 2026-12-01)

The file `submission/aditya_kumar__preferred.csv` captures the Clause 6 multi-criteria preferred supplier ranking across all items:
* **Composite Score Weights**: Recency (40%), Contract Status (15%), Quantity Volume per PO (5%), Max Volume POs (10%), On-Time Delivery (10%), and Quality Rating (10%).
* **Reference Price**: Computed as the most recent unit price paid to that supplier in the lookback window.
* Exactly top-3 suppliers per cataloged item are included in the export.
