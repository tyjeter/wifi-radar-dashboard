'use client'

import { useEffect, useState } from 'react'

interface Device {
  id: string
  name: string
  url: string
  lastSeen: number
  currentRssi:   number | null
  movementCount: number
  direction:     string | null
  speed:         string | null
  calibrated:    boolean
  breathing:     boolean
}

const s: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100vh', padding:'24px', maxWidth:'1200px', margin:'0 auto' },
  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' },
  h1:       { fontSize:'1.4rem', fontWeight:600, color:'#58a6ff' },
  badge:    { fontSize:'0.7rem', background:'#1f3a5f', color:'#58a6ff', border:'1px solid #58a6ff44',
              borderRadius:'4px', padding:'2px 8px', marginLeft:'8px', verticalAlign:'middle' },
  subtitle: { fontSize:'0.85rem', color:'#8b949e', marginTop:'4px' },
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:'16px' },
  card:     { background:'#161b22', border:'1px solid #30363d', borderRadius:'10px', padding:'18px',
              cursor:'pointer', transition:'border-color 0.2s, transform 0.15s',
              textDecoration:'none', display:'block', color:'inherit' },
  cardName: { fontSize:'1.05rem', fontWeight:600, marginBottom:'4px', color:'#e6edf3' },
  cardUrl:  { fontSize:'0.75rem', color:'#58a6ff', marginBottom:'10px',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  statsRow: { display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'10px' },
  chip:     { fontSize:'0.72rem', background:'#0d1117', border:'1px solid #30363d',
              borderRadius:'4px', padding:'2px 7px', color:'#8b949e' },
  chipOk:   { fontSize:'0.72rem', background:'#0d2a0d', border:'1px solid #238636',
              borderRadius:'4px', padding:'2px 7px', color:'#3fb950' },
  chipWarn: { fontSize:'0.72rem', background:'#2a1a0d', border:'1px solid #d29922',
              borderRadius:'4px', padding:'2px 7px', color:'#d29922' },
  chipAlert:{ fontSize:'0.72rem', background:'#2a0d0d', border:'1px solid #f85149',
              borderRadius:'4px', padding:'2px 7px', color:'#f85149' },
  cardFooter:{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.75rem', color:'#8b949e' },
  dot:      { width:'8px', height:'8px', borderRadius:'50%', background:'#3fb950', flexShrink:0 },
  empty:    { textAlign:'center', padding:'80px 20px', color:'#484f58' },
  emptyTitle:{ fontSize:'1.1rem', marginBottom:'8px', color:'#8b949e' },
  emptyDesc: { fontSize:'0.85rem', lineHeight:1.6 },
  refreshBtn:{ background:'none', border:'1px solid #30363d', color:'#8b949e',
               borderRadius:'6px', padding:'6px 14px', fontSize:'0.8rem', cursor:'pointer' },
  modal:    { position:'fixed', inset:0, background:'#0009', zIndex:100, display:'flex', flexDirection:'column' },
  modalHeader:{ background:'#161b22', borderBottom:'1px solid #30363d',
                padding:'12px 20px', display:'flex', alignItems:'center', gap:'12px' },
  modalClose: { background:'none', border:'none', color:'#8b949e', fontSize:'1.4rem', cursor:'pointer', lineHeight:1 },
  iframe:   { flex:1, border:'none', width:'100%' },
  // Triangulation section
  triSection:{ background:'#161b22', border:'1px solid #30363d', borderRadius:'10px',
               padding:'20px', marginBottom:'20px' },
  triTitle: { fontSize:'0.85rem', fontWeight:600, color:'#8b949e', textTransform:'uppercase',
              letterSpacing:'0.05em', marginBottom:'16px' },
  triGrid:  { display:'flex', gap:'8px', alignItems:'flex-end', flexWrap:'wrap' },
  triBar:   { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', minWidth:'60px' },
  triLabel: { fontSize:'0.72rem', color:'#8b949e', textAlign:'center', maxWidth:'70px',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
}

const DIR_LABEL: Record<string, string> = {
  approaching: '↗ near',
  moving_away: '↘ away',
  stationary:  '→ still',
}

export default function Home() {
  const [devices,  setDevices]  = useState<Device[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Device | null>(null)

  const fetchDevices = async () => {
    try {
      const res  = await fetch('/api/devices')
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
    const id = setInterval(fetchDevices, 5000)
    return () => clearInterval(id)
  }, [])

  const timeAgo = (ms: number) => {
    const secs = Math.floor((Date.now() - ms) / 1000)
    if (secs < 5)  return 'just now'
    if (secs < 60) return `${secs}s ago`
    return `${Math.floor(secs / 60)}m ago`
  }

  // Triangulation: bar heights based on RSSI (stronger signal = taller bar = likely closer)
  const rssiToHeight = (rssi: number | null) => {
    if (rssi === null) return 10
    const clamped = Math.max(-100, Math.min(-20, rssi))
    return Math.round(((clamped + 100) / 80) * 120) + 10  // 10..130 px
  }

  const rssiColor = (rssi: number | null) => {
    if (rssi === null) return '#30363d'
    if (rssi > -50) return '#f85149'
    if (rssi > -65) return '#d29922'
    return '#1f6feb'
  }

  const activeDevices = devices.filter(d => d.calibrated)

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        a.device-card:hover { border-color:#58a6ff !important; transform:translateY(-2px); }
      `}</style>

      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Wi-Fi Radar <span style={s.badge}>HUB</span></h1>
          <p style={s.subtitle}>{devices.length} device{devices.length !== 1 ? 's' : ''} online</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchDevices}>Refresh</button>
      </div>

      {/* Triangulation / relative proximity view */}
      {activeDevices.length >= 2 && (
        <div style={s.triSection}>
          <div style={s.triTitle}>Relative Signal Strength (triangulation estimate)</div>
          <div style={s.triGrid}>
            {activeDevices.map(d => (
              <div key={d.id} style={s.triBar}>
                <div style={{ fontSize:'0.7rem', color:'#8b949e', marginBottom:'2px' }}>
                  {d.currentRssi != null ? `${d.currentRssi} dBm` : '—'}
                </div>
                <div style={{
                  width: '44px',
                  height: `${rssiToHeight(d.currentRssi)}px`,
                  background: rssiColor(d.currentRssi),
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s, background 0.5s',
                }} />
                <div style={s.triLabel} title={d.name}>{d.name}</div>
              </div>
            ))}
            <div style={{ fontSize:'0.75rem', color:'#484f58', marginLeft:'12px', alignSelf:'center', maxWidth:'180px' }}>
              Taller = stronger signal = likely closer to that Pi
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={s.empty}>
          <div style={{ ...s.emptyTitle, animation:'pulse 2s infinite' }}>Scanning for devices...</div>
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
          {devices.map(device => {
            const rssiStr = device.currentRssi != null ? `${device.currentRssi} dBm` : '—'
            const dirLabel = device.direction ? (DIR_LABEL[device.direction] || device.direction) : null
            return (
              <a
                key={device.id}
                className="device-card"
                style={s.card}
                onClick={e => { e.preventDefault(); setSelected(device) }}
                href={device.url}
              >
                <div style={s.cardName}>{device.name}</div>
                <div style={s.cardUrl}>{device.url}</div>

                <div style={s.statsRow}>
                  <span style={s.chip}>RSSI {rssiStr}</span>
                  <span style={s.chip}>{device.movementCount} events</span>
                  {dirLabel && (
                    <span style={device.direction === 'approaching' ? s.chipWarn : s.chip}>{dirLabel}</span>
                  )}
                  {device.speed && device.speed !== 'stationary' && (
                    <span style={device.speed === 'fast' ? s.chipAlert : s.chip}>{device.speed}</span>
                  )}
                  {device.breathing && <span style={s.chipOk}>breathing</span>}
                  {!device.calibrated && <span style={s.chipWarn}>calibrating</span>}
                </div>

                <div style={s.cardFooter}>
                  <div style={s.dot} />
                  <span>Online · {timeAgo(device.lastSeen)}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {selected && (
        <div style={s.modal}>
          <div style={s.modalHeader}>
            <button style={s.modalClose} onClick={() => setSelected(null)}>✕</button>
            <span style={{ fontWeight:600 }}>{selected.name}</span>
            {selected.currentRssi != null && (
              <span style={{ fontSize:'0.8rem', color:'#58a6ff' }}>{selected.currentRssi} dBm</span>
            )}
            <span style={{ color:'#8b949e', fontSize:'0.8rem', marginLeft:'auto' }}>{selected.url}</span>
          </div>
          <iframe style={s.iframe} src={selected.url} title={selected.name} />
        </div>
      )}
    </div>
  )
}
