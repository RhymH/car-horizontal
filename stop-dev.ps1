# Stop all running CarHorizontal dev instances (API .NET + portals Next.js).
# Catches both the consoles opened by start-dev.ps1 AND stray background
# processes (e.g. started by an AI session) by matching:
#   1. Anything listening on the dev ports (5080, 5005, 3000, 3001)
#   2. Any dotnet / node / cmd / CarHorizontal.Api process whose command line
#      references this repo (carhorizontal)
# Process trees are killed (/T) so npm -> node -> next children die too.
#
# Usage:
#   ./stop-dev.ps1              # stop API + portals, keep PostgreSQL running
#   ./stop-dev.ps1 -IncludeDb   # also stop the PostgreSQL docker container

param(
    [switch]$IncludeDb
)

$Root = $PSScriptRoot
$Ports = @(5080, 5005, 3000, 3001)

Write-Host "=== CarHorizontal Stop Dev ===" -ForegroundColor Cyan

# -- Build the exclusion list: this script's own process chain ----------
# (so we never kill the shell/agent that launched us)
$protected = New-Object System.Collections.Generic.HashSet[int]
$cursor = $PID
while ($cursor -and $protected.Add([int]$cursor)) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $cursor" -ErrorAction SilentlyContinue
    if ($null -eq $proc) { break }
    $cursor = $proc.ParentProcessId
}

$targets = New-Object System.Collections.Generic.HashSet[int]

# -- 1. Processes listening on the dev ports ----------------------------
foreach ($port in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        if ($conn.OwningProcess -gt 4 -and -not $protected.Contains([int]$conn.OwningProcess)) {
            if ($targets.Add([int]$conn.OwningProcess)) {
                Write-Host "  Port $port -> PID $($conn.OwningProcess)" -ForegroundColor Yellow
            }
        }
    }
}

# -- 2. Repo-related dotnet / node / cmd processes ----------------------
$candidates = Get-CimInstance Win32_Process -Filter `
    "Name = 'dotnet.exe' OR Name = 'node.exe' OR Name = 'cmd.exe' OR Name = 'CarHorizontal.Api.exe'" `
    -ErrorAction SilentlyContinue
foreach ($proc in $candidates) {
    if ($protected.Contains([int]$proc.ProcessId)) { continue }
    if ($proc.CommandLine -and $proc.CommandLine -match '(?i)carhorizontal') {
        if ($targets.Add([int]$proc.ProcessId)) {
            Write-Host "  $($proc.Name) -> PID $($proc.ProcessId)" -ForegroundColor Yellow
        }
    }
}

# -- Kill ---------------------------------------------------------------
if ($targets.Count -eq 0) {
    Write-Host "No running dev instance found." -ForegroundColor Green
} else {
    foreach ($targetPid in $targets) {
        # /T kills the whole tree, /F forces (next dev ignores polite close)
        & taskkill /PID $targetPid /T /F 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Killed PID $targetPid (tree)" -ForegroundColor Green
        } else {
            # Already gone (killed as child of a previous tree) - fine
            Write-Host "  PID $targetPid already stopped" -ForegroundColor DarkGray
        }
    }
    Write-Host "Done: $($targets.Count) process tree(s) processed." -ForegroundColor Green
}

# -- Optional: PostgreSQL ----------------------------------------------
if ($IncludeDb) {
    Write-Host "Stopping PostgreSQL (docker-compose down)..." -ForegroundColor Yellow
    & docker-compose -f "$Root\apps\api\docker-compose.yml" down
} else {
    Write-Host "PostgreSQL left running (use -IncludeDb to stop it)." -ForegroundColor DarkGray
}

# taskkill leaves a non-zero $LASTEXITCODE when a PID was already gone
exit 0
