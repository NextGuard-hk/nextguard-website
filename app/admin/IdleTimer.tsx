"use client"
import { useState, useEffect, useCallback } from "react"

const SESSION_TIMEOUT = 30 * 60 // 30 minutes in seconds
const WARNING_THRESHOLD = 5 * 60 // Show warning at 5 minutes remaining

export default function IdleTimer({ onLogout }: { onLogout: () => void }) {
  const [remaining, setRemaining] = useState(SESSION_TIMEOUT)
  const [lastActivity, setLastActivity] = useState(Date.now())

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now())
    setRemaining(SESSION_TIMEOUT)
  }, [])

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"]
    events.forEach(e => window.addEventListener(e, resetTimer))
    return () => events.forEach(e => window.removeEventListener(e, resetTimer))
  }, [resetTimer])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity) / 1000)
      const left = Math.max(SESSION_TIMEOUT - elapsed, 0)
      setRemaining(left)
      if (left <= 0) { clearInterval(interval); onLogout() }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastActivity, onLogout])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const pct = (remaining / SESSION_TIMEOUT) * 100
  const isWarning = remaining <= WARNING_THRESHOLD

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between text-xs ${
      isWarning ? "bg-red-600/20 border-b border-red-500/40" : "bg-zinc-800/50 border-b border-zinc-700/50"
    }`}>
      <div className="flex items-center gap-3">
        <span className={isWarning ? "text-red-400 font-medium" : "text-zinc-400"}>Session:</span>
        <div className="w-32 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isWarning ? "bg-red-500" : "bg-cyan-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono ${isWarning ? "text-red-400 font-bold" : "text-zinc-400"}`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
      {isWarning && (
        <span className="text-red-400 animate-pulse">Session expiring soon - move mouse to stay active</span>
      )}
    </div>
  )
}
