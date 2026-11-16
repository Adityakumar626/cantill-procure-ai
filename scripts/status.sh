#!/usr/bin/env bash
PORT=${PORT:-8000}

echo "========================================================"
echo "⚡ Checking Cantill ProcureAI Health & Status"
echo "========================================================"

if command -v curl &> /dev/null; then
    curl -s "http://localhost:${PORT}/health" | grep -q "online" && {
        echo "✔ Engine is ONLINE and healthy!"
        curl -s "http://localhost:${PORT}/health"
        echo ""
    } || {
        echo "❌ Server is not responding on port ${PORT}."
        exit 1
    }
else
    echo "curl command not found. Please verify python server is running."
fi
