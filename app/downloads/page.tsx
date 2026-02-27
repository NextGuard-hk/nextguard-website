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

export default function DownloadsPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [items, setItems] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
    const [budgetError, setBudgetError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      // Always start inside public/ prefix for public users
      const r = await fetch(`/api/downloads?pw=${encodeURIComponent(password)}&prefix=${encodeURIComponent(PUBLIC_PREFIX)}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.items || [])
        setIsAuth(true)
        setCurrentPath(PUBLIC_PREFIX)
      } else {
        setError("Invalid password")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function navigateFolder(path: string) {
    setLoading(true)
    try {
      // Ensure path always stays within public/
      const safePath = path.startsWith(PUBLIC_PREFIX) ? path : PUBLIC_PREFIX + path
      const r = await fetch(`/api/downloads?pw=${encodeURIComponent(password)}&prefix=${encodeURIComponent(safePath)}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.items || [])
        setCurrentPath(safePath)
      }
    } catch {} finally { setLoading(false) }
  }

  async function handleDownload(key: string, name: string) {
    setDownloading(key)
    try {
      const r = await fetch(`/api/downloads?action=download&pw=${encodeURIComponent(password)}&key=${encodeURIComponent(key)}`)
      if (r.ok) {
        const d = await r.json()
        const a = document.createElement("a")
        a.href = d.url
        a.download = name
        a.target = "_blank"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        const d = await r.json()
        if (d.budgetExceeded) {
          setBudgetError("Downloads are temporarily unavailable - monthly bandwidth budget has been reached. Please try again next month.")
        }
      }
    } catch {} finally { setDownloading(null) }
  }

  function goUp() {
    const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    const newPath = parts.length > 0 ? parts.join("/") + "/" : PUBLIC_PREFIX
    // Don't go above public/
    if (newPath === "" || !newPath.startsWith(PUBLIC_PREFIX)) {
      navigateFolder(PUBLIC_PREFIX)
    } else {
      navigateFolder(newPath)
    }
  }

  // Strip the public/ prefix for display in breadcrumbs
  const displayPath = currentPath.replace(/^public\//, "")
  const breadcrumbs = displayPath.split("/").filter(Boolean)

  if (!isAuth) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Downloads</h1>
          <p className="text-zinc-400 text-sm mt-1">Access NextGuard software, manuals, and official documents</p>
        </div>
        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Access Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter download password" required />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-medium disabled:opacity-50">{loading ? "Verifying..." : "Access Downloads"}</button>
      </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">NextGuard Downloads</h1>
            <p className="text-zinc-400 text-sm mt-1">Software ISO, HotFix, Manuals &amp; Installation Guides</p>
          </div>
          <button onClick={() => { setIsAuth(false); setPassword(""); setItems([]) }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm">Logout</button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm mb-4">
          <button onClick={() => navigateFolder(PUBLIC_PREFIX)} className="text-cyan-400 hover:text-cyan-300">Root</button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              <span className="text-zinc-600"> / </span>
              <button onClick={() => navigateFolder(PUBLIC_PREFIX + breadcrumbs.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button>
            </span>
          ))}
        </div>

                {budgetError && <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">{budgetError}</div>}
        {/* File List */}
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-zinc-500 text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No files in this directory</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Size</th>
                <th className="text-left py-3 px-4">Modified</th>
                <th className="text-left py-3 px-4">Action</th>
              </tr></thead>
              <tbody>
                {currentPath !== PUBLIC_PREFIX && (
                  <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer" onClick={goUp}>
                    <td className="py-3 px-4 text-zinc-400" colSpan={4}>{"↩ .."}</td>
                  </tr>
                )}
                {items.filter(item => item.name !== ".keep").map(item => (
                  <tr key={item.path} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      {item.type === "folder" ? (
                        <button onClick={() => navigateFolder(item.path)} className="flex items-center gap-2 text-white hover:text-cyan-400">
                          📁 {item.name}
                        </button>
                      ) : (
                        <span className="flex items-center gap-2">📄 {item.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td>
                    <td className="py-3 px-4">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4">
                      {item.type === "file" && (
                        <button onClick={() => handleDownload(item.path, item.name)} disabled={downloading === item.path} className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50">
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
