#!/usr/bin/env bash
# HKO 本地天氣站 / HKO local weather station — launcher
set -euo pipefail
cd "$(dirname "$0")"

echo "============================================================"
echo "  HKO 本地天氣站  /  HKO local weather station"
echo "============================================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[X] Node.js not found. Install Node.js 18+ first: https://nodejs.org/"
  exit 1
fi

read -r -p "請輸入連接埠 / port (Enter = 8787): " PORT
PORT="${PORT:-8787}"

echo
echo "Starting on http://localhost:${PORT}/  (Ctrl+C to stop)"
echo
exec node server.js "$PORT"
