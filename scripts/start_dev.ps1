# Cantill ProcureAI Launcher for Windows PowerShell
$ErrorActionPreference = "Stop"

$port = if ($env:PORT) { $env:PORT } else { "8000" }
$hostName = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }

$activateScript = ".venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "⚡ Starting Cantill ProcureAI Server on http://${hostName}:${port}" -ForegroundColor Cyan
Write-Host "   Buyer Workspace: http://localhost:${port}" -ForegroundColor Green
Write-Host "   API Docs:        http://localhost:${port}/docs" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

uvicorn app.main:app --host $hostName --port $port --reload
