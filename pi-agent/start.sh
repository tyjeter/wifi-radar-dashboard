#!/bin/bash
# start.sh — Launch the Wi-Fi Radar dashboard + register with Vercel in one command.
#
# Usage:
#   chmod +x start.sh
#   sudo ./start.sh --interface wlan0 --vercel-url https://your-app.vercel.app

INTERFACE=""
VERCEL_URL=""
PORT=5000
CHANNEL=""
SENSITIVITY=2.0

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --interface)   INTERFACE="$2";   shift ;;
    --vercel-url)  VERCEL_URL="$2";  shift ;;
    --port)        PORT="$2";        shift ;;
    --channel)     CHANNEL="--channel $2"; shift ;;
    --sensitivity) SENSITIVITY="$2"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

if [[ -z "$INTERFACE" || -z "$VERCEL_URL" ]]; then
  echo "Usage: sudo ./start.sh --interface wlan0 --vercel-url https://your-app.vercel.app"
  exit 1
fi

echo "[*] Starting Wi-Fi Radar dashboard on port $PORT..."
python3 ../wifi_radar_alpha/dashboard.py \
  --interface "$INTERFACE" \
  --port "$PORT" \
  --sensitivity "$SENSITIVITY" \
  $CHANNEL &
DASHBOARD_PID=$!

# Give dashboard a moment to start
sleep 3

echo "[*] Starting Pi agent + cloudflared tunnel..."
python3 register.py \
  --vercel-url "$VERCEL_URL" \
  --auto-tunnel \
  --port "$PORT" &
AGENT_PID=$!

echo "[+] All services running. Press Ctrl+C to stop."

cleanup() {
  echo "\n[*] Shutting down..."
  kill $DASHBOARD_PID $AGENT_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM
wait
