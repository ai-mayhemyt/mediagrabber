<div align="center">

<img src="public/logo.png" alt="MediaGrabber" width="360" />

# MediaGrabber (`v2.0`)

**Self-Hosted Media Ingestion, Download Queue Console, Metadata Editor & Jellyfin Companion Service**

Download, transcode, deduplicate, and organize media from **YouTube**, **YouTube Music**, **Spotify**, **Instagram**, **TikTok**, and other `yt-dlp` / `gallery-dl` sources with web-based queue management, scoped API keys, Navidrome radio sync, and native Jellyfin integration.

![Version](https://img.shields.io/badge/Version-v2.0--pre7--fix4-5b7cfa?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Linux%20(x86__64%20%7C%20ARM64)-10b981?style=flat-square)
![Branch](https://img.shields.io/badge/Branch-2.0--app-6366f1?style=flat-square)

</div>

---

## Supported Platforms

MediaGrabber is designed for self-hosted **Linux** servers and containers:

| Platform / Environment | Support Status | Notes |
| --- | --- | --- |
| **Ubuntu 22.04 / 24.04 LTS** | Fully Supported | Primary target for `deploy/install-linux.sh` + `systemd` |
| **Debian 11 / 12** | Fully Supported | Supported via `apt` + Node.js 22 LTS |
| **Proxmox VE LXC (Debian/Ubuntu)** | Fully Supported | Lightweight unprivileged or privileged container setup |
| **Other Linux (`x86_64` / `arm64`)** | Supported | Manual Node.js `20+` / `22 LTS` + `./deploy/start.sh` |

---

## Dependencies

### Core Runtime & Build
- **Node.js `20+` or `22 LTS`** and **npm**
- **`curl`**, **`git`**, **`unzip`**, **`python3`**, **`ca-certificates`**

### Media Download & Processing Engines (`grab` CLI)
- **`yt-dlp`** — YouTube, YouTube Music, and general video/audio extraction
- **`spotdl`** — Spotify track/album/playlist resolution & `.lrc` lyrics
- **`gallery-dl`** — Instagram, TikTok, X/Twitter, Reddit, Pinterest, and image galleries
- **`ffmpeg`** — Media muxing, audio/video transcoding, and embedded cover-art/metadata tagging
- **`jq`** — Metadata `.info.json` parsing used by the included [`grab`](./grab) wrapper script
- **`deno`** *(optional)* — JavaScript runtime used by `yt-dlp` when `--js-runtimes` is needed

---

## Step-by-Step Linux Installation

### Step 1: Clone & Run the Auto-Installer

The included installer (`deploy/install-linux.sh`) installs system dependencies (`curl`, `git`, `ffmpeg`, `unzip`, Node.js 22 LTS), installs the included [`grab`](./grab) script to `/usr/local/bin/grab`, builds the web UI, and registers `mediagrabber.service` via `systemd`.

```bash
git clone -b 2.0-app https://github.com/ai-mayhemyt/mediagrabber.git /opt/mediagrabber && \
cd /opt/mediagrabber && \
sudo bash deploy/install-linux.sh
```

During installation, choose your update channel:
1. **Full Releases (Stable)** (`--stable`)
2. **Nightly Pre-Releases** (`--nightly`, tracks `2.0-app` / `v2.0-pre*` builds)

You can also pass the channel flag non-interactively:

```bash
sudo bash deploy/install-linux.sh --nightly
```

### Step 2: Install Media Downloader Tools (If Not Already Installed)

Make sure `yt-dlp`, `spotdl`, `gallery-dl`, and `jq` are available in `PATH` or `~/.local/bin`:

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg jq python3-pip
python3 -m pip install --user --upgrade yt-dlp spotdl gallery-dl
```

Verify the included `grab` wrapper is installed and executable:

```bash
sudo install -m 755 /opt/mediagrabber/grab /usr/local/bin/grab
which grab
```

### Step 3: Complete the First-Run Setup Wizard

1. Open **`http://<your-server-ip>:3000`** in your browser.
2. Follow the **Setup Wizard** to create/confirm your Admin account (without overwriting existing user accounts), set your Video/Music/Gallery directories, and optionally link Jellyfin for automatic library scans.

### Step 4: Generate an API Key (for Jellyfin or External Scripts)

1. Click your profile badge in the bottom-left sidebar → **API Tokens**.
2. Enter a name (for example `Jellyfin`), select **`download`** (or **`admin`**) scope, and click **Create**.
3. Copy the generated `mg_...` API key (shown once upon creation).

---

## Companion Plugin: MediaGrabber — Jellyfin Edition

Queue YouTube, YouTube Music, Spotify, Instagram, and TikTok downloads directly inside Jellyfin (`10.8`, `10.9`, `10.10`, and `10.11+`) using **[ai-mayhemyt/MediaGrabber-Jellyfin-Edition](https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition)**:

1. In Jellyfin, open **Dashboard → Plugins → Repositories → `+`**.
2. Add the Repository URL:
   ```text
   https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition/releases/latest/download/manifest.json
   ```
3. Go to **Catalog → General → MediaGrabber**, install the build matching your Jellyfin version, and restart Jellyfin.
4. Open **MediaGrabber Downloader** in the Jellyfin sidebar (or **Dashboard → Plugins → MediaGrabber**), enter your MediaGrabber Server URL (`http://<your-server-ip>:3000`) and `mg_...` API key, test the connection, and save.

---

## Standalone `grab` Wrapper Script & Manual Build

The [`grab`](./grab) script in the repository root can also be invoked directly from the command line or cron:

```bash
# Video download
/usr/local/bin/grab "https://www.youtube.com/watch?v=..."

# Audio-only override
GRAB_AUDIO_ONLY=true GRAB_AUDIO_FORMAT=mp3 /usr/local/bin/grab "https://open.spotify.com/track/..."
```

To build and start the web console manually without `systemd`:

```bash
npm install --no-package-lock --legacy-peer-deps
npm run build
npm start
```

Configure optional variables (`PORT`, `MEDIAGRABBER_DATA_DIR`, `MEDIAGRABBER_UPDATE_CHANNEL`) in `.env` based on `.env.example`.
