# Start CarHorizontal in dev mode (PostgreSQL + API + Portal + Client portal)
# Requires: dotnet SDK, node/npm, Docker Desktop
# Opens separate console windows for API, portal and client portal.
#
# Usage:
#   ./start-dev.ps1
#   ./start-dev.ps1 -LaunchProfile https

param(
    [string]$LaunchProfile = ""
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Write-Host "=== CarHorizontal Dev Mode ===" -ForegroundColor Cyan
Write-Host ""

# -- Start PostgreSQL via docker-compose -------------------------------
Write-Host "Starting PostgreSQL (docker-compose)..." -ForegroundColor Yellow
$ComposeFile = "$Root\apps\api\docker-compose.yml"
& docker-compose -f $ComposeFile up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: docker-compose failed (is Docker Desktop running?)." -ForegroundColor Red
    Write-Host "The API will fail to start without PostgreSQL. Continuing anyway..." -ForegroundColor Red
    Write-Host ""
}

# -- Start .NET API ----------------------------------------------------
$ApiProject = "$Root\apps\api\CarHorizontal.Api"
$ApiUrl = "http://localhost:5080"

Write-Host "Starting API in new console..." -ForegroundColor Yellow
$ApiCmd = if ($LaunchProfile) {
    "title CarHorizontal API && cd /d `"$ApiProject`" && dotnet run --launch-profile `"$LaunchProfile`""
} else {
    "title CarHorizontal API && cd /d `"$ApiProject`" && dotnet run --urls `"$ApiUrl`""
}
Start-Process cmd -ArgumentList "/k", $ApiCmd

# -- Start Next.js portal ----------------------------------------------
Write-Host "Starting portal (next dev) in new console..." -ForegroundColor Yellow
$Portal = "$Root\apps\portal"
Start-Process cmd -ArgumentList "/k", "title CarHorizontal Portal && cd /d `"$Portal`" && npm run dev"

# -- Start Next.js client portal ---------------------------------------
Write-Host "Starting client portal (next dev) in new console..." -ForegroundColor Yellow
$Client = "$Root\apps\client"
Start-Process cmd -ArgumentList "/k", "title CarHorizontal Client && cd /d `"$Client`" && npm run dev"

# -- Summary -----------------------------------------------------------
Write-Host ""
Write-Host "=== CarHorizontal Dev Mode ===" -ForegroundColor Green
Write-Host "  Database: postgres://localhost:5432/db_carhorizontal" -ForegroundColor White
Write-Host "  API:      $ApiUrl" -ForegroundColor White
Write-Host "  Swagger:  $ApiUrl/swagger" -ForegroundColor White
Write-Host "  Hangfire: $ApiUrl/hangfire" -ForegroundColor White
Write-Host "  Portal:   http://localhost:3000" -ForegroundColor White
Write-Host "  Client:   http://localhost:3001" -ForegroundColor White
Write-Host "==============================" -ForegroundColor Green
Write-Host ""
Write-Host "Three console windows have been opened for API, portal and client." -ForegroundColor Yellow
Write-Host "Close them manually to stop the services." -ForegroundColor Yellow
Write-Host "PostgreSQL keeps running in Docker (use 'docker-compose -f apps/api/docker-compose.yml down' to stop it)." -ForegroundColor Yellow
