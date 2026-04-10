#!/usr/bin/env python3
"""
register.py — Pi agent: registers device with Vercel hub and sends heartbeats.

Features:
  - Persistent device ID
  - Auto cloudflared tunnel with auto-reconnect
  - Reports current RSSI, movement count, direction, speed with each heartbeat

Usage:
    python3 register.py --vercel-url https://your-app.vercel.app --tunnel-url https://xxx.trycloudflare.com
    python3 register.py --vercel-url https://your-app.vercel.app --auto-tunnel --port 5000
"""

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid

HEARTBEAT_INTERVAL = 30
DEVICE_ID_FILE     = os.path.expanduser("~/.wifi_radar_device_id")
DASHBOARD_PORT     = 5000


def get_device_id() -> str:
    if os.path.exists(DEVICE_ID_FILE):
        with open(DEVICE_ID_FILE) as f:
            return f.read().strip()
    device_id = str(uuid.uuid4())
    with open(DEVICE_ID_FILE, "w") as f:
        f.write(device_id)
    return device_id


def get_device_name() -> str:
    return socket.gethostname()


def fetch_radar_state(port: int) -> dict:
    """Pull current radar state from the local dashboard for reporting."""
    try:
        resp = urllib.request.urlopen(f"http://localhost:{port}/api/state", timeout=3)
        return json.loads(resp.read())
    except Exception:
        return {}


class TunnelManager:
    """Manages cloudflared tunnel with auto-reconnect."""

    def __init__(self, port: int):
        self.port     = port
        self.url:     str | None = None
        self._proc:   subprocess.Popen | None = None
        self._lock    = threading.Lock()
        self._on_url_change = None

    def set_url_callback(self, cb) -> None:
        self._on_url_change = cb

    def start(self) -> str | None:
        with self._lock:
            return self._launch()

    def _launch(self) -> str | None:
        print(f"[*] Starting cloudflared tunnel on port {self.port}...")
        self._proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"http://localhost:{self.port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        pat = re.compile(r'https://[a-z0-9\-]+\.trycloudflare\.com')
        for line in self._proc.stdout:
            print(f"  cloudflared: {line.rstrip()}")
            m = pat.search(line)
            if m:
                self.url = m.group(0)
                print(f"[+] Tunnel URL: {self.url}")
                threading.Thread(target=self._monitor, daemon=True).start()
                return self.url
        print("[-] Failed to parse tunnel URL.")
        return None

    def _monitor(self) -> None:
        """Watch cloudflared and restart if it exits."""
        while True:
            if self._proc.poll() is not None:
                rc = self._proc.returncode
                print(f"[!] cloudflared exited (rc={rc}), restarting in 5s...")
                time.sleep(5)
                with self._lock:
                    old_url = self.url
                    new_url = self._launch()
                if new_url and new_url != old_url and self._on_url_change:
                    self._on_url_change(new_url)
                return  # _launch will start a new _monitor thread
            time.sleep(5)


def register(vercel_url: str, device_id: str, name: str, tunnel_url: str,
             state: dict | None = None) -> bool:
    endpoint = f"{vercel_url.rstrip('/')}/api/register"
    payload  = {
        "id":   device_id,
        "name": name,
        "url":  tunnel_url,
    }
    if state:
        payload["current_rssi"]     = state.get("current_rssi")
        payload["movement_count"]   = len(state.get("movement_events", []))
        payload["direction"]        = state.get("direction")
        payload["speed"]            = state.get("speed")
        payload["calibrated"]       = state.get("calibrated", False)
        payload["breathing"]        = state.get("breathing_detected", False)

    data = json.dumps(payload).encode()
    req  = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            return result.get("ok", False)
    except urllib.error.HTTPError as e:
        print(f"[-] Registration failed: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"[-] Registration error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Wi-Fi Radar Pi agent")
    parser.add_argument("--vercel-url",  required=True)
    parser.add_argument("--tunnel-url",  default=None)
    parser.add_argument("--auto-tunnel", action="store_true")
    parser.add_argument("--port",        type=int, default=DASHBOARD_PORT)
    parser.add_argument("--name",        default=None)
    args = parser.parse_args()

    device_id   = get_device_id()
    device_name = args.name or get_device_name()
    print(f"[*] Device ID:   {device_id}")
    print(f"[*] Device name: {device_name}")
    print(f"[*] Vercel URL:  {args.vercel_url}")

    tunnel_url = args.tunnel_url
    tunnel_mgr = None

    if args.auto_tunnel:
        tunnel_mgr = TunnelManager(args.port)
        tunnel_url = tunnel_mgr.start()
        if not tunnel_url:
            sys.exit("[-] Could not start cloudflared tunnel.")

        def on_url_change(new_url: str):
            nonlocal tunnel_url
            tunnel_url = new_url
            print(f"[!] Tunnel URL changed → {new_url}")

        tunnel_mgr.set_url_callback(on_url_change)
    elif not tunnel_url:
        sys.exit("[-] Provide --tunnel-url or --auto-tunnel")

    print(f"\n[+] Heartbeating every {HEARTBEAT_INTERVAL}s — Ctrl+C to stop\n")

    while True:
        state = fetch_radar_state(args.port)
        ok    = register(args.vercel_url, device_id, device_name, tunnel_url, state)
        status = "[✓]" if ok else "[-]"
        rssi   = state.get("current_rssi")
        rssi_s = f"  RSSI:{rssi}" if rssi else ""
        print(f"{status} Heartbeat ({device_name}){rssi_s}")
        time.sleep(HEARTBEAT_INTERVAL)


if __name__ == "__main__":
    main()
