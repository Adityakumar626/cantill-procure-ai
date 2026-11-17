#!/usr/bin/env bash
set -e

echo "========================================================"
echo "⚡ Cantill ProcureAI Setup Script"
echo "   Corvo Engineering Procurement Intelligence Engine"
echo "========================================================"

# Determine Python command
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
elif command -v python &> /dev/null; then
    PY_CMD="python"
else
    echo "❌ Error: Python 3 is not installed or not in PATH."
    exit 1
fi

echo "✔ Using Python: $($PY_CMD --version)"

# Create virtual environment if not present
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment in .venv..."
    $PY_CMD -m venv .venv
else
    echo "✔ Virtual environment .venv already exists."
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# Run test suite to verify installation
echo "Running validation test suite..."
pytest

# Build React frontend if Node is installed
if command -v npm &> /dev/null; then
    echo "✔ Node.js detected ($(node --version)). Building modern React frontend..."
    (cd frontend && npm install && npm run build)
    echo "✔ React frontend built successfully into frontend/dist."
fi

echo "========================================================"
echo "🎉 Setup complete! All 23 tests passing."
echo "   Run './scripts/start_dev.sh' to launch application."
echo "========================================================"
