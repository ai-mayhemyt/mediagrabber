# MediaGrabber `v2.0-pre6` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.0-pre6` is a nightly pre-release on the `2.0-app` branch adding an interactive **Release Channel Selector** (**Full Releases** vs **Nightly Pre-Releases**) in both the web Version Manager and the Linux auto-installer (`deploy/install-linux.sh`), plus the new **`ChangelogModal`** accessible from the TopBar version badge.

---

## What Changed in `v2.0-pre6`

### 1. Interactive TopBar Changelog (`ChangelogModal.tsx`)
- Clicking the version badge in the TopBar (`v2.0-pre6`) opens **`ChangelogModal`**, listing recent nightly builds (`v2.0-pre6`, `v2.0-pre5`, `v2.0-pre4`, `v2.0-pre3fix`, `v2.0-pre2`) with `NEW`, `FIX`, and `SEC` tags, live channel status, GitHub Releases link, and a shortcut to reopen the Setup Wizard.

### 2. Full Releases vs Nightly Pre-Releases Channel Selector
- **Web Version Manager (`Utilities → Server Manager`)**:
  - Toggle between **Full Releases** (`stable`) and **Nightly Pre-Releases** (`nightly`) via `POST /api/version/channel` (persisted in `settings.json` as `update_channel`).
  - `GET /api/version/info` and `POST /api/version/update` filter GitHub Releases and tags according to the chosen channel while treating all `pre*`, `nightly*`, `rc*`, `alpha*`, `beta*`, and `dev*` tags as pre-releases.
- **Linux Auto-Installer (`deploy/install-linux.sh`)**:
  - Supports `--stable` / `--nightly` flags, `RELEASE_CHANNEL=stable|nightly`, or an interactive prompt on fresh installs.
  - Defaults to tracking the `2.0-app` branch (with `v2.0-app` fallback), saves `MEDIAGRABBER_UPDATE_CHANNEL` into `.env`, and installs dependencies via `npm install --no-package-lock --legacy-peer-deps`.

### 3. Carried-Forward `v2.0-pre5` Nightly Features
- **Jellyfin-Style 5-Step Setup Wizard** (`QuickStartModal`) with non-destructive admin creation (`POST /api/quickstart/admin`) preserving existing `users.json` accounts.
- **Direct 2FA Authenticator Link (`otpauth://`) + Copy Key** alongside 2FA QR codes.
- **Outgoing Webhooks** (Discord, Slack, JSON/ntfy/Shortcuts) + SSRF validation + Test button.
- **Stale Download Auto-Cleanup** (`stale_timeout_minutes` + 60s janitor + manual trigger).
- **In-Browser Media Player** (`206 Partial Content` HTTP range streaming for iOS/iPad & desktop).
- **Library & Download Stats** (`Utilities → Stats`).

---

## GitHub Repository & Release Alignment Notes
- Default branch target: **`2.0-app`**
- All `v2.0-pre*` releases (`v2.0-pre2`, `V2.0-pre3`, `v2.0-pre3fix`, `v2.0-pre4`, `v2.0-pre5`, `v2.0-pre6`) should be marked as GitHub **Pre-releases** (`--prerelease`) so stable channel users only see full releases while nightly channel users receive all pre-releases and `2.0-app` updates.
