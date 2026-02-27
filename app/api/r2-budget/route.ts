import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const BUCKET = 'nextguard-downloads'
const LOG_NPOINT_URL = process.env.NPOINT_LOGS_URL || ''

// R2 Pricing (as of 2024)
const R2_MONTHLY_BUDGET_USD = 200
const R2_STORAGE_PRICE_PER_GB = 0.015
const R2_CLASS_A_PRICE_PER_MILLION = 4.50
const R2_CLASS_B_PRICE_PER_MILLION = 0.36
const R2_FREE_CLASS_A = 1_000_000
const R2_FREE_CLASS_B = 10_000_000
const R2_FREE_STORAGE_GB = 10

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function GET(req: NextRequest) {
    // Auth: admin cookie or download password required
    const sessionSecret = process.env.CONTACT_SESSION_SECRET
    const adminToken = req.cookies.get('contact_admin_token')
    const isAdmin = sessionSecret && adminToken?.value === sessionSecret
    const pw = req.nextUrl.searchParams.get('pw')
    const hasPw = pw && pw === (process.env.DOWNLOAD_PASSWORD || '')
    if (!isAdmin && !hasPw) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  try {
    // 1. Calculate storage
    let totalBytes = 0
    let totalObjects = 0
    let token: string | undefined
    do {
      const list = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }))
      for (const obj of list.Contents || []) {
        totalBytes += obj.Size || 0
        totalObjects++
      }
      token = list.NextContinuationToken
    } while (token)

    const storageGB = totalBytes / (1024 * 1024 * 1024)
    const billableGB = Math.max(0, storageGB - R2_FREE_STORAGE_GB)
    const storageCost = Math.round(billableGB * R2_STORAGE_PRICE_PER_GB * 100) / 100

    // 2. Count ops from logs this month
    let downloads = 0, uploads = 0, listCalls = 0
    try {
      const res = await fetch(LOG_NPOINT_URL, { cache: 'no-store' })
      const data = await res.json()
      const logs = data.logs || []
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      for (const log of logs) {
        if (log.timestamp && log.timestamp >= monthStart) {
          if (log.action === 'download' && log.status === 'success') downloads++
          if (log.action === 'upload' && log.status === 'success') uploads++
          if (log.action === 'list') listCalls++
        }
      }
    } catch {}

    // 3. Calculate costs
    const classB = Math.max(0, downloads + listCalls - R2_FREE_CLASS_B)
    const classA = Math.max(0, uploads - R2_FREE_CLASS_A)
    const classBCost = Math.round((classB / 1_000_000) * R2_CLASS_B_PRICE_PER_MILLION * 100) / 100
    const classACost = Math.round((classA / 1_000_000) * R2_CLASS_A_PRICE_PER_MILLION * 100) / 100

    const totalCostUSD = Math.round((storageCost + classACost + classBCost) * 100) / 100
    const budgetRemaining = Math.round((R2_MONTHLY_BUDGET_USD - totalCostUSD) * 100) / 100
    const budgetExceeded = totalCostUSD >= R2_MONTHLY_BUDGET_USD

    return NextResponse.json({
      budgetLimitUSD: R2_MONTHLY_BUDGET_USD,
      totalCostUSD,
      budgetRemaining,
      budgetExceeded,
      breakdown: {
        storageCostUSD: storageCost,
        classACostUSD: classACost,
        classBCostUSD: classBCost,
      },
      usage: {
        storageGB: Math.round(storageGB * 100) / 100,
        totalObjects,
        monthlyDownloads: downloads,
        monthlyUploads: uploads,
        monthlyListCalls: listCalls,
      },
    })
  } catch (e: any) {
    console.error('R2 budget check error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
