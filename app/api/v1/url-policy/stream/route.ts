// app/api/v1/url-policy/stream/route.ts
// SSE endpoint for real-time SWG dashboard updates (P2-6)
import { NextRequest } from 'next/server'
import { getDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function ensureLogTable(db: ReturnType<typeof getDB>) {
  await db.execute(`CREATE TABLE IF NOT EXISTS url_policy_log (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, action TEXT NOT NULL, category TEXT NOT NULL, risk_level TEXT NOT NULL DEFAULT 'unknown', user_id TEXT, policy_id INTEGER, evaluated_at DATETIME NOT NULL DEFAULT (datetime('now')))`)
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const queryData = async () => {
        const db = getDB()
        await ensureLogTable(db)
        const [sumRows, recentRows] = await Promise.all([
          db.execute(`SELECT COUNT(*) as total, SUM(CASE WHEN LOWER(action)='block' THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN LOWER(action)='warn' THEN 1 ELSE 0 END) as warned FROM url_policy_log WHERE evaluated_at > datetime('now','-24 hours')`),
          db.execute(`SELECT domain, action, category, risk_level, evaluated_at FROM url_policy_log ORDER BY evaluated_at DESC LIMIT 5`),
        ])
        const s = sumRows.rows[0] as any
        return {
          total: Number(s?.total || 0),
          blocked: Number(s?.blocked || 0),
          warned: Number(s?.warned || 0),
          recent: recentRows.rows,
        }
      }

      // Send initial snapshot
      try {
        const data = await queryData()
        send('snapshot', data)
      } catch (e: any) {
        send('error', { message: 'Failed to load initial data', detail: e?.message })
      }

      // Poll every 10s
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          const data = await queryData()
          send('update', { ...data, timestamp: new Date().toISOString() })
        } catch (e: any) {
          send('error', { message: 'Poll failed', detail: e?.message })
        }
      }, 10000)

      // Cleanup after 5 minutes max
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
