import { NextRequest, NextResponse } from "next/server"

const NPOINT_URL = process.env.NPOINT_LOGS_URL || ""
const MAX_LOGS = 500

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get("contact_admin_token")
  return token?.value === sessionSecret
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const r = await fetch(NPOINT_URL, { cache: "no-store" })
    const data = await r.json()
    return NextResponse.json({ logs: data.logs || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const entry = await req.json()
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry,
    }

    const getRes = await fetch(NPOINT_URL, { cache: "no-store" })
    const current = await getRes.json()
    const logs = current.logs || []
    logs.push(logEntry)

    // Keep only latest MAX_LOGS entries
    const trimmed = logs.slice(-MAX_LOGS)

    await fetch(NPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: trimmed }),
    })

    return NextResponse.json({ success: true, id: logEntry.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
