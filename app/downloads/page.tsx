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

const DISCLAIMER_TEXT = `By downloading software, documentation, or any files from this page, you acknowledge and agree to the following:\n\n1. All materials provided are the proprietary property of NextGuard Technology and are protected by applicable intellectual property laws.\n2. You are granted a limited, non-exclusive, non-transferable license to use the downloaded materials solely for evaluation or authorized business purposes.\n3. Redistribution, reverse engineering, or unauthorized sharing of any downloaded content is strictly prohibited.\n4. All software is provided "AS IS" without warranty of any kind.\n5. NextGuard Technology reserves the right to revoke access at any time without prior notice.`

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "yahoo.co.jp", "yahoo.co.uk", "yahoo.com.hk",
  "hotmail.com", "outlook.com", "live.com", "msn.com",
  "163.com", "126.com", "yeah.net", "qq.com", "foxmail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "mail.com", "zoho.com", "protonmail.com", "proton.me",
  "yandex.com", "gmx.com", "gmx.net", "web.de",
  "naver.com", "hanmail.net", "daum.net"
]

function isCompanyEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false
  return !FREE_EMAIL_DOMAINS.includes(domain)
}

type AuthStep = "register" | "login" | "otp" | "authenticated"

export default function DownloadsPage() {
  const [authStep, setAuthStep] = useState<AuthStep>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionToken, setSessionToken] = useState("")

  const [items, setItems] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("")
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<string | null>(null)

  // Register
  async function handleRegister() {
    setError("")
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.")
      return
    }
    if (!isCompanyEmail(email)) {
      setError("Please use a company email address. Free email services (Gmail, Yahoo, QQ, Hotmail, etc.) are not accepted.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Registration failed."); return }
      setAuthStep("login")
      setError("")
      alert("Registration successful! Please log in.")
    } catch { setError("Network error.") }
    finally { setLoading(false) }
  }

  // Login
  async function handleLogin() {
    setError("")
    if (!email || !password) {
      setError("Please enter email and password.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Login failed."); return }
      setAuthStep("otp")
      setError("")
    } catch { setError("Network error.") }
    finally { setLoading(false) }
  }

  // Verify OTP
  async function handleVerifyOtp() {
    setError("")
    if (!otpCode) { setError("Please enter the verification code."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Verification failed."); return }
      setSessionToken(data.sessionToken || "verified")
      setAuthStep("authenticated")
      setError("")
      loadFiles("")
    } catch { setError("Network error.") }
    finally { setLoading(false) }
  }

  async function loadFiles(path: string) {
    setLoadingFiles(true)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(PUBLIC_PREFIX + path)}`)
      const data = await res.json()
      setItems(data.items || [])
      setCurrentPath(path)
    } catch { setItems([]) }
    finally { setLoadingFiles(false) }
  }

  function handleItemClick(item: FileItem) {
    if (item.type === "folder") {
      const newPath = currentPath ? currentPath + "/" + item.name : item.name
      loadFiles(newPath)
    } else {
      if (!agreed) {
        setPendingDownload(item.path)
        setShowDisclaimer(true)
      } else {
        window.open(`/api/download?file=${encodeURIComponent(item.path)}`, "_blank")
      }
    }
  }

  function handleAgreeAndDownload() {
    setAgreed(true)
    setShowDisclaimer(false)
    if (pendingDownload) {
      window.open(`/api/download?file=${encodeURIComponent(pendingDownload)}`, "_blank")
      setPendingDownload(null)
    }
  }

  function goUp() {
    const parts = currentPath.split("/")
    parts.pop()
    loadFiles(parts.join("/"))
  }

  // Auth forms
  if (authStep !== "authenticated") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#111", border: "1px solid #333", borderRadius: 12, padding: 40, maxWidth: 420, width: "100%" }}>
          <h1 style={{ color: "#fff", fontSize: 24, marginBottom: 8, textAlign: "center" }}>NextGuard Downloads</h1>
          <p style={{ color: "#888", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
            {authStep === "register" && "Create an account with your company email"}
            {authStep === "login" && "Sign in to access downloads"}
            {authStep === "otp" && `A verification code has been sent to ${email}`}
          </p>

          {error && <div style={{ background: "#3a1111", border: "1px solid #e74c3c", color: "#e74c3c", padding: "8px 12px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}

          {authStep === "register" && (
            <>
              <input type="email" placeholder="Company email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
              <button onClick={handleRegister} disabled={loading} style={btnStyle}>{loading ? "Registering..." : "Register"}</button>
              <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 16 }}>
                Already have an account? <span onClick={() => { setAuthStep("login"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Sign in</span>
              </p>
            </>
          )}

          {authStep === "login" && (
            <>
              <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
              <button onClick={handleLogin} disabled={loading} style={btnStyle}>{loading ? "Signing in..." : "Sign In"}</button>
              <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 16 }}>
                No account? <span onClick={() => { setAuthStep("register"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Register</span>
              </p>
            </>
          )}

          {authStep === "otp" && (
            <>
              <input type="text" placeholder="Enter 6-digit code" value={otpCode} onChange={e => setOtpCode(e.target.value)} style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 8 }} maxLength={6} onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} />
              <button onClick={handleVerifyOtp} disabled={loading} style={btnStyle}>{loading ? "Verifying..." : "Verify"}</button>
              <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 16 }}>
                <span onClick={() => { setAuthStep("login"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Back to login</span>
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // File browser (authenticated)
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", fontSize: 24, marginBottom: 24 }}>Downloads</h1>

        {currentPath && (
          <button onClick={goUp} style={{ background: "none", border: "1px solid #333", color: "#4ea1f5", padding: "6px 16px", borderRadius: 6, cursor: "pointer", marginBottom: 16 }}>
            ← Back
          </button>
        )}

        {loadingFiles ? (
          <p style={{ color: "#888" }}>Loading...</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#888" }}>No files available.</p>
        ) : (
          <div style={{ border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
            {items.map((item, i) => (
              <div key={i} onClick={() => handleItemClick(item)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < items.length - 1 ? "1px solid #222" : "none", cursor: "pointer", color: "#fff" }}>
                <span>{item.type === "folder" ? "📁" : "📄"} {item.name}</span>
                <span style={{ color: "#888", fontSize: 13 }}>{item.size ? formatSize(item.size) : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDisclaimer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#111", border: "1px solid #333", borderRadius: 12, padding: 32, maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "auto" }}>
            <h2 style={{ color: "#fff", marginBottom: 16 }}>Download Disclaimer</h2>
            <pre style={{ color: "#ccc", fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 24 }}>{DISCLAIMER_TEXT}</pre>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowDisclaimer(false); setPendingDownload(null) }} style={{ ...btnStyle, background: "#333" }}>Cancel</button>
              <button onClick={handleAgreeAndDownload} style={btnStyle}>I Agree & Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 6,
  border: "1px solid #333", background: "#1a1a1a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box"
}

const btnStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 6, border: "none",
  background: "#4ea1f5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4
}
