# MediaGrabber `v2.0-pre7fix` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.0-pre7fix` is a nightly hotfix pre-release on the `2.0-app` branch fixing API Token generation and plain-HTTP clipboard copying (iPad/LAN Safari), and adding full **MediaGrabber** logo branding, descriptions, and Jellyfin repository links across **MediaGrabber — Jellyfin Edition** (`jellyfin-plugin/`).

---

## What Changed in `v2.0-pre7fix`

### 1. API Token Generation & HTTP Clipboard Fixes (`Modals.tsx` + `server.ts`)
- Fixed `AccountModal → API Tokens` form submission, inline error alerts, `cache: 'no-store'` reads, immediate list updates from `POST /api/tokens`, and `writeJson` parent directory safety (`mkdirSync` + array validation).
- Prevented background user object refreshes from clearing freshly generated `mg_...` tokens before copying.
- Added a `document.execCommand('copy')` fallback alongside `navigator.clipboard` plus `z-[90]` toast layering so copying tokens, 2FA keys, and the Jellyfin repo URL works on LAN/Tailscale HTTP origins (such as `http://100.88.171.48:3000`).

### 2. MediaGrabber — Jellyfin Edition Branding & Plugin (`jellyfin-plugin/`)
- Added `logo.png` (`manifest.json` `"imageUrl"`, CI release zip `thumb.png` + `"imagePath": "thumb.png"`, and embedded `Web/logo.png` served at `GET /MediaGrabber/Logo`).
- Added full plugin descriptions and the copyable Jellyfin Plugin Repository URL across `manifest.json`, `build.yaml`, `README.md`, Jellyfin `configPage.html` / `downloaderPage.html`, and MediaGrabber **Settings → Media Server Integrations**.
- Supports Jellyfin **`10.8.x` (`net6.0`)**, **`10.9.x` (`net8.0`)**, **`10.10.x` (`net8.0`)**, and **`10.11+` (`net9.0`)** with mandatory `download`/`admin` API key enforcement via `/api/jellyfin/*`.

### 3. Carried-Forward `v2.0-pre6` & `v2.0-pre5` Nightly Features
- **Interactive TopBar Changelog (`ChangelogModal.tsx`)**: Clicking the version badge in the TopBar opens recent nightly builds with `NEW`, `FIX`, and `SEC` badges and Setup Wizard shortcut.
- **Full Releases vs Nightly Pre-Releases Selector**: Toggle update channels in `Utilities → Server Manager` or during Linux auto-install (`deploy/install-linux.sh --stable | --nightly`).
- **Jellyfin-Style 5-Step Setup Wizard** (`QuickStartModal`) with non-destructive admin creation (`POST /api/quickstart/admin`) preserving existing `users.json` accounts.
- **Direct 2FA Authenticator Link (`otpauth://`) + Copy Key** alongside 2FA QR codes.
- **Outgoing Webhooks** (Discord, Slack, JSON/ntfy/Shortcuts) + SSRF validation + Test button.
- **Stale Download Auto-Cleanup** (`stale_timeout_minutes` + 60s janitor + manual trigger).
- **In-Browser Media Player** (`206 Partial Content` HTTP range streaming for iOS/iPad & desktop).
- **Library & Download Stats** (`Utilities → Stats`).

---

## GitHub Repository & Release Alignment Notes
- Default branch target: **`2.0-app`**
- All `v2.0-pre*` releases (`v2.0-pre2`, `V2.0-pre3`, `v2.0-pre3fix`, `v2.0-pre4`, `v2.0-pre5`, `v2.0-pre6`, `v2.0-pre7`, `v2.0-pre7fix`) should be marked as GitHub **Pre-releases** (`--prerelease`) so stable channel users only see full releases while nightly channel users receive all pre-releases and `2.0-app` updates.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
