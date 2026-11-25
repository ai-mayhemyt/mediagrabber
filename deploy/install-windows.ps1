# MediaGrabber v2.1 - Windows 10 & Windows 11 Auto-Installer
param(
    [ValidateSet("stable", "nightly", "")]
    [string]$Channel = "",
    [int]$Port = 3000,
    [string]$InstallDir = "C:\MediaGrabber",
    [string]$DataDir = $(Join-Path $env:LOCALAPPDATA "MediaGrabber"),
    [switch]$RegisterStartupTask,
    [switch]$SkipExe
)

$ErrorActionPreference = "Stop"

Write-Host "==> MediaGrabber v2.1 Windows Installer" -ForegroundColor Cyan

$osBuild = [Environment]::OSVersion.Version.Build
$winLabel = if ($osBuild -ge 22000) { "Windows 11 (Build $osBuild)" } else { "Windows 10 (Build $osBuild)" }
Write-Host "==> Detected OS: $winLabel" -ForegroundColor Green

if (-not $Channel) {
    Write-Host ""
    Write-Host "Select MediaGrabber release channel:"
    Write-Host "  1) Full Releases (Stable - recommended)"
    Write-Host "  2) Nightly Pre-Releases"
    $choice = Read-Host "Choose [1/2] (default: 1)"
    $Channel = if ($choice -eq "2") { "nightly" } else { "stable" }
}
Write-Host "==> Release channel: $Channel" -ForegroundColor Green

function Update-SessionPath {
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($scope in @("Machine", "User")) {
        $val = [System.Environment]::GetEnvironmentVariable("PATH", $scope)
        if ($val) {
            foreach ($p in ($val -split ';')) {
                if ($p -and (-not $parts.Contains($p))) { $parts.Add($p) }
            }
        }
    }
    $extraCandidates = New-Object System.Collections.Generic.List[string]
    if ($env:LOCALAPPDATA) {
        $extraCandidates.Add((Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links"))
        Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Programs\Python\Python*") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $extraCandidates.Add($_.FullName)
            $extraCandidates.Add((Join-Path $_.FullName "Scripts"))
        }
        Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $extraCandidates.Add($_.FullName)
        }
    }
    if ($env:APPDATA) {
        Get-ChildItem -Path (Join-Path $env:APPDATA "Python\Python*\Scripts") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $extraCandidates.Add($_.FullName)
        }
    }
    $extraCandidates.Add("C:\Program Files\nodejs")
    $extraCandidates.Add("C:\Program Files\Git\cmd")
    foreach ($ec in $extraCandidates) {
        if ($ec -and (Test-Path $ec) -and (-not $parts.Contains($ec))) {
            $parts.Add($ec)
        }
    }
    $env:PATH = ($parts -join ';')
}

function Find-RealPython {
    Update-SessionPath
    $candidates = New-Object System.Collections.Generic.List[string]
    if ($env:LOCALAPPDATA) {
        Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Programs\Python\Python*\python.exe") -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | ForEach-Object { $candidates.Add($_.FullName) }
    }
    Get-ChildItem -Path "C:\Program Files\Python*\python.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | ForEach-Object { $candidates.Add($_.FullName) }
    $cmdPy = Get-Command python -ErrorAction SilentlyContinue
    if ($cmdPy -and ($cmdPy.Source -notmatch '\\Microsoft\\WindowsApps\\python\.exe$')) {
        $candidates.Add($cmdPy.Source)
    }
    $cmdPy3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($cmdPy3 -and ($cmdPy3.Source -notmatch '\\Microsoft\\WindowsApps\\python3\.exe$')) {
        $candidates.Add($cmdPy3.Source)
    }
    foreach ($py in $candidates) {
        if ($py -and (Test-Path $py)) {
            $prevPref = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try {
                $ver = & $py -c "import sys; print(sys.version_info[0])" 2>$null
                if ($LASTEXITCODE -eq 0 -and "$ver".Trim() -eq "3") {
                    return $py
                }
            } catch {} finally {
                $ErrorActionPreference = $prevPref
            }
        }
    }
    return $null
}

function Install-WinGetTool {
    param(
        [string]$PackageId,
        [string]$Label
    )
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        return $false
    }
    Write-Host "==> Ensuring $Label ($PackageId) via WinGet..."
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & winget install --id $PackageId -e --silent --accept-package-agreements --accept-source-agreements
        $code = $LASTEXITCODE
        # 0 = installed, -1978335189 (0x8A15002B) = already installed / no applicable update
        if ($code -ne 0 -and $code -ne -1978335189) {
            Write-Host "    WinGet returned exit code $code for $PackageId; retrying interactive source agreement..." -ForegroundColor Yellow
            & winget install --id $PackageId -e --accept-package-agreements --accept-source-agreements
        }
    } catch {
        Write-Host "    WinGet note for ${PackageId}: $_" -ForegroundColor Yellow
    } finally {
        $ErrorActionPreference = $prevPref
    }
    Update-SessionPath
    return $true
}

function Add-UserPathEntry {
    param([string]$DirPath)
    if (-not $DirPath -or -not (Test-Path $DirPath)) { return }
    $currentUserPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $segments = if ($currentUserPath) { $currentUserPath -split ';' | Where-Object { $_ } } else { @() }
    if ($segments -notcontains $DirPath) {
        $newPath = (@($segments) + $DirPath) -join ';'
        [System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
        Write-Host "==> Added to User PATH: $DirPath"
    }
    if (($env:PATH -split ';') -notcontains $DirPath) {
        $env:PATH = "$DirPath;$env:PATH"
    }
}

Update-SessionPath

# 1. Core runtime dependencies (Node.js 22 LTS, Git, FFmpeg, Python 3.12)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Install-WinGetTool -PackageId "OpenJS.NodeJS.LTS" -Label "Node.js 22 LTS" | Out-Null
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Install-WinGetTool -PackageId "Git.Git" -Label "Git" | Out-Null
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Install-WinGetTool -PackageId "Gyan.FFmpeg" -Label "FFmpeg" | Out-Null
}
$PythonExe = Find-RealPython
if (-not $PythonExe) {
    Install-WinGetTool -PackageId "Python.Python.3.12" -Label "Python 3.12" | Out-Null
    $PythonExe = Find-RealPython
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ or 22 LTS is required. Install it from https://nodejs.org/ and re-run this script."
}
if (-not $PythonExe) {
    throw "Python 3 is required to install yt-dlp, spotdl, and gallery-dl. Install Python 3.12 from https://www.python.org/downloads/ and re-run."
}
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw "FFmpeg is mandatory for MediaGrabber media muxing and transcoding. Install Gyan.FFmpeg via WinGet or https://ffmpeg.org/."
}

# 2. Mandatory Media Extractors: yt-dlp, spotdl, and gallery-dl
Write-Host "==> Installing mandatory downloaders (yt-dlp, spotdl, gallery-dl) via $PythonExe..." -ForegroundColor Cyan
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install --upgrade yt-dlp spotdl gallery-dl
$pipCode = $LASTEXITCODE
$ErrorActionPreference = $prevPref

if ($pipCode -ne 0) {
    Write-Host "==> Retrying pip install with --user flag..." -ForegroundColor Yellow
    & $PythonExe -m pip install --user --upgrade yt-dlp spotdl gallery-dl
}

$pyScripts = (& $PythonExe -c "import sysconfig; print(sysconfig.get_path('scripts') or '')").Trim()
$pyUserBase = (& $PythonExe -c "import site, os; print(os.path.join(site.getuserbase(), 'Scripts'))" 2>$null).Trim()
Add-UserPathEntry $pyScripts
Add-UserPathEntry $pyUserBase
if (-not (Get-Command yt-dlp -ErrorAction SilentlyContinue)) {
    Install-WinGetTool -PackageId "yt-dlp.yt-dlp" -Label "yt-dlp" | Out-Null
}
Update-SessionPath

$missingTools = @()
foreach ($tool in @("ffmpeg", "yt-dlp", "spotdl", "gallery-dl")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        $missingTools += $tool
    }
}
if ($missingTools.Count -gt 0) {
    throw "Mandatory media tools missing from PATH after installation: $($missingTools -join ', '). Check Python Scripts PATH ($pyScripts) and retry."
}
Write-Host "==> Verified mandatory tools: ffmpeg, yt-dlp, spotdl, gallery-dl" -ForegroundColor Green

# 3. Locate or clone MediaGrabber project directory
$MyScriptPath = $MyInvocation.MyCommand.Path
$ScriptRoot = if ($MyScriptPath) { Split-Path -Parent (Split-Path -Parent $MyScriptPath) } else { "" }
if ($ScriptRoot -and (Test-Path (Join-Path $ScriptRoot "package.json"))) {
    $InstallDir = $ScriptRoot
} else {
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    }
    if (-not (Test-Path (Join-Path $InstallDir "package.json"))) {
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            throw "Git is required to clone MediaGrabber into $InstallDir."
        }
        $CloneBranch = if ($Channel -eq "nightly") { "mediagrabber-nightly" } else { "mediagrabber" }
        Write-Host "==> Cloning MediaGrabber (branch $CloneBranch) into $InstallDir..."
        git clone -b $CloneBranch https://github.com/ai-mayhemyt/mediagrabber.git $InstallDir
    }
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
Set-Location $InstallDir

# 4. Write UTF-8 (no BOM!) .env file safely for cmd.exe & dotenv
$EnvFile = Join-Path $InstallDir ".env"
if (-not (Test-Path $EnvFile)) {
    $envLines = @(
        "NODE_ENV=production"
        "PORT=$Port"
        "MEDIAGRABBER_DATA_DIR=$DataDir"
        "MEDIAGRABBER_UPDATE_CHANNEL=$Channel"
    ) -join [Environment]::NewLine
    [System.IO.File]::WriteAllText($EnvFile, "$envLines$([Environment]::NewLine)", (New-Object System.Text.UTF8Encoding($false)))
} else {
    $rawEnv = [System.IO.File]::ReadAllText($EnvFile)
    if ($rawEnv -match '(?m)^MEDIAGRABBER_UPDATE_CHANNEL=') {
        $rawEnv = [System.Text.RegularExpressions.Regex]::Replace($rawEnv, '(?m)^MEDIAGRABBER_UPDATE_CHANNEL=.*$', "MEDIAGRABBER_UPDATE_CHANNEL=$Channel")
    } else {
        $rawEnv = $rawEnv.TrimEnd() + [Environment]::NewLine + "MEDIAGRABBER_UPDATE_CHANNEL=$Channel" + [Environment]::NewLine
    }
    [System.IO.File]::WriteAllText($EnvFile, $rawEnv, (New-Object System.Text.UTF8Encoding($false)))
}

# 5. Build frontend + bundled server.cjs (and standalone .exe)
Write-Host "==> Installing Node dependencies..."
npm install --no-package-lock --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Write-Host "==> Building Web UI & bundled Node server..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Vite frontend build failed." }

npm run build:server
if ($LASTEXITCODE -ne 0) { throw "Server bundle build failed." }

$RootExe = $null
if (-not $SkipExe) {
    Write-Host "==> Building standalone Windows executable (mediagrabber.exe)..."
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $PkgBin = Join-Path $InstallDir "node_modules\.bin\pkg.cmd"
    if (Test-Path $PkgBin) {
        & $PkgBin dist-server/server.cjs --targets node22-win-x64 --output dist-exe/mediagrabber-win-x64.exe
    } else {
        npx @yao-pkg/pkg dist-server/server.cjs --targets node22-win-x64 --output dist-exe/mediagrabber-win-x64.exe
    }
    $pkgExit = $LASTEXITCODE
    $ErrorActionPreference = $prevPref

    $ExePath = Join-Path $InstallDir "dist-exe\mediagrabber-win-x64.exe"
    if ($pkgExit -eq 0 -and (Test-Path $ExePath)) {
        Copy-Item -Force $ExePath (Join-Path $InstallDir "mediagrabber.exe")
        $RootExe = Join-Path $InstallDir "mediagrabber.exe"
    } else {
        Write-Host "    Standalone .exe packaging skipped/failed (exit $pkgExit); using Node + dist-server\server.cjs launcher." -ForegroundColor Yellow
    }
}

if ($RegisterStartupTask) {
    if ($RootExe -and (Test-Path $RootExe)) {
        $Action = New-ScheduledTaskAction -Execute $RootExe -Argument "--port $Port --data-dir `"$DataDir`"" -WorkingDirectory $InstallDir
    } else {
        $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$InstallDir\deploy\start-windows.bat`"" -WorkingDirectory $InstallDir
    }
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    Register-ScheduledTask -TaskName "MediaGrabber" -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
    Write-Host "==> Registered Scheduled Task 'MediaGrabber' to start automatically at logon."
}

Write-Host ""
Write-Host "==> Installation complete!" -ForegroundColor Green
if ($RootExe) {
    Write-Host "    Start server:  .\mediagrabber.exe --open"
}
Write-Host "    Batch launch:  .\deploy\start-windows.bat"
Write-Host "    Web UI URL:    http://127.0.0.1:$Port"
Write-Host "    First Run:     Open the URL above to create your Administrator account in the Setup Guide."
