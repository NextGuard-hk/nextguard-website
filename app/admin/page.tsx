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
  const [tab, setTab] = useState<"contacts" | "rsvp" | "downloads" | "logs" | "news">("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [rsvps, setRsvps] = useState<Registration[]>([])
  const [dlItems, setDlItems] = useState<FileItem[]>([])
  const [dlPath, setDlPath] = useState("")
  const [dlLoading, setDlLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newFolder, setNewFolder] = useState("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logFilter, setLogFilter] = useState("all")
    const [newsArticles, setNewsArticles] = useState<any[]>([])   const [newsLoading, setNewsLoading] = useState(false)   const [newsFilter, setNewsFilter] = useState<"all"|"pending"|"published">("all")   const [uploadMode, setUploadMode] = useState<"public" | "internal">("public")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    try { const r = await fetch("/api/contact/auth"); if (r.ok) { setIsAuth(true); fetchContacts(); fetchRsvps() } } catch {} finally { setChecking(false) }
  }

  async function sendCode() {
    if (!password) { setError("Enter password first"); return }
    const emailLower = adminEmail.toLowerCase().trim()
    if (!emailLower || (!emailLower.endsWith("@skyguard.com.cn") && !emailLower.endsWith("@next-guard.com"))) {
      setError("Only @skyguard.com.cn or @next-guard.com emails are allowed"); return
    }
    setTotpLoading(true); setError(""); setCodeSent(false)
    try {
      const r = await fetch("/api/contact/totp", { headers: { "x-admin-password": password, "x-admin-email": adminEmail.trim() } })
      const d = await r.json()
      if (r.ok) { setCodeSent(true); setTotpExpiry(d.expiresIn) }
      else setError(d.message || "Failed to send 2FA code")
    } catch { setError("Network error") } finally { setTotpLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true)
    try {
      const r = await fetch("/api/contact/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, totpCode }) })
      const d = await r.json()
      if (r.ok) { setIsAuth(true); fetchContacts(); fetchRsvps() }
      else setError(d.message || "Login failed")
    } catch { setError("Network error") } finally { setLoading(false) }
  }

  async function fetchContacts() {
    try { const r = await fetch("/api/contact"); if (r.ok) { const d = await r.json(); setContacts(d.contacts || []) } } catch {}
  }

  async function fetchRsvps() {
    try {
      const r = await fetch("/api/rsvp?password=NextGuard123")
      const d = await r.json()
      if (d.status === "success") setRsvps(d.registrations || [])
    } catch {}
  }

  async function fetchDownloads(prefix = "") {
    setDlLoading(true)
    try {
      const r = await fetch(`/api/downloads?prefix=${encodeURIComponent(prefix)}`)
      if (r.ok) { const d = await r.json(); setDlItems(d.items || []); setDlPath(prefix) }
    } catch {} finally { setDlLoading(false) }
  }

      async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const key = dlPath + file.name
        // Step 1: Get presigned URL
        const presignRes = await fetch(`/api/downloads?action=presign-upload&key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`)
        if (!presignRes.ok) throw new Error('Failed to get presigned URL')
        const { url } = await presignRes.json()
        // Step 2: Upload directly to R2 via presigned URL
        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('Upload to R2 failed')
        // Step 3: Confirm upload + virus scan
        const confirmRes = await fetch(`/api/downloads?action=confirm-upload&key=${encodeURIComponent(key)}&size=${file.size}`)
        const confirmData = await confirmRes.json()
        if (confirmData.virus) {
          alert(`File blocked - virus detected in ${file.name}: ${confirmData.message}`)
          continue
        }
        if (confirmData.scan) {
          console.log(`Scan result for ${file.name}: ${confirmData.scan}`)
        }
      }
      fetchDownloads(dlPath)
    } catch (e: any) { alert('Upload failed: ' + (e.message || 'Unknown error'))
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Delete ${key}?`)) return
    try {
      await fetch("/api/downloads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) })
      fetchDownloads(dlPath)
    } catch {}
  }

    async function createFolder() {
    if (!newFolder.trim()) return
    const key = dlPath + newFolder.trim() + "/.keep"
    try {
      // Use presigned URL for folder creation too
      const presignRes = await fetch(`/api/downloads?action=presign-upload&key=${encodeURIComponent(key)}&contentType=text/plain`)
      if (!presignRes.ok) throw new Error('Failed to get presigned URL')
      const { url } = await presignRes.json()
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: '' })
      await fetch(`/api/downloads?action=confirm-upload&key=${encodeURIComponent(key)}&size=0`)
      setNewFolder(""); fetchDownloads(dlPath)
    } catch {}
  }

  async function fetchLogs() {
    setLogsLoading(true)
    try {
      const r = await fetch("/api/logs")
      if (r.ok) { const d = await r.json(); setLogs(d.logs || []) }
    } catch {} finally { setLogsLoading(false) }
  }

  async function handleLogout() {
    await fetch("/api/contact/auth", { method: "DELETE" })
    setIsAuth(false); setContacts([]); setRsvps([]); setPassword(""); setTotpCode(""); setAdminEmail("")
  }

  function dlGoUp() {
    const parts = dlPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    fetchDownloads(parts.length > 0 ? parts.join("/") + "/" : "")
  }

  const filteredLogs = logFilter === "all" ? logs : logs.filter(l => l.type === logFilter)

  if (checking) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-zinc-400">Checking authentication...</p>
    </div>
  )

  if (!isAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-zinc-400 text-sm mt-1">NextGuard Admin Dashboard</p>
        </div>
        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>}
        {codeSent && <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 text-green-300 text-sm">Verification code sent to {adminEmail.trim()}.</div>}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter admin password" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address <span className="text-zinc-500">(@skyguard.com.cn or @next-guard.com)</span></label>
          <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="your.name@next-guard.com" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">2FA Code</label>
          <div className="flex gap-2">
            <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="6-digit code" maxLength={6} required />
            <button type="button" onClick={sendCode} disabled={totpLoading} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">{totpLoading ? "..." : "Send Code"}</button>
          </div>
          {totpExpiry > 0 && <p className="text-zinc-500 text-xs mt-2">Code expires in {totpExpiry}s</p>}
        </div>
        <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-medium disabled:opacity-50">{loading ? "Authenticating..." : "Login"}</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
            <IdleTimer onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button onClick={() => { fetchContacts(); fetchRsvps(); if (tab === "downloads") fetchDownloads(dlPath); if (tab === "logs") fetchLogs() }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
            <button onClick={handleLogout} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm">Logout</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("contacts")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "contacts" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>Contacts ({contacts.length})</button>
          <button onClick={() => setTab("rsvp")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "rsvp" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>RSVP ({rsvps.length})</button>
                  <button onClick={() => { setTab("downloads"); fetchDownloads(uploadMode + "/") }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "downloads" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>Uploads</button>
          <button onClick={() => { setTab("logs"); fetchLogs() }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "logs" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>Logs</button>         <button onClick={() => { setTab("news"); fetchNews() }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "news" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>News</button>
        </div>

        {tab === "contacts" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/contact?format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4">Message</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr></thead>
                <tbody>
                  {contacts.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-zinc-500">No contacts yet</td></tr> : contacts.slice().reverse().map(c => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                      <td className="py-3 px-4">{c.fullName}</td>
                      <td className="py-3 px-4">{c.email}</td>
                      <td className="py-3 px-4">{c.company || "-"}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{c.message}</td>
                      <td className="py-3 px-4">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "rsvp" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/rsvp?password=NextGuard123&format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4">Job Title</th>
                  <th className="text-left py-3 px-4">Phone</th>
                  <th className="text-left py-3 px-4">Country</th>
                  <th className="text-left py-3 px-4">Attendees</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr></thead>
                <tbody>
                  {rsvps.length === 0 ? <tr><td colSpan={9} className="text-center py-8 text-zinc-500">No registrations yet</td></tr> : rsvps.map((r, i) => (
                    <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                      <td className="py-3 px-4">{i + 1}</td>
                      <td className="py-3 px-4">{r.fullName}</td>
                      <td className="py-3 px-4">{r.email}</td>
                      <td className="py-3 px-4">{r.company}</td>
                      <td className="py-3 px-4">{r.jobTitle}</td>
                      <td className="py-3 px-4">{r.phone}</td>
                      <td className="py-3 px-4">{r.country}</td>
                      <td className="py-3 px-4">{r.attendees}</td>
                      <td className="py-3 px-4">{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "downloads" && (
    <div>
      <input ref={fileInputRef} type="file" multiple onChange={e => handleUpload(e.target.files)} className="hidden" />
      {/* Upload Mode Sub-tabs */}
      <div className="flex gap-2 mb-4">
                <button onClick={() => { setUploadMode("public"); fetchDownloads("public/") }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMode === "public" ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
          🌍 Upload for Public
        </button>
                <button onClick={() => { setUploadMode("internal"); fetchDownloads("internal/") }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMode === "internal" ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
          🔒 Upload for Internal
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className={`ml-auto px-4 py-2 rounded-lg text-sm disabled:opacity-50 ${uploadMode === "public" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-orange-600 hover:bg-orange-500 text-white"}`}>
          {uploading ? "Uploading..." : `Upload to ${uploadMode === "public" ? "Public" : "Internal"}`}
        </button>
      </div>
                  <button onClick={async () => { const r = await fetch('/api/downloads?action=setup-cors'); const d = await r.json(); alert(d.message || d.error || 'Done') }} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs">Setup CORS</button>
      <div className={`text-xs px-3 py-2 rounded-lg mb-4 ${uploadMode === "public" ? "bg-green-900/30 text-green-400 border border-green-700/50" : "bg-orange-900/30 text-orange-400 border border-orange-700/50"}`}>
        {uploadMode === "public" ? "🌍 Public files will be visible on /downloads page" : "🔒 Internal files are private - not accessible from public site"}
      </div>
      <div className="flex gap-2 mb-4">
        <input type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="New folder name" />
        <button onClick={createFolder} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm">Create Folder</button>
      </div>
      <div className="flex items-center gap-1 text-sm mb-4">
        <button onClick={() => fetchDownloads("")} className="text-cyan-400 hover:text-cyan-300">Root</button>
        {dlPath.split("/").filter(Boolean).map((crumb, i, arr) => (
          <span key={i}>
            <span className="text-zinc-600"> / </span>
            <button onClick={() => fetchDownloads(arr.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        {dlLoading ? (
          <p className="text-zinc-500 text-center py-8">Loading...</p>
        ) : dlItems.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No files in this directory</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Size</th>
              <th className="text-left py-3 px-4">Modified</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {dlPath && (
                <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4 text-zinc-400" colSpan={4}>
                    <button onClick={dlGoUp} className="hover:text-cyan-400">↑ ..</button>
                  </td>
                </tr>
              )}
              {dlItems.filter(item => item.name !== ".keep").map(item => (
                <tr key={item.path} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4">
                    {item.type === "folder" ? (
                      <button onClick={() => fetchDownloads(item.path)} className="flex items-center gap-2 text-white hover:text-cyan-400">📁 {item.name}</button>
                    ) : (
                      <span className="flex items-center gap-2">
                        {item.path.startsWith("internal/") ? <span className="text-xs bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded">🔒</span> : <span className="text-xs bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">🌍</span>}
                        📄 {item.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td>
                  <td className="py-3 px-4">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleDelete(item.path)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded-md text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
        )}

        {tab === "logs" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <span className="text-zinc-400 text-sm">Filter:</span>
              {["all", "login", "file"].map(f => (
                <button key={f} onClick={() => setLogFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${logFilter === f ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>{f === "all" ? "All" : f === "login" ? "Login" : "File Ops"}</button>
              ))}
              <span className="text-zinc-500 text-xs ml-auto">{filteredLogs.length} records</span>
            </div>
            <div className="overflow-x-auto">
              {logsLoading ? (
                <p className="text-zinc-500 text-center py-8">Loading logs...</p>
              ) : filteredLogs.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No logs yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Action</th>
                    <th className="text-left py-3 px-4">Details</th>
                    <th className="text-left py-3 px-4">IP</th>
                  </tr></thead>
                  <tbody>
                    {filteredLogs.slice().reverse().map(log => (
                      <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                        <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.type === "login" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"}`}>{log.type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.action === "login_success" || log.action === "upload" ? "bg-green-600/20 text-green-400" :
                            log.action === "login_failed" || log.action === "rate_limited" ? "bg-red-600/20 text-red-400" :
                            log.action === "delete" || log.action === "delete_folder" ? "bg-orange-600/20 text-orange-400" :
                            "bg-zinc-600/20 text-zinc-400"
                          }`}>{log.action}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                          {log.key && <span>Key: {log.key}</span>}
                          {log.reason && <span>Reason: {log.reason}</span>}
                          {log.size && <span> Size: {formatSize(Number(log.size))}</span>}
                          {log.count && <span> Files: {log.count}</span>}
                          {log.status && <span> Status: {log.status}</span>}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-xs">{log.ip || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

                {tab === "news" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={triggerCollect} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">Collect Now</button>
              <button onClick={publishAllPending} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Publish All Pending</button>
              <span className="text-zinc-400 text-sm ml-auto">{newsArticles.length} total | {newsArticles.filter(a=>a.status==="pending").length} pending | {newsArticles.filter(a=>a.status==="published").length} published</span>
            </div>
            <div className="flex gap-2">
              {(["all","pending","published"] as const).map(f=>(<button key={f} onClick={()=>setNewsFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${newsFilter===f?"bg-cyan-600 text-white":"bg-zinc-800 text-zinc-400 hover:text-white"}`}>{f=="all"?"All":f=="pending"?"Pending":"Published"}</button>))}
            </div>
            {newsLoading ? <div className="text-center py-8 text-zinc-400">Loading news...</div> : (newsArticles.filter(a=>newsFilter==="all"||a.status===newsFilter).length===0 ? <div className="text-center py-8 text-zinc-400">No articles found</div> : <div className="space-y-3">{newsArticles.filter(a=>newsFilter==="all"||a.status===newsFilter).map(a=>(<div key={a.id} className={`border rounded-lg p-4 ${a.status==="pending"?"border-yellow-600/30 bg-yellow-900/10":"border-zinc-700 bg-zinc-800/50"}`}><div className="flex items-start justify-between gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded text-xs font-medium ${a.status==="pending"?"bg-yellow-500/20 text-yellow-400":"bg-green-500/20 text-green-400"}`}>{a.status}</span><span className="text-zinc-500 text-xs">{a.source}</span><span className="text-zinc-600 text-xs">{a.importance}</span></div><h3 className="text-white font-medium text-sm">{a.title}</h3><p className="text-zinc-400 text-xs mt-1 line-clamp-2">{a.summary}</p><div className="flex gap-1 mt-2">{a.tags?.slice(0,4).map((t:string)=>(<span key={t} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">{t}</span>))}</div></div><div className="flex gap-2 flex-shrink-0">{a.status==="pending"&&<button onClick={()=>updateNewsStatus(a.id,"published")} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs">Publish</button>}{a.status==="published"&&<button onClick={()=>updateNewsStatus(a.id,"pending")} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs">Unpublish</button>}<button onClick={()=>deleteNewsArticle(a.id)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded text-xs">Delete</button></div></div></div>))}</div>)}
          </div>
        )}

      </div>
    </div>
  )
}
