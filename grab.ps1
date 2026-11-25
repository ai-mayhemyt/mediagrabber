# =====================================================
# MediaGrabber v2.1 - Windows 10 / 11 Grab Wrapper (PowerShell)
# =====================================================
param(
    [Parameter(Position = 0)]
    [string]$Url = ""
)

$ErrorActionPreference = "Continue"

if (-not $Url) {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] No URL provided."
    exit 1
}

$CleanUrl = ($Url -replace '[\r\n\t\s]', '')
$ConfigDir = if ($env:USERPROFILE) { Join-Path $env:USERPROFILE ".mediagrabber" } else { Join-Path $env:LOCALAPPDATA "MediaGrabber\.mediagrabber" }
$ArchiveFile = Join-Path $ConfigDir "archive.txt"

$YtDir = if ($env:GRAB_YT_DIR) { $env:GRAB_YT_DIR } else { Join-Path ([Environment]::GetFolderPath("MyVideos")) "MediaGrabber" }
$MusicDir = if ($env:GRAB_MUSIC_DIR) { $env:GRAB_MUSIC_DIR } else { Join-Path ([Environment]::GetFolderPath("MyMusic")) "MediaGrabber" }
$GalleryDir = if ($env:GRAB_GALLERY_DIR) { $env:GRAB_GALLERY_DIR } else { Join-Path ([Environment]::GetFolderPath("MyPictures")) "MediaGrabber" }
$CookiesYoutube = if ($env:GRAB_COOKIES_YOUTUBE) { $env:GRAB_COOKIES_YOUTUBE } else { "" }
$CookiesGallery = if ($env:GRAB_COOKIES_GALLERY) { $env:GRAB_COOKIES_GALLERY } else { "" }
$TempDir = if ($env:GRAB_OUTPUT_DIR) { $env:GRAB_OUTPUT_DIR } else { Join-Path ([System.IO.Path]::GetTempPath()) "mediagrabber\$PID" }

New-Item -ItemType Directory -Force -Path $ConfigDir, $YtDir, $MusicDir, $GalleryDir, $TempDir | Out-Null
if (-not (Test-Path $ArchiveFile)) {
    New-Item -ItemType File -Force -Path $ArchiveFile | Out-Null
}

function Write-GrabLog {
    param([string]$Message)
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

function Resolve-GrabTool {
    param([string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = New-Object System.Collections.Generic.List[string]
    if ($env:LOCALAPPDATA) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\$Name.exe"))
        Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Programs\Python\Python*\Scripts\$Name.exe") -ErrorAction SilentlyContinue | ForEach-Object { $candidates.Add($_.FullName) }
        Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin\$Name.exe") -ErrorAction SilentlyContinue | ForEach-Object { $candidates.Add($_.FullName) }
    }
    if ($env:APPDATA) {
        $candidates.Add((Join-Path $env:APPDATA "Python\Scripts\$Name.exe"))
        Get-ChildItem -Path (Join-Path $env:APPDATA "Python\Python*\Scripts\$Name.exe") -ErrorAction SilentlyContinue | ForEach-Object { $candidates.Add($_.FullName) }
    }
    if ($env:ProgramData) { $candidates.Add((Join-Path $env:ProgramData "chocolatey\bin\$Name.exe")) }
    if ($env:USERPROFILE) { $candidates.Add((Join-Path $env:USERPROFILE "scoop\shims\$Name.exe")) }
    $candidates.Add("C:\ffmpeg\bin\$Name.exe")
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

$FfmpegBin = Resolve-GrabTool "ffmpeg"
if ($FfmpegBin) {
    $FfmpegDir = Split-Path -Parent $FfmpegBin
    if ($FfmpegDir -and ($env:PATH -notlike "*$FfmpegDir*")) {
        $env:PATH = "$FfmpegDir;$env:PATH"
    }
}

$YtDlp = Resolve-GrabTool "yt-dlp"
$SpotDl = Resolve-GrabTool "spotdl"
$GalleryDl = Resolve-GrabTool "gallery-dl"
$DenoBin = Resolve-GrabTool "deno"

$Engine = "YOUTUBE"
if ($CleanUrl -imatch "spotify\.com") {
    $Engine = "SPOTIFY"
} elseif ($CleanUrl -imatch "music\.youtube\.com") {
    $Engine = "YT MUSIC"
} elseif ($CleanUrl -imatch "instagram\.com|tiktok\.com|twitter\.com|x\.com|reddit\.com|pinterest\.com") {
    $Engine = "GALLERY"
}

Write-GrabLog "Engine → $Engine"
Write-GrabLog "URL → $CleanUrl"

$VideoRes = if ($env:GRAB_VIDEO_RES) { $env:GRAB_VIDEO_RES } else { "1080" }
$AudioFormat = if ($env:GRAB_AUDIO_FORMAT) { $env:GRAB_AUDIO_FORMAT } else { "mp3" }
$AudioBitrate = if ($env:GRAB_AUDIO_BITRATE) { $env:GRAB_AUDIO_BITRATE } else { "320k" }
$Container = if ($env:GRAB_CONTAINER) { $env:GRAB_CONTAINER } else { "mp4" }
$GenerateLrc = ($env:GRAB_GENERATE_LRC -eq "true")
$AudioOnly = ($env:GRAB_AUDIO_ONLY -eq "true") -or ($Engine -eq "YT MUSIC")
$EmbedSubs = ($env:GRAB_EMBED_SUBS -eq "true")
$SponsorBlock = ($env:GRAB_SPONSORBLOCK -eq "true")
$AllowPlaylist = ($env:GRAB_PLAYLIST -eq "true")
$FolderStructure = if ($env:GRAB_FOLDER_STRUCTURE) { $env:GRAB_FOLDER_STRUCTURE } else { "default" }
$RateLimit = if ($env:GRAB_RATE_LIMIT -and ($env:GRAB_RATE_LIMIT.Trim() -match '^\d+(?:\.\d+)?[kKmMgG]?$')) { $env:GRAB_RATE_LIMIT.Trim() } else { "" }

function Get-SafeRelTemplate {
    param([string]$Raw, [string]$Fallback)
    if (-not $Raw) { return $Fallback }
    $clean = ($Raw -replace '[\r\n\x00`$;|&><"'']', '') -replace '\.\.', ''
    $clean = $clean.TrimStart('/', '\')
    if (-not $clean) { return $Fallback }
    return $clean
}

$YtTemplate = Get-SafeRelTemplate $env:GRAB_YT_TEMPLATE "%(title).150s.%(ext)s"
$MusicTemplate = Get-SafeRelTemplate $env:GRAB_MUSIC_TEMPLATE "{artist}/{album}/{title}.{ext}"
$GalleryTemplate = Get-SafeRelTemplate $env:GRAB_GALLERY_TEMPLATE "%(title).100s-%(id)s.%(ext)s"

Write-GrabLog "Video max: ${VideoRes}p, Audio: $AudioFormat ($AudioBitrate), Container: $Container, Audio-Only: $AudioOnly, Subtitles: $EmbedSubs, SponsorBlock: $SponsorBlock, Playlist: $AllowPlaylist$(if ($RateLimit) { ", Limit: $RateLimit" })"

# ---------- SPOTIFY PIPELINE ----------
if ($Engine -eq "SPOTIFY") {
    if (-not $SpotDl) {
        Write-GrabLog "ERROR: spotdl not found in PATH."
        exit 1
    }
    $OutTemplate = Join-Path $MusicDir ($MusicTemplate -replace '/', '\')
    $ArgsList = @($CleanUrl, "--output", $OutTemplate, "--format", $AudioFormat, "--simple-tui", "--max-retries", "5")
    if ($AudioFormat -eq "mp3") { $ArgsList += @("--bitrate", $AudioBitrate) }
    if ($GenerateLrc) { $ArgsList += "--generate-lrc" }
    if ($env:GRAB_EXTRA_SPOTIFY) { $ArgsList += ($env:GRAB_EXTRA_SPOTIFY -split '\s+' | Where-Object { $_ }) }

    Write-GrabLog "Running spotdl..."
    & $SpotDl @ArgsList 2>&1 | ForEach-Object {
        $line = "$_"
        Write-Output $line
        if ($line -match 'Downloading\s+track\s+(\d+)\s+of\s+(\d+)') {
            $d = [int]$Matches[1]; $t = [int]$Matches[2]
            if ($t -gt 0) {
                $pct = [int][Math]::Round(($d * 100) / $t)
                Write-GrabLog "PROGRESS: $d/$t ($pct%)"
            }
        }
    }
    $ExitCode = $LASTEXITCODE
    if ($ExitCode -eq 0) {
        $Latest = Get-ChildItem -Path $MusicDir -Recurse -File -Include *.mp3,*.flac,*.m4a,*.opus -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($Latest) {
            Write-GrabLog "FINAL_FILE: $($Latest.FullName)"
        }
    }
    exit $ExitCode
}

# ---------- GALLERY PIPELINE ----------
if ($Engine -eq "GALLERY") {
    if (-not $GalleryDl) {
        Write-GrabLog "ERROR: gallery-dl not found in PATH."
        exit 1
    }
    Push-Location $TempDir
    $GalleryFileTmpl = Split-Path -Leaf ($GalleryTemplate -replace '/', '\')
    if (-not $GalleryFileTmpl) { $GalleryFileTmpl = "%(title).100s-%(id)s.%(ext)s" }
    $ArgsList = @($CleanUrl, "--directory", ".", "--filename", $GalleryFileTmpl)
    if ($RateLimit) { $ArgsList += @("--limit-rate", $RateLimit) }
    if ($CookiesGallery -and (Test-Path $CookiesGallery)) { $ArgsList += @("--cookies", $CookiesGallery) }
    if ($env:GRAB_EXTRA_GALLERY) { $ArgsList += ($env:GRAB_EXTRA_GALLERY -split '\s+' | Where-Object { $_ }) }

    Write-GrabLog "Running gallery-dl..."
    & $GalleryDl @ArgsList 2>&1 | ForEach-Object { Write-Output "$_" }
    $ExitCode = $LASTEXITCODE

    if ($ExitCode -eq 0) {
        $Latest = Get-ChildItem -Path $TempDir -Recurse -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($Latest) {
            $FinalDir = if ($FolderStructure -eq "flat") { $GalleryDir } else { Join-Path $GalleryDir "Unsorted" }
            New-Item -ItemType Directory -Force -Path $FinalDir | Out-Null
            $Dest = Join-Path $FinalDir $Latest.Name
            Move-Item -Force -Path $Latest.FullName -Destination $Dest
            Write-GrabLog "FINAL_FILE: $Dest"
        }
    }
    Pop-Location
    exit $ExitCode
}

# ---------- YOUTUBE PIPELINE ----------
if (-not $YtDlp) {
    Write-GrabLog "ERROR: yt-dlp not found in PATH."
    exit 1
}

Push-Location $TempDir
$YtRelOut = ".\\" + ($YtTemplate -replace '/', '\')
$ArgsList = @(
    "--no-mtime", "--no-part", "--ignore-errors", "--continue", "--no-overwrites", "--newline",
    "--download-archive", $ArchiveFile,
    "--write-info-json", "--write-thumbnail", "--embed-metadata",
    "--concurrent-fragments", "4", "--geo-bypass",
    "--retries", "10", "--fragment-retries", "10"
)
if ($RateLimit) { $ArgsList += @("--limit-rate", $RateLimit) }
if ($CookiesYoutube -and (Test-Path $CookiesYoutube)) { $ArgsList += @("--cookies", $CookiesYoutube) }
if ($DenoBin) { $ArgsList += @("--js-runtimes", "deno:$DenoBin", "--remote-components", "ejs:github") }
if ($AllowPlaylist) { $ArgsList += "--yes-playlist" } else { $ArgsList += "--no-playlist" }
if ($EmbedSubs -and (-not $AudioOnly)) { $ArgsList += @("--write-subs", "--write-auto-subs", "--embed-subs", "--sub-langs", "en.*,en") }
if ($SponsorBlock) { $ArgsList += @("--sponsorblock-remove", "sponsor") }

if ($AudioOnly) {
    $ArgsList += @("--extract-audio", "--audio-format", $AudioFormat, "--audio-quality", "0", "-o", $YtRelOut)
} else {
    $ArgsList += @("-f", "bv*[height<=$VideoRes]+ba/b[height<=$VideoRes]/b", "--merge-output-format", $Container, "-o", $YtRelOut)
}
if ($env:GRAB_EXTRA_YT) { $ArgsList += ($env:GRAB_EXTRA_YT -split '\s+' | Where-Object { $_ }) }
$ArgsList += $CleanUrl

Write-GrabLog "Running yt-dlp..."
& $YtDlp @ArgsList 2>&1 | ForEach-Object { Write-Output "$_" }
$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    $MediaExts = if ($AudioOnly) { @(".mp3", ".flac", ".m4a", ".opus") } else { @(".mp4", ".mkv", ".webm") }
    $MediaFile = Get-ChildItem -Path $TempDir -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $MediaExts -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($MediaFile) {
        $BaseName = [System.IO.Path]::GetFileNameWithoutExtension($MediaFile.Name)
        $MediaParent = $MediaFile.Directory.FullName
        $InfoPath = Join-Path $MediaParent "$BaseName.info.json"
        $Uploader = "Unknown Uploader"
        $Year = (Get-Date -Format "yyyy")
        if (Test-Path $InfoPath) {
            try {
                $InfoObj = Get-Content -Path $InfoPath -Raw | ConvertFrom-Json
                if ($InfoObj.uploader) { $Uploader = [string]$InfoObj.uploader }
                if ($InfoObj.upload_date -and "$($InfoObj.upload_date)".Length -ge 4) {
                    $Year = "$($InfoObj.upload_date)".Substring(0, 4)
                }
            } catch {}
        }
        $UploaderSafe = ($Uploader -replace '[<>:"/\\|?*\x00-\x1f]', '_').Trim(' ', '.')
        if (-not $UploaderSafe) { $UploaderSafe = "Unknown Uploader" }

        $BaseDestRoot = if ($AudioOnly) { $MusicDir } else { $YtDir }
        $TempFull = (Resolve-Path $TempDir).Path.TrimEnd('\')
        $ParentFull = $MediaParent.TrimEnd('\')
        if ($ParentFull.Length -gt $TempFull.Length) {
            $RelSub = $ParentFull.Substring($TempFull.Length).TrimStart('\')
            $FinalDir = Join-Path $BaseDestRoot $RelSub
        } elseif ($FolderStructure -eq "flat") {
            $FinalDir = $BaseDestRoot
        } else {
            $FinalDir = Join-Path (Join-Path $BaseDestRoot $UploaderSafe) $Year
        }
        New-Item -ItemType Directory -Force -Path $FinalDir | Out-Null

        $DestMedia = Join-Path $FinalDir $MediaFile.Name
        Move-Item -Force -Path $MediaFile.FullName -Destination $DestMedia
        Write-GrabLog "FINAL_FILE: $DestMedia"

        foreach ($ext in @(".webp", ".jpg", ".jpeg", ".png")) {
            $ThumbPath = Join-Path $MediaParent "$BaseName$ext"
            if (Test-Path $ThumbPath) {
                $DestThumb = Join-Path $FinalDir "$BaseName$ext"
                Move-Item -Force -Path $ThumbPath -Destination $DestThumb
                Write-GrabLog "FINAL_THUMB: $DestThumb"
            }
        }
        if (Test-Path $InfoPath) {
            Move-Item -Force -Path $InfoPath -Destination (Join-Path $FinalDir "$BaseName.info.json")
        }
    }
}

Pop-Location
exit $ExitCode
