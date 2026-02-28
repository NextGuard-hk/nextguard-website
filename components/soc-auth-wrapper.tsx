"use client"
import { useState } from "react"
import { Shield } from "lucide-react"

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

type AuthStep = "login" | "register" | "otp" | "forgot-password" | "reset-password" | "force-reset-password"
export default function SocAuthWrapper({ children }: { children: React.ReactNode }) {
  const [authStep, setAuthStep] = useState<AuthStep>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [company, setCompany] = useState("")
  const [contactName, setContactName] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [resetOtp, setResetOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Register
  async function handleRegister() {
    setError("")
    if (!email || !password || !confirmPassword) { setError("Please fill in all fields."); return }
    if (!isCompanyEmail(email)) { setError("Please use a company email address."); return }
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
      if (data.mustResetPassword) {
        setAuthStep("force-reset-password")
      } else {
        setIsAuth(true)
      }
      setError("")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Forgot Password
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

  // Reset Password
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

  // Force Reset Password (admin-triggered)
  async function handleForceResetPassword() {
    setError("")
    if (!newPassword || !newPasswordConfirm) { setError("Please fill in all fields."); return }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }
    if (newPassword !== newPasswordConfirm) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/download-users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, newPassword, forceReset: true }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Password reset failed."); return }
      setIsAuth(true)
      setError("")
    } catch { setError("Network error.") } finally { setLoading(false) }
  }

  // Logout
  function handleLogout() {
    setIsAuth(false)
    setEmail("")
    setPassword("")
    setAuthStep("login")
    setError("")
  }

  // If authenticated, show children with a logout button overlay
  if (isAuth) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <button onClick={handleLogout} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg border border-zinc-600 transition-colors">Logout</button>
        </div>
        {children}
      </div>
    )
  }

  // Auth forms
  const cardStyle = "bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl w-full max-w-md"
  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none mb-3"
  const btnCls = "w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 text-white font-medium py-2.5 rounded-lg transition-colors mt-1"
  const linkCls = "text-cyan-400 cursor-pointer hover:underline text-sm"

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24">
      <div className={cardStyle}>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-6 w-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">AI SOC</h1>
        </div>
        <p className="text-zinc-400 text-sm mb-5">
          {authStep === "login" && "Sign in to access the AI SOC dashboard"}
          {authStep === "register" && "Create an account with your company email"}
          {authStep === "otp" && `Verification code sent to ${email}`}
          {authStep === "forgot-password" && "Enter your email to receive a reset code"}
          {authStep === "reset-password" && `Enter the reset code sent to ${email}`}
          {authStep === "force-reset-password" && "Password change required"}
        </p>
        {successMsg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg mb-4 text-sm">{successMsg}</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Login */}
        {authStep === "login" && (
          <>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <div className="text-right -mt-1 mb-3"><span onClick={() => { setAuthStep("forgot-password"); setError(""); setSuccessMsg("") }} className={linkCls}>Forgot password?</span></div>
            <button onClick={handleLogin} disabled={loading} className={btnCls}>{loading ? "Signing in..." : "Sign In"}</button>
            <p className="text-center mt-4 text-zinc-500 text-sm">No account? <span onClick={() => { setAuthStep("register"); setError("") }} className={linkCls}>Register</span></p>
          </>
        )}

        {/* Register */}
        {authStep === "register" && (
          <>
            <input type="text" placeholder="Contact name" value={contactName} onChange={e => setContactName(e.target.value)} className={inputCls} />
            <input type="text" placeholder="Company name" value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
            <input type="email" placeholder="Company email address" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
            <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
            <button onClick={handleRegister} disabled={loading} className={btnCls}>{loading ? "Registering..." : "Register"}</button>
            <p className="text-center mt-4 text-zinc-500 text-sm">Already have an account? <span onClick={() => { setAuthStep("login"); setError("") }} className={linkCls}>Sign in</span></p>
          </>
        )}

        {/* OTP */}
        {authStep === "otp" && (
          <>
            <input type="text" placeholder="Enter 6-digit code" value={otpCode} onChange={e => setOtpCode(e.target.value)} className={inputCls + " text-center text-2xl tracking-widest"} maxLength={6} onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} />
            <button onClick={handleVerifyOtp} disabled={loading} className={btnCls}>{loading ? "Verifying..." : "Verify"}</button>
            <p className="text-center mt-4 text-zinc-500 text-sm"><span onClick={() => { setAuthStep("login"); setError("") }} className={linkCls}>Back to login</span></p>
          </>
        )}

        {/* Forgot Password */}
        {authStep === "forgot-password" && (
          <>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
            <button onClick={handleForgotPassword} disabled={loading} className={btnCls}>{loading ? "Sending..." : "Send Reset Code"}</button>
            <p className="text-center mt-4 text-zinc-500 text-sm"><span onClick={() => { setAuthStep("login"); setError(""); setSuccessMsg("") }} className={linkCls}>Back to login</span></p>
          </>
        )}

        {/* Reset Password */}
        {authStep === "reset-password" && (
          <>
            <input type="text" placeholder="Enter 6-digit reset code" value={resetOtp} onChange={e => setResetOtp(e.target.value)} className={inputCls + " text-center text-2xl tracking-widest"} maxLength={6} />
            <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} />
            <input type="password" placeholder="Confirm new password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} className={inputCls} />
            <button onClick={handleResetPassword} disabled={loading} className={btnCls}>{loading ? "Resetting..." : "Reset Password"}</button>
            <p className="text-center mt-4 text-zinc-500 text-sm"><span onClick={() => { setAuthStep("login"); setError(""); setSuccessMsg("") }} className={linkCls}>Back to login</span></p>
          </>
        )}

        {/* Force Reset Password */}
        {authStep === "force-reset-password" && (
          <>
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">Your account requires a password change before you can continue.</div>
            <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} />
            <input type="password" placeholder="Confirm new password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} className={inputCls} />
            <button onClick={handleForceResetPassword} disabled={loading} className={btnCls}>{loading ? "Saving..." : "Set New Password"}</button>
          </>
        )}

      </div>
    </div>
  )
}
