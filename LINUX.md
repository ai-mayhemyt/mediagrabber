<div align="center">

<img src="public/logo.png" alt="MediaGrabber" width="320" />

# MediaGrabber `v2.1` — Linux & Ubuntu Guide

Complete installation, Ubuntu App Store (Snap), `.deb` package, npm CLI, `systemd`, `/usr/local/bin/grab`, and SSH/SFTP deployment guide for **Ubuntu 22.04/24.04 LTS**, **Debian 11/12**, and **Proxmox LXC**.

</div>

---

## Option 1: Automated Linux Installer (`deploy/install-linux.sh`)

Recommended for **Ubuntu Server**, **Debian**, and **Proxmox LXC** deployments into `/opt/mediagrabber` with `systemd`:

```bash
git clone -b mediagrabber https://github.com/ai-mayhemyt/mediagrabber.git /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh --stable
```

Pass `--nightly` instead of `--stable` if you want to track `mediagrabber-nightly` pre-releases.

`install-linux.sh` mandatorily installs `ffmpeg`, `jq`, `python3`, `python3-venv`, `yt-dlp`, `spotdl`, and `gallery-dl` (linked into `/usr/local/bin/`) and starts cleanly with no pre-saved accounts so you create your own Administrator account in the Setup Guide.

Manual extractor upgrade command (optional):

```bash
/opt/mediagrabber/.venv/bin/pip install --upgrade yt-dlp spotdl gallery-dl
```

---

## Option 2: Ubuntu App Store (Snap Package)

Build or install via Snapcraft (`snap/snapcraft.yaml`, `core22`, strict confinement):

### Install from Snap Store (once published)
```bash
sudo snap install mediagrabber
sudo snap connect mediagrabber:removable-media
mediagrabber --open
```

The Snap bundles Node.js 22, FFmpeg, `jq`, `yt-dlp`, `spotdl`, `gallery-dl`, and a background daemon:
- **Launch desktop Web UI**: `mediagrabber --open` (or click **MediaGrabber** in Ubuntu Applications)
- **Background service**: `mediagrabber.daemon` (runs on port `3000`, stores data in `$SNAP_USER_COMMON` / `$SNAP_COMMON`)
- **CLI wrapper**: `mediagrabber.grab "<url>"`

### Build & Publish Snap Locally
```bash
sudo snap install snapcraft --classic
snapcraft
sudo snap install ./mediagrabber_2.1.0_amd64.snap --dangerous
snapcraft login
snapcraft upload --release=stable mediagrabber_2.1.0_amd64.snap
```

---

## Option 3: Ubuntu / Debian `.deb` Package

Build an installable `.deb` with systemd service, `/usr/bin/mediagrabber`, `/usr/local/bin/grab`, and desktop launcher icon:

```bash
npm install --no-package-lock --legacy-peer-deps
npm run build:deb
sudo apt install -y ./dist-deb/mediagrabber_2.1.0_amd64.deb
```

---

## Option 4: Global npm Package (`npm install -g mediagrabber`)

```bash
npm install -g mediagrabber
mediagrabber --open
```

Check version or customize port/data directory:

```bash
mediagrabber --version
MEDIAGRABBER_DATA_DIR=/var/lib/mediagrabber mediagrabber --port 3000
```

---

## Option 5: Deploy Source `.zip` via SFTP & SSH

1. In MediaGrabber **Utilities → Server Manager**, click **Download Bundle (.zip)** (saves `mediagrabber-v2.1.zip`).
2. Upload `mediagrabber-v2.1.zip` via SFTP, then extract and upgrade on your Linux host over SSH:

```bash
unzip -o mediagrabber-v2.1.zip -d /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh --stable && \
sudo systemctl restart mediagrabber && \
curl -s http://127.0.0.1:3000/healthz
```

---

## Standalone Linux Binary

Build or download `mediagrabber-linux-x64` from [GitHub Releases (`v2.1`)](https://github.com/ai-mayhemyt/mediagrabber/releases):

```bash
chmod +x mediagrabber-linux-x64
./mediagrabber-linux-x64 --port 3000 --data-dir /var/lib/mediagrabber
```

---

## Default Linux Paths

| Purpose | Default Location |
| --- | --- |
| Source / Binary Install | `/opt/mediagrabber` |
| Systemd Data Directory | `/var/lib/mediagrabber` (set via `MEDIAGRABBER_DATA_DIR`) |
| Snap App Data | `$SNAP_USER_COMMON/workspace` or `$SNAP_COMMON/workspace` |
| Global npm Data | `~/.local/share/mediagrabber` (or `/tmp/mediagrabber-workspace`) |
| Standalone Grab Wrapper | `/usr/local/bin/grab` |
| Systemd Unit | `/etc/systemd/system/mediagrabber.service` |

---

## Keyboard Shortcuts in the Web UI

Press **`?`** anywhere inside MediaGrabber to open the Keyboard Shortcuts reference:
- **`/`** or **`Ctrl/Cmd + K`** — Focus Global Search bar
- **`N`** — Jump to Queue & focus the URL batch box
- **`Ctrl/Cmd + Enter`** *(in URL box)* — Submit batch grab immediately
- **`1`** / **`2`** / **`3`** / **`4`** — Switch between Queue, History, Utilities, and Settings
- **`R`** — Refresh Queue, History, and Storage metrics
- **`?`** — Open Keyboard Shortcuts modal
- **`Esc`** — Close topmost modal
