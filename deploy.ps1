<#
.SYNOPSIS
  Automated 1-click deployment script for Stabil Umzug website and Google Workspace back end.

.DESCRIPTION
  - Validates and runs python tools/build.py
  - Runs unit test suites to guarantee code stability
  - Automatically pushes and deploys apps-script (Website API)
  - Automatically pushes and deploys admin-script (Admin UI & Billing)
  - Runs live health check on Google Apps Script Web App
  - Prints all endpoints
#>

[CmdletBinding()]
param (
  [switch]$SkipTests,
  [string]$Message = "Workspace Standard Deployment"
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Stabil Umzug - 1-Click Deployment Script " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Rebuild site and sync shared scripts
Write-Host "`n[1/5] Building static site & syncing shared backend scripts..." -ForegroundColor Yellow
python tools/build.py
if ($LASTEXITCODE -ne 0) { throw "Build failed!" }
Write-Host "Site build complete." -ForegroundColor Green

# Step 2: Run verification tests
if (-not $SkipTests) {
  Write-Host "`n[2/5] Running automated tests..." -ForegroundColor Yellow
  node backend/test/run.js
  if ($LASTEXITCODE -ne 0) { throw "backend/test/run.js failed!" }
  node backend/test/admin.js
  if ($LASTEXITCODE -ne 0) { throw "backend/test/admin.js failed!" }
  node backend/test/belege.js
  if ($LASTEXITCODE -ne 0) { throw "backend/test/belege.js failed!" }
  Write-Host "All unit tests passed." -ForegroundColor Green
} else {
  Write-Host "`n[2/5] Skipping tests as requested." -ForegroundColor DarkGray
}

# Step 3: Deploy apps-script
Write-Host "`n[3/5] Deploying Website API (apps-script) to Google Workspace..." -ForegroundColor Yellow
$AppDir = Join-Path $Root "backend\apps-script"
$AppDeployId = (Get-Content (Join-Path $AppDir ".deployment-id") -Raw).Trim()

Push-Location $AppDir
try {
  clasp push --force
  if ($LASTEXITCODE -ne 0) { throw "clasp push failed for apps-script" }
  clasp deploy --deploymentId $AppDeployId --description "$Message ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
  if ($LASTEXITCODE -ne 0) { throw "clasp deploy failed for apps-script" }
} finally {
  Pop-Location
}
Write-Host "Website API successfully pushed & deployed." -ForegroundColor Green

# Step 4: Deploy admin-script
Write-Host "`n[4/5] Deploying Admin Dashboard (admin-script) to Google Workspace..." -ForegroundColor Yellow
$AdminDir = Join-Path $Root "backend\admin-script"
$AdminDeployId = (Get-Content (Join-Path $AdminDir ".deployment-id") -Raw).Trim()

Push-Location $AdminDir
try {
  clasp push --force
  if ($LASTEXITCODE -ne 0) { throw "clasp push failed for admin-script" }
  clasp deploy --deploymentId $AdminDeployId --description "$Message ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
  if ($LASTEXITCODE -ne 0) { throw "clasp deploy failed for admin-script" }
} finally {
  Pop-Location
}
Write-Host "Admin Dashboard successfully pushed & deployed." -ForegroundColor Green

# Step 5: Live API Health Check
Write-Host "`n[5/5] Performing live health check on Google Workspace API..." -ForegroundColor Yellow
$ApiUrl = "https://script.google.com/macros/s/$AppDeployId/exec?action=health"
try {
  $health = Invoke-RestMethod -Uri $ApiUrl -TimeoutSec 30
  if ($health.ok) {
    Write-Host "API Health Check: OK (Version: $($health.version), Warm: $($health.warm))" -ForegroundColor Green
  } else {
    Write-Host "API Warning: $($health.error)" -ForegroundColor Red
  }
} catch {
  Write-Host "Health check warning: $_" -ForegroundColor DarkYellow
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " Website API:  https://script.google.com/macros/s/$AppDeployId/exec" -ForegroundColor White
Write-Host " Admin Portal: https://script.google.com/macros/s/$AdminDeployId/exec" -ForegroundColor White
Write-Host " Admin Mirror: https://www.stabilumzug.de/admin/" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
