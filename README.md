# Wi-Fi Radar Dashboard

A Vercel-hosted hub that detects and connects to Wi-Fi Radar Raspberry Pi devices on any network.

## How it works

```
[Raspberry Pi]
  ├── dashboard.py  (Flask heatmap server, port 5000)
  └── register.py   (heartbeats to Vercel every 30s with tunnel URL)
        ↓ cloudflared tunnel (public HTTPS URL)
        ↓
[Vercel App]  ←  stores active devices in Vercel KV
        ↓
[Your Browser]  ←  sees all online Pis, clicks to open their heatmap
```

Devices appear on the dashboard automatically within 30 seconds of the Pi agent starting. They disappear 90 seconds after the agent stops.

## Deploy to Vercel

### 1. Create Vercel KV store

In your Vercel project dashboard:
- Go to **Storage** → **Create Database** → **KV**
- Pull env vars: `vercel env pull .env.local`

### 2. Deploy

```sh
npm install
vercel deploy
```

### 3. Set up the Pi

Install cloudflared on the Pi:
```sh
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

Copy `pi-agent/register.py` to your Pi, then run:
```sh
# Start dashboard + agent in one command
cd pi-agent
chmod +x start.sh
sudo ./start.sh --interface wlan0 --vercel-url https://your-app.vercel.app
```

Or run separately:
```sh
# Terminal 1 — dashboard
sudo python3 dashboard.py --interface wlan0

# Terminal 2 — agent
python3 register.py --vercel-url https://your-app.vercel.app --auto-tunnel
```

## Multiple Pis

Each Pi gets a unique persistent ID (stored in `~/.wifi_radar_device_id`). Run the agent on as many Pis as you want — they all appear on the same dashboard automatically.

## Environment Variables

Set these in Vercel (added automatically when you create a KV store):

| Variable | Description |
|---|---|
| `KV_URL` | Vercel KV connection URL |
| `KV_REST_API_URL` | KV REST endpoint |
| `KV_REST_API_TOKEN` | KV auth token |
