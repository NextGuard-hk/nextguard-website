// app/api/v1/url-policy/profiles/route.ts
// P1: Policy Profile API - per user/group policy overrides
// Allows different groups (e.g. Engineering, HR, Guest) to have different URL policies
// GET /api/v1/url-policy/profiles
// POST /api/v1/url-policy/profiles
// PUT /api/v1/url-policy/profiles
// DELETE /api/v1/url-policy/profiles?id=
// GET /api/v1/url-policy/profiles/evaluate?url=&profile=

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

const DEFAULT_PROFILE_RULES = [
  { category: 'Malware', action: 'Block' },
  { category: 'Phishing', action: 'Block' },
  { category: 'Botnet/C2', action: 'Block' },
  { category: 'Exploit/Attack Tools', action: 'Block' },
  { category: 'Scam/Fraud', action: 'Block' },
  { category: 'Adult', action: 'Block' },
  { category: 'Gambling', action: 'Block' },
  { category: 'Proxy/Anonymizer', action: 'Warn' },
  { category: 'VPN Services', action: 'Warn' },
  { category: 'Social Networking', action: 'Allow' },
  { category: 'Streaming Video', action: 'Allow' },
]

async function initProfileTables() {
  const db = getDB()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      group_type TEXT DEFAULT 'custom',
      is_default INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_profile_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'Block',
      note TEXT DEFAULT '',
      FOREIGN KEY (profile_id) REFERENCES url_policy_profiles(id) ON DELETE CASCADE,
      UNIQUE(profile_id, category)
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_profile_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      identifier TEXT NOT NULL,
      identifier_type TEXT DEFAULT 'user',
      FOREIGN KEY (profile_id) REFERENCES url_policy_profiles(id) ON DELETE CASCADE,
      UNIQUE(identifier)
    )
  `)
  // Seed default profiles if empty
  const existing = await db.execute('SELECT COUNT(*) as count FROM url_policy_profiles')
  if ((existing.rows[0]?.count as number) === 0) {
    await seedDefaultProfiles(db)
  }
}

async function seedDefaultProfiles(db: ReturnType<typeof getDB>) {
  const profiles = [
    { name: 'Default', description: 'Standard policy for all users', group_type: 'default', is_default: 1 },
    { name: 'Engineering', description: 'Relaxed policy for engineering team - allows dev tools, GitHub, etc.', group_type: 'department' },
    { name: 'Guest/BYOD', description: 'Strict policy for guest and personal devices', group_type: 'guest' },
    { name: 'Executive', description: 'Standard + DLP-aware policy for senior management', group_type: 'executive' },
  ]
  for (const p of profiles) {
    const r = await db.execute({
      sql: `INSERT OR IGNORE INTO url_policy_profiles (name, description, group_type, is_default) VALUES (?, ?, ?, ?)`,
      args: [p.name, p.description, p.group_type, p.is_default || 0]
    })
    const profileId = r.lastInsertRowid
    if (!profileId) continue
    // Add default rules for each profile
    const rules = p.name === 'Engineering'
      ? [...DEFAULT_PROFILE_RULES, { category: 'File Sharing', action: 'Allow' }, { category: 'Developer Tools', action: 'Allow' }]
      : p.name === 'Guest/BYOD'
      ? [...DEFAULT_PROFILE_RULES, { category: 'Social Networking', action: 'Warn' }, { category: 'Streaming Video', action: 'Block' }, { category: 'Cryptocurrency', action: 'Block' }]
      : DEFAULT_PROFILE_RULES
    for (const rule of rules) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_policy_profile_rules (profile_id, category, action) VALUES (?, ?, ?)`,
        args: [profileId, rule.category, rule.action]
      })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await initProfileTables()
    const db = getDB()
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    const withRules = searchParams.get('withRules') === 'true'

    if (id) {
      const profile = await db.execute({ sql: 'SELECT * FROM url_policy_profiles WHERE id = ?', args: [id] })
      if (!profile.rows.length) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      const rules = await db.execute({ sql: 'SELECT * FROM url_policy_profile_rules WHERE profile_id = ? ORDER BY category', args: [id] })
      const members = await db.execute({ sql: 'SELECT * FROM url_policy_profile_members WHERE profile_id = ?', args: [id] })
      return NextResponse.json({ profile: profile.rows[0], rules: rules.rows, members: members.rows })
    }

    const profiles = await db.execute(`
      SELECT p.*,
        (SELECT COUNT(*) FROM url_policy_profile_rules WHERE profile_id = p.id) as rule_count,
        (SELECT COUNT(*) FROM url_policy_profile_members WHERE profile_id = p.id) as member_count
      FROM url_policy_profiles p ORDER BY p.is_default DESC, p.name ASC
    `)

    if (withRules) {
      const result = []
      for (const profile of profiles.rows) {
        const rules = await db.execute({ sql: 'SELECT * FROM url_policy_profile_rules WHERE profile_id = ?', args: [(profile.id as number)] })
        result.push({ ...profile, rules: rules.rows })
      }
      return NextResponse.json({ profiles: result })
    }

    return NextResponse.json({ profiles: profiles.rows })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initProfileTables()
    const db = getDB()
    const body = await request.json()
    const { name, description = '', group_type = 'custom', rules = [], members = [] } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const r = await db.execute({
      sql: `INSERT INTO url_policy_profiles (name, description, group_type) VALUES (?, ?, ?)`,
      args: [name, description, group_type]
    })
    const profileId = r.lastInsertRowid

    for (const rule of (rules as {category: string; action: string}[])) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO url_policy_profile_rules (profile_id, category, action) VALUES (?, ?, ?)`,
        args: [profileId, rule.category, rule.action]
      })
    }

    for (const member of (members as {identifier: string; identifier_type?: string}[])) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_policy_profile_members (profile_id, identifier, identifier_type) VALUES (?, ?, ?)`,
        args: [profileId, member.identifier, member.identifier_type || 'user']
      })
    }

    return NextResponse.json({ success: true, profileId }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'Profile name already exists' }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    const body = await request.json()
    const { id, name, description, group_type, is_active, addRules = [], removeCategories = [], addMembers = [], removeMembers = [] } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates: string[] = []
    const args: unknown[] = []
    if (name !== undefined) { updates.push('name = ?'); args.push(name) }
    if (description !== undefined) { updates.push('description = ?'); args.push(description) }
    if (group_type !== undefined) { updates.push('group_type = ?'); args.push(group_type) }
    if (is_active !== undefined) { updates.push('is_active = ?'); args.push(is_active ? 1 : 0) }
    if (updates.length) {
      updates.push("updated_at = datetime('now')")
      args.push(id)
      await db.execute({ sql: `UPDATE url_policy_profiles SET ${updates.join(', ')} WHERE id = ?`, args })
    }

    for (const rule of (addRules as {category: string; action: string}[])) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO url_policy_profile_rules (profile_id, category, action) VALUES (?, ?, ?)`,
        args: [id, rule.category, rule.action]
      })
    }

    for (const cat of (removeCategories as string[])) {
      await db.execute({ sql: 'DELETE FROM url_policy_profile_rules WHERE profile_id = ? AND category = ?', args: [id, cat] })
    }

    for (const m of (addMembers as {identifier: string; identifier_type?: string}[])) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_policy_profile_members (profile_id, identifier, identifier_type) VALUES (?, ?, ?)`,
        args: [id, m.identifier, m.identifier_type || 'user']
      })
    }

    for (const identifier of (removeMembers as string[])) {
      await db.execute({ sql: 'DELETE FROM url_policy_profile_members WHERE profile_id = ? AND identifier = ?', args: [id, identifier] })
    }

    const profile = await db.execute({ sql: 'SELECT * FROM url_policy_profiles WHERE id = ?', args: [id] })
    const rules = await db.execute({ sql: 'SELECT * FROM url_policy_profile_rules WHERE profile_id = ?', args: [id] })
    return NextResponse.json({ success: true, profile: profile.rows[0], rules: rules.rows })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDB()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const profile = await db.execute({ sql: 'SELECT is_default FROM url_policy_profiles WHERE id = ?', args: [id] })
    if (profile.rows[0]?.is_default) return NextResponse.json({ error: 'Cannot delete the default profile' }, { status: 403 })
    await db.execute({ sql: 'DELETE FROM url_policy_profiles WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
