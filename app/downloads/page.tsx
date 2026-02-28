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

type AuthStep = "register" | "login" | "otp" | "authenticated" | "forgot-password" | "reset-password"

export default function DownloadsPage() {
  const [authStep, setAuthStep] = useState<AuthStep>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [company, setCompany] = useState("")
  const [contactName, setContactName] = useState("")
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
  const [resetOtp, setResetOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Register
  async function handleRegister() {
    setError("")
    if (!email || !password || !confirmPassword) { setError("Please fill in all fields."); return }
    if (!isCompanyEmail(email)) { setError("Please use a company email address. Free email services (Gmail, Yahoo, QQ, Hotmail, etc.) are not accepted."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, company, contactName }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Registration failed."); return }
      setAuthStep("login")
      setError("")
      alert("Registration successful! Please log in.")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Login
  async function handleLogin() {
    setError("")
    if (!email || !password) { setError("Please enter email and password."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Login failed."); return }
      setAuthStep("otp")
      setError("")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Verify OTP
  async function handleVerifyOtp() {
    setError("")
    if (!otpCode) { setError("Please enter the verification code."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: otpCode }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Verification failed."); return }
      setSessionToken(data.sessionToken || "verified")
      setAuthStep("authenticated")
      setError("")
      loadFiles("")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Forgot Password - request OTP
  async function handleForgotPassword() {
    setError("")
    setSuccessMsg("")
    if (!email) { setError("Please enter your email address."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to send reset code."); return }
      setSuccessMsg("A password reset code has been sent to your email.")
      setAuthStep("reset-password")
      setError("")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Reset Password - verify OTP + set new password
  async function handleResetPassword() {
    setError("")
    if (!resetOtp || !newPassword || !newPasswordConfirm) { setError("Please fill in all fields."); return }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }
    if (newPassword !== newPasswordConfirm) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp: resetOtp, newPassword }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Password reset failed."); return }
      setAuthStep("login")
      setError("")
      setPassword("")
      alert("Password reset successful! Please log in with your new password.")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Logout
  function handleLogout() {
    setAuthStep("login")
    setEmail("")
    setPassword("")
    setSessionToken("")
    setItems([])
    setCurrentPath("")
    setAgreed(false)
    setError("")
  }

  async function loadFiles(path: string) {
    setLoadingFiles(true)
    try {
      const res = await fetch(`/api/downloads?action=list&prefix=${encodeURIComponent(path)}`)
      const data = await res.json()
      setItems(data.items || [])
      setCurrentPath(path)
    } catch { setItems([]) } finally { setLoadingFiles(false) }
  }

  function handleItemClick(item: FileItem) {
    if (item.type === "folder") {
            const newPath = item.path.replace(/^public\//, "")
      loadFiles(newPath)
    } else {
      if (!agreed) {
        setPendingDownload(item.path)
        setShowDisclaimer(true)
      } else {
        fetch(`/api/downloads?action=download&key=${encodeURIComponent(item.path)}`).then(r=>r.json()).then(d=>{if(d.url)window.open(d.url,"_blank")})
      }
    }
  }

  function handleAgreeAndDownload() {
    setAgreed(true)
    setShowDisclaimer(false)
    if (pendingDownload) {
      fetch(`/api/downloads?action=download&key=${encodeURIComponent(pendingDownload)}`).then(r=>r.json()).then(d=>{if(d.url)window.open(d.url,"_blank")})
      setPendingDownload(null)
    }
  }

  function goUp() {
        const parts = currentPath.replace(/\/$/, "").split("/")
    parts.pop()
    loadFiles(parts.join("/"))
  }

  // ---- RENDER ----

  // Auth forms
  if (authStep !== "authenticated") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, paddingTop: 100 }}>
        <div style={{ background: "#111", borderRadius: 12, padding: 32, width: "100%", maxWidth: 420, boxShadow: "0 4px 32px #0008" }}>
          <h2 style={{ color: "#fff", marginBottom: 6, fontSize: 22, textAlign: "center" }}>NextGuard Downloads</h2>
          <p style={{ color: "#888", textAlign: "center", marginBottom: 20, fontSize: 14 }}>
            {authStep === "register" && "Create an account with your company email"}
            {authStep === "login" && "Sign in to access downloads"}
            {authStep === "otp" && `A verification code has been sent to ${email}`}
            {authStep === "forgot-password" && "Enter your email to receive a reset code"}
            {authStep === "reset-password" && `Enter the reset code sent to ${email}`}
          </p>
          {successMsg && <div style={{ background: "#1a3a1a", color: "#4caf50", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>{successMsg}</div>}
          {error && <div style={{ background: "#2a1a1a", color: "#f87171", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>{error}</div>}

          {authStep === "register" && (<>
            <input type="text" placeholder="Contact name" value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Company email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            <button onClick={handleRegister} disabled={loading} style={btnStyle}>{loading ? "Registering..." : "Register"}</button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#888" }}>Already have an account? <span onClick={() => { setAuthStep("login"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Sign in</span></p>
          </>)}

          {authStep === "login" && (<>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <div style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}>
              <span onClick={() => { setAuthStep("forgot-password"); setError(""); setSuccessMsg("") }} style={{ color: "#4ea1f5", cursor: "pointer", fontSize: 13 }}>Forgot password?</span>
            </div>
            <button onClick={handleLogin} disabled={loading} style={btnStyle}>{loading ? "Signing in..." : "Sign In"}</button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#888" }}>No account? <span onClick={() => { setAuthStep("register"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Register</span></p>
          </>)}

          {authStep === "otp" && (<>
            <input type="text" placeholder="Enter 6-digit code" value={otpCode} onChange={e => setOtpCode(e.target.value)} style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 8 }} maxLength={6} onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} />
            <button onClick={handleVerifyOtp} disabled={loading} style={btnStyle}>{loading ? "Verifying..." : "Verify"}</button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#888" }}><span onClick={() => { setAuthStep("login"); setError("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Back to login</span></p>
          </>)}

          {authStep === "forgot-password" && (<>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
            <button onClick={handleForgotPassword} disabled={loading} style={btnStyle}>{loading ? "Sending..." : "Send Reset Code"}</button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#888" }}><span onClick={() => { setAuthStep("login"); setError(""); setSuccessMsg("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Back to login</span></p>
          </>)}

          {authStep === "reset-password" && (<>
            <input type="text" placeholder="Enter 6-digit reset code" value={resetOtp} onChange={e => setResetOtp(e.target.value)} style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 8 }} maxLength={6} />
            <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm new password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} style={inputStyle} />
            <button onClick={handleResetPassword} disabled={loading} style={btnStyle}>{loading ? "Resetting..." : "Reset Password"}</button>
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#888" }}><span onClick={() => { setAuthStep("login"); setError(""); setSuccessMsg("") }} style={{ color: "#4ea1f5", cursor: "pointer" }}>Back to login</span></p>
          </>)}
        </div>
      </div>
    )
  }

  // File browser (authenticated)
  return (
    <div style={{ minHeight: "100vh", padding: "80px 16px 24px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ color: "#fff", fontSize: "clamp(20px, 5vw, 28px)", margin: 0 }}>Downloads</h1>
        <button onClick={handleLogout} style={{ background: "#333", color: "#fff", border: "1px solid #555", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>Logout</button>
      </div>
      {currentPath && (
        <button onClick={goUp} style={{ ...btnStyle, width: "auto", marginBottom: 16, padding: "6px 16px", background: "#222" }}>← Back</button>
      )}
      {loadingFiles ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888" }}>No files available.</p>
      ) : (
        <div style={{ background: "#111", borderRadius: 10, overflow: "hidden", border: "1px solid #222" }}>
          {items.map((item, i) => (
            <div key={i} onClick={() => handleItemClick(item)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < items.length - 1 ? "1px solid #222" : "none", cursor: "pointer", color: "#fff" }}>
              <span>{item.type === "folder" ? "📁" : "📄"} {item.name}</span>
              <span style={{ color: "#888", fontSize: 12 }}>{item.size ? formatSize(item.size) : ""}</span>
            </div>
          ))}
        </div>
      )}

      {showDisclaimer && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}>
          <div style={{ background: "#111", borderRadius: 12, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 4px 32px #0008" }}>
            <h3 style={{ color: "#fff", marginBottom: 12 }}>Download Disclaimer</h3>
            <p style={{ color: "#aaa", fontSize: 13, whiteSpace: "pre-line", marginBottom: 20 }}>{DISCLAIMER_TEXT}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowDisclaimer(false); setPendingDownload(null) }} style={{ ...btnStyle, background: "#333" }}>Cancel</button>
              <button onClick={handleAgreeAndDownload} style={btnStyle}>I Agree & Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", marginBottom: 12, borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }
const btnStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 6, border: "none", background: "#4ea1f5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 }
