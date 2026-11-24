# MediaGrabber `v2.0-pre5` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.0-pre5` is a nightly pre-release on the `v2.0` branch introducing a Jellyfin-style Setup Wizard, outgoing completion/failure webhooks, automatic stale download cleanup, in-browser HTTP range media streaming, a library/download stats dashboard, direct 2FA authenticator deep links, and nightly-aware updater improvements.

## What Changed in `v2.0-pre5`
- **Jellyfin-Style 5-Step Setup Wizard (`QuickStartModal`)**:
  - Non-destructive admin creation (`POST /api/quickstart/admin`) that preserves all existing `users.json` accounts (`Existing Accounts Preserved` indicator) and supports zero-admin bootstrapping (`GET /api/quickstart/status`).
  - Guided setup for Media Library Paths, Download Formats & Stale Cleanup Timeout, Browser/PWA Push Alerts, Outgoing Webhooks, and Jellyfin / Navidrome Sync.
- **Direct 2FA Link & Copyable Key**:
  - Added **Open in Authenticator App** (`otpauth://...`), **Copy 2FA Link**, and copyable **Secret Key** alongside the QR code in both **Account → Security & 2FA** and the Setup Wizard.
- **Outgoing Webhooks (`POST /api/webhook/test` + Job Lifecycle)**:
  - Discord, Slack, and JSON webhook alerts (ntfy / Apple Shortcuts) on job completion, failure, and stale cleanup, with server-side URL validation.
- **Stale / Zombie Download Auto-Cleanup**:
  - Configurable `stale_timeout_minutes` (5–1440, default `120`) + 60-second background janitor (`SIGTERM` / `SIGKILL`) + manual admin cleanup (`POST /api/queue/cleanup-stale`).
- **In-Browser Media Player (`206 Partial Content`)**:
  - HTTP `Range` byte-range streaming via `GET /api/files/download?inline=1` and **Preview** buttons on completed Queue and History items (`<video playsInline>` / `<audio>`).
- **Library & Download Stats (`GET /api/stats` + `Utilities → Stats`)**:
  - 24h / 7d totals, success rate, source breakdown, and per-library file counts & storage usage.
- **Nightly Pre-Release Updater Improvements**:
  - Supports `pre*`, `nightly*`, `rc*`, `alpha*`, `beta*`, and `fix` tags across GitHub Releases & tags, detects active branch dynamically, and runs `npm install --no-package-lock --legacy-peer-deps`.
