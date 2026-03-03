import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getUsers } from '../../../download-users/route'

const BUCKET = 'nextguard-downloads'
const BACKUP_PREFIX = 'project-backups/'
const MAX_BACKUPS = 14 // keep last 14 days

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

async function isAuthenticated(req: NextRequest): boolean {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) return false
    const session = JSON.parse(sessionCookie)
    if (!session.expires || Date.now() > session.expires) return false
    return true
  } catch { return false }
}

// POST - Create backup or restore
export async function POST(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'backup') {
      const { issues, kbSections, activityLogs } = body
      const users = await getUsers()
      const accounts = users.filter((u: any) => u.permissions?.projectAccess).map((u: any) => ({
        id: u.id, name: u.contactName, email: u.email, role: u.role, active: u.active
      }))
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        issues: issues || [],
        kbSections: kbSections || [],
        activityLogs: activityLogs || [],
        accounts,
      }
      const key = `${BACKUP_PREFIX}backup-${timestamp}.json`
      await S3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: JSON.stringify(backupData, null, 2),
        ContentType: 'application/json',
      }))

      // Cleanup old backups beyond MAX_BACKUPS
      const listRes = await S3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: BACKUP_PREFIX,
      }))
      const backups = (listRes.Contents || []).filter(o => o.Key?.endsWith('.json')).sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      if (backups.length > MAX_BACKUPS) {
        const toDelete = backups.slice(MAX_BACKUPS)
        for (const obj of toDelete) {
          if (obj.Key) {
            await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }))
          }
        }
      }
      return NextResponse.json({ success: true, key, backupCount: Math.min(backups.length, MAX_BACKUPS) })
    }

    if (action === 'restore') {
      const { backupKey } = body
      if (!backupKey) return NextResponse.json({ error: 'backupKey required' }, { status: 400 })
      const res = await S3.send(new GetObjectCommand({ Bucket: BUCKET, Key: backupKey }))
      const text = await res.Body?.transformToString()
      if (!text) return NextResponse.json({ error: 'Empty backup' }, { status: 404 })
      const data = JSON.parse(text)
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Backup failed' }, { status: 500 })
  }
}

// GET - List available backups
export async function GET(req: NextRequest) {
  if (!await isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const listRes = await S3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: BACKUP_PREFIX,
    }))
    const backups = (listRes.Contents || [])
      .filter(o => o.Key?.endsWith('.json'))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      .slice(0, MAX_BACKUPS)
      .map(o => ({
        key: o.Key,
        date: o.LastModified?.toISOString(),
        size: o.Size,
      }))
    return NextResponse.json({ backups })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
