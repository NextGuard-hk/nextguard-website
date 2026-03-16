// app/api/v1/url-policy/custom-categories/route.ts
// P0: Custom URL Category CRUD API
// GET /api/v1/url-policy/custom-categories - list all
// POST /api/v1/url-policy/custom-categories - create category
// PUT /api/v1/url-policy/custom-categories - update category or add URLs
// DELETE /api/v1/url-policy/custom-categories - delete category

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

const VALID_ACTIONS = ['Block', 'Warn', 'Isolate', 'Allow']

async function initCustomCategoryTables() {
  const db = getDB()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_url_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      action TEXT NOT NULL DEFAULT 'Block',
      color TEXT DEFAULT '#ef4444',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_url_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      domain TEXT NOT NULL,
      added_by TEXT DEFAULT 'admin',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES custom_url_categories(id) ON DELETE CASCADE,
      UNIQUE(domain)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      risk_level TEXT DEFAULT 'none',
      evaluated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  // Index for fast lookup
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_custom_entries_domain ON custom_url_entries(domain)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_policy_log_evaluated ON url_policy_log(evaluated_at)`)
}

export async function GET(request: NextRequest) {
  try {
    await initCustomCategoryTables()
    const db = getDB()
    const { searchParams } = request.nextUrl
    const categoryId = searchParams.get('id')

    if (categoryId) {
      // Get single category with its URL entries
      const cat = await db.execute({
        sql: 'SELECT * FROM custom_url_categories WHERE id = ?',
        args: [categoryId]
      })
      if (!cat.rows.length) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      const entries = await db.execute({
        sql: 'SELECT * FROM custom_url_entries WHERE category_id = ? ORDER BY created_at DESC',
        args: [categoryId]
      })
      return NextResponse.json({ category: cat.rows[0], entries: entries.rows })
    }

    // List all categories with entry counts
    const cats = await db.execute(`
      SELECT cc.*, COUNT(cue.id) as url_count
      FROM custom_url_categories cc
      LEFT JOIN custom_url_entries cue ON cue.category_id = cc.id
      GROUP BY cc.id
      ORDER BY cc.created_at DESC
    `)
    return NextResponse.json({ categories: cats.rows, total: cats.rows.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initCustomCategoryTables()
    const db = getDB()
    const body = await request.json()

    const { name, description = '', action = 'Block', color = '#ef4444', urls = [] } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!VALID_ACTIONS.includes(action)) return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 })

    // Create category
    const result = await db.execute({
      sql: `INSERT INTO custom_url_categories (name, description, action, color) VALUES (?, ?, ?, ?)`,
      args: [name, description, action, color]
    })
    const categoryId = result.lastInsertRowid

    // Add URLs if provided
    const addedUrls: string[] = []
    const failedUrls: string[] = []
    for (const rawUrl of (urls as string[]).slice(0, 500)) {
      const domain = normalizeDomain(rawUrl)
      if (!domain) continue
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO custom_url_entries (category_id, domain) VALUES (?, ?)`,
          args: [categoryId, domain]
        })
        addedUrls.push(domain)
      } catch { failedUrls.push(domain) }
    }

    return NextResponse.json({
      success: true,
      category: { id: categoryId, name, description, action, color, url_count: addedUrls.length },
      addedUrls,
      failedUrls,
    }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initCustomCategoryTables()
    const db = getDB()
    const body = await request.json()
    const { id, name, description, action, color, is_active, addUrls = [], removeUrls = [] } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    if (action && !VALID_ACTIONS.includes(action)) return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 })

    // Update category metadata
    const updates: string[] = []
    const args: unknown[] = []
    if (name !== undefined) { updates.push('name = ?'); args.push(name) }
    if (description !== undefined) { updates.push('description = ?'); args.push(description) }
    if (action !== undefined) { updates.push('action = ?'); args.push(action) }
    if (color !== undefined) { updates.push('color = ?'); args.push(color) }
    if (is_active !== undefined) { updates.push('is_active = ?'); args.push(is_active ? 1 : 0) }
    if (updates.length) {
      updates.push("updated_at = datetime('now')")
      args.push(id)
      await db.execute({ sql: `UPDATE custom_url_categories SET ${updates.join(', ')} WHERE id = ?`, args })
    }

    // Add new URLs
    const addedUrls: string[] = []
    for (const rawUrl of (addUrls as string[]).slice(0, 500)) {
      const domain = normalizeDomain(rawUrl)
      if (!domain) continue
      try {
        await db.execute({ sql: `INSERT OR IGNORE INTO custom_url_entries (category_id, domain) VALUES (?, ?)`, args: [id, domain] })
        addedUrls.push(domain)
      } catch {}
    }

    // Remove URLs
    const removedUrls: string[] = []
    for (const rawUrl of (removeUrls as string[])) {
      const domain = normalizeDomain(rawUrl)
      if (!domain) continue
      await db.execute({ sql: `DELETE FROM custom_url_entries WHERE category_id = ? AND domain = ?`, args: [id, domain] })
      removedUrls.push(domain)
    }

    const cat = await db.execute({ sql: 'SELECT *, (SELECT COUNT(*) FROM custom_url_entries WHERE category_id = cc.id) as url_count FROM custom_url_categories cc WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true, category: cat.rows[0], addedUrls, removedUrls })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDB()
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await db.execute({ sql: 'DELETE FROM custom_url_entries WHERE category_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM custom_url_categories WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true, deleted: id })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

function normalizeDomain(input: string): string {
  let d = input.toLowerCase().trim()
  if (!d) return ''
  try {
    if (!d.startsWith('http')) d = 'https://' + d
    d = new URL(d).hostname
  } catch { return '' }
  return d.replace(/^www\./, '')
}
