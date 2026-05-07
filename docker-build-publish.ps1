<#
.SYNOPSIS
    Unified Docker build and publish script for CarHorizontal API and Portal.

.PARAMETER Service
    Which service(s) to target: "api", "portal", or "all" (default: "all").

.PARAMETER Action
    What to do: "build", "publish", or "both" (default: "both").

.PARAMETER Tag
    Docker image tag (default: "latest").

.EXAMPLE
    .\docker-build-publish.ps1                          # Build & publish both with :latest
    .\docker-build-publish.ps1 -Service api             # Build & publish API only
    .\docker-build-publish.ps1 -Service portal -Action build
    .\docker-build-publish.ps1 -Tag v1.2.3
#>

param(
    [ValidateSet("api", "portal", "all")]
    [string]$Service = "all",

    [ValidateSet("build", "publish", "both")]
    [string]$Action = "both",

    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

# TODO: confirm final registry path — placeholder until publishing target is set.
$Registry = "registry.gitlab.com/aries-software/carhorizontal"

$services = @{
    api    = @{
        Image   = "$Registry/api:$Tag"
        Context = "$PSScriptRoot/apps/api"
    }
    portal = @{
        Image   = "$Registry/portal:$Tag"
        Context = "$PSScriptRoot/apps/portal"
    }
}

function Build-Service($name, $config) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " Building $name -> $($config.Image)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    docker build -t $config.Image $config.Context
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to build $name" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully built $name" -ForegroundColor Green
}

function Publish-Service($name, $config) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " Pushing $name -> $($config.Image)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    docker push $config.Image
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to push $name" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully pushed $name" -ForegroundColor Green
}

$targets = if ($Service -eq "all") { @("api", "portal") } else { @($Service) }

foreach ($target in $targets) {
    $config = $services[$target]

    if ($Action -in @("build", "both")) {
        Build-Service $target $config
    }

    if ($Action -in @("publish", "both")) {
        Publish-Service $target $config
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Done! ($Action for: $($targets -join ', '))" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
