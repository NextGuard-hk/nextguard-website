// lib/dga-detector.ts
// P2-2: Domain Generation Algorithm (DGA) Detection
// Tier 1 feature: detect algorithmically generated domains (like PAN-DB/Zscaler)
// Uses entropy analysis, n-gram frequency, consonant ratio, and length heuristics

const COMMON_BIGRAMS = new Set([
  'th','he','in','er','an','re','on','at','en','nd','ti','es','or','te','of',
  'ed','is','it','al','ar','st','to','nt','ng','se','ha','as','ou','io','le',
  've','co','me','de','hi','ri','ro','ic','ne','ea','ra','ce','li','ch','ll',
  'be','ma','si','om','ur'
])

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {}
  for (const c of s) freq[c] = (freq[c] || 0) + 1
  let entropy = 0
  const len = s.length
  for (const count of Object.values(freq)) {
    const p = count / len
    entropy -= p * Math.log2(p)
  }
  return entropy
}

function consonantRatio(s: string): number {
  const vowels = new Set(['a','e','i','o','u'])
  let consonants = 0
  let alpha = 0
  for (const c of s.toLowerCase()) {
    if (/[a-z]/.test(c)) {
      alpha++
      if (!vowels.has(c)) consonants++
    }
  }
  return alpha > 0 ? consonants / alpha : 0
}

function bigramScore(s: string): number {
  if (s.length < 2) return 0
  let matches = 0
  let total = 0
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2).toLowerCase()
    if (/^[a-z]{2}$/.test(bg)) {
      total++
      if (COMMON_BIGRAMS.has(bg)) matches++
    }
  }
  return total > 0 ? matches / total : 0
}

function digitRatio(s: string): number {
  let digits = 0
  for (const c of s) if (/\d/.test(c)) digits++
  return s.length > 0 ? digits / s.length : 0
}

function hasRepeatingPatterns(s: string): boolean {
  // Check for repeating 2-4 char patterns (common in DGA)
  for (let pLen = 2; pLen <= 4; pLen++) {
    for (let i = 0; i <= s.length - pLen * 3; i++) {
      const pattern = s.slice(i, i + pLen)
      let repeats = 0
      for (let j = i + pLen; j <= s.length - pLen; j += pLen) {
        if (s.slice(j, j + pLen) === pattern) repeats++
        else break
      }
      if (repeats >= 2) return true
    }
  }
  return false
}

export interface DGAResult {
  isDGA: boolean
  confidence: number
  score: number
  factors: string[]
}

export function detectDGA(domain: string): DGAResult {
  // Extract the registrable part (remove TLD)
  const parts = domain.toLowerCase().split('.')
  const label = parts.length >= 2 ? parts.slice(0, -1).join('') : parts[0]

  const factors: string[] = []
  let score = 0

  // 1. Length check
  if (label.length > 20) { score += 15; factors.push(`long-label:${label.length}`) }
  if (label.length > 30) { score += 15; factors.push('very-long-label') }

  // 2. Shannon entropy (DGA domains typically have high entropy)
  const entropy = shannonEntropy(label)
  if (entropy > 3.5) { score += 25; factors.push(`high-entropy:${entropy.toFixed(2)}`) }
  else if (entropy > 3.0) { score += 10; factors.push(`elevated-entropy:${entropy.toFixed(2)}`) }

  // 3. Consonant ratio (DGA often has unnatural consonant clusters)
  const cr = consonantRatio(label)
  if (cr > 0.8) { score += 20; factors.push(`high-consonant-ratio:${cr.toFixed(2)}`) }
  else if (cr > 0.7) { score += 10; factors.push(`elevated-consonant-ratio:${cr.toFixed(2)}`) }

  // 4. Bigram frequency (legitimate domains use common bigrams)
  const bg = bigramScore(label)
  if (bg < 0.1) { score += 20; factors.push(`low-bigram-score:${bg.toFixed(2)}`) }
  else if (bg < 0.2) { score += 10; factors.push(`below-avg-bigram:${bg.toFixed(2)}`) }

  // 5. Digit ratio
  const dr = digitRatio(label)
  if (dr > 0.4) { score += 15; factors.push(`high-digit-ratio:${dr.toFixed(2)}`) }
  else if (dr > 0.25) { score += 8; factors.push(`elevated-digit-ratio:${dr.toFixed(2)}`) }

  // 6. Hex-like patterns (common in DGA)
  if (/^[0-9a-f]{8,}$/.test(label)) { score += 30; factors.push('hex-pattern') }

  // 7. No vowels in long strings
  if (label.length > 6 && !/[aeiou]/i.test(label)) { score += 25; factors.push('no-vowels') }

  // 8. Repeating patterns
  if (hasRepeatingPatterns(label)) { score += 10; factors.push('repeating-patterns') }

  const cappedScore = Math.min(score, 100)
  const isDGA = cappedScore >= 50
  const confidence = isDGA ? Math.min(cappedScore + 10, 99) : 100 - cappedScore

  return { isDGA, confidence, score: cappedScore, factors }
}
