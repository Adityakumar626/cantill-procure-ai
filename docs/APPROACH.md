# Cantill ProcureAI — Engineering Approach (APPROACH.md)

This document details the software architecture, design principles, tools, and artificial intelligence systems utilized to design, develop, and test Cantill ProcureAI.

---

## 1. Architectural Philosophy: Separation of Engine & Presentation

The system is strictly partitioned into three independent tiers:
1. **The Deterministic Policy Engine (Core)**: 
   - A pure, standalone Python library with zero UI dependencies.
   - Operates purely on typed Pydantic models and pandas/in-memory data tables.
   - Evaluates procurement decisions in sub-millisecond timeframes deterministically.
2. **The Policy-As-Data Registry (State Engine)**:
   - Stores policy clauses, numerical thresholds, plant scopes, and rule precedence as JSON-serializable data schemas.
   - Supports version branching (`v5.0` -> `v5.1`) with explicit effective timestamps.
   - Guarantees that business logic changes dynamically without application code redeployment.
3. **The Presentation & Intake Layer (API & UI)**:
   - FastAPI REST API providing documented OpenAPI endpoints.
   - Conversational intake assistant utilizing structured entity extraction for natural language PR drafting.
   - Production Buyer Workspace providing visual decision telemetry, clause citations, and human-in-the-loop overrides.

---

## 2. Tools & AI Systems Utilized During Development

In accordance with Cantill.ai guidelines (*"Say what you used in APPROACH.md"*):

### Development & Agentic Orchestration:
- **Google Antigravity & Gemini 3.8 / 2.5 Pro**: Utilized as the primary autonomous development orchestrator to generate phase-gated test suites, write cross-platform shell scripts, and verify regression boundaries.
- **Python 3.12, Pydantic v2 & Pytest**: Utilized for strict runtime typing, schema validation, and test-driven development (TDD).

### Inside the Application:
- **Fuzzy Token Matching (RapidFuzz)**: Used for sub-millisecond free-text item description matching against the Item Master.
- **LLM Entity Extractor (Ollama / Gemini / OpenAI Adapter)**:
  - Employed inside the Chat Intake Assistant to extract entity parameters (`item`, `quantity`, `plant`, `need_by`, `urgency`) from unstructured conversational employee requests.
  - Employed inside the Policy Amendment Engine to parse incoming amendment PDFs/text into structured policy diffs.
- **Docker Compose**: Containerized multi-service deployment ensuring identical execution across local macOS/Linux/Windows and cloud environments.
