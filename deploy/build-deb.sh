#!/usr/bin/env bash
set -euo pipefail

# Build a Debian/Ubuntu .deb package for MediaGrabber v2.1.0
# Usage: bash deploy/build-deb.sh [--skip-build]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="2.1.0"
ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
STAGE_DIR="$ROOT_DIR/dist-deb/stage"
OUT_DEB="$ROOT_DIR/dist-deb/mediagrabber_${VERSION}_${ARCH}.deb"

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "Error: dpkg-deb is required (install dpkg on Ubuntu/Debian)."
  exit 1
fi

if [ "${1:-}" != "--skip-build" ]; then
  echo "==> Building frontend and bundled Node server..."
  npm run build
  npm run build:server
fi

rm -rf "$STAGE_DIR"
mkdir -p \
  "$STAGE_DIR/DEBIAN" \
  "$STAGE_DIR/opt/mediagrabber" \
  "$STAGE_DIR/usr/bin" \
  "$STAGE_DIR/usr/local/bin" \
  "$STAGE_DIR/usr/share/applications" \
  "$STAGE_DIR/usr/share/icons/hicolor/512x512/apps" \
  "$STAGE_DIR/usr/share/icons/hicolor/scalable/apps" \
  "$STAGE_DIR/lib/systemd/system" \
  "$STAGE_DIR/var/lib/mediagrabber"

cp -a dist "$STAGE_DIR/opt/mediagrabber/dist"
cp -a dist-server "$STAGE_DIR/opt/mediagrabber/dist-server"
cp -a public "$STAGE_DIR/opt/mediagrabber/public"
rm -rf "$STAGE_DIR/opt/mediagrabber/dist/assets/aistudio" "$STAGE_DIR/opt/mediagrabber/public/assets/aistudio"
cp -a package.json grab .env.example LICENSE README.md WINDOWS.md LINUX.md "$STAGE_DIR/opt/mediagrabber/"
chmod 755 "$STAGE_DIR/opt/mediagrabber/grab" "$STAGE_DIR/opt/mediagrabber/dist-server/server.cjs"

install -m 755 grab "$STAGE_DIR/usr/local/bin/grab"
install -m 644 deploy/mediagrabber.desktop "$STAGE_DIR/usr/share/applications/mediagrabber.desktop"
install -m 644 public/pwa-512x512.png "$STAGE_DIR/usr/share/icons/hicolor/512x512/apps/mediagrabber.png"
install -m 644 public/icon.svg "$STAGE_DIR/usr/share/icons/hicolor/scalable/apps/mediagrabber.svg"

cat > "$STAGE_DIR/usr/bin/mediagrabber" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
export NODE_ENV=production
export MEDIAGRABBER_DATA_DIR="${MEDIAGRABBER_DATA_DIR:-/var/lib/mediagrabber}"
exec /usr/bin/node /opt/mediagrabber/dist-server/server.cjs "$@"
EOF
chmod 755 "$STAGE_DIR/usr/bin/mediagrabber"

cat > "$STAGE_DIR/lib/systemd/system/mediagrabber.service" <<'EOF'
[Unit]
Description=MediaGrabber — Self-Hosted Media Ingestion, Queue & Jellyfin Companion Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/mediagrabber
EnvironmentFile=-/opt/mediagrabber/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=MEDIAGRABBER_DATA_DIR=/var/lib/mediagrabber
ExecStart=/usr/bin/node /opt/mediagrabber/dist-server/server.cjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > "$STAGE_DIR/DEBIAN/control" <<EOF
Package: mediagrabber
Version: ${VERSION}
Section: video
Priority: optional
Architecture: ${ARCH}
Depends: nodejs (>= 20), ffmpeg, jq, python3, python3-pip, python3-venv
Maintainer: ai-mayhemyt <https://github.com/ai-mayhemyt/mediagrabber>
Homepage: https://github.com/ai-mayhemyt/mediagrabber
Description: Self-hosted media downloader, queue console & Jellyfin companion
 MediaGrabber downloads, organizes, deduplicates, and streams media from
 YouTube, YouTube Music, Spotify, Instagram, and TikTok with a web UI,
 live SSE logs, scheduled SHA-256 deduplication, and Jellyfin integration.
EOF

cat > "$STAGE_DIR/DEBIAN/postinst" <<'EOF'
#!/usr/bin/env bash
set -e
mkdir -p /var/lib/mediagrabber /tmp/mediagrabber
chmod 1777 /tmp/mediagrabber
if ! command -v yt-dlp >/dev/null 2>&1 || ! command -v spotdl >/dev/null 2>&1 || ! command -v gallery-dl >/dev/null 2>&1; then
  if [ ! -d /opt/mediagrabber/.venv ]; then
    python3 -m venv /opt/mediagrabber/.venv || true
  fi
  if [ -x /opt/mediagrabber/.venv/bin/pip ]; then
    /opt/mediagrabber/.venv/bin/pip install --upgrade pip yt-dlp spotdl gallery-dl || true
    for tool in yt-dlp spotdl gallery-dl; do
      if [ -x "/opt/mediagrabber/.venv/bin/$tool" ] && ! command -v "$tool" >/dev/null 2>&1; then
        ln -sf "/opt/mediagrabber/.venv/bin/$tool" "/usr/local/bin/$tool"
      fi
    done
  fi
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  systemctl daemon-reload >/dev/null 2>&1 || true
  systemctl enable --now mediagrabber.service >/dev/null 2>&1 || true
fi
EOF
chmod 755 "$STAGE_DIR/DEBIAN/postinst"

mkdir -p "$ROOT_DIR/dist-deb"
dpkg-deb --build --root-owner-group "$STAGE_DIR" "$OUT_DEB"
echo "==> Built Ubuntu/Debian package: $OUT_DEB"
echo "    Install with: sudo apt install -y $OUT_DEB"
