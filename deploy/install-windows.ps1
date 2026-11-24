# MediaGrabber v2.0 - Windows 10 & Windows 11 Auto-Installer
param(
    [ValidateSet("stable", "nightly", "")]
    [string]$Channel = "",
    [int]$Port = 3000,
    [string]$InstallDir = "C:\MediaGrabber",
    [string]$DataDir = $(Join-Path $env:LOCALAPPDATA "MediaGrabber"),
    [switch]$RegisterStartupTask
)

$ErrorActionPreference = "Stop"

Write-Host "==> MediaGrabber v2.0 Windows Installer" -ForegroundColor Cyan

$osBuild = [Environment]::OSVersion.Version.Build
$winLabel = if ($osBuild -ge 22000) { "Windows 11 (Build $osBuild)" } else { "Windows 10 (Build $osBuild)" }
Write-Host "==> Detected OS: $winLabel" -ForegroundColor Green

if (-not $Channel) {
    Write-Host ""
    Write-Host "Select MediaGrabber release channel:"
    Write-Host "  1) Full Releases (Stable)"
    Write-Host "  2) Nightly Pre-Releases (Recommended for v2.0)"
    $choice = Read-Host "Choose [1/2] (default: 2)"
    $Channel = if ($choice -eq "1") { "stable" } else { "nightly" }
}
Write-Host "==> Release channel: $Channel" -ForegroundColor Green

# Ensure winget tools if available
if (Get-Command winget -ErrorAction SilentlyContinue) {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "==> Installing Node.js 22 LTS..."
        winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "==> Installing Git..."
        winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
    }
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        Write-Host "==> Installing FFmpeg..."
        winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    }
    if (-not (Get-Command yt-dlp -ErrorAction SilentlyContinue)) {
        Write-Host "==> Installing yt-dlp..."
        winget install --id yt-dlp.yt-dlp -e --accept-package-agreements --accept-source-agreements
    }
}

# Refresh PATH in current session
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ or 22 LTS is required. Install it from https://nodejs.org/ and re-run this script."
}

$ScriptRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $ScriptRoot "package.json"))) {
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    }
    if (-not (Test-Path (Join-Path $InstallDir "package.json"))) {
        $CloneBranch = if ($Channel -eq "nightly") { "mediagrabber-nightly" } else { "mediagrabber" }
        Write-Host "==> Cloning MediaGrabber (branch $CloneBranch) into $InstallDir..."
        git clone -b $CloneBranch https://github.com/ai-mayhemyt/mediagrabber.git $InstallDir
    }
} else {
    $InstallDir = $ScriptRoot
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
Set-Location $InstallDir

$EnvFile = Join-Path $InstallDir ".env"
if (-not (Test-Path $EnvFile)) {
    @"
NODE_ENV=production
PORT=$Port
MEDIAGRABBER_DATA_DIR=$DataDir
MEDIAGRABBER_UPDATE_CHANNEL=$Channel
"@ | Set-Content -Path $EnvFile -Encoding UTF8
}

Write-Host "==> Installing Node dependencies and building MediaGrabber..."
npm install --no-package-lock --legacy-peer-deps
npm run build

if ($RegisterStartupTask) {
    $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$InstallDir\deploy\start-windows.bat`""
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "MediaGrabber" -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
    Write-Host "==> Registered Scheduled Task 'MediaGrabber' to start automatically at logon."
}

Write-Host ""
Write-Host "==> Installation complete!" -ForegroundColor Green
Write-Host "    Start server:  .\deploy\start-windows.bat"
Write-Host "    Web UI URL:    http://127.0.0.1:$Port"
