#!/usr/bin/env bash
set -euo pipefail

# MediaGrabber v2.0-v1 — Linux Server SSH Setup Script (Ubuntu/Debian)
APP_DIR="${APP_DIR:-/opt/mediagrabber}"
DATA_DIR="${MEDIAGRABBER_DATA_DIR:-/var/lib/mediagrabber}"
PORT="${PORT:-3000}"

echo "==> Installing system prerequisites (curl, git, ffmpeg)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl git ffmpeg ca-certificates
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  echo "==> Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Preparing directories ($APP_DIR & $DATA_DIR)..."
sudo mkdir -p "$APP_DIR" "$DATA_DIR"
sudo chown -R "$(id -u):$(id -g)" "$APP_DIR" "$DATA_DIR"

if [ ! -f "$APP_DIR/package.json" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo "==> Copying project files from $SCRIPT_DIR to $APP_DIR..."
    cp -a "$SCRIPT_DIR/." "$APP_DIR/"
  else
    echo "ERROR: Place repository files in $APP_DIR or run this script from inside the cloned repo."
    exit 1
  fi
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cat > .env <<EOF
NODE_ENV=production
PORT=${PORT}
MEDIAGRABBER_DATA_DIR=${DATA_DIR}
EOF
fi

echo "==> Installing Node dependencies & building frontend..."
npm install --legacy-peer-deps
npm run build

if command -v systemctl >/dev/null 2>&1; then
  echo "==> Installing systemd service (mediagrabber.service)..."
  sudo tee /etc/systemd/system/mediagrabber.service >/dev/null <<EOF
[Unit]
Description=MediaGrabber v2.0-v1 Console
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_DIR}
EnvironmentFile=-${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/env npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now mediagrabber
  sudo systemctl status mediagrabber --no-pager || true
  echo "==> MediaGrabber v2.0-v1 is running on port ${PORT}."
else
  echo "==> systemd not detected. Start manually with: ./deploy/start.sh"
fi
