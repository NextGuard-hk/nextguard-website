"use client"

import { useState, useEffect } from "react"

interface Contact {
  id: string
  fullName: string
  email: string
  company: string
  message: string
  timestamp: string
}

export default function AdminContactsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpExpiry, setTotpExpiry] = useState(0)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch("/api/contact/auth")
      if (res.ok) {
        setIsAuthenticated(true)
        fetchContacts()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setChecking(false)
    }
  }

  async function fetchTotpCode() {
    if (!password) {
      setError("Enter password first")
      return
    }
    setTotpLoading(true)
    setError("")
    try {
      const res = await fetch("/api/contact/totp", {
        headers: { "x-admin-password": password },
      })
      const data = await res.json()
      if (res.ok) {
        setTotpCode(data.code)
        setTotpExpiry(data.expiresIn)
      } else {
        setError(data.message || "Failed to get 2FA code")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/contact/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, totpCode }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsAuthenticated(true)
        fetchContacts()
      } else {
        setError(data.message || "Login failed")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contact")
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts || [])
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    }
  }

  async function handleLogout() {
    await fetch("/api/contact/auth", { method: "DELETE" })
    setIsAuthenticated(false)
    setContacts([])
    setPassword("")
    setTotpCode("")
  }

  function downloadCSV() {
    window.open("/api/contact?format=csv", "_blank")
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-zinc-400 text-sm mb-6">Contact Submissions Dashboard</p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">2FA Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={fetchTotpCode}
                    disabled={totpLoading || !password}
                    className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {totpLoading ? "..." : "Get Code"}
                  </button>
                </div>
                {totpExpiry > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">Code expires in {totpExpiry}s</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Contact Submissions</h1>
            <p className="text-zinc-400 text-sm mt-1">{contacts.length} total submissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchContacts}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={downloadCSV}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Company</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Message</th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-zinc-500 py-12">No submissions yet</td>
                  </tr>
                ) : (
                  contacts.slice().reverse().map((c) => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-6 py-4 text-sm text-white">{c.fullName}</td>
                      <td className="px-6 py-4 text-sm text-cyan-400">{c.email}</td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{c.company || "-"}</td>
                      <td className="px-6 py-4 text-sm text-zinc-300 max-w-xs truncate">{c.message}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">
                        {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
