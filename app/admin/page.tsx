"use client"
import { useState, useEffect, useRef } from "react"
import IdleTimer from "./IdleTimer"

interface Contact {
  id: string
  fullName: string
  email: string
  company: string
  message: string
  timestamp: string
}

interface Registration {
  id: string
  fullName: string
  email: string
  company: string
  jobTitle: string
  phone: string
  country: string
  attendees: string
  notes: string
  timestamp: string
}

interface FileItem {
  name: string
  path: string
  size?: number
  lastModified?: string
  type: "file" | "folder"
}

interface LogEntry {
  id: string
  timestamp: string
  type: string
  action: string
  ip?: string
  key?: string
  size?: string
  count?: string
  reason?: string
  status?: string
  [k: string]: string | undefined
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [totpLoading, setTotpLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [totpExpiry, setTotpExpiry] = useState(0)
    const [tab, setTab] = useState<"contacts" | "rsvp" | "downloads" | "logs" | "news" | "syslog">("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [rsvps, setRsvps] = useState<Registration[]>([])
  const [dlItems, setDlItems] = useState<FileItem[]>([])
  const [dlPath, setDlPath] = useState("")
  const [dlLoading, setDlLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFileName, setUploadFileName] = useState("")
  const [newFolder, setNewFolder] = useState("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logFilter, setLogFilter] = useState("all")
  const [newsArticles, setNewsArticles] = useState<any[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsFilter, setNewsFilter] = useState<"all"|"pending"|"published">("all")
  const [uploadMode, setUploadMode] = useState<"public" | "internal">("public")
    const [syslogFiles, setSyslogFiles] = useState<any[]>([])
  const [syslogLoading, setSyslogLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
    const [renameItem, setRenameItem] = useState<{path: string; name: string; type: string} | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [moveItem, setMoveItem] = useState<{path: string; name: string; type: string} | null>(null)
  const [moveTarget, setMoveTarget] = useState("")

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    try { const r = await fetch("/api/contact/auth"); if (r.ok) { setIsAuth(true); fetchContacts(); fetchRsvps() } } catch {} finally { setChecking(false) }
  }

  async function sendCode() {
    if (!password) { setError("Enter password first"); return }
    const emailLower = adminEmail.toLowerCase().trim()
    if (!emailLower || (!emailLower.endsWith("@skyguard.com.cn") && !emailLower.endsWith("@next-guard.com"))) { setError("Only @skyguard.com.cn or @next-guard.com emails are allowed"); return }
    setTotpLoading(true); setError(""); setCodeSent(false)
    try {
      const r = await fetch("/api/contact/totp", { headers: { "x-admin-password": password, "x-admin-email": adminEmail.trim() } })
      const d = await r.json()
      if (r.ok) { setCodeSent(true); setTotpExpiry(d.expiresIn) } else setError(d.message || "Failed to send 2FA code")
    } catch { setError("Network error") } finally { setTotpLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true)
    try {
      const r = await fetch("/api/contact/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, totpCode }) })
      const d = await r.json()
      if (r.ok) { setIsAuth(true); fetchContacts(); fetchRsvps() } else setError(d.message || "Login failed")
    } catch { setError("Network error") } finally { setLoading(false) }
  }

  async function fetchContacts() {
    try { const r = await fetch("/api/contact"); if (r.ok) { const d = await r.json(); setContacts(d.contacts || []) } } catch {}
  }

  async function fetchRsvps() {
    try { const r = await fetch("/api/rsvp?password=NextGuard123"); const d = await r.json(); if (d.status === "success") setRsvps(d.registrations || []) } catch {}
  }

  async function fetchDownloads(prefix = "") {
    setDlLoading(true)
    try { const r = await fetch(`/api/downloads?prefix=${encodeURIComponent(prefix)}`); if (r.ok) { const d = await r.json(); setDlItems(d.items || []); setDlPath(prefix) } } catch {} finally { setDlLoading(false) }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
        const MAX_FILE_SIZE = 20 * 1024 * 1024 * 1024 // 20GB limit
    for (let f = 0; f < files.length; f++) {
      if (files[f].size > MAX_FILE_SIZE) {
        alert('File "' + files[f].name + '" exceeds 20GB limit (' + formatSize(files[f].size) + '). Maximum upload size is 20GB per file.')
        return
      }
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadFileName(file.name + (files.length > 1 ? " (" + (i + 1) + "/" + files.length + ")" : ""))
        const key = dlPath + file.name
        const CHUNK_SIZE = 100 * 1024 * 1024 // 100MB per chunk
          if (file.size > CHUNK_SIZE) {
            // Multipart upload for large files
            const createRes = await fetch("/api/downloads?action=multipart-create&key=" + encodeURIComponent(key) + "&contentType=" + encodeURIComponent(file.type || 'application/octet-stream'))
            if (!createRes.ok) throw new Error('Failed to create multipart upload')
            const { uploadId } = await createRes.json()
            const totalParts = Math.ceil(file.size / CHUNK_SIZE)
            const parts: { ETag: string; PartNumber: number }[] = []
            try {
              for (let p = 0; p < totalParts; p++) {
                const start = p * CHUNK_SIZE
                const end = Math.min(start + CHUNK_SIZE, file.size)
                const chunk = file.slice(start, end)
                const partNumber = p + 1
                const presignPartRes = await fetch("/api/downloads?action=multipart-presign&key=" + encodeURIComponent(key) + "&uploadId=" + encodeURIComponent(uploadId) + "&partNumber=" + partNumber)
                if (!presignPartRes.ok) throw new Error('Failed to presign part ' + partNumber)
                const { url: partUrl } = await presignPartRes.json()
                const partRes = await fetch(partUrl, { method: 'PUT', body: chunk })
                if (!partRes.ok) throw new Error('Failed to upload part ' + partNumber)
                const etag = partRes.headers.get('ETag') || ''
                parts.push({ ETag: etag, PartNumber: partNumber })
                setUploadProgress(Math.round(((p + 1) / totalParts) * 100))
              }
              const completeRes = await fetch("/api/downloads?action=multipart-complete&key=" + encodeURIComponent(key) + "&uploadId=" + encodeURIComponent(uploadId) + "&parts=" + encodeURIComponent(JSON.stringify(parts)))
              if (!completeRes.ok) throw new Error('Failed to complete multipart upload')
            } catch (mpErr) {
              await fetch("/api/downloads?action=multipart-abort&key=" + encodeURIComponent(key) + "&uploadId=" + encodeURIComponent(uploadId))
              throw mpErr
            }
          } else {
            // Single PUT for small files
            const presignRes = await fetch("/api/downloads?action=presign-upload&key=" + encodeURIComponent(key) + "&contentType=" + encodeURIComponent(file.type || 'application/octet-stream'))
            if (!presignRes.ok) throw new Error('Failed to get presigned URL')
            const { url } = await presignRes.json()
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest()
              xhr.open('PUT', url)
              xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  setUploadProgress(Math.round((event.loaded / event.total) * 100))
                }
              }
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve()
                else reject(new Error('Upload to R2 failed'))
              }
              xhr.onerror = () => reject(new Error('Upload to R2 failed'))
              xhr.send(file)
            })
          }
        const confirmRes = await fetch("/api/downloads?action=confirm-upload&key=" + encodeURIComponent(key) + "&size=" + file.size)
        const confirmData = await confirmRes.json()
        if (confirmData.virus) { alert("File blocked - virus detected in " + file.name + ": " + confirmData.message); continue }
        if (confirmData.scan) { console.log("Scan result for " + file.name + ": " + confirmData.scan) }
      }
      fetchDownloads(dlPath)
    } catch (e: any) { alert('Upload failed: ' + (e.message || 'Unknown error')) } finally { setUploading(false); setUploadProgress(0); setUploadFileName(""); if (fileInputRef.current) (fileInputRef.current as any).value = "" }
  }

  async function handleDelete(key: string) {
    if (!confirm("Delete " + key + "?")) return
    try { await fetch("/api/downloads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }); fetchDownloads(dlPath) } catch {}
  }

  async function createFolder() {
    if (!newFolder.trim()) return
    const key = dlPath + newFolder.trim() + "/.keep"
    try {
      const presignRes = await fetch("/api/downloads?action=presign-upload&key=" + encodeURIComponent(key) + "&contentType=text/plain")
      if (!presignRes.ok) throw new Error('Failed to get presigned URL')
      const { url } = await presignRes.json()
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: '' })
      await fetch("/api/downloads?action=confirm-upload&key=" + encodeURIComponent(key) + "&size=0")
      setNewFolder(""); fetchDownloads(dlPath)
    } catch {}
  }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function handleDownloadFolder(folderPath: string, folderName: string) {
          try {
                  setUploading(true)
                  setUploadFileName('Preparing download: ' + folderName + '...')
                  setUploadProgress(0)
                  const listRes = await fetch('/api/downloads?action=list-recursive&prefix=' + encodeURIComponent(folderPath))
                  const listData = await listRes.json()
                  const files = listData.files || []
                  if (files.length === 0) { alert('No files in folder'); return }
                  if (!(window as any).JSZip) {
                            await new Promise((res: any, rej: any) => {
                                        const s = document.createElement('script')
                                        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
                                        s.onload = () => res(null)
                                        s.onerror = () => rej(new Error('Failed to load JSZip'))
                                        document.head.appendChild(s)
                                      })
                          }
                  const JSZip = (window as any).JSZip
                  const zip = new JSZip()
                  for (let i = 0; i < files.length; i++) {
                            const f = files[i]
                            setUploadFileName('Downloading: ' + f.key.replace(folderPath, ''))
                            setUploadProgress(Math.round(((i + 0.5) / files.length) * 100))
                            const resp = await fetch(f.url)
                            const blob = await resp.blob()
                            zip.file(f.key.replace(folderPath, ''), blob)
                          }
                  setUploadFileName('Creating ZIP...')
                  setUploadProgress(95)
                  const content = await zip.generateAsync({ type: 'blob' })
                  const url = URL.createObjectURL(content)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = folderName + '.zip'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e: any) { alert('Download failed: ' + e.message) }
          finally { setUploading(false); setUploadProgress(0); setUploadFileName('') }
        }

  async function fetchLogs() {
    setLogsLoading(true)
    try { const r = await fetch("/api/logs"); if (r.ok) { const d = await r.json(); setLogs(d.logs || []) } } catch {} finally { setLogsLoading(false) }
  }

  async function fetchNews() {
    setNewsLoading(true)
    try {
      const r = await fetch("/api/news-feed/collect?secret=nextguard-collect-2024")
      const collectData = await r.json()
      const nr = await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa")
      if (nr.ok) {
        const data = await nr.json()
        setNewsArticles(data.articles || [])
      }
    } catch {} finally { setNewsLoading(false) }
  }

  async function updateNewsStatus(id: string, status: string) {
    try {
      const r = await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa")
      const data = await r.json()
      const articles = (data.articles || []).map((a: any) => a.id === id ? { ...a, status } : a)
      await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articles }) })
      setNewsArticles(articles)
    } catch {}
  }

  async function publishAllPending() {
    try {
      const r = await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa")
      const data = await r.json()
      const articles = (data.articles || []).map((a: any) => a.status === "pending" ? { ...a, status: "published" } : a)
      await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articles }) })
      setNewsArticles(articles)
    } catch {}
  }

  async function deleteNewsArticle(id: string) {
    if (!confirm("Delete this article?")) return
    try {
      const r = await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa")
      const data = await r.json()
      const articles = (data.articles || []).filter((a: any) => a.id !== id)
      await fetch("https://api.npoint.io/ea9aac6e3aff30bb0dfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articles }) })
      setNewsArticles(articles)
    } catch {}
  }

  async function handleLogout() {
    await fetch("/api/contact/auth", { method: "DELETE" })
    setIsAuth(false); setContacts([]); setRsvps([]); setPassword(""); setTotpCode(""); setAdminEmail("")
  }

  async function triggerCollect() {
    setNewsLoading(true)
    try {
      const r = await fetch('/api/news-feed/collect', { method: 'POST' })
      if (r.ok) { await fetchNews() }
    } catch {} finally { setNewsLoading(false) }
  }

    async function fetchSyslogFiles() {
    setSyslogLoading(true)
    try {
      const r = await fetch('/api/syslog-analysis?action=list-files')
      if (r.ok) { const d = await r.json(); setSyslogFiles(d.items || []) }
    } catch {} finally { setSyslogLoading(false) }
  }

  async function analyzeSyslog(filePath: string) {
    setAnalyzing(true); setAnalysisResult(null)
    try {
      const r = await fetch('/api/syslog-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath }) })
      const d = await r.json()
      if (r.ok) { setAnalysisResult(d.analysis); alert("Analysis complete: " + d.analysis.totalEvents + " events - " + d.analysis.falsePositives + " FP, " + d.analysis.truePositives + " TP, " + d.analysis.needsReview + " needs review") }
      else alert('Analysis failed: ' + (d.error || 'Unknown error'))
    } catch (e: any) { alert('Analysis error: ' + e.message) }
    finally { setAnalyzing(false) }
  }

  function dlGoUp() {
    const parts = dlPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    fetchDownloads(parts.length > 0 ? parts.join("/") + "/" : "")
  }

    async function handleRename() {
    if (!renameItem || !renameValue.trim()) return
    try {
      const oldPath = renameItem.path
      let newPath: string
      if (renameItem.type === 'folder') {
        const parentPath = oldPath.replace(/[^/]+\/$/, '')
        const newFolderPath = parentPath + renameValue.trim() + '/'
        const r = await fetch('/api/downloads?action=move-folder&oldPrefix=' + encodeURIComponent(oldPath) + '&newPrefix=' + encodeURIComponent(newFolderPath))
        if (!r.ok) throw new Error('Rename folder failed')
      } else {
        const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/') + 1)
        newPath = parentPath + renameValue.trim()
        const r = await fetch('/api/downloads?action=rename&oldKey=' + encodeURIComponent(oldPath) + '&newKey=' + encodeURIComponent(newPath))
        if (!r.ok) throw new Error('Rename failed')
      }
      setRenameItem(null)
      setRenameValue('')
      fetchDownloads(dlPath)
    } catch (e: any) { alert('Rename failed: ' + e.message) }
  }

  async function handleMove() {
    if (!moveItem || !moveTarget.trim()) return
    try {
      if (moveItem.type === 'folder') {
        const newPrefix = moveTarget.trim().replace(/\/$/, '') + '/' + moveItem.name + '/'
        const r = await fetch('/api/downloads?action=move-folder&oldPrefix=' + encodeURIComponent(moveItem.path) + '&newPrefix=' + encodeURIComponent(newPrefix))
        if (!r.ok) throw new Error('Move folder failed')
      } else {
        const newKey = moveTarget.trim().replace(/\/$/, '') + '/' + moveItem.name
        const r = await fetch('/api/downloads?action=rename&oldKey=' + encodeURIComponent(moveItem.path) + '&newKey=' + encodeURIComponent(newKey))
        if (!r.ok) throw new Error('Move failed')
      }
      setMoveItem(null)
      setMoveTarget('')
      fetchDownloads(dlPath)
    } catch (e: any) { alert('Move failed: ' + e.message) }
  }

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l: any) => l.type === logFilter)

  if (checking) return (<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><p className="text-zinc-400">Checking authentication...</p></div>)

  if (!isAuth) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
        <p className="text-zinc-400 mb-6">NextGuard Admin Dashboard</p>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
        {codeSent && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 text-green-400 text-sm">Verification code sent to {adminEmail.trim()}.</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter admin password" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email Address <span className="text-zinc-500">(@skyguard.com.cn or @next-guard.com)</span></label>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="your.name@next-guard.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">2FA Code</label>
            <div className="flex gap-2">
              <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="6-digit code" maxLength={6} required />
              <button type="button" onClick={sendCode} disabled={totpLoading} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2.5 rounded-lg text-sm disabled:opacity-50">{totpLoading ? "..." : "Send Code"}</button>
            </div>
            {totpExpiry > 0 && <p className="text-xs text-zinc-500 mt-1">Code expires in {totpExpiry}s</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{loading ? "Authenticating..." : "Login"}</button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 pt-24">
      <IdleTimer onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={() => { fetchContacts(); fetchRsvps(); if (tab === "downloads") fetchDownloads(dlPath); if (tab === "logs") fetchLogs() }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
            <button onClick={handleLogout} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm">Logout</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab("contacts")} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "contacts" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>Contacts ({contacts.length})</button>
          <button onClick={() => setTab("rsvp")} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "rsvp" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>RSVP ({rsvps.length})</button>
          <button onClick={() => { setTab("downloads"); fetchDownloads(uploadMode + "/") }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "downloads" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>Uploads</button>
          <button onClick={() => { setTab("logs"); fetchLogs() }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "logs" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>Logs</button>
          <button onClick={() => { setTab("news"); fetchNews() }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "news" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>News</button>
                          <button onClick={() => { setTab("syslog"); fetchSyslogFiles() }} className={"px-4 py-2 rounded-md text-sm font-medium transition-colors " + (tab === "syslog" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white")}>Syslog</button>
        </div>

        {tab === "contacts" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/contact?format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead><tr className="text-zinc-400 border-b border-zinc-800"><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Company</th><th className="pb-3 pr-4">Message</th><th className="pb-3">Date</th></tr></thead>
                <tbody>{contacts.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-zinc-500">No contacts yet</td></tr> : contacts.slice().reverse().map((c: any) => (<tr key={c.id} className="border-b border-zinc-800/50"><td className="py-3 pr-4 text-white">{c.fullName}</td><td className="py-3 pr-4 text-cyan-400">{c.email}</td><td className="py-3 pr-4 text-zinc-300">{c.company || "-"}</td><td className="py-3 pr-4 text-zinc-400 max-w-xs truncate">{c.message}</td><td className="py-3 text-zinc-500">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "-"}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "rsvp" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/rsvp?password=NextGuard123&format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead><tr className="text-zinc-400 border-b border-zinc-800"><th className="pb-3 pr-4">#</th><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Company</th><th className="pb-3 pr-4">Job Title</th><th className="pb-3 pr-4">Phone</th><th className="pb-3 pr-4">Country</th><th className="pb-3 pr-4">Attendees</th><th className="pb-3">Date</th></tr></thead>
                <tbody>{rsvps.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-zinc-500">No RSVPs yet</td></tr> : rsvps.map((r: any, i: number) => (<tr key={r.id || i} className="border-b border-zinc-800/50"><td className="py-3 pr-4 text-zinc-500">{i + 1}</td><td className="py-3 pr-4 text-white">{r.fullName}</td><td className="py-3 pr-4 text-cyan-400">{r.email}</td><td className="py-3 pr-4 text-zinc-300">{r.company}</td><td className="py-3 pr-4 text-zinc-300">{r.jobTitle}</td><td className="py-3 pr-4 text-zinc-300">{r.phone}</td><td className="py-3 pr-4 text-zinc-300">{r.country}</td><td className="py-3 pr-4 text-zinc-300">{r.attendees}</td><td className="py-3 text-zinc-500">{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "downloads" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <input ref={fileInputRef} type="file" multiple onChange={(e) => handleUpload(e.target.files)} className="hidden" />
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setUploadMode("public"); fetchDownloads("public/") }} className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (uploadMode === "public" ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>Public</button>
              <button onClick={() => { setUploadMode("internal"); fetchDownloads("internal/") }} className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (uploadMode === "internal" ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>Internal</button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="ml-auto bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{uploading ? "Uploading..." : "Upload"}</button>
            </div>
            {uploading && (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-cyan-400">{uploadFileName}</span>
                  <span className="text-zinc-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-3">
                  <div className="bg-cyan-500 h-3 rounded-full transition-all duration-300" style={{width: uploadProgress + "%"}}></div>
                </div>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <input type="text" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="New folder name" />
              <button onClick={createFolder} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm">Create Folder</button>
            </div>
            <div className="flex gap-1 mb-4 text-sm">
              <button onClick={() => fetchDownloads("")} className="text-cyan-400 hover:text-cyan-300">Root</button>
              {dlPath.split("/").filter(Boolean).map((crumb, i, arr) => (<span key={i}> / <button onClick={() => fetchDownloads(arr.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button></span>))}
            </div>
            {dlLoading ? <p className="text-zinc-400">Loading...</p> : dlItems.length === 0 ? <p className="text-zinc-500">No files in this directory</p> : (
              <table className="w-full text-sm text-left">
                <thead><tr className="text-zinc-400 border-b border-zinc-800"><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Size</th><th className="pb-3 pr-4">Modified</th><th className="pb-3">Actions</th></tr></thead>
                <tbody>
                  {dlPath && <tr className="border-b border-zinc-800/50"><td colSpan={4} className="py-2"><button onClick={dlGoUp} className="text-cyan-400 hover:text-cyan-300">.. (up)</button></td></tr>}
                  {dlItems.filter((item: any) => item.name !== ".keep").map((item: any) => (<tr key={item.path} className="border-b border-zinc-800/50"><td className="py-3 pr-4">{item.type === "folder" ? <button onClick={() => fetchDownloads(item.path)} className="text-white hover:text-cyan-400">{'\ud83d\udcc1'} {item.name}</button> : <span className="text-zinc-300">{'\ud83d\udcc4'} {item.name}</span>}</td><td className="py-3 pr-4 text-zinc-400">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td><td className="py-3 pr-4 text-zinc-500">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td><td className="py-3">{item.type === "folder" && <button onClick={() => handleDownloadFolder(item.path, item.name)} disabled={uploading} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-md text-xs mr-2 disabled:opacity-50">Download ZIP</button>}{item.type === "file" && <button onClick={async () => { const r = await fetch("/api/downloads?action=download&key=" + encodeURIComponent(item.path)); const d = await r.json(); if (d.url) window.open(d.url, "_blank") }} className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded-md text-xs mr-2">Download</button>}<button onClick={() => { setRenameItem({path: item.path, name: item.name, type: item.type}); setRenameValue(item.name) }} className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 px-3 py-1 rounded-md text-xs mr-2">Rename</button><button onClick={() => { setMoveItem({path: item.path, name: item.name, type: item.type}); setMoveTarget('') }} className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-md text-xs mr-2">Move</button><button onClick={() => handleDelete(item.path)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded-md text-xs">Delete</button></td></tr>))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "logs" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-4 mb-4">
              
      {/* Rename Modal */}
      {renameItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRenameItem(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="text-zinc-400 text-sm mb-2">Current: {renameItem.name}</p>
            <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none mb-4" placeholder="New name" autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRenameItem(null)} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleRename} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {moveItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setMoveItem(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Move {moveItem.type === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="text-zinc-400 text-sm mb-2">Moving: {moveItem.name}</p>
            <input type="text" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none mb-2" placeholder="Destination path (e.g. public/docs/)" autoFocus />
            <p className="text-zinc-500 text-xs mb-4">Enter the destination folder path (e.g. public/archive/ or internal/backup/)</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMoveItem(null)} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleMove} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg">Move</button>
            </div>
          </div>
        </div>
      )}
              <span className="text-zinc-400 text-sm">Filter:</span>
              {["all", "login", "file"].map(f => (<button key={f} onClick={() => setLogFilter(f)} className={"px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (logFilter === f ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white")}>{f === "all" ? "All" : f === "login" ? "Login" : "File Ops"}</button>))}
              <span className="text-zinc-500 text-xs ml-auto">{filteredLogs.length} records</span>
            </div>
            {logsLoading ? <p className="text-zinc-400">Loading logs...</p> : filteredLogs.length === 0 ? <p className="text-zinc-500">No logs yet</p> : (
              <table className="w-full text-sm text-left">
                <thead><tr className="text-zinc-400 border-b border-zinc-800"><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Details</th><th className="pb-3">IP</th></tr></thead>
                <tbody>{filteredLogs.slice().reverse().map((log: any) => (<tr key={log.id} className="border-b border-zinc-800/50"><td className="py-3 pr-4 text-zinc-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td><td className="py-3 pr-4 text-cyan-400">{log.type}</td><td className="py-3 pr-4 text-white">{log.action}</td><td className="py-3 pr-4 text-zinc-400">{log.key && <span>Key: {log.key} </span>}{log.reason && <span>Reason: {log.reason} </span>}{log.size && <span>Size: {formatSize(Number(log.size))} </span>}</td><td className="py-3 text-zinc-500">{log.ip || "-"}</td></tr>))}</tbody>
              </table>
            )}
          </div>
        )}

        {tab === "news" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <button onClick={fetchNews} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Collect Now</button>
              <button onClick={publishAllPending} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">Publish All Pending</button>
              <span className="text-zinc-500 text-xs ml-auto">{newsArticles.length} total | {newsArticles.filter((a: any)=>a.status==="pending").length} pending | {newsArticles.filter((a: any)=>a.status==="published").length} published</span>
            </div>
            <div className="flex gap-2 mb-4">
              {(["all","pending","published"] as const).map(f=>(<button key={f} onClick={()=>setNewsFilter(f)} className={"px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (newsFilter===f?"bg-cyan-600 text-white":"bg-zinc-800 text-zinc-400 hover:text-white")}>{f==="all"?"All":f==="pending"?"Pending":"Published"}</button>))}
            </div>
            {newsLoading ? <p className="text-zinc-400">Loading news...</p> : (newsArticles.filter((a: any)=>newsFilter==="all"||a.status===newsFilter).length===0 ? <p className="text-zinc-500">No articles found</p> : <div className="space-y-4">{newsArticles.filter((a: any)=>newsFilter==="all"||a.status===newsFilter).map((a: any)=>(<div key={a.id} className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center gap-2 mb-2">
                <span className={"px-2 py-0.5 rounded text-xs " + (a.status==="published"?"bg-green-600/20 text-green-400":"bg-yellow-600/20 text-yellow-400")}>{a.status}</span>
                <span className="text-zinc-500 text-xs">{a.source}</span>
                <span className={"text-xs px-2 py-0.5 rounded " + (a.importance==="high"?"bg-red-600/20 text-red-400":a.importance==="medium"?"bg-yellow-600/20 text-yellow-400":"bg-zinc-700 text-zinc-400")}>{a.importance}</span>
              </div>
              <h3 className="text-white font-medium mb-1">{a.title}</h3>
              <p className="text-zinc-400 text-sm mb-2">{a.summary}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {a.tags?.slice(0,4).map((t:string)=>(<span key={t} className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-xs">{t}</span>))}
                <div className="ml-auto flex gap-2">
                  {a.status==="pending"&&<button onClick={()=>updateNewsStatus(a.id,"published")} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs">Publish</button>}
                  {a.status==="published"&&<button onClick={()=>updateNewsStatus(a.id,"pending")} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs">Unpublish</button>}
                  <button onClick={()=>deleteNewsArticle(a.id)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded text-xs">Delete</button>
                </div>
              </div>
            </div>))}</div>)}
          </div>
        )}
                  {tab === "syslog" && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Syslog Analysis</h2>
                <button onClick={fetchSyslogFiles} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Refresh Files</button>
              </div>
                        {analyzing && <div className="text-center py-4 text-cyan-400">Analyzing with AI... This may take a moment.</div>}
              {syslogLoading ? <p className="text-zinc-400">Loading syslog files...</p> : syslogFiles.length === 0 ? <p className="text-zinc-500">No syslog files found. Upload files to internal/Syslog/ via Uploads tab.</p> : (
                              <table className="w-full text-sm text-left">
                  <thead><tr className="text-zinc-400 border-b border-zinc-800"><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Size</th><th className="pb-3">Actions</th></tr></thead>
                                          <tbody>{syslogFiles.filter((f: any) => f.type === 'file').map((f: any) => (<tr key={f.path} className="border-b border-zinc-800/50"><td className="py-2 pr-4 text-white">{f.name}</td><td className="py-2 pr-4 text-zinc-400">{f.size ? formatSize(f.size) : '-'}</td><td className="py-2"><button onClick={() => analyzeSyslog(f.path)} disabled={analyzing} className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded-md text-xs font-medium disabled:opacity-50">{analyzing ? 'Analyzing...' : 'Analyze with AI'}</button></td></tr>))}</tbody>
                                          </table>
              )}
              {analysisResult && (
                <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                    <h3 className="text-white font-bold mb-2">Latest Analysis: {analysisResult.fileName}</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div><div className="text-2xl font-bold text-white">{analysisResult.totalEvents}</div><div className="text-xs text-zinc-500">Total</div></div>
                    <div><div className="text-2xl font-bold text-green-400">{analysisResult.falsePositives}</div><div className="text-xs text-zinc-500">False Positive</div></div>
                    <div><div className="text-2xl font-bold text-red-400">{analysisResult.truePositives}</div><div className="text-xs text-zinc-500">True Positive</div></div>
                    <div><div className="text-2xl font-bold text-yellow-400">{analysisResult.needsReview}</div><div className="text-xs text-zinc-500">Needs Review</div></div>
                  </div>
                                    <p className="text-center mt-4 text-sm text-zinc-400">View detailed results on the <a href="/soc-review" className="text-cyan-400 hover:text-cyan-300 underline">SOC Review Dashboard</a></p>
                </div>
              )}
            </div>
                          )}

      </div>
    </div>
  )
}
