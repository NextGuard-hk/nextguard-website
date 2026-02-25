"use client"
import { useState } from "react"

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const r = await fetch(`/api/downloads?pw=${encodeURIComponent(password)}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.items || [])
        setIsAuth(true)
        setCurrentPath("")
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
      const r = await fetch(`/api/downloads?pw=${encodeURIComponent(password)}&prefix=${encodeURIComponent(path)}`)
      if (r.ok) {
        const d = await r.json()
        setItems(d.items || [])
        setCurrentPath(path)
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
      }
    } catch {} finally { setDownloading(null) }
  }

  function goUp() {
    const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean)
    parts.pop()
    const newPath = parts.length > 0 ? parts.join("/") + "/" : ""
    navigateFolder(newPath)
  }

  const breadcrumbs = currentPath.split("/").filter(Boolean)

  if (!isAuth) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <h1 className="text-2xl font-bold text-white">Downloads</h1>
          </div>
          <p className="text-zinc-400 text-sm mb-6">Access NextGuard software, manuals, and official documents</p>
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4"><p className="text-red-400 text-sm">{error}</p></div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Access Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" placeholder="Enter download password" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">{loading ? "Verifying..." : "Access Downloads"}</button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">NextGuard Downloads</h1>
            <p className="text-zinc-400 text-sm mt-1">Software ISO, HotFix, Manuals & Installation Guides</p>
          </div>
          <button onClick={() => { setIsAuth(false); setPassword(""); setItems([]) }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm">Logout</button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button onClick={() => navigateFolder("")} className="text-cyan-400 hover:text-cyan-300">Root</button>
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-600">/</span>
              <button onClick={() => navigateFolder(breadcrumbs.slice(0, i + 1).join("/") + "/")} className="text-cyan-400 hover:text-cyan-300">{crumb}</button>
            </div>
          ))}
        </div>

        {/* File List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center text-zinc-500 py-12">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-zinc-500 py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              <p>No files in this directory</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Modified</th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPath && (
                  <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer" onClick={goUp}>
                    <td className="px-6 py-3 text-sm text-zinc-300" colSpan={4}>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        <span>..</span>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map(item => (
                  <tr key={item.path} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-6 py-3 text-sm">
                      {item.type === "folder" ? (
                        <button onClick={() => navigateFolder(item.path)} className="flex items-center gap-2 text-white hover:text-cyan-400">
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                          {item.name}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-white">
                          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          {item.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-400">{item.type === "file" && item.size ? formatSize(item.size) : "-"}</td>
                    <td className="px-6 py-3 text-sm text-zinc-500">{item.lastModified ? new Date(item.lastModified).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-3 text-sm text-right">
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
