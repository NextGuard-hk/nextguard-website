"use client"
import { useState, useEffect, useRef } from "react"

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
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [totpLoading, setTotpLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [totpExpiry, setTotpExpiry] = useState(0)
  const [tab, setTab] = useState<"contacts" | "rsvp" | "downloads">("contacts")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [rsvps, setRsvps] = useState<Registration[]>([])
  const [dlItems, setDlItems] = useState<FileItem[]>([])
  const [dlPath, setDlPath] = useState("")
  const [dlLoading, setDlLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newFolder, setNewFolder] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    try {
      const r = await fetch("/api/contact/auth")
      if (r.ok) { setIsAuth(true); fetchContacts(); fetchRsvps() }
    } catch {} finally { setChecking(false) }
  }

  async function sendCode() {
    if (!password) { setError("Enter password first"); return }
    setTotpLoading(true); setError(""); setCodeSent(false)
    try {
      const r = await fetch("/api/contact/totp", { headers: { "x-admin-password": password } })
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
                const formData = new FormData()
        formData.append("file", file)
        formData.append("key", key)
        await fetch("/api/downloads", { method: "POST", body: formData })
      }
      fetchDownloads(dlPath)
    } catch {} finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = "" }
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
            const formData = new FormData()
      formData.append("file", new Blob([""], { type: "text/plain" }), ".keep")
      formData.append("key", key)
      const r = await fetch("/api/downloads", { method: "POST", body: formData })
      if (r.ok) { setNewFolder(""); fetchDownloads(dlPath) }
    } catch {}
  }

  async function handleLogout() {
    await fetch("/api/contact/auth", { method: "DELETE" })
    setIsAuth(false); setContacts([]); setRsvps([]); setPassword(""); setTotpCode("")
  }

  function dlGoUp() {
    const parts = dlPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    fetchDownloads(parts.length > 0 ? parts.join("/") + "/" : "")
  }

  if (checking) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Checking authentication...</div>
    </div>
  )

  if (!isAuth) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-zinc-400 text-sm mb-6">NextGuard Admin Dashboard</p>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4"><p className="text-red-400 text-sm">{error}</p></div>}
          {codeSent && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4"><p className="text-green-400 text-sm">Verification code sent to admin email.</p></div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter admin password" required />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">2FA Code</label>
              <div className="flex gap-2">
                <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="6-digit code" maxLength={6} required />
                <button type="button" onClick={sendCode} disabled={totpLoading || !password} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">{totpLoading ? "..." : "Send Code"}</button>
              </div>
              {totpExpiry > 0 && <p className="text-xs text-zinc-500 mt-1">Code expires in {totpExpiry}s</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">{loading ? "Authenticating..." : "Login"}</button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button onClick={() => { fetchContacts(); fetchRsvps(); if (tab === "downloads") fetchDownloads(dlPath) }} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm">Refresh</button>
            <button onClick={handleLogout} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm">Logout</button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg w-fit">
          <button onClick={() => setTab("contacts")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "contacts" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>Contacts ({contacts.length})</button>
          <button onClick={() => setTab("rsvp")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "rsvp" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>RSVP ({rsvps.length})</button>
          <button onClick={() => { setTab("downloads"); if (dlItems.length === 0) fetchDownloads() }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "downloads" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"}`}>Uploads</button>
        </div>

        {tab === "contacts" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/contact?format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Message</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Date</th>
                  </tr></thead>
                  <tbody>
                    {contacts.length === 0 ? <tr><td colSpan={5} className="text-center text-zinc-500 py-12">No submissions yet</td></tr>
                    : contacts.slice().reverse().map(c => (
                      <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-6 py-4 text-sm text-white">{c.fullName}</td>
                        <td className="px-6 py-4 text-sm text-cyan-400">{c.email}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{c.company || "-"}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300 max-w-xs truncate">{c.message}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "rsvp" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => window.open("/api/rsvp?password=NextGuard123&format=csv", "_blank")} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">Export CSV</button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">#</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Job Title</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Phone</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Country</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Attendees</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Date</th>
                  </tr></thead>
                  <tbody>
                    {rsvps.length === 0 ? <tr><td colSpan={9} className="text-center text-zinc-500 py-12">No registrations yet</td></tr>
                    : rsvps.map((r, i) => (
                      <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-6 py-4 text-sm text-zinc-500">{i + 1}</td>
                        <td className="px-6 py-4 text-sm text-white">{r.fullName}</td>
                        <td className="px-6 py-4 text-sm text-cyan-400">{r.email}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{r.company}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{r.jobTitle}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{r.phone}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{r.country}</td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{r.attendees}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "downloads" && (
          <div>
            {/* Upload & Create Folder */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input ref={fileInputRef} type="file" multiple onChange={e => handleUpload(e.target.files)} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{uploading ? "Uploading..." : "Upload Files"}</button>
              <div className="flex gap-2">
                <input type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="New folder name" />
                <button onClick={createFolder} className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-sm">Create Folder</button>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <button onClick={() => fetchDownloads("")} className="text-cyan-400 hover:text-cyan-300">Root</button>
              {dlPath.split("/").filter(Boolean).map((crumb, i, arr) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-zinc-600">/</span>
                  <button onClick={() => fetchDownloads(arr.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button>
                </div>
              ))}
            </div>

            {/* File List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {dlLoading ? (
                <div className="text-center text-zinc-500 py-12">Loading...</div>
              ) : dlItems.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">No files in this directory</div>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Size</th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Modified</th>
                    <th className="text-right text-xs font-medium text-zinc-400 uppercase px-6 py-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {dlPath && (
                      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer" onClick={dlGoUp}>
                        <td className="px-6 py-3 text-sm text-zinc-300" colSpan={4}><span className="flex items-center gap-2">&#x21A9; ..</span></td>
                      </tr>
                    )}
                    {dlItems.map(item => (
                      <tr key={item.path} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-6 py-3 text-sm">
                          {item.type === "folder" ? (
                            <button onClick={() => fetchDownloads(item.path)} className="flex items-center gap-2 text-white hover:text-cyan-400">&#x1F4C1; {item.name}</button>
                          ) : (
                            <span className="flex items-center gap-2 text-white">&#x1F4C4; {item.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-zinc-400">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td>
                        <td className="px-6 py-3 text-sm text-zinc-500">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td>
                        <td className="px-6 py-3 text-sm text-right">
                          {item.type === "file" && (
                            <button onClick={() => handleDelete(item.path)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded-md text-xs font-medium">Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
