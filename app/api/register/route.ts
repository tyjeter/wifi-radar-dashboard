import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

export interface Device {
  id: string
  name: string
  url: string
  lastSeen: number
}

export async function POST(req: NextRequest) {
  try {
    const { id, name, url } = await req.json()

    if (!id || !url) {
      return NextResponse.json({ error: 'id and url are required' }, { status: 400 })
    }

    const device: Device = {
      id,
      name: name || `Pi (${id.slice(0, 6)})`,
      url,
      lastSeen: Date.now(),
    }

    // Store device with 90s TTL — Pi must heartbeat every 30s to stay listed
    await kv.set(`device:${id}`, device, { ex: 90 })
    await kv.sadd('devices', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
