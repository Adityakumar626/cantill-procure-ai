# Cantill ProcureAI Setup Script for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "⚡ Cantill ProcureAI Setup Script (Windows PowerShell)" -ForegroundColor Cyan
Write-Host "   Corvo Engineering Procurement Intelligence Engine" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Find Python
$pyCmd = ""
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pyCmd = "py"
} else {
    Write-Error "Python 3 is not installed or not in PATH."
}

Write-Host "✔ Using Python: $(& $pyCmd --version)" -ForegroundColor Green

# Create venv if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment in .venv..."
    & $pyCmd -m venv .venv
} else {
    Write-Host "✔ Virtual environment .venv already exists." -ForegroundColor Green
}

# Activate virtual environment
$activateScript = ".venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
}

# Install dependencies
Write-Host "Installing dependencies from requirements.txt..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Run pytest
Write-Host "Running validation test suite..."
python -m pytest

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🎉 Setup complete! All tests passed." -ForegroundColor Green
Write-Host "   Run '.\scripts\start_dev.ps1' to launch application." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
