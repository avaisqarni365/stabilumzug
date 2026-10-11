<#
  Stabil Umzug - deploy the Google Sheet back end and connect the website.

  Run from the repo root in PowerShell:
      powershell -ExecutionPolicy Bypass -File backend\deploy-backend.ps1

  What it does:
    1. installs clasp (Google's Apps Script command-line tool) if missing
    2. asks you to switch on the Apps Script API once (Google requires the account owner to do this)
    3. logs clasp in to your Google account (you approve in the browser)
    4. creates the sheet "Stabil Umzug - Anfragen" with the script (first run only)
    5. uploads Code.js, Estimator.js and appsscript.json
    6. opens the sheet so you run "Stabil Umzug -> Einrichten" once and allow the permissions
    7. deploys the web app (later runs update the same deployment, so the URL stays the same)
    8. writes the URL into tools/config.py, rebuilds the site, commits and pushes

  Re-run it any time after changing backend/apps-script: it skips what is already done.
#>
$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$App  = Join-Path $PSScriptRoot 'apps-script'
$State = Join-Path $App '.deployment-id'

function Step($n, $text) { Write-Host ""; Write-Host "[$n] $text" -ForegroundColor Cyan }
function Pause-For($text) { Write-Host ""; Write-Host ">>> $text" -ForegroundColor Yellow; Read-Host ">>> Press Enter when done" | Out-Null }

# --- 0. tools -------------------------------------------------------------------------------
Step 0 'Checking Node.js, Python and git'
foreach ($c in 'node', 'npm', 'python', 'git') {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { throw "$c is not installed or not on PATH." }
}

Step 1 'Installing clasp if needed'
if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
  npm install -g @google/clasp
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + (npm prefix -g)
}
clasp --version

# --- 2. Apps Script API ---------------------------------------------------------------------
Step 2 'Apps Script API'
$apiMarker = Join-Path $env:USERPROFILE '.stabil-apps-script-api-on'
if (-not (Test-Path $apiMarker)) {
  Start-Process 'https://script.google.com/home/usersettings'
  Pause-For 'In the browser (signed in as info.stabilumzug@gmail.com): switch "Google Apps Script API" to ON.'
  New-Item -ItemType File -Path $apiMarker -Force | Out-Null
}

# --- 3. login -------------------------------------------------------------------------------
Step 3 'Logging clasp in to Google'
$rc = Join-Path $env:USERPROFILE '.clasprc.json'
if (-not (Test-Path $rc)) {
  Write-Host 'A browser window opens. Choose info.stabilumzug@gmail.com and click "Zulassen" (Allow).'
  clasp login
}

# --- 4. create sheet + script (first run) ----------------------------------------------------
Step 4 'Sheet and script project'
Push-Location $App
try {
  if (-not (Test-Path '.clasp.json')) {
    Copy-Item appsscript.json appsscript.json.keep -Force       # clasp create may replace the manifest
    clasp create --type sheets --title 'Stabil Umzug - Anfragen' --rootDir .
    Move-Item appsscript.json.keep appsscript.json -Force
  }
  $clasp = Get-Content .clasp.json -Raw | ConvertFrom-Json
  $sheetId = $clasp.parentId
  if ($sheetId -is [array]) { $sheetId = $sheetId[0] }
  $sheetUrl = "https://docs.google.com/spreadsheets/d/$sheetId/edit"
  Write-Host "Sheet: $sheetUrl"

  # only the three script files go to Google
  @('**/**', '!Code.js', '!Website.js', '!Shared.js', '!Estimator.js', '!appsscript.json') -join "`n" | Set-Content .claspignore -Encoding ASCII

  # --- 5. upload ----------------------------------------------------------------------------
  Step 5 'Uploading the script files'
  clasp push --force

  # --- 6. setup in the sheet (permissions) ------------------------------------------------
  Step 6 'Running the setup in the sheet'
  if (-not (Test-Path $State)) {
    Start-Process $sheetUrl
    Pause-For ('In the sheet: wait for the menu "Stabil Umzug" (reload the page if needed), click Stabil Umzug -> Einrichten. ' +
               'When Google asks: Weiter -> choose the account -> Erweitert -> "Zu ... wechseln" -> Zulassen. Wait for "Fertig".')
  }

  # --- 7. deploy ---------------------------------------------------------------------------
  Step 7 'Deploying the web app'
  if (Test-Path $State) {
    $id = (Get-Content $State -Raw).Trim()
    clasp deploy --deploymentId $id --description ("Website API " + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
  } else {
    $out = clasp deploy --description 'Website API' 2>&1 | Out-String
    Write-Host $out
    $m = [regex]::Match($out, 'AKfy[\w-]+')
    if (-not $m.Success) { throw 'Could not read the deployment ID from clasp. Copy it from Apps Script -> Bereitstellen -> Bereitstellungen verwalten.' }
    $id = $m.Value
    Set-Content $State $id -Encoding ASCII
  }
} finally { Pop-Location }

$url = "https://script.google.com/macros/s/$id/exec"
Write-Host "Web app: $url"

Step 8 'Testing the web app'
try {
  $h = Invoke-RestMethod -Uri "${url}?action=health" -TimeoutSec 60
  if (-not $h.ok) { throw 'health check did not return ok' }
  Write-Host "OK - catalogue version $($h.version)" -ForegroundColor Green
} catch {
  Write-Host "The web app did not answer yet ($($_.Exception.Message))." -ForegroundColor Red
  Write-Host 'If you have not run Stabil Umzug -> Einrichten yet, do that, then run this script again.'
  exit 1
}

# --- 9. connect the website ----------------------------------------------------------------
Step 9 'Connecting the website'
$cfg = Join-Path $Repo 'tools\config.py'
$text = [IO.File]::ReadAllText($cfg)
$new = [regex]::Replace($text, '"api":\s*"[^"]*"', '"api": "' + $url + '"')
if ($new -ne $text) {
  [IO.File]::WriteAllText($cfg, $new, (New-Object System.Text.UTF8Encoding $false))
  Push-Location $Repo
  try {
    python tools/build.py
    git add tools/config.py assets/js/site-config.js datenschutz en/privacy
    git commit -m "Connect the planner to the Google Sheet back end" | Out-Null
    git push origin HEAD
  } finally { Pop-Location }
  Write-Host 'Website updated and pushed. GitHub Pages publishes it within a few minutes.' -ForegroundColor Green
} else {
  Write-Host 'The website already uses this URL.'
}

# --- 10. admin app (staff sign in with Google; runs as the signed-in user) -------------------
Step 10 'Admin app'
$Adm = Join-Path $PSScriptRoot 'admin-script'
$AdmState = Join-Path $Adm '.deployment-id'
Push-Location $Repo; try { python tools/build.py | Out-Null } finally { Pop-Location }   # copies Shared.js and Estimator.js
Push-Location $Adm
try {
  @("/* Written by backend/deploy-backend.ps1 for this Google account. Not committed. */",
    "var SHEET_ID = '$sheetId';",
    "var SITE_URL = 'https://www.stabilumzug.de';",
    "var PORTAL_URL = 'https://www.stabilumzug.de/mein-umzug/';") -join "`n" | Set-Content Config.js -Encoding ASCII
  @('**/**', '!Admin.js', '!Shared.js', '!Estimator.js', '!Config.js', '!Index.html', '!Belege.js', '!BelegeUi.html', '!Termine.js', '!TermineUi.html', '!NoAccess.html', '!appsscript.json') -join "`n" | Set-Content .claspignore -Encoding ASCII
  if (-not (Test-Path '.clasp.json')) {
    Copy-Item appsscript.json appsscript.json.keep -Force
    clasp create --type standalone --title 'Stabil Umzug - Admin' --rootDir .
    Move-Item appsscript.json.keep appsscript.json -Force
  }
  clasp push --force
  if (Test-Path $AdmState) {
    $aid = (Get-Content $AdmState -Raw).Trim()
    clasp deploy --deploymentId $aid --description ("Admin " + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
  } else {
    $out = clasp deploy --description 'Admin' 2>&1 | Out-String
    $m = [regex]::Match($out, 'AKfy[\w-]+')
    if (-not $m.Success) { throw 'Could not read the admin deployment ID from clasp.' }
    $aid = $m.Value
    Set-Content $AdmState $aid -Encoding ASCII
  }
} finally { Pop-Location }
$adminUrl = "https://script.google.com/macros/s/$aid/exec"
$text = [IO.File]::ReadAllText($cfg)
$new = [regex]::Replace($text, '"admin_url":\s*"[^"]*"', '"admin_url": "' + $adminUrl + '"')
if ($new -ne $text) {
  [IO.File]::WriteAllText($cfg, $new, (New-Object System.Text.UTF8Encoding $false))
  Push-Location $Repo
  try { python tools/build.py; git add -A tools/config.py admin en/admin; git commit -m "Link the admin app" | Out-Null; git push origin HEAD } finally { Pop-Location }
}

Write-Host ""
Write-Host "Done. Sheet: $sheetUrl" -ForegroundColor Green
Write-Host "      API:   $url" -ForegroundColor Green
Write-Host "      Admin: $adminUrl  (also https://www.stabilumzug.de/admin/)" -ForegroundColor Green
Write-Host "      Staff get access when you share the sheet with their Google account (Editor)." -ForegroundColor Green
