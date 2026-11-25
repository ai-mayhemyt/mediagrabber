# MediaGrabber `v2.1` (Full Stable Release) — Main Handoff & Deployment Guide

## Summary
**MediaGrabber `v2.1`** is the full stable release on the **`mediagrabber`** branch (`https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1`) and is live on npm as **`mediagrabber@2.1.0`** (`https://www.npmjs.com/package/mediagrabber`). It unifies **YouTube (`yt-dlp`)**, **Spotify (`spotdl`)**, and **Instagram / TikTok / X (`gallery-dl`)** behind one self-hosted Web UI and CLI across **Windows 10**, **Windows 11**, and **Linux (Ubuntu / Debian / Proxmox LXC)**, with **clean first-run Admin onboarding**, **Keyboard Shortcuts**, **mandatory downloader installation (`yt-dlp`, `spotdl`, `gallery-dl`, `ffmpeg`)**, **public npm CLI (`mediagrabber`)**, **Standalone `.exe` / Linux binaries**, **Unified Release Zip (`mediagrabber-v2.1.zip`)**, and **Ubuntu App Store (`Snap` + `.deb`)** distribution.

---

## Quick Download & Install Overview

| Platform | Fast CLI (`npm` / `npx`) | Standalone Binary (No Node) | Automated Installer (`Git` / `.zip`) | Native Linux Store / Package |
| --- | --- | --- | --- | --- |
| **Windows 10 & 11** | `npm install -g mediagrabber`<br>`npx mediagrabber --open` | `mediagrabber-win-x64.exe` ([Releases](https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1)) | `.\deploy\install-windows.ps1 -Channel stable -RegisterStartupTask` | — |
| **Linux (Ubuntu / Debian / LXC)** | `npm install -g mediagrabber`<br>`npx mediagrabber --open` | `mediagrabber-linux-x64` ([Releases](https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1)) | `sudo bash deploy/install-linux.sh --stable` | **Snap** (`mediagrabber`) & **`.deb`** (`build-deb.sh`) |

> **Mandatory Media Engines**: On every platform, **FFmpeg**, **`yt-dlp`**, **`spotdl`**, and **`gallery-dl`** are required (`ffmpeg` + Python extractors). The automated Windows (`install-windows.ps1`), Linux (`install-linux.sh`), `.deb` (`postinst`), and Snap installers handle all of these automatically; for standalone binary or npm installs, install FFmpeg + Python extractors first using the one-liners below.

---

## Windows 10 & Windows 11 — Download & Install Methods

### Method 1: Global npm CLI or `npx` *(Live on npm: `mediagrabber@2.1.0`)*
Install mandatory media engines once, then install or launch MediaGrabber from anywhere:
```powershell
winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
python -m pip install --upgrade pip yt-dlp spotdl gallery-dl

# Option A: Install globally
npm install -g mediagrabber
mediagrabber --open

# Option B: Run directly without installing globally
npx mediagrabber --open
```

### Method 2: Standalone Windows Executable (`mediagrabber-win-x64.exe` — No Node.js Required)
1. Install FFmpeg and the three mandatory extractors:
   ```powershell
   winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
   winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
   python -m pip install --upgrade pip yt-dlp spotdl gallery-dl
   ```
2. Download **`mediagrabber-win-x64.exe`** from **[GitHub Releases (`v2.1`)](https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1)** and launch it:
   ```cmd
   mediagrabber-win-x64.exe --open
   # Or specify custom port and workspace directory:
   mediagrabber-win-x64.exe --port 3000 --data-dir "%LOCALAPPDATA%\MediaGrabber" --open
   ```

### Method 3: Unified Release Zip (`mediagrabber-v2.1.zip` — Windows & Linux in One Archive)
Download **`mediagrabber-v2.1.zip`** from **[GitHub Releases (`v2.1`)](https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1)** (or **Utilities → Server Manager → Download Bundle (.zip)**), extract to `C:\MediaGrabber`, and run the Windows installer:
```powershell
Expand-Archive -Path "$HOME\Downloads\mediagrabber-v2.1.zip" -DestinationPath "C:\MediaGrabber" -Force
cd C:\MediaGrabber
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\install-windows.ps1 -Channel stable -RegisterStartupTask
```

### Method 4: Automated Git Clone Installer (`install-windows.ps1`)
```powershell
git clone -b mediagrabber https://github.com/ai-mayhemyt/mediagrabber.git C:\MediaGrabber
cd C:\MediaGrabber
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\install-windows.ps1 -Channel stable -RegisterStartupTask
```
*(Updating an existing clone preserves `%LOCALAPPDATA%\MediaGrabber` accounts & settings: `cd C:\MediaGrabber; git fetch --all --tags; git checkout mediagrabber; git pull; Set-ExecutionPolicy -Scope Process Bypass; .\deploy\install-windows.ps1 -Channel stable`)*

Then launch anytime with:
```powershell
.\mediagrabber.exe --open
# Or via the Node batch launcher:
.\deploy\start-windows.bat --open
```

---

## Linux (Ubuntu / Debian / Proxmox LXC) — Download & Install Methods

### Method 1: Automated Linux Installer (`deploy/install-linux.sh` — Recommended for Servers)
Installs Node/runtime dependencies, `ffmpeg`, `jq`, `python3`, `python3-venv`, provisions `yt-dlp`, `spotdl`, and `gallery-dl` into `/opt/mediagrabber/.venv` symlinked to `/usr/local/bin/`, preserves non-root ownership, sets up `/usr/local/bin/grab`, builds the app, and starts `mediagrabber.service`:
```bash
git clone -b mediagrabber https://github.com/ai-mayhemyt/mediagrabber.git /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh --stable
```
*(Pass `--nightly` instead of `--stable` to track the `mediagrabber-nightly` branch.)*

### Method 2: Unified Release Zip (`mediagrabber-v2.1.zip` via Download / SFTP & SSH)
Download **`mediagrabber-v2.1.zip`** from GitHub Releases (or upload via SFTP to `~`), extract, and install:
```bash
curl -fsSL -o ~/mediagrabber-v2.1.zip https://github.com/ai-mayhemyt/mediagrabber/releases/download/v2.1/mediagrabber-v2.1.zip
sudo unzip -o ~/mediagrabber-v2.1.zip -d /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh --stable && \
sudo systemctl restart mediagrabber && \
curl -s http://127.0.0.1:3000/healthz
```

### Method 3: Global npm CLI or `npx` *(Live on npm: `mediagrabber@2.1.0`)*
Install mandatory system engines once, then install or run via npm:
```bash
sudo apt update && sudo apt install -y ffmpeg jq python3 python3-pip
python3 -m pip install --upgrade yt-dlp spotdl gallery-dl

# Option A: Install globally
sudo npm install -g mediagrabber
mediagrabber --open

# Option B: Run directly via npx
npx mediagrabber --open
```
*(Customize workspace/port anytime: `MEDIAGRABBER_DATA_DIR=/var/lib/mediagrabber mediagrabber --port 3000`.)*

### Method 4: Standalone Linux Binary (`mediagrabber-linux-x64` — No Node.js Required)
Install FFmpeg + Python extractors, then download **`mediagrabber-linux-x64`** from **[GitHub Releases (`v2.1`)](https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1)**:
```bash
curl -fsSL -o mediagrabber-linux-x64 https://github.com/ai-mayhemyt/mediagrabber/releases/download/v2.1/mediagrabber-linux-x64
chmod +x mediagrabber-linux-x64
./mediagrabber-linux-x64 --port 3000 --data-dir /var/lib/mediagrabber --open
```

### Method 5: Ubuntu / Debian `.deb` Package
Builds and installs a native `.deb` package with `systemd` service, `/usr/bin/mediagrabber`, `/usr/local/bin/grab`, desktop launcher, and automatic extractor provisioning:
```bash
cd /opt/mediagrabber
npm run build:deb
sudo apt install -y ./dist-deb/mediagrabber_2.1.0_amd64.deb
```

### Method 6: Ubuntu App Store (`Snap`)
```bash
# Install from Snap Store (once published):
sudo snap install mediagrabber
sudo snap connect mediagrabber:removable-media
mediagrabber --open

# Or build & publish locally via Snapcraft:
sudo snap install snapcraft --classic
snapcraft
sudo snap install ./mediagrabber_2.1.0_amd64.snap --dangerous
sudo snap connect mediagrabber:removable-media
snapcraft login
snapcraft upload --release=stable mediagrabber_2.1.0_amd64.snap
```

---

## Complete Feature Inventory (`v2.0` → `v2.1`)

### 1. New & Fixed in `v2.1` Final Release
- **Clean First-Run Account Onboarding (Windows & Linux)**:
  - Brand-new installations start with zero pre-seeded/hardcoded accounts, zero dummy media files, and an empty queue/history.
  - Launching the Web UI for the first time automatically opens the **MediaGrabber Setup Wizard (Step 1: Admin Account)** so the installer creates their own administrator username and password cleanly (or uses the Auth screen's first-run **Create Administrator Account** form).
  - Step 1 transitions directly to Step 2 (**Media Libraries**) without resetting the wizard when the admin session is created.
  - Existing accounts on upgraded servers are always preserved untouched (`users.json`). *(Explicit demo seeding is opt-in only via `MEDIAGRABBER_DEMO_SEED=1`.)*
- **Mandatory Media Extractors (`yt-dlp`, `spotdl`, `gallery-dl`, `ffmpeg`)**:
  - `install-windows.ps1`, `install-linux.sh`, `build-deb.sh` (`postinst`), and `snapcraft.yaml` all mandatorily install and verify **`ffmpeg`**, **`yt-dlp`**, **`spotdl`**, and **`gallery-dl`** (plus **`jq`** on Linux), and **Utilities → Server Manager → Pre-Flight Health** marks all three extractors as **Required**.
- **Global Keyboard Shortcuts & Shortcuts Reference Modal (`ShortcutsModal`)**:
  - `/` or `Ctrl/Cmd + K`: Focus TopBar global search filter.
  - `N`: Switch to Queue and focus the batch URL box.
  - `Ctrl/Cmd + Enter` *(inside Queue URL box)*: Submit batch grab immediately.
  - `1`–`4`: Switch between Queue, History, Utilities, and Settings (admin-only for `4`).
  - `R`: Refresh Queue, History, and Storage metrics.
  - `?`: Toggle Keyboard Shortcuts modal (also clickable in TopBar).
  - `Esc`: Close the topmost open modal cleanly.
  - Single-key shortcuts automatically ignore typing inside `input`, `textarea`, `select`, and `contentEditable` elements.
- **Public npm CLI Package (`mediagrabber@2.1.0`)**:
  - Live at `https://www.npmjs.com/package/mediagrabber` with MIT `LICENSE`, clean `files` allowlist, `bin: { "mediagrabber": "dist-server/server.cjs" }`, `prepublishOnly`, and executable Node shebang in `build:server`.
  - Fixed global npm path resolution (`IS_COMPILED_CJS`, `PACKAGE_ROOT`, `BUNDLE_ROOT`) so `npm install -g mediagrabber` / `npx mediagrabber --open` works from any working directory.
- **Ubuntu App Store (`Snap`) & `.deb` Packaging**:
  - [`snap/snapcraft.yaml`](./snap/snapcraft.yaml) (`base: core22`, `confinement: strict`) bundling Node 22, FFmpeg, `jq`, `yt-dlp`, `spotdl`, `gallery-dl`, desktop app, `daemon`, and `grab` CLI, with `SNAP_USER_COMMON` / `SNAP_COMMON` storage detection.
  - [`deploy/mediagrabber.desktop`](./deploy/mediagrabber.desktop) and [`deploy/build-deb.sh`](./deploy/build-deb.sh) (`npm run build:deb`) building installable Ubuntu/Debian `.deb` packages.

### 2. Core & Downloader Features (`v2.1-pre1` + `v2.1-pre2`)
- **Live SSE Log Streaming (`GET /api/log/:jobId/stream`)**: Real-time `EventSource` terminal stream with `LIVE STREAM` badge, keepalive pings, and Auto-scroll toggle.
- **Automated Duplicate Cleanup Scheduler**: Chunked 1 MB SHA-256 hashing (`hashFileSha256`), `Off / Daily / Weekly` schedule, 1-click **Run All Libraries Now**, and safe `duplicates_trash` staging.
- **Custom Per-Site Naming Templates**: Validated templates for `yt-dlp`, `spotdl`, and `gallery-dl` wired into Linux `grab`, Windows `grab.ps1`, and `server.ts`.
- **Bandwidth Throttling (`--limit-rate`)**: Presets (`Unlimited`, `1M`, `2M`, `5M`, `10M`, `25M`, `50M`) and custom rate limits across `grab`, `grab.ps1`, and `server.ts`.
- **Standalone Windows `.exe` & Linux Binaries**: Built via `esbuild` + `@yao-pkg/pkg` (`node22-win-x64`, `node22-linux-x64`), bundled `grab`/`grab.ps1` extraction, `--open` browser launch, `--port`, `--data-dir`, and binary self-updating.
- **Persistent Queue & Concurrency Scheduling**: `queue.json` persistence across restarts + configurable Max Concurrent Downloads (`1–8`).
- **YouTube RSS Auto-Grab**: Sidebar `@handle` / channel ID subscriptions with Video/Audio toggle, 15-minute poller, archive deduplication, and Check Now.
- **Per-Grab Toggles & `cookies.txt` Manager**: Embed Subtitles, SponsorBlock, Single Video vs Full Playlist mode, and Netscape `cookies.txt` upload/paste in Settings.
- **Pre-Flight Dependency Health & Updater**: Inspect and 1-click update `yt-dlp`, `spotdl`, `gallery-dl`, `ffmpeg`, `jq`, `deno`, and `grab`/`grab.ps1` in **Utilities → Server Manager**.

### 3. Auth, Integrations & Companion Features (`v2.0`)
- **Multi-User Auth, Scoped API Keys & TOTP 2FA**: Scrypt password hashing, `mg_...` scoped API tokens, and `otpauth://` QR + copyable setup secret.
- **5-Step Jellyfin-Style Setup Wizard**: Clean first-run admin onboarding + non-destructive account preservation on upgrades, library path setup, quality presets, and Jellyfin/Navidrome/Plex linking.
- **MediaGrabber — Jellyfin Edition (`jellyfin-plugin/`)**: Companion plugin for Jellyfin `10.8–10.11+` (`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`) with Server URL & API Key settings.
- **In-Browser Range Player, Send to Device, Web Push & Webhooks**: HTTP 206 byte-range media preview, 1-hour signed download URLs with QR codes, VAPID Web Push, and Discord/Slack/ntfy webhooks.
- **Channel-Aware Auto-Updater**: Full Releases track **`mediagrabber`**; Nightly Pre-Releases track **`mediagrabber-nightly`**.

---

## Windows Deployment Fixes Included in `v2.1`

1. **Cross-Platform `npm start` & `npm run clean`**: Replaced POSIX-only `NODE_ENV=production tsx server.ts` in `package.json` with a cross-platform Node launcher targeting `dist-server/server.cjs` (auto-building if needed) so `cmd.exe` and PowerShell never fail with `'NODE_ENV' is not recognized`.
2. **Working Standalone `.exe` Builds (`@yao-pkg/pkg`)**: Replaced legacy `pkg@5.8.1` (which crashed on `node22-win-x64` with `No available node version satisfies 'node22'`) with `@yao-pkg/pkg@6.26.0` so `npm run build:exe` builds `dist-exe\mediagrabber-win-x64.exe` reliably.
3. **Robust `deploy/install-windows.ps1`**:
   - Safely handles both script execution and one-liner invocation (`$MyInvocation.MyCommand.Path` guarded).
   - Wraps `winget install` calls safely against non-fatal exit codes (such as already-installed `0x8A15002B`), skips the fake Microsoft Store `WindowsApps\python.exe` stub, and installs `Node.js 22 LTS`, `Git`, `FFmpeg (Gyan.FFmpeg)`, and `Python 3.12`.
   - Mandatorily installs/upgrades **`yt-dlp`**, **`spotdl`**, and **`gallery-dl`** via `python -m pip install --upgrade`, adds Python `Scripts` permanently to User `PATH`, and verifies all 4 tools (`ffmpeg`, `yt-dlp`, `spotdl`, `gallery-dl`) before finishing.
   - Writes `.env` as **UTF-8 without BOM** so `deploy/start-windows.bat` parses `PORT` and `MEDIAGRABBER_DATA_DIR` cleanly without BOM corruption.
   - Builds `dist/` and `dist-server/server.cjs` before compiling `mediagrabber.exe`.
4. **Fixed `deploy/start-windows.bat`, `server.ts` & `grab.ps1`**:
   - Fixed batch `.env` `#` comment skipping and dynamic scanning of `%LOCALAPPDATA%\Programs\Python\Python*\Scripts`, `%APPDATA%\Python\Python*\Scripts`, and `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin`.

---

## Maintainer Sync & Release Reference (`v2.1`)

If updating the **`mediagrabber`** branch, release notes, or release assets on GitHub from `/opt/mediagrabber`:

```bash
cd /opt/mediagrabber
sudo chown -R "$USER:$USER" /opt/mediagrabber
git checkout mediagrabber
git add -A
git commit -m "Update MediaGrabber v2.1 handoff and download docs"
git push --force-with-lease origin mediagrabber
git tag -f -a v2.1 -m "MediaGrabber v2.1 Full Stable Release"
git push -f origin v2.1

gh release edit v2.1 \
  --title "MediaGrabber v2.1 (Full Stable Release)" \
  --notes-file HANDOFF.md
```

*(Note: Pushing a `v*` tag triggers [`.github/workflows/build-binaries.yml`](./.github/workflows/build-binaries.yml), which builds and attaches `mediagrabber-win-x64.exe`, `mediagrabber-linux-x64`, and the unified `mediagrabber-v2.1.zip` directly to the release. To publish a follow-up npm patch version, bump `"version"` in `package.json` and run `npm publish --access public --otp=123456`.)*

---

## Distribution & Repository Links
- **GitHub Repository**: `https://github.com/ai-mayhemyt/mediagrabber`
- **Full Release Branch**: `mediagrabber` (target for **`v2.1`**)
- **Nightly Branch**: `mediagrabber-nightly`
- **GitHub Release (`v2.1`)**: `https://github.com/ai-mayhemyt/mediagrabber/releases/tag/v2.1`
- **npm Package (`mediagrabber@2.1.0`)**: `https://www.npmjs.com/package/mediagrabber`
- **Companion Jellyfin Plugin**: `https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`
- **Ubuntu App Store (Snap)**: `mediagrabber` (`snap/snapcraft.yaml`)
- **Debian/Ubuntu Package**: `deploy/build-deb.sh` → `dist-deb/mediagrabber_2.1.0_<arch>.deb`
