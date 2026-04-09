#!/usr/bin/env python3
"""
register.py — Pi agent that registers this device with the Vercel dashboard.

Usage:
    python3 register.py --vercel-url https://your-app.vercel.app --tunnel-url https://xxx.trycloudflare.com

Or with auto tunnel (requires cloudflared):
    python3 register.py --vercel-url https://your-app.vercel.app --auto-tunnel --port 5000
"""

import argparse
import subprocess
import sys
import time
import uuid
import socket
import urllib.request
import urllib.error
import json
import re
import os

HEARTBEAT_INTERVAL = 30   # seconds between registration pings
DEVICE_ID_FILE     = os.path.expanduser("~/.wifi_radar_device_id")


def get_device_id() -> str:
    """Persistent unique ID for this Pi — generated once and saved."""
    if os.path.exists(DEVICE_ID_FILE):
        with open(DEVICE_ID_FILE) as f:
            return f.read().strip()
    device_id = str(uuid.uuid4())
    with open(DEVICE_ID_FILE, "w") as f:
        f.write(device_id)
    return device_id


def get_device_name() -> str:
    """Use the Pi's hostname as the display name."""
    return socket.gethostname()


def start_cloudflared_tunnel(port: int) -> str:
    """Launch cloudflared and return the public tunnel URL."""
    print(f"[*] Starting cloudflared tunnel on port {port}...")
    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    # Wait for the tunnel URL to appear in output
    url_pattern = re.compile(r'https://[a-z0-9\-]+\.trycloudflare\.com')
    for line in proc.stdout:
        print(f"  cloudflared: {line.rstrip()}")
        match = url_pattern.search(line)
        if match:
            url = match.group(0)
            print(f"[+] Tunnel URL: {url}")
            return url

    sys.exit("[-] Failed to get tunnel URL from cloudflared.")


def register(vercel_url: str, device_id: str, name: str, tunnel_url: str) -> bool:
    """POST device registration to the Vercel API."""
    endpoint = f"{vercel_url.rstrip('/')}/api/register"
    payload = json.dumps({"id": device_id, "name": name, "url": tunnel_url}).encode()

    req = urllib.request.Request(
        endpoint,
        data=payload,
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
    parser = argparse.ArgumentParser(description="Wi-Fi Radar Pi agent — registers this Pi with the Vercel dashboard")
    parser.add_argument("--vercel-url", required=True, help="Your Vercel app URL (e.g. https://your-app.vercel.app)")
    parser.add_argument("--tunnel-url", default=None, help="Public tunnel URL if already running")
    parser.add_argument("--auto-tunnel", action="store_true", help="Launch cloudflared automatically")
    parser.add_argument("--port", type=int, default=5000, help="Local dashboard port (default: 5000)")
    parser.add_argument("--name", default=None, help="Display name for this device")
    args = parser.parse_args()

    device_id   = get_device_id()
    device_name = args.name or get_device_name()
    tunnel_url  = args.tunnel_url

    print(f"[*] Device ID:   {device_id}")
    print(f"[*] Device name: {device_name}")
    print(f"[*] Vercel URL:  {args.vercel_url}")

    if args.auto_tunnel:
        tunnel_url = start_cloudflared_tunnel(args.port)
    elif not tunnel_url:
        sys.exit("[-] Provide --tunnel-url or use --auto-tunnel")

    print(f"\n[+] Registering with Vercel every {HEARTBEAT_INTERVAL}s — press Ctrl+C to stop\n")

    while True:
        ok = register(args.vercel_url, device_id, device_name, tunnel_url)
        if ok:
            print(f"[✓] Heartbeat sent ({device_name})")
        time.sleep(HEARTBEAT_INTERVAL)


if __name__ == "__main__":
    main()
