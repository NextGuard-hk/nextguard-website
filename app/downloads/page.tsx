"use client"
import { useState } from "react"

const PUBLIC_PREFIX = "public/"

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

const DISCLAIMER_TEXT = `By downloading software, documentation, or any files from NextGuard Technology, you acknowledge and agree to the following:\n\n1. These files are provided exclusively for authorized customers, partners, and approved POC participants.\n2. Redistribution, reverse engineering, or sharing with unauthorized third parties is strictly prohibited.\n3. All downloads are logged and monitored. Excessive or suspicious download behavior may result in token revocation.\n4. NextGuard Technology reserves the right to revoke access at any time without prior notice.\n5. The downloaded materials are provided "AS IS" without warranty of any kind.`

export default function DownloadsPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [authMode, setAuthMode] = useState<"password" | "token">("token")
  const [password, setPassword] = useState("")
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [items, setItems] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [budgetError, setBudgetError] = useState("")
  const [rateLimitMsg, setRateLimitMsg] = useState("")
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerPending, setDisclaimerPending] = useState(false)
  const [company, setCompany] = useState("")

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const r = await fetch('/api/downloads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      if (r.ok) {
        const listR = await fetch(`/api/downloads?prefix=${encodeURIComponent(PUBLIC_PREFIX)}`)
        if (listR.ok) {
          const d = await listR.json()
          setItems(d.items || []); setIsAuth(true); setCurrentPath(PUBLIC_PREFIX)
        }
      } else { setError("Invalid password") }
    } catch { setError("Network error") } finally { setLoading(false) }
  }

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      // First validate the token
      const r = await fetch('/api/downloads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      if (r.ok) {
        const data = await r.json()
        setCompany(data.company || "")
        // Show disclaimer if not yet accepted
        setShowDisclaimer(true)
        setDisclaimerPending(true)
      } else {
        const data = await r.json()
        setError(data.error || "Invalid token")
      }
    } catch { setError("Network error") } finally { setLoading(false) }
  }

  async function acceptDisclaimer() {
    setLoading(true)
    try {
      // Accept disclaimer via API
      await fetch('/api/downloads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, acceptDisclaimer: true }) })
      // Load file list
      const listR = await fetch(`/api/downloads?prefix=${encodeURIComponent(PUBLIC_PREFIX)}&token=${encodeURIComponent(token)}`)
      if (listR.ok) {
        const d = await listR.json()
        setItems(d.items || []); setIsAuth(true); setCurrentPath(PUBLIC_PREFIX)
      }
      setShowDisclaimer(false); setDisclaimerPending(false)
    } catch { setError("Network error") } finally { setLoading(false) }
  }

  async function navigateFolder(path: string) {
    setLoading(true)
    try {
      const safePath = path.startsWith(PUBLIC_PREFIX) ? path : PUBLIC_PREFIX + path
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      const r = await fetch(`/api/downloads?prefix=${encodeURIComponent(safePath)}${tokenParam}`)
      if (r.ok) { const d = await r.json(); setItems(d.items || []); setCurrentPath(safePath) }
    } catch {} finally { setLoading(false) }
  }

  async function handleDownload(key: string, name: string, size?: number) {
    setDownloading(key)
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
      const sizeParam = size ? `&size=${size}` : ''
      const r = await fetch(`/api/downloads?action=download&key=${encodeURIComponent(key)}${tokenParam}${sizeParam}`)
      if (r.ok) {
        const d = await r.json()
        const a = document.createElement("a")
        a.href = d.url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a)
      } else {
        const d = await r.json()
        if (d.rateLimited) { setRateLimitMsg(d.error || "Rate limit exceeded") }
        else if (d.budgetExceeded) { setBudgetError(d.error || "Bandwidth budget exceeded") }
        else if (d.disclaimerRequired) { setShowDisclaimer(true) }
      }
    } catch {} finally { setDownloading(null) }
  }

  function goUp() {
    const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    const newPath = parts.length > 0 ? parts.join("/") + "/" : PUBLIC_PREFIX
    if (!newPath.startsWith(PUBLIC_PREFIX)) navigateFolder(PUBLIC_PREFIX)
    else navigateFolder(newPath)
  }

  const displayPath = currentPath.replace(/^public\//, "")
  const breadcrumbs = displayPath.split("/").filter(Boolean)

  // ── Disclaimer Modal ──
  if (showDisclaimer) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-white mb-2">Download Disclaimer</h2>
        {company && <p className="text-cyan-400 mb-4">Company: {company}</p>}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
          <pre className="text-zinc-300 text-sm whitespace-pre-wrap">{DISCLAIMER_TEXT}</pre>
        </div>
        <div className="flex gap-3">
          <button onClick={acceptDisclaimer} disabled={loading} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
            {loading ? "Processing..." : "I Accept & Continue"}
          </button>
          <button onClick={() => { setShowDisclaimer(false); setDisclaimerPending(false) }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-3 rounded-lg transition-colors">
            Decline
          </button>
        </div>
      </div>
    </div>
  )

  // ── Rate Limit Popup ──
  const rateLimitPopup = rateLimitMsg ? (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-yellow-600 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">\u26a0\ufe0f</div>
        <h3 className="text-xl font-bold text-yellow-400 mb-3">Download Limit Reached</h3>
        <p className="text-zinc-300 mb-6">{rateLimitMsg}</p>
        <button onClick={() => setRateLimitMsg("")} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg">OK</button>
      </div>
    </div>
  ) : null

  // ── Login Page ──
  if (!isAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {rateLimitPopup}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Downloads</h1>
        <p className="text-zinc-400 mb-6">Access NextGuard software, manuals, and official documents</p>
        {error && <p className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-sm">{error}</p>}
        <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
          <button onClick={() => setAuthMode("token")} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'token' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Token</button>
          <button onClick={() => setAuthMode("password")} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${authMode === 'password' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Password</button>
        </div>
        {authMode === 'token' ? (
          <form onSubmit={handleTokenLogin}>
            <label className="text-zinc-300 text-sm font-medium">Download Token</label>
            <input type="text" value={token} onChange={e => setToken(e.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter your download token" required />
            <p className="text-zinc-500 text-xs mt-2 mb-4">Contact your NextGuard sales representative or support team to obtain a token.</p>
            <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">{loading ? "Verifying..." : "Access Downloads"}</button>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin}>
            <label className="text-zinc-300 text-sm font-medium">Access Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter download password" required />
            <button type="submit" disabled={loading} className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">{loading ? "Verifying..." : "Access Downloads"}</button>
          </form>
        )}
      </div>
    </div>
  )

  // ── File Browser ──
  return (
    <div className="min-h-screen bg-black text-white">
      {rateLimitPopup}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">NextGuard Downloads</h1>
            <p className="text-zinc-400 mt-1">Software ISO, HotFix, Manuals & Installation Guides</p>
            {company && <p className="text-cyan-400 text-sm mt-1">Authenticated: {company}</p>}
          </div>
          <button onClick={() => { setIsAuth(false); setPassword(""); setToken(""); setItems([]); setCompany("") }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm">Logout</button>
        </div>
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
          <button onClick={() => navigateFolder(PUBLIC_PREFIX)} className="text-cyan-400 hover:text-cyan-300">Root</button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              <span className="text-zinc-600 mx-1">/</span>
              <button onClick={() => navigateFolder(PUBLIC_PREFIX + breadcrumbs.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button>
            </span>
          ))}
        </div>
        {budgetError && <p className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-sm">{budgetError}</p>}
        {/* File List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-zinc-500 text-center py-12">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-500 text-center py-12">No files in this directory</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800 text-zinc-400 text-sm"><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3 w-24">Size</th><th className="text-left px-4 py-3 w-32">Modified</th><th className="text-left px-4 py-3 w-28">Action</th></tr></thead>
              <tbody>
                {currentPath !== PUBLIC_PREFIX && <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30"><td colSpan={4} className="px-4 py-2"><button onClick={goUp} className="text-zinc-400 hover:text-white">← Back</button></td></tr>}
                {items.filter(item => item.name !== ".keep").map(item => (
                  <tr key={item.path} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-2.5">
                      {item.type === "folder" ? (
                        <button onClick={() => navigateFolder(item.path)} className="flex items-center gap-2 text-white hover:text-cyan-400">
                          \ud83d\udcc1 {item.name}
                        </button>
                      ) : <span className="flex items-center gap-2">\ud83d\udcc4 {item.name}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-sm">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td>
                    <td className="px-4 py-2.5 text-zinc-400 text-sm">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2.5">
                      {item.type === "file" && (
                        <button onClick={() => handleDownload(item.path, item.name, item.size)} disabled={downloading === item.path} className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50">
                          {downloading === item.path ? "Downloading..." : "Download"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
