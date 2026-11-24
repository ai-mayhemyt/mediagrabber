# MediaGrabber v2.0-pre3fix — Release & Handoff Notes

## What Was Added & Fixed

### 1. Real Media Extraction Pipeline (`grab` Integration)
- `server.ts` (`processJob`) executes `/usr/local/bin/grab` (or direct `yt-dlp` / `spotdl` / `gallery-dl` fallback) with `GRAB_*` environment variables, cookie paths, format/bitrate flags, and live progress/log streaming.
- Added `POST /grab` and `POST /api/grab/notify` support and preserved existing `/usr/local/bin/grab` and `/tmp/mediagrabber` permissions in `deploy/install-linux.sh`.

### 2. New Satellite Dish Brand Logo
- Created reusable `src/components/BrandLogo.tsx` (modern geometric parabolic dish + feed mast + signal arcs) and updated `Sidebar.tsx` and `AuthScreen.tsx`.
- Generated matching app icons in `public/`: `icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, and `apple-touch-icon.png` (180x180).

### 3. Progressive Web App (PWA) Support
- Configured `vite-plugin-pwa` in `vite.config.ts` with `manifest.webmanifest`, Workbox precaching, Google Fonts runtime caching, and `/api/*` + `/grab` navigation fallback exclusions.
- Added iOS Safari meta tags in `index.html`, SW registration in `src/main.tsx`, `usePWAInstall` + `PWAInstallButton` (with iOS Add-to-Home-Screen guide), and `OfflineIndicator` (`useOnlineStatus`).

### 4. Push & Browser/In-App Notifications
- Backend (`server.ts`): Persistent auto-generated VAPID keys (`STATE_DIR/vapid.json`), push subscription storage (`STATE_DIR/push_subscriptions.json`), endpoints (`/api/notifications/vapid-public-key`, `/api/notifications/status`, `/api/notifications/subscribe`, `/api/notifications/unsubscribe`, `/api/notifications/test`), and Service Worker handlers (`public/sw-push.js`).
- Frontend (`src/hooks/useNotifications.ts`, `TopBar.tsx`, `SettingsView.tsx`, `App.tsx`):
  - **Alerts / Alerts On** toggle in TopBar and **PWA App & Push Notifications** panel in System Settings.
  - Fires both **in-app toast notifications** (works over LAN HTTP and HTTPS) and **OS/Service Worker notifications** (deduped by tag over HTTPS / `localhost`) for completed/failed downloads and newly detected GitHub releases.

### 5. GitHub Version Detection & Auto-Updater (`v2.0-pre3fix`)
- Fixed `/api/version/info` to query the **GitHub Releases API** + `git ls-remote --tags`, normalize case (`V2.0-pre3` == `v2.0-pre3`), and compare semantic tuples (`v1.9.7-final` < `v2.0-v1` < `v2.0-pre2` < `v2.0-pre3` < `v2.0-pre3fix` < `v2.0-pre4`).
- Added `POST /api/version/update` (admin-only) and an **Install Update** button in **Utilities** when a newer version is available.

## Deployment & Maintenance Notes
- Install dependencies with `npm install --legacy-peer-deps` and build with `npm run build`.
- Managed via `systemd` (`mediagrabber.service` running in `/opt/mediagrabber` on port `3000`).
- Browser OS Push Notifications & PWA install require accessing MediaGrabber over `https://` or `http://localhost:3000`.
