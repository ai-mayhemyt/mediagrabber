# MediaGrabber — Jellyfin Edition

Official Jellyfin plugin that connects your Jellyfin server directly to **MediaGrabber**, letting you queue YouTube, YouTube Music, Spotify, and gallery downloads from inside Jellyfin without opening the MediaGrabber web UI.

> **Required:** You must generate a MediaGrabber API key with **`download`** or **`admin`** scope (in MediaGrabber → **Account → API Tokens**) and enter it in the plugin settings before the downloader will function.

---

## Supported Jellyfin Versions
| Jellyfin Series | Target Framework | Target ABI |
| --- | --- | --- |
| Jellyfin 10.11+ | `.NET 9.0` | `10.11.0.0` |
| Jellyfin 10.10.x | `.NET 8.0` | `10.10.0.0` |
| Jellyfin 10.9.x | `.NET 8.0` | `10.9.0.0` |
| Jellyfin 10.8.x | `.NET 6.0` | `10.8.0.0` |

---

## Option 1: Install via Jellyfin Plugin Repository
1. In Jellyfin, open **Dashboard → Plugins → Repositories**.
2. Click **Add (+)**:
   - **Name:** `MediaGrabber - Jellyfin Edition`
   - **URL:** `https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition/releases/latest/download/manifest.json`
3. Go to **Catalog → General → MediaGrabber**, select the version matching your Jellyfin server, and click **Install**.
4. Restart Jellyfin.

---

## Option 2: Manual Build from Source (Any Jellyfin Version)
Requires the matching .NET SDK (`6.0`, `8.0`, or `9.0`):

```bash
# Example for Jellyfin 10.10.x (swap 10.8, 10.9, 10.10, or 10.11)
dotnet publish MediaGrabber.Jellyfin/MediaGrabber.Jellyfin.csproj \
  -c Release \
  -p:JellyfinSeries=10.10 \
  -o ./dist/MediaGrabber
```

Copy `./dist/MediaGrabber/MediaGrabber.Jellyfin.dll` into your Jellyfin plugins folder (e.g. `/var/lib/jellyfin/plugins/MediaGrabber_2.0.0.0/`) and restart Jellyfin.

---

## Setup & API Key Configuration
1. In **MediaGrabber**, open **Account → API Tokens**, create a token with **`download`** (or **`admin`**) scope, and copy the `mg_...` key.
2. In **Jellyfin**, open **Dashboard → Plugins → MediaGrabber**:
   - **MediaGrabber Server URL:** e.g. `http://127.0.0.1:3000`
   - **MediaGrabber API Key:** paste your `mg_...` key
3. Click **Test Connection & API Key**, then **Save Configuration**.
4. Use **MediaGrabber Downloader** in the Jellyfin dashboard menu to paste single or bulk URLs, pick **Video** or **Audio Only**, and monitor/cancel/retry active jobs.
