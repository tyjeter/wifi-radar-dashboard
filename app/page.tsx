'use client'

import { useEffect, useState } from 'react'

interface Device {
  id: string
  name: string
  url: string
  lastSeen: number
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' },
  h1: { fontSize: '1.4rem', fontWeight: 600, color: '#58a6ff' },
  badge: { fontSize: '0.7rem', background: '#1f3a5f', color: '#58a6ff',
    border: '1px solid #58a6ff44', borderRadius: '4px', padding: '2px 8px',
    marginLeft: '8px', verticalAlign: 'middle' },
  subtitle: { fontSize: '0.85rem', color: '#8b949e', marginTop: '4px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '10px',
    padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
    textDecoration: 'none', display: 'block', color: 'inherit' },
  cardName: { fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px', color: '#e6edf3' },
  cardUrl: { fontSize: '0.78rem', color: '#58a6ff', marginBottom: '12px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardFooter: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#8b949e' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950', flexShrink: 0 },
  empty: { textAlign: 'center', padding: '80px 20px', color: '#484f58' },
  emptyTitle: { fontSize: '1.1rem', marginBottom: '8px', color: '#8b949e' },
  emptyDesc: { fontSize: '0.85rem', lineHeight: 1.6 },
  pulse: { animation: 'pulse 2s infinite' },
  refreshBtn: { background: 'none', border: '1px solid #30363d', color: '#8b949e',
    borderRadius: '6px', padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: '#0009', zIndex: 100,
    display: 'flex', flexDirection: 'column' },
  modalHeader: { background: '#161b22', borderBottom: '1px solid #30363d',
    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' },
  modalClose: { background: 'none', border: 'none', color: '#8b949e',
    fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 },
  iframe: { flex: 1, border: 'none', width: '100%' },
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Device | null>(null)

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      setDevices(data)
    } catch {
      // silently retry
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000) // refresh every 5s
    return () => clearInterval(interval)
  }, [])

  const timeAgo = (ms: number) => {
    const secs = Math.floor((Date.now() - ms) / 1000)
    if (secs < 5)  return 'just now'
    if (secs < 60) return `${secs}s ago`
    return `${Math.floor(secs / 60)}m ago`
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        a.device-card:hover { border-color: #58a6ff !important; transform: translateY(-2px); }
      `}</style>

      <div style={s.header}>
        <div>
          <h1 style={s.h1}>
            Wi-Fi Radar <span style={s.badge}>ALPHA</span>
          </h1>
          <p style={s.subtitle}>Connected Raspberry Pi devices</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchDevices}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ ...s.empty }}>
          <div style={{ ...s.emptyTitle, ...s.pulse }}>Scanning for devices...</div>
        </div>
      ) : devices.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No devices online</div>
          <div style={s.emptyDesc}>
            Run the Pi agent on your Raspberry Pi to connect it here.<br />
            Devices appear automatically within 30 seconds.
          </div>
        </div>
      ) : (
        <div style={s.grid}>
          {devices.map(device => (
            <a
              key={device.id}
              className="device-card"
              style={s.card}
              onClick={e => { e.preventDefault(); setSelected(device) }}
              href={device.url}
            >
              <div style={s.cardName}>{device.name}</div>
              <div style={s.cardUrl}>{device.url}</div>
              <div style={s.cardFooter}>
                <div style={s.dot} />
                <span>Online · {timeAgo(device.lastSeen)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Device modal — embeds Pi dashboard in iframe */}
      {selected && (
        <div style={s.modal}>
          <div style={s.modalHeader}>
            <button style={s.modalClose} onClick={() => setSelected(null)}>✕</button>
            <span style={{ fontWeight: 600 }}>{selected.name}</span>
            <span style={{ color: '#8b949e', fontSize: '0.8rem', marginLeft: 'auto' }}>
              {selected.url}
            </span>
          </div>
          <iframe
            style={s.iframe}
            src={selected.url}
            title={selected.name}
            allow="cross-origin"
          />
        </div>
      )}
    </div>
  )
}
