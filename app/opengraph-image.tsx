import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Nextguard - AI-Driven Data Loss Prevention'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #0d0f12 0%, #1a1d23 50%, #0d0f12 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              marginRight: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            NG
          </div>
          <span style={{ fontSize: '56px', fontWeight: 'bold' }}>Nextguard</span>
        </div>
        <div
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: '1.4',
          }}
        >
          AI-Driven Data Loss Prevention
        </div>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '40px',
            fontSize: '18px',
          }}
        >
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
            }}
          >
            Endpoint Protection
          </div>
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#a78bfa',
            }}
          >
            Cloud Security
          </div>
          <div
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
            }}
          >
            AI Content Inspection
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
