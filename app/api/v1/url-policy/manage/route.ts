import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

// URL Policy Management API - Tier 1 Feature
// Supports: CRUD for policy rules, bulk updates, policy profiles
// Endpoint: /api/v1/url-policy/manage

const VALID_ACTIONS = ['Block', 'Warn', 'Allow', 'Isolate', 'Monitor'];
const VALID_SCHEDULES = ['always', 'business_hours', 'after_hours', 'custom'];

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    const profileId = request.nextUrl.searchParams.get('profile_id');
    const category = request.nextUrl.searchParams.get('category');

    // Ensure policy_rules table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS policy_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL DEFAULT 'default',
      profile_name TEXT DEFAULT 'Default Policy',
      category TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'Allow',
      schedule TEXT DEFAULT 'always',
      schedule_config TEXT,
      log_enabled INTEGER DEFAULT 1,
      notify_user INTEGER DEFAULT 1,
      block_page_message TEXT,
      priority INTEGER DEFAULT 50,
      enabled INTEGER DEFAULT 1,
      created_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(profile_id, category)
    )`);

    // Ensure policy_profiles table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS policy_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      parent_profile_id TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    let sql = 'SELECT * FROM policy_rules WHERE 1=1';
    const args: string[] = [];

    if (profileId) {
      sql += ' AND profile_id = ?';
      args.push(profileId);
    }
    if (category) {
      sql += ' AND category = ?';
      args.push(category);
    }
    sql += ' ORDER BY priority DESC, category ASC';

    const rules = await db.execute({ sql, args });

    // Also get profiles
    const profiles = await db.execute('SELECT * FROM policy_profiles ORDER BY name');

    return NextResponse.json({
      rules: rules.rows,
      profiles: profiles.rows,
      count: rules.rows.length,
      validActions: VALID_ACTIONS,
      validSchedules: VALID_SCHEDULES,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    const body = await request.json();

    // Ensure tables exist
    await db.execute(`CREATE TABLE IF NOT EXISTS policy_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL DEFAULT 'default',
      profile_name TEXT DEFAULT 'Default Policy',
      category TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'Allow',
      schedule TEXT DEFAULT 'always',
      schedule_config TEXT,
      log_enabled INTEGER DEFAULT 1,
      notify_user INTEGER DEFAULT 1,
      block_page_message TEXT,
      priority INTEGER DEFAULT 50,
      enabled INTEGER DEFAULT 1,
      created_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(profile_id, category)
    )`);

    // Action: seed default policies
    if (body.action === 'seed_defaults') {
      const defaults: Record<string, { action: string; priority: number }> = {
        'adult': { action: 'Block', priority: 90 },
        'gambling': { action: 'Block', priority: 90 },
        'malware': { action: 'Block', priority: 99 },
        'phishing': { action: 'Block', priority: 99 },
        'botnet/c2': { action: 'Block', priority: 99 },
        'spyware': { action: 'Block', priority: 95 },
        'exploit/attack tools': { action: 'Block', priority: 95 },
        'scam/fraud': { action: 'Block', priority: 90 },
        'proxy/anonymizer': { action: 'Warn', priority: 70 },
        'vpn services': { action: 'Warn', priority: 60 },
        'cryptocurrency': { action: 'Warn', priority: 50 },
        'social networking': { action: 'Warn', priority: 40 },
        'streaming video': { action: 'Warn', priority: 40 },
        'games': { action: 'Warn', priority: 40 },
        'messaging': { action: 'Warn', priority: 30 },
        'dynamic dns': { action: 'Warn', priority: 60 },
        'suspicious': { action: 'Warn', priority: 75 },
        'news': { action: 'Allow', priority: 10 },
        'search engines': { action: 'Allow', priority: 10 },
        'business': { action: 'Allow', priority: 10 },
        'technology': { action: 'Allow', priority: 10 },
        'education': { action: 'Allow', priority: 10 },
        'government': { action: 'Allow', priority: 10 },
        'health': { action: 'Allow', priority: 10 },
        'finance': { action: 'Allow', priority: 10 },
        'shopping': { action: 'Allow', priority: 10 },
      };

      let seeded = 0;
      const profileId = body.profile_id || 'default';
      for (const [cat, config] of Object.entries(defaults)) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO policy_rules (profile_id, category, action, priority, enabled) VALUES (?, ?, ?, ?, 1)`,
          args: [profileId, cat, config.action, config.priority],
        });
        seeded++;
      }
      return NextResponse.json({ success: true, seeded, profile_id: profileId });
    }

    // Action: create/update single rule
    if (body.action === 'upsert_rule') {
      const { profile_id = 'default', category, rule_action, schedule, priority, log_enabled, notify_user, block_page_message } = body;
      if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 });
      if (rule_action && !VALID_ACTIONS.includes(rule_action)) {
        return NextResponse.json({ error: `Invalid action. Valid: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
      }

      await db.execute({
        sql: `INSERT INTO policy_rules (profile_id, category, action, schedule, priority, log_enabled, notify_user, block_page_message)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(profile_id, category) DO UPDATE SET
                action = COALESCE(excluded.action, action),
                schedule = COALESCE(excluded.schedule, schedule),
                priority = COALESCE(excluded.priority, priority),
                log_enabled = COALESCE(excluded.log_enabled, log_enabled),
                notify_user = COALESCE(excluded.notify_user, notify_user),
                block_page_message = COALESCE(excluded.block_page_message, block_page_message),
                updated_at = datetime('now')`,
        args: [
          profile_id, category, rule_action || 'Allow',
          schedule || 'always', priority || 50,
          log_enabled !== undefined ? (log_enabled ? 1 : 0) : 1,
          notify_user !== undefined ? (notify_user ? 1 : 0) : 1,
          block_page_message || null,
        ],
      });
      return NextResponse.json({ success: true, category, action: rule_action || 'Allow', profile_id });
    }

    // Action: bulk update rules
    if (body.action === 'bulk_update') {
      const { rules, profile_id = 'default' } = body;
      if (!Array.isArray(rules)) return NextResponse.json({ error: 'rules array required' }, { status: 400 });

      let updated = 0;
      for (const rule of rules.slice(0, 100)) {
        if (!rule.category || !rule.rule_action) continue;
        await db.execute({
          sql: `INSERT INTO policy_rules (profile_id, category, action, priority, enabled)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(profile_id, category) DO UPDATE SET action = excluded.action, priority = excluded.priority, updated_at = datetime('now')`,
          args: [profile_id, rule.category, rule.rule_action, rule.priority || 50],
        });
        updated++;
      }
      return NextResponse.json({ success: true, updated, profile_id });
    }

    // Action: create profile
    if (body.action === 'create_profile') {
      const { id, name, description, parent_profile_id } = body;
      if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });

      await db.execute(`CREATE TABLE IF NOT EXISTS policy_profiles (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
        is_default INTEGER DEFAULT 0, parent_profile_id TEXT,
        enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);

      await db.execute({
        sql: `INSERT INTO policy_profiles (id, name, description, parent_profile_id) VALUES (?, ?, ?, ?)`,
        args: [id, name, description || null, parent_profile_id || null],
      });
      return NextResponse.json({ success: true, profile: { id, name } });
    }

    return NextResponse.json({ error: 'Invalid action. Use: seed_defaults, upsert_rule, bulk_update, create_profile' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    const body = await request.json();
    const { profile_id = 'default', category } = body;

    if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 });

    const result = await db.execute({
      sql: 'DELETE FROM policy_rules WHERE profile_id = ? AND category = ?',
      args: [profile_id, category],
    });

    return NextResponse.json({ success: true, deleted: result.rowsAffected });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
