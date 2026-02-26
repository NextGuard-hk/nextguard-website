"use client"
import { useState, useEffect } from "react"
import { Shield } from "lucide-react"

export default function SocAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/soc-auth")
      .then(r => {
        if (r.ok) setIsAuth(true)
        else setIsAuth(false)
      })
      .catch(() => setIsAuth(false))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const r = await fetch("/api/soc-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (r.ok) {
        setIsAuth(true)
      } else {
        setError("Invalid password")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  if (isAuth === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (isAuth) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-7 w-7 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">SOC Review</h1>
          </div>
          <p className="text-zinc-400 mb-6 text-sm">
            Access NextGuard SOC analysis dashboard
          </p>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none mb-4"
              placeholder="Enter SOC review password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Verifying..." : "Access SOC Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
