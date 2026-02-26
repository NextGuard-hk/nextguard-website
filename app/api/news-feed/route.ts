import { NextRequest, NextResponse } from "next/server"

const NPOINT_URL = "https://api.npoint.io/ea9aac6e3aff30bb0dfa"

const IMPORTANCE_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const tag = searchParams.get("tag") || ""

    const res = await fetch(NPOINT_URL, { cache: "no-store" })
    const data = await res.json()
    let news = (data.news || data.articles || []).filter((n: any) => n.status === "published")

    // Filter by tag if provided
    if (tag) {
      news = news.filter((n: any) => n.tags?.includes(tag))
    }

    // Sort by importance desc, then publishedAt desc
    news.sort((a: any, b: any) => {
      const impA = IMPORTANCE_ORDER[a.importance] || 0
      const impB = IMPORTANCE_ORDER[b.importance] || 0
      if (impB !== impA) return impB - impA
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    const total = news.length
    const start = (page - 1) * pageSize
    const items = news.slice(start, start + pageSize)

    return NextResponse.json({ items, total, page, pageSize })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
