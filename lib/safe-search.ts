// lib/safe-search.ts
// Safe Search Enforcement Engine for NextGuard
// Forces strict safe search on Google, Bing, YouTube, DuckDuckGo, Yahoo, Yandex

export interface SafeSearchConfig {
  enabled: boolean
  engines: {
    google: boolean
    bing: boolean
    youtube: boolean
    duckduckgo: boolean
    yahoo: boolean
    yandex: boolean
  }
  enforceMode: 'strict' | 'moderate'
  blockOnBypass: boolean // block if user tries to disable safe search
}

export const DEFAULT_SAFE_SEARCH_CONFIG: SafeSearchConfig = {
  enabled: true,
  engines: { google: true, bing: true, youtube: true, duckduckgo: true, yahoo: true, yandex: true },
  enforceMode: 'strict',
  blockOnBypass: true
}

// Safe Search parameter enforcement rules per search engine
export interface SafeSearchRule {
  engine: string
  domains: string[]
  enforceParams: Record<string, string> // params to force
  restrictDomain?: string // domain rewrite (e.g. forcesafesearch.google.com)
  disableIndicators: string[] // params that indicate user is disabling safe search
}

export const SAFE_SEARCH_RULES: SafeSearchRule[] = [
  {
    engine: 'google',
    domains: ['google.com', 'google.com.hk', 'google.co.jp', 'google.co.uk', 'google.com.au', 'google.com.tw', 'google.com.sg', 'google.co.kr', 'google.de', 'google.fr', 'google.ca', 'google.com.br', 'google.co.in'],
    enforceParams: { safe: 'active' },
    restrictDomain: 'forcesafesearch.google.com',
    disableIndicators: ['safe=off', 'safe=images']
  },
  {
    engine: 'bing',
    domains: ['bing.com', 'www.bing.com', 'cn.bing.com'],
    enforceParams: { adlt: 'strict' },
    restrictDomain: 'strict.bing.com',
    disableIndicators: ['adlt=off', 'adlt=moderate']
  },
  {
    engine: 'youtube',
    domains: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    enforceParams: {},
    restrictDomain: 'restrict.youtube.com',
    disableIndicators: []
  },
  {
    engine: 'duckduckgo',
    domains: ['duckduckgo.com'],
    enforceParams: { kp: '1' },
    disableIndicators: ['kp=-1', 'kp=-2']
  },
  {
    engine: 'yahoo',
    domains: ['search.yahoo.com', 'yahoo.com'],
    enforceParams: { vm: 'r' },
    disableIndicators: ['vm=p']
  },
  {
    engine: 'yandex',
    domains: ['yandex.com', 'yandex.ru'],
    enforceParams: { fyandex: '1' },
    disableIndicators: ['fyandex=0']
  }
]

// Check if a URL is a search engine and determine safe search status
export function analyzeSafeSearch(url: string, config: SafeSearchConfig = DEFAULT_SAFE_SEARCH_CONFIG): {
  isSearchEngine: boolean
  engine: string | null
  rule: SafeSearchRule | null
  needsEnforcement: boolean
  isBypassAttempt: boolean
  enforcedUrl: string | null
  restrictDomain: string | null
} {
  if (!config.enabled) return { isSearchEngine: false, engine: null, rule: null, needsEnforcement: false, isBypassAttempt: false, enforcedUrl: null, restrictDomain: null }

  let parsed: URL
  try {
    let u = url.toLowerCase().trim()
    if (!u.startsWith('http')) u = 'https://' + u
    parsed = new URL(u)
  } catch {
    return { isSearchEngine: false, engine: null, rule: null, needsEnforcement: false, isBypassAttempt: false, enforcedUrl: null, restrictDomain: null }
  }

  const hostname = parsed.hostname.replace(/^www\./, '')

  for (const rule of SAFE_SEARCH_RULES) {
    const engineEnabled = config.engines[rule.engine as keyof typeof config.engines]
    if (!engineEnabled) continue

    const matchesDomain = rule.domains.some(d => {
      const cleanD = d.replace(/^www\./, '')
      return hostname === cleanD || hostname.endsWith('.' + cleanD)
    })

    if (!matchesDomain) continue

    // Check if user is trying to bypass safe search
    const fullUrl = parsed.toString()
    const isBypassAttempt = rule.disableIndicators.some(ind => fullUrl.includes(ind))

    // Check if safe search params are already enforced
    let alreadyEnforced = true
    for (const [key, val] of Object.entries(rule.enforceParams)) {
      if (parsed.searchParams.get(key) !== val) { alreadyEnforced = false; break }
    }

    const needsEnforcement = !alreadyEnforced || isBypassAttempt

    // Build enforced URL
    let enforcedUrl: string | null = null
    if (needsEnforcement) {
      const enforced = new URL(parsed.toString())
      // Apply safe search params
      for (const [key, val] of Object.entries(rule.enforceParams)) {
        enforced.searchParams.set(key, val)
      }
      // Remove bypass params
      rule.disableIndicators.forEach(ind => {
        const [key] = ind.split('=')
        if (key && rule.enforceParams[key]) {
          enforced.searchParams.set(key, rule.enforceParams[key])
        }
      })
      enforcedUrl = enforced.toString()
    }

    return {
      isSearchEngine: true,
      engine: rule.engine,
      rule,
      needsEnforcement,
      isBypassAttempt,
      enforcedUrl,
      restrictDomain: rule.restrictDomain || null
    }
  }

  return { isSearchEngine: false, engine: null, rule: null, needsEnforcement: false, isBypassAttempt: false, enforcedUrl: null, restrictDomain: null }
}

// Generate DNS-level safe search enforcement records
export function getSafeSearchDNSRecords(config: SafeSearchConfig = DEFAULT_SAFE_SEARCH_CONFIG): Array<{ domain: string; cname: string; engine: string }> {
  const records: Array<{ domain: string; cname: string; engine: string }> = []
  if (!config.enabled) return records

  for (const rule of SAFE_SEARCH_RULES) {
    const engineEnabled = config.engines[rule.engine as keyof typeof config.engines]
    if (!engineEnabled || !rule.restrictDomain) continue

    for (const domain of rule.domains) {
      records.push({ domain, cname: rule.restrictDomain, engine: rule.engine })
    }
  }
  return records
}

// Generate PAC file snippet for safe search enforcement
export function getSafeSearchPACRules(config: SafeSearchConfig = DEFAULT_SAFE_SEARCH_CONFIG): string {
  if (!config.enabled) return ''
  const lines: string[] = []
  for (const rule of SAFE_SEARCH_RULES) {
    const engineEnabled = config.engines[rule.engine as keyof typeof config.engines]
    if (!engineEnabled || !rule.restrictDomain) continue
    for (const domain of rule.domains) {
      lines.push(`  if (dnsDomainIs(host, "${domain}")) return "PROXY ${rule.restrictDomain}:443";`)
    }
  }
  return lines.join('\n')
}
