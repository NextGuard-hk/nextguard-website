import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const NPOINT_ID = process.env.NPOINT_NEWSFEED_ID || ""
const NPOINT_API = `https://api.npoint.io/${NPOINT_ID}`

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has("admin_session")
}

// GET all articles (including pending) for admin review
export async function GET(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const res = await fetch(NPOINT_API, { cache: "no-store" })
    const data = await res.json()
    const articles = data.articles || []
    return NextResponse.json({ articles, total: articles.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH - update article status (publish/hide)
export async function PATCH(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id, status, action: bulkAction, ids } = body

    const res = await fetch(NPOINT_API, { cache: "no-store" })
    const data = await res.json()
    let articles = data.articles || []

    if (bulkAction === "publish-all" && ids?.length) {
      articles = articles.map((a: any) => ids.includes(a.id) ? { ...a, status: "published" } : a)
    } else if (id && status) {
      articles = articles.map((a: any) => a.id === id ? { ...a, status } : a)
    } else {
      return NextResponse.json({ error: "Missing id/status or bulk action" }, { status: 400 })
    }

    await fetch(NPOINT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE - remove article
export async function DELETE(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: "Missing article id" }, { status: 400 })

    const res = await fetch(NPOINT_API, { cache: "no-store" })
    const data = await res.json()
    const articles = (data.articles || []).filter((a: any) => a.id !== id)

    await fetch(NPOINT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
