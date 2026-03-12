// Cloudflare Radar URL Scanner integration
// Docs: https://developers.cloudflare.com/radar/

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const CF_RADAR_BASE = 'https://api.cloudflare.com/client/v4/radar';

// Map Cloudflare Radar content categories to our internal categories
const CF_CATEGORY_MAP: Record<string, string> = {
  // Cloudflare uses numeric IDs or string labels
  'gambling': 'Licensed Gambling',
  'casino': 'Licensed Gambling',
  'betting': 'Licensed Gambling',
  'sports': 'Sports',
  'sports-betting': 'Licensed Gambling',
  'news': 'News & Media',
  'news-and-media': 'News & Media',
  'media': 'News & Media',
  'social-networking': 'Social Media',
  'social-media': 'Social Media',
  'search-engines': 'Search Engine',
  'search': 'Search Engine',
  'technology': 'Technology',
  'software': 'Technology',
  'finance': 'Finance',
  'banking': 'Finance',
  'shopping': 'Shopping',
  'entertainment': 'Entertainment',
  'streaming': 'Video Streaming',
  'video-streaming': 'Video Streaming',
  'adult': 'Adult Content',
  'pornography': 'Adult Content',
  'malware': 'Malware',
  'phishing': 'Phishing',
  'spam': 'Spam',
  'government': 'Government',
  'education': 'Education',
  'health': 'Health',
  'travel': 'Travel',
  'games': 'Gaming',
  'games-gaming': 'Gaming',
};

export interface RadarScanResult {
  domain: string;
  categories: string[];
  rawCategories: string[];
  malicious: boolean;
  phishing: boolean;
  malware: boolean;
  source: 'cloudflare-radar';
  scannedAt: string;
}

function mapCfCategory(cat: string): string {
  const key = cat.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  return CF_CATEGORY_MAP[key] || cat;
}

export async function queryCloudflareRadar(domain: string): Promise<RadarScanResult | null> {
  const apiToken = process.env.CLOUDFLARE_RADAR_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) return null;

  try {
    // Use Cloudflare Radar Domain Details endpoint
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
    const res = await fetch(
      `${CF_RADAR_BASE}/domains/details?domain=${encodeURIComponent(cleanDomain)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.result) return null;

    const details = data.result.details_0 || data.result;
    const rawCategories: string[] = [
      ...(details.categories?.superCategory ? [details.categories.superCategory] : []),
      ...(details.categories?.other || []).map((c: any) => c.name || c),
      ...(details.application?.name ? [details.application.name] : []),
    ].filter(Boolean);

    const categories = [...new Set(rawCategories.map(mapCfCategory))].filter(
      c => c && c !== 'Unknown'
    );

    const isMalicious = details.isIoC === true || details.malicious === true;
    const isPhishing = (rawCategories.some(c => c.toLowerCase().includes('phish')));
    const isMalware = (rawCategories.some(c => c.toLowerCase().includes('malware')));

    return {
      domain: cleanDomain,
      categories: categories.length > 0 ? categories : ['Uncategorized'],
      rawCategories,
      malicious: isMalicious,
      phishing: isPhishing,
      malware: isMalware,
      source: 'cloudflare-radar',
      scannedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Cache Radar results in DB for 30 days
export async function queryAndCacheRadarCategory(
  domain: string,
  db: any
): Promise<string[]> {
  try {
    // Check if we have a recent radar result in DB (< 30 days)
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
    const existing = await db.execute({
      sql: `SELECT category, updated_at FROM url_categories WHERE domain = ? AND source = 'cloudflare-radar' LIMIT 1`,
      args: [cleanDomain],
    });
    if (existing.rows.length > 0) {
      const updatedAt = new Date(existing.rows[0].updated_at as string);
      const ageMs = Date.now() - updatedAt.getTime();
      if (ageMs < 30 * 24 * 60 * 60 * 1000) {
        // Return all radar categories for this domain
        const all = await db.execute({
          sql: `SELECT category FROM url_categories WHERE domain = ? AND source = 'cloudflare-radar'`,
          args: [cleanDomain],
        });
        return all.rows.map((r: any) => r.category as string);
      }
    }

    // Query Cloudflare Radar
    const result = await queryCloudflareRadar(cleanDomain);
    if (!result || result.categories.length === 0) return [];
    if (result.categories[0] === 'Uncategorized') return [];

    // Save to DB (delete old radar entries first)
    await db.execute({
      sql: `DELETE FROM url_categories WHERE domain = ? AND source = 'cloudflare-radar'`,
      args: [cleanDomain],
    });
    for (const cat of result.categories) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_categories (domain, category, source) VALUES (?, ?, 'cloudflare-radar')`,
        args: [cleanDomain, cat],
      });
    }

    return result.categories;
  } catch {
    return [];
  }
}
