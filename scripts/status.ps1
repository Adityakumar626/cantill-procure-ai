# Cantill ProcureAI Health & Status Check for Windows PowerShell
$port = if ($env:PORT) { $env:PORT } else { "8000" }

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "⚡ Checking Cantill ProcureAI Health & Status" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

try {
    $res = Invoke-RestMethod -Uri "http://localhost:${port}/health" -Method Get
    Write-Host "✔ Engine is ONLINE and healthy!" -ForegroundColor Green
    $res | Format-List
} catch {
    Write-Host "❌ Server is not responding on port ${port}." -ForegroundColor Red
}
