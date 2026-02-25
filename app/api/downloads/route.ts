import { NextRequest, NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const BUCKET = "nextguard-downloads"
const DOWNLOAD_PASSWORD = process.env.DOWNLOAD_PASSWORD || "NextGuard123"

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
})

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get("contact_admin_token")
  return token?.value === sessionSecret
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get("action")
  const pw = searchParams.get("pw")

  if (!action || action === "list") {
    if (pw !== DOWNLOAD_PASSWORD && !isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    try {
      const prefix = searchParams.get("prefix") || ""
      const data = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, Delimiter: "/" }))
      const folders = (data.CommonPrefixes || []).map(p => ({
        name: p.Prefix?.replace(prefix, "").replace(/\/$/, "") || "",
        path: p.Prefix || "",
        type: "folder" as const,
      }))
      const files = (data.Contents || []).filter(f => f.Key !== prefix).map(f => ({
        name: f.Key?.replace(prefix, "") || "",
        path: f.Key || "",
        size: f.Size || 0,
        lastModified: f.LastModified?.toISOString() || "",
        type: "file" as const,
      }))
      return NextResponse.json({ items: [...folders, ...files] })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  if (action === "download") {
    if (pw !== DOWNLOAD_PASSWORD && !isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    try {
      const key = searchParams.get("key")
      if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })
      const url = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 })
      return NextResponse.json({ url })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const key = formData.get("key") as string | null
    if (!file || !key) {
      return NextResponse.json({ error: "Missing file or key" }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    await S3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    }))
    return NextResponse.json({ success: true, key })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin only" }, { status: 403 })
  try {
    const { key } = await req.json()
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })

    // If key ends with "/", it's a folder - delete all objects under it
    if (key.endsWith("/")) {
      let continuationToken: string | undefined
      let deleted = 0
      do {
        const list = await S3.send(new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: key,
          ContinuationToken: continuationToken,
        }))
        const objects = list.Contents || []
        for (const obj of objects) {
          if (obj.Key) {
            await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }))
            deleted++
          }
        }
        continuationToken = list.NextContinuationToken
      } while (continuationToken)
      return NextResponse.json({ success: true, deleted })
    }

    // Single file delete
    await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
