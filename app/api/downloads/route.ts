import { NextRequest, NextResponse } from "next/server"
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { cookies } from "next/headers"

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
  const c = req.cookies.get("admin_session")
  return c?.value === "authenticated"
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get("action")
  const pw = searchParams.get("pw")

  // List files - requires password or admin
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

  // Download file - requires password or admin
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

  // Upload URL - admin only
  if (action === "upload-url") {
    if (!isAdmin(req)) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const key = searchParams.get("key")
    const contentType = searchParams.get("contentType") || "application/octet-stream"
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })
    try {
      const url = await getSignedUrl(S3, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn: 3600 })
      return NextResponse.json({ url })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin only" }, { status: 403 })
  try {
    const { key } = await req.json()
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 })
    await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
