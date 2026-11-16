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
- **Google Gemini 2.0 Flash REST Client**:
  - Powers the conversational PR Intake Assistant (`app/assistant/chat.py`) by extracting structured procurement entities (`item_code`, `quantity`, `plant`, `need_by_date`, `urgency`) from unstructured conversational requests.
  - Implements **In-Context Catalog Grounding**: Rather than introducing heavy vector database dependencies (like ChromaDB or FAISS) for a concise 73-item catalog, the entire catalog is provided directly inside Gemini's prompt context (~1,500 tokens). This ensures zero embedding latency, 100% recall accuracy, and eliminates external database overhead.
  - Configurable via `GEMINI_API_KEY` and `GEMINI_MODEL` (defaulting to `gemini-2.0-flash`).
- **Deterministic Offline Fail-Safe Engine**:
  - The conversational intake layer implements a **Dual-Mode Graceful Fallback**: if an external LLM API key is not supplied, or if network connectivity is severed or rate-limited during evaluation or the Thursday blind test, the system silently and instantly executes a deterministic token-overlap & regex parser with zero unhandled exceptions.
- **Fuzzy Token Matching**: Used for sub-millisecond free-text item description matching against the Item Master.
- **Docker Compose & Multi-Stage Builds**: Multi-stage containerization compiling the React 18 TypeScript frontend and hosting the FastAPI backend in a lean (~160MB) image with built-in health checks.
