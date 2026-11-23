#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export NODE_ENV=production
export PORT="${PORT:-3000}"
export MEDIAGRABBER_DATA_DIR="${MEDIAGRABBER_DATA_DIR:-/var/lib/mediagrabber}"

mkdir -p "$MEDIAGRABBER_DATA_DIR"

if [ ! -d node_modules ]; then
  npm install
fi

if [ ! -d dist ]; then
  npm run build
fi

exec npm start
