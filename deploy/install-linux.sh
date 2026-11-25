#!/usr/bin/env bash
set -euo pipefail

# MediaGrabber v2.1 — Linux Server Auto-Installer (Ubuntu/Debian)
# Usage:
#   ./deploy/install-linux.sh [--stable | --nightly]
#   RELEASE_CHANNEL=stable ./deploy/install-linux.sh

APP_DIR="${APP_DIR:-/opt/mediagrabber}"
DATA_DIR="${MEDIAGRABBER_DATA_DIR:-/var/lib/mediagrabber}"
PORT="${PORT:-3000}"
REPO_URL="${REPO_URL:-https://github.com/ai-mayhemyt/mediagrabber.git}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-mediagrabber}"
NIGHTLY_BRANCH="${NIGHTLY_BRANCH:-mediagrabber-nightly}"
RELEASE_CHANNEL="${RELEASE_CHANNEL:-}"

TARGET_USER="${SUDO_USER:-$(whoami)}"
TARGET_GROUP="$(id -gn "$TARGET_USER" 2>/dev/null || id -gn)"

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
      echo "  --stable   Track full stable releases only (${DEFAULT_BRANCH} branch, default)"
      echo "  --nightly  Track nightly pre-releases and ${NIGHTLY_BRANCH} branch"
      exit 0
      ;;
  esac
done

if [ -z "$RELEASE_CHANNEL" ]; then
  if [ -t 0 ]; then
    echo ""
    echo "Select MediaGrabber release channel:"
    echo "  1) Full Releases (Stable - recommended)"
    echo "  2) Nightly Pre-Releases"
    read -r -p "Choose [1/2] (default: 1): " channel_choice || true
    case "${channel_choice:-1}" in
      2) RELEASE_CHANNEL="nightly" ;;
      *) RELEASE_CHANNEL="stable" ;;
    esac
  else
    RELEASE_CHANNEL="stable"
  fi
fi

echo "==> Selected release channel: ${RELEASE_CHANNEL}"
echo "==> Installing system prerequisites (curl, git, ffmpeg, jq, unzip, python3, pip, venv)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl git ffmpeg jq unzip ca-certificates python3 python3-pip python3-venv
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]; then
  echo "==> Installing Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Preparing directories ($APP_DIR & $DATA_DIR)..."
sudo mkdir -p "$APP_DIR" "$DATA_DIR"
sudo chown -R "${TARGET_USER}:${TARGET_GROUP}" "$APP_DIR" "$DATA_DIR"

if [ ! -f "$APP_DIR/package.json" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ -f "$SCRIPT_DIR/package.json" ]; then
    echo "==> Copying project files from $SCRIPT_DIR to $APP_DIR..."
    cp -a "$SCRIPT_DIR/." "$APP_DIR/"
    sudo chown -R "${TARGET_USER}:${TARGET_GROUP}" "$APP_DIR"
  else
    echo "==> Cloning MediaGrabber from $REPO_URL..."
    if [ "$RELEASE_CHANNEL" = "nightly" ]; then
      git clone -b "$NIGHTLY_BRANCH" "$REPO_URL" "$APP_DIR" \
        || git clone -b "$DEFAULT_BRANCH" "$REPO_URL" "$APP_DIR" \
        || git clone "$REPO_URL" "$APP_DIR"
    else
      git clone -b "$DEFAULT_BRANCH" "$REPO_URL" "$APP_DIR" \
        || git clone "$REPO_URL" "$APP_DIR"
    fi
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
      git checkout "$DEFAULT_BRANCH" 2>/dev/null || true
      git pull --ff-only origin "$DEFAULT_BRANCH" 2>/dev/null || true
    fi
  else
    echo "==> Tracking nightly channel (${NIGHTLY_BRANCH} / latest nightly pre-release)..."
    git checkout "$NIGHTLY_BRANCH" 2>/dev/null \
      || git checkout -b "$NIGHTLY_BRANCH" "origin/$NIGHTLY_BRANCH" 2>/dev/null \
      || git checkout "$DEFAULT_BRANCH" 2>/dev/null \
      || true
    git pull --ff-only origin "$NIGHTLY_BRANCH" 2>/dev/null \
      || git pull --ff-only origin "$DEFAULT_BRANCH" 2>/dev/null \
      || true
  fi
fi

echo "==> Installing mandatory downloaders (yt-dlp, spotdl, gallery-dl) into ${APP_DIR}/.venv..."
VENV_DIR="${APP_DIR}/.venv"
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install --upgrade yt-dlp spotdl gallery-dl

for tool in yt-dlp spotdl gallery-dl; do
  if [ -x "$VENV_DIR/bin/$tool" ]; then
    sudo ln -sf "$VENV_DIR/bin/$tool" "/usr/local/bin/$tool"
  fi
done

for tool in ffmpeg jq yt-dlp spotdl gallery-dl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Error: Mandatory media tool '$tool' failed to install or is not in PATH." >&2
    exit 1
  fi
done
echo "==> Verified mandatory tools: ffmpeg, jq, yt-dlp, spotdl, gallery-dl"

if [ -f "grab" ]; then
  echo "==> Installing/updating grab wrapper to /usr/local/bin/grab..."
  sudo install -m 755 grab /usr/local/bin/grab
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

echo "==> Installing Node dependencies & building MediaGrabber..."
npm install --no-package-lock --legacy-peer-deps
npm run build
npm run build:server
sudo chown -R "${TARGET_USER}:${TARGET_GROUP}" "$APP_DIR" "$DATA_DIR"

if command -v systemctl >/dev/null 2>&1; then
  echo "==> Installing systemd service (mediagrabber.service)..."
  sudo tee /etc/systemd/system/mediagrabber.service >/dev/null <<EOF
[Unit]
Description=MediaGrabber — Self-Hosted Media Ingestion, Queue & Jellyfin Companion Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${TARGET_USER}
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
  echo "==> MediaGrabber (${RELEASE_CHANNEL} channel) is running on http://127.0.0.1:${PORT}."
  echo "==> First Run: open http://127.0.0.1:${PORT} in your browser to create your Administrator account."
else
  echo "==> systemd not detected. Start manually with: ./deploy/start.sh"
fi
