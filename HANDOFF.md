# MediaGrabber `v2.0-pre7` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.0-pre7` is a nightly pre-release on the `2.0-app` branch introducing full Jellyfin integration via the new **MediaGrabber — Jellyfin Edition** plugin repository (`jellyfin-plugin/`, supporting Jellyfin `10.8`, `10.9`, `10.10`, and `10.11+`) backed by an API key-authenticated MediaGrabber bridge.

---

## What Changed in `v2.0-pre7`

### 1. MediaGrabber — Jellyfin Edition Plugin (`jellyfin-plugin/`) & API Key Bridge
- **Multi-Version Jellyfin Plugin Repo**: Full C#/.NET Jellyfin plugin packaged in `jellyfin-plugin/` targeting **Jellyfin `10.8.x` (`net6.0`), `10.9.x` (`net8.0`), `10.10.x` (`net8.0`), and `10.11+` (`net9.0`)**, including GitHub Actions CI (`.github/workflows/build-release.yml`) and an official plugin catalog `manifest.json`.
- **Mandatory MediaGrabber API Key Enforcement**:
  - Jellyfin configuration & Downloader pages strictly require a `download` or `admin` API Token generated under `Account → API Tokens`.
  - Backend bridge routes (`GET /api/jellyfin/verify`, `GET /api/jellyfin/queue`, `POST /api/jellyfin/grab`, `POST /api/jellyfin/cancel/:jobId`, `POST /api/jellyfin/retry/:jobId`) validate `X-API-Key` / `Authorization: Bearer` tokens using SHA-256 timing-safe comparison, revocation checks, and scope enforcement.
- **Export Plugin Repo**: Admins can download `MediaGrabber-Jellyfin-Edition.zip` directly from `Settings → Media Server Integrations`, `Utilities → Server Manager`, or `GET /api/server/export-jellyfin-plugin`.

### 2. Carried-Forward `v2.0-pre6` & `v2.0-pre5` Nightly Features
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
- All `v2.0-pre*` releases (`v2.0-pre2`, `V2.0-pre3`, `v2.0-pre3fix`, `v2.0-pre4`, `v2.0-pre5`, `v2.0-pre6`, `v2.0-pre7`) should be marked as GitHub **Pre-releases** (`--prerelease`) so stable channel users only see full releases while nightly channel users receive all pre-releases and `2.0-app` updates.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
