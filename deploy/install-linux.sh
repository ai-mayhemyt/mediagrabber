#!/usr/bin/env bash
set -euo pipefail

# MediaGrabber v2.0 — Linux Server Auto-Installer (Ubuntu/Debian)
# Usage:
#   ./deploy/install-linux.sh [--stable | --nightly]
#   RELEASE_CHANNEL=nightly ./deploy/install-linux.sh

APP_DIR="${APP_DIR:-/opt/mediagrabber}"
DATA_DIR="${MEDIAGRABBER_DATA_DIR:-/var/lib/mediagrabber}"
PORT="${PORT:-3000}"
REPO_URL="${REPO_URL:-https://github.com/ai-mayhemyt/mediagrabber.git}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-2.0-app}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-}"

for arg in "$@"; do
  case "$arg" in
    --stable|--full)
      RELEASE_CHANNEL="stable"
      ;;
    --nightly|--pre)
      RELEASE_CHANNEL="nightly"
      ;;
    -h|--help)
      echo "Usage: $0 [--stable | --nightly]"
      echo "  --stable   Track full stable releases only"
      echo "  --nightly  Track nightly pre-releases and ${DEFAULT_BRANCH} branch (default)"
      exit 0
      ;;
  esac
done

if [ -z "$RELEASE_CHANNEL" ]; then
  if [ -t 0 ]; then
    echo ""
    echo "Select MediaGrabber release channel:"
    echo "  1) Full Releases (Stable)"
    echo "  2) Nightly Pre-Releases (Recommended for v2.0 preview features)"
    read -r -p "Choose [1/2] (default: 2): " channel_choice || true
    case "${channel_choice:-2}" in
      1) RELEASE_CHANNEL="stable" ;;
      *) RELEASE_CHANNEL="nightly" ;;
    esac
  else
    RELEASE_CHANNEL="nightly"
  fi
fi

echo "==> Selected release channel: ${RELEASE_CHANNEL}"
echo "==> Installing system prerequisites (curl, git, ffmpeg, unzip)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl git ffmpeg unzip ca-certificates
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
    echo "==> Cloning MediaGrabber from $REPO_URL..."
    git clone -b "$DEFAULT_BRANCH" "$REPO_URL" "$APP_DIR" \
      || git clone -b "v2.0-app" "$REPO_URL" "$APP_DIR" \
      || git clone "$REPO_URL" "$APP_DIR"
  fi
fi

cd "$APP_DIR"

if [ -d .git ]; then
  git fetch --all --tags || true
  if [ "$RELEASE_CHANNEL" = "stable" ]; then
    LATEST_STABLE_TAG="$(git tag --sort=-v:refname | grep -viE 'pre|nightly|rc|alpha|beta|dev' | head -n 1 || true)"
    if [ -n "$LATEST_STABLE_TAG" ]; then
      echo "==> Checking out latest full release tag: $LATEST_STABLE_TAG"
      git checkout "$LATEST_STABLE_TAG" || true
    else
      echo "==> No full release tag found yet; staying on current checkout."
    fi
  else
    echo "==> Tracking nightly channel (${DEFAULT_BRANCH} / latest nightly pre-release)..."
    git checkout "$DEFAULT_BRANCH" 2>/dev/null \
      || git checkout "v2.0-app" 2>/dev/null \
      || true
    git pull --ff-only origin "$DEFAULT_BRANCH" 2>/dev/null \
      || git pull --ff-only origin "v2.0-app" 2>/dev/null \
      || true
  fi
fi

if [ ! -f /usr/local/bin/grab ] && [ -f "grab" ]; then
  echo "==> Installing grab wrapper to /usr/local/bin/grab..."
  sudo install -m 755 grab /usr/local/bin/grab
elif [ -f /usr/local/bin/grab ]; then
  echo "==> Existing /usr/local/bin/grab detected; preserving and ensuring executable..."
  sudo chmod 755 /usr/local/bin/grab
fi
sudo mkdir -p /tmp/mediagrabber
sudo chmod 1777 /tmp/mediagrabber

if [ ! -f .env ]; then
  cat > .env <<EOF
NODE_ENV=production
PORT=${PORT}
MEDIAGRABBER_DATA_DIR=${DATA_DIR}
MEDIAGRABBER_UPDATE_CHANNEL=${RELEASE_CHANNEL}
EOF
elif grep -q '^MEDIAGRABBER_UPDATE_CHANNEL=' .env; then
  sed -i "s/^MEDIAGRABBER_UPDATE_CHANNEL=.*/MEDIAGRABBER_UPDATE_CHANNEL=${RELEASE_CHANNEL}/" .env
else
  echo "MEDIAGRABBER_UPDATE_CHANNEL=${RELEASE_CHANNEL}" >> .env
fi

echo "==> Installing Node dependencies & building frontend..."
npm install --no-package-lock --legacy-peer-deps
npm run build

if command -v systemctl >/dev/null 2>&1; then
  echo "==> Installing systemd service (mediagrabber.service)..."
  sudo tee /etc/systemd/system/mediagrabber.service >/dev/null <<EOF
[Unit]
Description=MediaGrabber — Self-Hosted Media Ingestion, Queue & Jellyfin Companion Service
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
  echo "==> MediaGrabber (${RELEASE_CHANNEL} channel) is running on port ${PORT}."
else
  echo "==> systemd not detected. Start manually with: ./deploy/start.sh"
fi
