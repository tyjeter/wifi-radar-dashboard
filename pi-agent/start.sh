#!/bin/bash
# start.sh — Launch Wi-Fi Radar watchdog + register with Vercel hub.
#
# The watchdog handles:
#   - Auto-restarting dashboard.py if it crashes
#   - Auto-restarting cloudflared if the tunnel drops
#   - Keeping the Pi agent heartbeating
#
# Usage (reads from ~/.wifi_radar_config.json by default):
#   sudo ./start.sh
#
# Override config file values with flags:
#   sudo ./start.sh --interface wlan1 --vercel-url https://your-app.vercel.app

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RADAR_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="${RADAR_DIR}/venv/bin/python3"

# Fall back to system python if venv not set up
if [[ ! -f "$PYTHON" ]]; then
  PYTHON="python3"
fi

exec sudo "$PYTHON" "$RADAR_DIR/watchdog.py" "$@"
