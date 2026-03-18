// app/api/v1/url-policy/stream/route.ts
// SSE endpoint for real-time SWG dashboard updates (P2-6)
import { NextRequest } from 'next/server'
import { getDB, initDB } from '@/lib/db'

// runtime = 'edge' disabled for libSQL
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial snapshot
      try {
        await initDB(); await initDB(); const db = getDB()
        const [sumRows, recentRows] = await Promise.all([
          db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN action="block" THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN action="warn" THEN 1 ELSE 0 END) as warned FROM ai_url_cache WHERE evaluated_at > datetime("now","-24 hours")'),
          db.execute('SELECT domain, action, category, risk_level, evaluated_at FROM ai_url_cache ORDER BY evaluated_at DESC LIMIT 5'),
        ])
        const s = sumRows.rows[0] as any
        send('snapshot', {
          total: Number(s?.total || 0),
          blocked: Number(s?.blocked || 0),
          warned: Number(s?.warned || 0),
          recent: recentRows.rows,
        })
      } catch (e) {
        send('error', { message: 'Failed to load initial data' })
      }

      // Poll every 10s for new entries
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          await initDB(); await initDB(); const db = getDB()
          const [sumRows, recentRows] = await Promise.all([
            db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN action="block" THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN action="warn" THEN 1 ELSE 0 END) as warned FROM ai_url_cache WHERE evaluated_at > datetime("now","-24 hours")'),
            db.execute('SELECT domain, action, category, risk_level, evaluated_at FROM ai_url_cache ORDER BY evaluated_at DESC LIMIT 5'),
          ])
          const s = sumRows.rows[0] as any
          send('update', {
            total: Number(s?.total || 0),
            blocked: Number(s?.blocked || 0),
            warned: Number(s?.warned || 0),
            recent: recentRows.rows,
            timestamp: new Date().toISOString(),
          })
        } catch (e) {
          send('error', { message: 'Poll failed' })
        }
      }, 10000)

      // Cleanup after 5 minutes max (Vercel edge limit)
      setTimeout(() => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch {}
      }, 5 * 60 * 1000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
