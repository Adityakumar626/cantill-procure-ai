#!/usr/bin/env bash
set -e

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "========================================================"
echo "⚡ Starting Cantill ProcureAI Server on http://${HOST}:${PORT}"
echo "   Buyer Workspace: http://localhost:${PORT}"
echo "   API Docs:        http://localhost:${PORT}/docs"
echo "========================================================"

exec uvicorn app.main:app --host "${HOST}" --port "${PORT}" --reload
