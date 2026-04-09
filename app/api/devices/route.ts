import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'
import type { Device } from '../register/route'

export const revalidate = 0 // always fresh

export async function GET() {
  try {
    const ids = await kv.smembers('devices') as string[]

    if (!ids.length) {
      return NextResponse.json([])
    }

    const devices = await Promise.all(ids.map(id => kv.get<Device>(`device:${id}`)))

    // Filter nulls (TTL expired = device offline)
    const active = devices.filter((d): d is Device => d !== null)

    // Clean up offline device IDs from the set
    const offlineIds = ids.filter((id, i) => devices[i] === null)
    if (offlineIds.length) {
      await Promise.all(offlineIds.map(id => kv.srem('devices', id)))
    }

    return NextResponse.json(active)
  } catch (err) {
    return NextResponse.json([], { status: 500 })
  }
}
