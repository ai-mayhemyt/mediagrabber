<div align="center">

<img src="public/logo.png" alt="MediaGrabber" width="360" />

# MediaGrabber (`v2.0`)

**Self-Hosted Media Ingestion, Download Queue Console, Metadata Editor & Jellyfin Companion Service**

Download, transcode, deduplicate, and organize media from **YouTube**, **YouTube Music**, **Spotify**, **Instagram**, **TikTok**, and other `yt-dlp` / `gallery-dl` sources with web-based queue management, scoped API keys, Navidrome radio sync, and native Jellyfin integration across **Linux**, **Windows 11**, and **Windows 10**.

![Version](https://img.shields.io/badge/Version-v2.0--pre8-5b7cfa?style=flat-square)
![Platforms](https://img.shields.io/badge/Platforms-Linux%20%7C%20Windows%2011%20%7C%20Windows%2010-10b981?style=flat-square)
![Branch](https://img.shields.io/badge/Branch-2.0--app-6366f1?style=flat-square)

</div>

---

## Supported Platforms & OS Version Badges

MediaGrabber automatically appends your host OS to the reported build version (for example `v2.0-pre8-Linux`, `v2.0-pre8-Windows11`, or `v2.0-pre8-Windows10`):

| Platform / Environment | Support Status | Reported Version Tag | Notes |
| --- | --- | --- | --- |
| **Ubuntu 22.04 / 24.04 LTS** | Fully Supported | `-Linux` | Primary target for `deploy/install-linux.sh` + `systemd` |
| **Debian 11 / 12 & Proxmox LXC** | Fully Supported | `-Linux` | Lightweight server / LXC container setup |
| **Windows 11 (`Build >= 22000`)** | Fully Supported | `-Windows11` | Native PowerShell (`grab.ps1` + `deploy/install-windows.ps1`) |
| **Windows 10 (`Build < 22000`)** | Fully Supported | `-Windows10` | Native PowerShell (`grab.ps1` + `deploy/install-windows.ps1`) |

---

## Dependencies

### Core Runtime & Build
- **Node.js `20+` or `22 LTS`** and **npm**
- **Linux**: `curl`, `git`, `unzip`, `python3`, `ca-certificates`
- **Windows 10 / 11**: PowerShell `5.1+` / `7+` (built in), `git`, and optional `winget`

### Media Download & Processing Engines (`grab` / `grab.ps1`)
- **`yt-dlp`** — YouTube, YouTube Music, and general video/audio extraction
- **`spotdl`** — Spotify track/album/playlist resolution & `.lrc` lyrics
- **`gallery-dl`** — Instagram, TikTok, X/Twitter, Reddit, Pinterest, and image galleries
- **`ffmpeg`** — Media muxing, audio/video transcoding, and embedded cover-art/metadata tagging
- **`jq`** *(Linux `grab`)* — Metadata `.info.json` parsing (PowerShell parses JSON natively on Windows)
- **`deno`** *(optional)* — JavaScript runtime used by `yt-dlp` when `--js-runtimes` is needed

---

## Linux Installation (`Ubuntu / Debian / Proxmox LXC`)

### Step 1: Clone & Run the Linux Auto-Installer

```bash
git clone -b 2.0-app https://github.com/ai-mayhemyt/mediagrabber.git /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh
```

Choose **Full Releases** (`--stable`) or **Nightly Pre-Releases** (`--nightly`) during install. The installer installs [`grab`](./grab) to `/usr/local/bin/grab` and sets up `mediagrabber.service` on port **`3000`**.

### Step 2: Install Media Downloader Tools (If Needed)

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg jq python3-pip
python3 -m pip install --user --upgrade yt-dlp spotdl gallery-dl
```

---

## Windows 10 & Windows 11 Installation

### Step 1: Run the PowerShell Installer

Open **PowerShell** (as Administrator if registering a startup task) and run:

```powershell
git clone -b 2.0-app https://github.com/ai-mayhemyt/mediagrabber.git C:\MediaGrabber
cd C:\MediaGrabber
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\install-windows.ps1
```

The installer detects **Windows 11** vs **Windows 10**, installs missing tools via `winget` (`Node.js LTS`, `Git`, `FFmpeg`, `yt-dlp`), configures `%LOCALAPPDATA%\MediaGrabber` for state, and builds the app. Pass `-RegisterStartupTask` to auto-start MediaGrabber on sign-in.

Install optional Spotify / social gallery engines via Python if desired:

```powershell
python -m pip install --upgrade yt-dlp spotdl gallery-dl
```

### Step 2: Start MediaGrabber on Windows

Double-click or run:

```cmd
deploy\start-windows.bat
```

MediaGrabber uses [`grab.ps1`](./grab.ps1) natively on Windows and stores downloads in your `Videos\MediaGrabber`, `Music\MediaGrabber`, and `Pictures\MediaGrabber` folders by default (customizable in **Settings**).

---

## First-Run Setup Wizard & API Keys

1. Open **`http://<your-server-ip>:3000`** (or `http://localhost:3000` on Windows).
2. Follow the **Setup Wizard** to create/confirm your Admin account (without overwriting existing accounts), configure your Video/Music/Gallery directories, and optionally link Jellyfin.
3. Click your profile badge in the bottom-left sidebar → **API Tokens** to create a **`download`** or **`admin`** `mg_...` API key.

---

## Companion Plugin: MediaGrabber — Jellyfin Edition

Queue YouTube, YouTube Music, Spotify, Instagram, and TikTok downloads directly inside Jellyfin (`10.8`, `10.9`, `10.10`, and `10.11+`) using **[ai-mayhemyt/MediaGrabber-Jellyfin-Edition](https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition)**:

1. In Jellyfin, open **Dashboard → Plugins → Repositories → `+`**.
2. Add the Repository URL:
   ```text
   https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition/releases/latest/download/manifest.json
   ```
3. Go to **Catalog → General → MediaGrabber**, install the build matching your Jellyfin version, and restart Jellyfin.
4. Open **MediaGrabber Downloader** in the Jellyfin sidebar (or **Dashboard → Plugins → MediaGrabber**), enter your MediaGrabber Server URL and `mg_...` API key, test the connection, and save.

---

## Standalone CLI Wrappers (`grab` / `grab.ps1`)

- **Linux**: `/usr/local/bin/grab "https://www.youtube.com/watch?v=..."`
- **Windows**: `powershell -ExecutionPolicy Bypass -File .\grab.ps1 "https://www.youtube.com/watch?v=..."`

Configure optional environment variables (`PORT`, `MEDIAGRABBER_DATA_DIR`, `MEDIAGRABBER_UPDATE_CHANNEL`) in `.env` based on `.env.example`.
