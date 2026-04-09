import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wi-Fi Radar — Device Hub',
  description: 'Monitor connected Wi-Fi Radar Raspberry Pi devices',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d1117', color: '#e6edf3',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
