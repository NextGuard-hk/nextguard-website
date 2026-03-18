// lib/redis.ts - Upstash Redis REST client for L2 cache
// Uses fetch-based REST API (no extra deps needed)

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''

async function redisCmd(...args: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(`${UPSTASH_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.result ?? null
  } catch { return null }
}

export function isRedisConfigured(): boolean {
  return !!(UPSTASH_URL && UPSTASH_TOKEN)
}

// GET with JSON parse
export async function redisGet<T = any>(key: string): Promise<T | null> {
  const val = await redisCmd('GET', key)
  if (!val) return null
  try { return JSON.parse(val) as T } catch { return val as T }
}

// SET with optional TTL (seconds)
export async function redisSet(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  const json = JSON.stringify(value)
  if (ttlSeconds) {
    const r = await redisCmd('SET', key, json, 'EX', String(ttlSeconds))
    return r === 'OK'
  }
  const r = await redisCmd('SET', key, json)
  return r === 'OK'
}

// DEL
export async function redisDel(key: string): Promise<boolean> {
  const r = await redisCmd('DEL', key)
  return r === 1
}

// URL policy cache helpers
const URL_CACHE_PREFIX = 'urlp:'
const CF_CACHE_PREFIX = 'cfin:'
const URL_CACHE_TTL = 300 // 5 min
const CF_CACHE_TTL = 1800 // 30 min

export async function getUrlCache(domain: string): Promise<any | null> {
  return redisGet(`${URL_CACHE_PREFIX}${domain}`)
}

export async function setUrlCache(domain: string, data: any): Promise<void> {
  await redisSet(`${URL_CACHE_PREFIX}${domain}`, data, URL_CACHE_TTL)
}

export async function getCfIntelCache(domain: string): Promise<any | null> {
  return redisGet(`${CF_CACHE_PREFIX}${domain}`)
}

export async function setCfIntelCache(domain: string, data: any): Promise<void> {
  await redisSet(`${CF_CACHE_PREFIX}${domain}`, data, CF_CACHE_TTL)
}
