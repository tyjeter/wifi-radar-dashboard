import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

export interface Device {
  id: string
  name: string
  url: string
  lastSeen: number
  // Live state reported by Pi agent
  currentRssi:   number | null
  movementCount: number
  direction:     string | null
  speed:         string | null
  calibrated:    boolean
  breathing:     boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, url } = body

    if (!id || !url) {
      return NextResponse.json({ error: 'id and url are required' }, { status: 400 })
    }

    const device: Device = {
      id,
      name:          name || `Pi (${id.slice(0, 6)})`,
      url,
      lastSeen:      Date.now(),
      currentRssi:   body.current_rssi   ?? null,
      movementCount: body.movement_count ?? 0,
      direction:     body.direction      ?? null,
      speed:         body.speed          ?? null,
      calibrated:    body.calibrated     ?? false,
      breathing:     body.breathing      ?? false,
    }

    await kv.set(`device:${id}`, device, { ex: 90 })
    await kv.sadd('devices', id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
