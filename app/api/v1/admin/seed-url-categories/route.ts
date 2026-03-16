import { NextRequest, NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

// Admin API: Seed URL categories into Turso DB
// POST: bulk insert domain->category mappings
// GET: stats on current DB categories

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'nextguard-admin-2024';

function checkAuth(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key') || request.nextUrl.searchParams.get('key');
  return key === ADMIN_KEY;
}

// Known UT1/Shallalist category mappings to our taxonomy
const CATEGORY_MAP: Record<string, string> = {
  'adult': 'Adult',
  'porn': 'Adult',
  'aggressive': 'Violence',
  'agressif': 'Violence',
  'audio-video': 'Video Streaming',
  'bank': 'Finance',
  'banking': 'Finance',
  'blog': 'Blog',
  'chat': 'Instant Messaging',
  'dating': 'Dating',
  'downloads': 'Software Downloads',
  'drugs': 'Drugs',
  'education': 'Education',
  'finance': 'Finance',
  'fortunetelling': 'Entertainment',
  'forum': 'Forums',
  'gambling': 'Gambling',
  'games': 'Online Gaming',
  'government': 'Government',
  'hacking': 'Hacking',
  'hobby': 'Hobby & Interests',
  'hospitals': 'Healthcare',
  'imagehosting': 'Image Hosting',
  'isp': 'ISP',
  'jobsearch': 'Job Search',
  'library': 'Education',
  'malware': 'Malware',
  'manga': 'Entertainment',
  'military': 'Government',
  'models': 'Adult',
  'movies': 'Entertainment',
  'music': 'Music & Audio',
  'news': 'News',
  'phishing': 'Phishing',
  'podcasts': 'Podcasts',
  'politics': 'Politics',
  'proxy': 'Anonymous Proxy',
  'radio': 'Music & Audio',
  'reaffected': 'Uncategorized',
  'recipes': 'Food & Cooking',
  'redirector': 'URL Shortener',
  'religion': 'Religion',
  'remote-control': 'Remote Access',
  'ringtones': 'Entertainment',
  'science': 'Science',
  'searchengines': 'Search Engines',
  'sex': 'Adult',
  'lingerie': 'Adult',
  'shopping': 'Shopping',
  'social_networks': 'Social Networking',
  'socialnet': 'Social Networking',
  'spyware': 'Spyware',
  'sports': 'Sports',
  'tracker': 'Web Analytics',
  'translate': 'Translation',
  'travel': 'Travel',
  'updatesites': 'Software Updates',
  'warez': 'Warez',
  'weapons': 'Weapons',
  'webmail': 'Web-based Email',
  'webphone': 'VoIP',
  'webradio': 'Music & Audio',
  'webtv': 'Video Streaming',
  'vpn': 'VPN',
  'cryptocurrency': 'Cryptocurrency',
  'filehosting': 'Cloud Storage',
  'marketingware': 'Advertising',
  'mixed_adult': 'Adult',
  'sect': 'Cults',
  'bitcoin': 'Cryptocurrency',
};

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await initDB();
    const db = getDB();
    const stats = await db.execute(
      'SELECT category, COUNT(*) as count FROM url_categories GROUP BY category ORDER BY count DESC'
    );
    const total = await db.execute('SELECT COUNT(*) as total FROM url_categories');
    return NextResponse.json({
      totalDomains: total.rows[0]?.total || 0,
      categories: stats.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await initDB();
    const db = getDB();
    const body = await request.json();
    
    // Support multiple formats:
    // 1. { entries: [{domain, category}] } — direct insert
    // 2. { category: "adult", domains: ["example.com", ...] } — bulk per category
    // 3. { ut1_data: { category_name: ["domain1", ...] } } — UT1 format
    
    let inserted = 0;
    let skipped = 0;

    if (body.entries && Array.isArray(body.entries)) {
      for (const entry of body.entries) {
        try {
          const cat = CATEGORY_MAP[entry.category?.toLowerCase()] || entry.category;
          await db.execute({
            sql: 'INSERT OR REPLACE INTO url_categories (domain, category, source) VALUES (?, ?, ?)',
            args: [entry.domain.toLowerCase().trim(), cat, entry.source || 'api'],
          });
          inserted++;
        } catch { skipped++; }
      }
    }

    if (body.category && Array.isArray(body.domains)) {
      const cat = CATEGORY_MAP[body.category.toLowerCase()] || body.category;
      const source = body.source || 'api';
      for (const domain of body.domains) {
        try {
          await db.execute({
            sql: 'INSERT OR REPLACE INTO url_categories (domain, category, source) VALUES (?, ?, ?)',
            args: [domain.toLowerCase().trim(), cat, source],
          });
          inserted++;
        } catch { skipped++; }
      }
    }

    if (body.ut1_data && typeof body.ut1_data === 'object') {
      for (const [catKey, domains] of Object.entries(body.ut1_data)) {
        if (!Array.isArray(domains)) continue;
        const cat = CATEGORY_MAP[catKey.toLowerCase()] || catKey;
        for (const domain of domains) {
          try {
            await db.execute({
              sql: 'INSERT OR REPLACE INTO url_categories (domain, category, source) VALUES (?, ?, ?)',
              args: [(domain as string).toLowerCase().trim(), cat, 'ut1'],
            });
            inserted++;
          } catch { skipped++; }
        }
      }
    }

    // Also support seeding popular domains with known categories
    if (body.seed_popular) {
      const popular: Record<string, string[]> = {
        'Adult': ['pornhub.com','xvideos.com','xnxx.com','xhamster.com','redtube.com','youporn.com','tube8.com','brazzers.com','chaturbate.com','onlyfans.com','livejasmin.com','stripchat.com','bongacams.com'],
        'Gambling': ['bet365.com','pokerstars.com','betway.com','888casino.com','draftkings.com','fanduel.com','williamhill.com','paddypower.com','betfair.com','unibet.com','bwin.com','ladbrokes.com','bovada.lv'],
        'Social Networking': ['facebook.com','instagram.com','twitter.com','x.com','tiktok.com','snapchat.com','linkedin.com','reddit.com','pinterest.com','tumblr.com','threads.net','mastodon.social'],
        'Video Streaming': ['youtube.com','netflix.com','twitch.tv','hulu.com','disneyplus.com','hbomax.com','peacocktv.com','paramountplus.com','crunchyroll.com','vimeo.com','dailymotion.com','bilibili.com'],
        'News': ['cnn.com','bbc.com','nytimes.com','washingtonpost.com','reuters.com','apnews.com','foxnews.com','theguardian.com','bloomberg.com','cnbc.com','aljazeera.com'],
        'Shopping': ['amazon.com','ebay.com','walmart.com','aliexpress.com','etsy.com','shopify.com','target.com','bestbuy.com','costco.com','wayfair.com','wish.com'],
        'Search Engines': ['google.com','bing.com','yahoo.com','duckduckgo.com','baidu.com','yandex.com','brave.com'],
        'Cloud Storage': ['drive.google.com','dropbox.com','onedrive.live.com','icloud.com','box.com','mega.nz','mediafire.com','wetransfer.com'],
        'Finance': ['paypal.com','chase.com','bankofamerica.com','wellsfargo.com','citi.com','hsbc.com','barclays.com','revolut.com','wise.com','venmo.com','stripe.com'],
        'Cryptocurrency': ['coinbase.com','binance.com','kraken.com','crypto.com','blockchain.com','metamask.io','uniswap.org','opensea.io'],
        'Malware': ['malware-traffic-analysis.net'],
        'Phishing': [],
        'Dating': ['tinder.com','bumble.com','match.com','okcupid.com','hinge.co','grindr.com','pof.com','eharmony.com','zoosk.com'],
        'VPN': ['nordvpn.com','expressvpn.com','surfshark.com','protonvpn.com','cyberghostvpn.com','privateinternetaccess.com','mullvad.net','windscribe.com'],
        'Online Gaming': ['steampowered.com','epicgames.com','ea.com','blizzard.com','roblox.com','minecraft.net','leagueoflegends.com','playstation.com','xbox.com'],
        'Hacking': ['kali.org','exploit-db.com','hackthebox.com','shodan.io','metasploit.com'],
        'Education': ['coursera.org','edx.org','udemy.com','khanacademy.org','mit.edu','harvard.edu','stanford.edu','oxford.ac.uk'],
        'Healthcare': ['webmd.com','mayoclinic.org','nih.gov','who.int','cdc.gov','healthline.com','medlineplus.gov'],
        'Government': ['usa.gov','gov.uk','canada.ca','europa.eu','un.org'],
        'Travel': ['booking.com','airbnb.com','expedia.com','tripadvisor.com','kayak.com','skyscanner.com','hotels.com','agoda.com'],
        'Instant Messaging': ['web.whatsapp.com','telegram.org','discord.com','signal.org','slack.com','teams.microsoft.com','wechat.com','line.me'],
        'Web-based Email': ['mail.google.com','outlook.live.com','mail.yahoo.com','protonmail.com','zoho.com','tutanota.com'],
        'Advertising': ['doubleclick.net','googlesyndication.com','googleadservices.com','facebook.com/ads','adsense.google.com'],
        'Anonymous Proxy': ['torproject.org','hide.me','hidemyass.com','proxynova.com'],
      };
      for (const [cat, domains] of Object.entries(popular)) {
        for (const domain of domains) {
          try {
            await db.execute({
              sql: 'INSERT OR REPLACE INTO url_categories (domain, category, source) VALUES (?, ?, ?)',
              args: [domain.toLowerCase(), cat, 'seed-popular'],
            });
            inserted++;
          } catch { skipped++; }
        }
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      message: `Seeded ${inserted} domains (${skipped} skipped)`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
