import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

// Custom URL Categories API - Zscaler-grade custom category management
// Supports: CRUD operations, whitelist/blacklist, keyword matching
// Max 64 custom categories, 25000 URLs across all categories

export async function GET(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    // Ensure custom categories table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS custom_url_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'custom' CHECK(type IN ('custom','whitelist','blacklist')),
      action TEXT NOT NULL DEFAULT 'Block' CHECK(action IN ('Allow','Alert','Warn','Block','Isolate','Continue','Override')),
      priority INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      retain_parent_category INTEGER NOT NULL DEFAULT 0,
      urls_count INTEGER NOT NULL DEFAULT 0,
      keywords_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS custom_url_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      entry_type TEXT NOT NULL DEFAULT 'url' CHECK(entry_type IN ('url','keyword','ip_range')),
      value TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES custom_url_categories(id) ON DELETE CASCADE
    )`);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cue_cat ON custom_url_entries(category_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cue_value ON custom_url_entries(value)');
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_cue_cat_value ON custom_url_entries(category_id, value)');

    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const cat = await db.execute({ sql: 'SELECT * FROM custom_url_categories WHERE id = ?', args: [id] });
      if (!cat.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const entries = await db.execute({ sql: 'SELECT * FROM custom_url_entries WHERE category_id = ? ORDER BY entry_type, value', args: [id] });
      return NextResponse.json({ category: cat.rows[0], entries: entries.rows });
    }
    const categories = await db.execute('SELECT * FROM custom_url_categories ORDER BY priority ASC, name ASC');
    const stats = await db.execute('SELECT COUNT(*) as total_entries FROM custom_url_entries');
    return NextResponse.json({
      categories: categories.rows,
      totalCategories: categories.rows.length,
      maxCategories: 64,
      totalEntries: stats.rows[0]?.total_entries || 0,
      maxEntries: 25000,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    // Ensure tables exist
    await db.execute(`CREATE TABLE IF NOT EXISTS custom_url_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT,
      type TEXT NOT NULL DEFAULT 'custom', action TEXT NOT NULL DEFAULT 'Block',
      priority INTEGER NOT NULL DEFAULT 100, is_active INTEGER NOT NULL DEFAULT 1,
      retain_parent_category INTEGER NOT NULL DEFAULT 0, urls_count INTEGER NOT NULL DEFAULT 0,
      keywords_count INTEGER NOT NULL DEFAULT 0, created_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS custom_url_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL,
      entry_type TEXT NOT NULL DEFAULT 'url', value TEXT NOT NULL, description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES custom_url_categories(id) ON DELETE CASCADE
    )`);
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_cue_cat_value ON custom_url_entries(category_id, value)');

    const body = await request.json();

    // Create category
    if (body.action === 'create_category') {
      const count = await db.execute('SELECT COUNT(*) as c FROM custom_url_categories');
      if ((count.rows[0]?.c as number) >= 64) {
        return NextResponse.json({ error: 'Maximum 64 custom categories reached' }, { status: 400 });
      }
      const r = await db.execute({
        sql: `INSERT INTO custom_url_categories (name, description, type, action, priority) VALUES (?, ?, ?, ?, ?)`,
        args: [body.name, body.description || '', body.type || 'custom', body.categoryAction || 'Block', body.priority || 100],
      });
      return NextResponse.json({ success: true, id: Number(r.lastInsertRowid), message: `Category '${body.name}' created` });
    }

    // Add URLs/keywords to category
    if (body.action === 'add_entries') {
      const catId = body.category_id;
      if (!catId) return NextResponse.json({ error: 'category_id required' }, { status: 400 });
      const entries = body.entries || [];
      // Also support flat urls array
      const urls = body.urls || [];
      const keywords = body.keywords || [];
      let added = 0, skipped = 0;

      const allEntries = [
        ...entries,
        ...urls.map((u: string) => ({ type: 'url', value: u })),
        ...keywords.map((k: string) => ({ type: 'keyword', value: k })),
      ];

      for (const entry of allEntries) {
        try {
          await db.execute({
            sql: 'INSERT OR IGNORE INTO custom_url_entries (category_id, entry_type, value, description) VALUES (?, ?, ?, ?)',
            args: [catId, entry.type || 'url', entry.value.toLowerCase().trim(), entry.description || ''],
          });
          added++;
        } catch { skipped++; }
      }
      // Update counts
      await db.execute({
        sql: `UPDATE custom_url_categories SET urls_count = (SELECT COUNT(*) FROM custom_url_entries WHERE category_id = ? AND entry_type = 'url'), keywords_count = (SELECT COUNT(*) FROM custom_url_entries WHERE category_id = ? AND entry_type = 'keyword'), updated_at = datetime('now') WHERE id = ?`,
        args: [catId, catId, catId],
      });
      return NextResponse.json({ success: true, added, skipped });
    }

    // Delete category
    if (body.action === 'delete_category') {
      await db.execute({ sql: 'DELETE FROM custom_url_entries WHERE category_id = ?', args: [body.category_id] });
      await db.execute({ sql: 'DELETE FROM custom_url_categories WHERE id = ?', args: [body.category_id] });
      return NextResponse.json({ success: true, message: 'Category deleted' });
    }

    // Remove entry
    if (body.action === 'remove_entry') {
      await db.execute({ sql: 'DELETE FROM custom_url_entries WHERE id = ?', args: [body.entry_id] });
      if (body.category_id) {
        await db.execute({
          sql: `UPDATE custom_url_categories SET urls_count = (SELECT COUNT(*) FROM custom_url_entries WHERE category_id = ? AND entry_type = 'url'), keywords_count = (SELECT COUNT(*) FROM custom_url_entries WHERE category_id = ? AND entry_type = 'keyword'), updated_at = datetime('now') WHERE id = ?`,
          args: [body.category_id, body.category_id, body.category_id],
        });
      }
      return NextResponse.json({ success: true, message: 'Entry removed' });
    }

    // Update category settings
    if (body.action === 'update_category') {
      await db.execute({
        sql: `UPDATE custom_url_categories SET name = COALESCE(?, name), description = COALESCE(?, description), action = COALESCE(?, action), priority = COALESCE(?, priority), is_active = COALESCE(?, is_active), updated_at = datetime('now') WHERE id = ?`,
        args: [body.name || null, body.description || null, body.categoryAction || null, body.priority || null, body.is_active ?? null, body.category_id],
      });
      return NextResponse.json({ success: true, message: 'Category updated' });
    }

    // Lookup: check if domain matches any custom category
    if (body.action === 'lookup') {
      const domain = (body.domain || '').toLowerCase().trim();
      if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });
      // Check URL entries
      const urlMatch = await db.execute({
        sql: `SELECT c.*, e.value as matched_value, e.entry_type FROM custom_url_entries e JOIN custom_url_categories c ON e.category_id = c.id WHERE e.entry_type = 'url' AND (e.value = ? OR ? LIKE '%.' || e.value) AND c.is_active = 1 ORDER BY c.priority ASC LIMIT 5`,
        args: [domain, domain],
      });
      // Check keyword entries
      const kwMatch = await db.execute({
        sql: `SELECT c.*, e.value as matched_keyword FROM custom_url_entries e JOIN custom_url_categories c ON e.category_id = c.id WHERE e.entry_type = 'keyword' AND ? LIKE '%' || e.value || '%' AND c.is_active = 1 ORDER BY c.priority ASC LIMIT 5`,
        args: [domain],
      });
      return NextResponse.json({
        domain,
        urlMatches: urlMatch.rows,
        keywordMatches: kwMatch.rows,
        hasMatch: urlMatch.rows.length > 0 || kwMatch.rows.length > 0,
        effectiveAction: urlMatch.rows[0]?.action || kwMatch.rows[0]?.action || null,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use: create_category, add_entries, delete_category, remove_entry, update_category, lookup' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
