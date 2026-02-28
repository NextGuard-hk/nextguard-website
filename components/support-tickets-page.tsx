"use client"

import { useState, useRef } from "react"
import { PageHeader } from "./page-header"

const CATEGORIES = [
  { value: "installation", label: "Installation" },
  { value: "configuration", label: "Configuration" },
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "performance", label: "Performance" },
  { value: "connectivity", label: "Connectivity" },
  { value: "license", label: "License" },
  { value: "upgrade", label: "Upgrade" },
  { value: "security_incident", label: "Security Incident" },
  { value: "general", label: "General" },
]

const PRIORITIES = [
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-green-500" },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500" },
  open: { label: "Open", color: "bg-cyan-500" },
  in_progress: { label: "In Progress", color: "bg-purple-500" },
  waiting_customer: { label: "Waiting for Customer", color: "bg-yellow-500" },
  waiting_vendor: { label: "Waiting for Vendor", color: "bg-orange-500" },
  resolved: { label: "Resolved", color: "bg-green-500" },
  closed: { label: "Closed", color: "bg-gray-500" },
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB per file
const MAX_FILES = 5
const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/plain", "text/csv", "text/log",
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "application/octet-stream",
  "application/gzip",
]
const ALLOWED_EXTENSIONS = [".png",".jpg",".jpeg",".gif",".webp",".txt",".log",".csv",".pdf",".zip",".gz",".tar",".7z",".evtx",".pcap",".cap",".syslog"]

type FileAttachment = { name: string; size: number; type: string; data: string }
type View = "lookup" | "create" | "list" | "detail"

export default function SupportTicketsPage() {
  const [view, setView] = useState<View>("lookup")
  const [email, setEmail] = useState("")
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [comment, setComment] = useState("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", customerCompany: "",
    subject: "", description: "", category: "general",
    priority: "medium", product: "NextGuard DLP", version: "",
    environment: "", stepsToReproduce: "",
  })

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    if (attachments.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`); return
    }
    Array.from(files).forEach(file => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (file.size > MAX_FILE_SIZE) { setError(`File ${file.name} exceeds 5MB limit`); return }
      if (!ALLOWED_EXTENSIONS.includes(ext)) { setError(`File type ${ext} not allowed`); return }
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name, size: file.size, type: file.type,
          data: reader.result as string,
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  async function lookupTickets() {
    if (!email) { setError("Please enter your email"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/tickets?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setTickets(data.tickets || [])
      setView("list")
    } catch { setError("Failed to load tickets") }
    finally { setLoading(false) }
  }

  async function createTicket() {
    if (!form.customerName || !form.customerEmail || !form.subject || !form.description) {
      setError("Please fill all required fields: Name, Email, Subject, Description"); return
    }
    setLoading(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attachments }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSuccess(`Ticket submitted successfully! Your ticket ID: ${data.ticket.ticketId}. Please save this ID for tracking.`)
      setEmail(form.customerEmail)
      setAttachments([])
      setTimeout(() => { lookupByEmail(form.customerEmail) }, 2000)
    } catch { setError("Failed to create ticket") }
    finally { setLoading(false) }
  }

  async function lookupByEmail(e: string) {
    const res = await fetch(`/api/tickets?email=${encodeURIComponent(e)}`)
    const data = await res.json()
    setTickets(data.tickets || [])
    setView("list")
  }

  async function viewTicket(ticketId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets?ticketId=${ticketId}&email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.tickets?.length) { setSelectedTicket(data.tickets[0]); setView("detail") }
    } catch { setError("Failed to load ticket") }
    finally { setLoading(false) }
  }

  async function addComment() {
    if (!comment.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.ticketId, action: "comment", email, comment }),
      })
      const data = await res.json()
      if (data.ticket) { setSelectedTicket(data.ticket); setComment("") }
    } catch { setError("Failed to add comment") }
    finally { setLoading(false) }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("en-HK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }
  function formatTimeRemaining(ms: number) {
    if (ms <= 0) return "Breached"
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m remaining`
  }

  function isImage(name: string) {
    return /\.(png|jpg|jpeg|gif|webp)$/i.test(name)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <PageHeader badge="Support" headline="Technical Support" subheadline="Report issues, upload logs, and track your support requests" />
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error} <button onClick={() => setError("")} className="ml-2 underline">dismiss</button></div>}
        {success && <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded text-green-200 text-sm">{success}</div>}

        <div className="flex gap-3 mb-8">
          <button onClick={() => setView("lookup")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "lookup" || view === "list" ? "bg-primary-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>My Tickets</button>
          <button onClick={() => { setView("create"); setError(""); setSuccess("") }} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "create" ? "bg-primary-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>Report Issue</button>
          {view === "detail" && <button onClick={() => setView("list")} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700">Back to List</button>}
        </div>

        {/* Lookup View */}
        {view === "lookup" && (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Track Your Tickets</h2>
              <p className="text-gray-400 text-sm mb-4">Enter your email to view all your support tickets and their status.</p>
              <input type="email" placeholder="your@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && lookupTickets()} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4 focus:border-primary-500 outline-none" />
              <button onClick={lookupTickets} disabled={loading} className="w-full py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition disabled:opacity-50">{loading ? "Loading..." : "View My Tickets"}</button>
            </div>
          </div>
        )}

        {/* Create/Report Issue View */}
        {view === "create" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-2">Report an Issue</h2>
              <p className="text-gray-400 text-sm mb-6">Please describe your issue clearly. Upload screenshots and log files to help us resolve it faster.</p>

              {/* Contact Info */}
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name *</label>
                  <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email *</label>
                  <input type="email" value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="your@company.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company</label>
                  <input value={form.customerCompany} onChange={e => setForm({...form, customerCompany: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="Company name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Product</label>
                  <input value={form.product} onChange={e => setForm({...form, product: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" />
                </div>
              </div>

              {/* Issue Details */}
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Issue Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Version</label>
                  <input value={form.version} onChange={e => setForm({...form, version: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="e.g. 3.2.1" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Subject *</label>
                <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="Brief summary of the issue" />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Description *</label>
                <textarea rows={5} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none resize-y" placeholder="Describe the issue in detail: What happened? What did you expect?" />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Steps to Reproduce</label>
                <textarea rows={3} value={form.stepsToReproduce} onChange={e => setForm({...form, stepsToReproduce: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none resize-y" placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe that..." />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Environment / OS</label>
                <input value={form.environment} onChange={e => setForm({...form, environment: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none" placeholder="e.g. Windows Server 2022, CentOS 8, macOS 14" />
              </div>

              {/* File Upload Section */}
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Attachments</h3>
              <div className="mb-4">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-primary-500 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.gif,.webp,.txt,.log,.csv,.pdf,.zip,.gz,.tar,.7z,.evtx,.pcap,.cap,.syslog" onChange={handleFileSelect} className="hidden" />
                  <div className="text-3xl mb-2">📎</div>
                  <p className="text-gray-400 text-sm">Click to upload or drag files here</p>
                  <p className="text-gray-600 text-xs mt-1">Screenshots, logs, pcap files (Max 5MB each, up to {MAX_FILES} files)</p>
                  <p className="text-gray-600 text-xs">Supported: PNG, JPG, PDF, TXT, LOG, CSV, ZIP, GZ, EVTX, PCAP, SYSLOG</p>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {isImage(f.name) ? (
                            <img src={f.data} alt={f.name} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <span className="text-lg">📄</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{f.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(f.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300 text-sm ml-2 flex-shrink-0">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={createTicket} disabled={loading} className="w-full py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition disabled:opacity-50 text-lg">{loading ? "Submitting..." : "Submit Ticket"}</button>
            </div>
          </div>
        )}

        {/* Ticket List View */}
        {view === "list" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Your Tickets ({tickets.length})</h2>
              <button onClick={() => lookupByEmail(email)} className="text-sm text-primary-400 hover:text-primary-300">Refresh</button>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No tickets found</p>
                <p className="text-sm">Click "Report Issue" to submit a new ticket</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t: any) => (
                  <div key={t.ticketId} onClick={() => viewTicket(t.ticketId)} className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-primary-500/50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-gray-500">{t.ticketId}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${STATUS_LABELS[t.status]?.color || "bg-gray-600"}`}>{STATUS_LABELS[t.status]?.label || t.status}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${PRIORITIES.find(p => p.value === t.priority)?.color || "bg-gray-600"}`}>{t.priority}</span>
                          {t.attachments?.length > 0 && <span className="text-xs text-gray-500">📎 {t.attachments.length} file(s)</span>}
                        </div>
                        <h3 className="font-medium text-white truncate">{t.subject}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t.category} | {formatDate(t.createdAt)}</p>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        {t.slaStatus?.resolutionBreached ? (
                          <span className="text-red-400 font-medium">SLA Breached</span>
                        ) : t.slaStatus?.resolutionTimeRemaining ? (
                          <span className="text-yellow-400">{formatTimeRemaining(t.slaStatus.resolutionTimeRemaining)}</span>
                        ) : (
                          <span className="text-green-400">Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ticket Detail View */}
        {view === "detail" && selectedTicket && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-mono text-gray-500">{selectedTicket.ticketId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${STATUS_LABELS[selectedTicket.status]?.color}`}>{STATUS_LABELS[selectedTicket.status]?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${PRIORITIES.find(p => p.value === selectedTicket.priority)?.color}`}>{selectedTicket.priority}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{selectedTicket.subject}</h2>
                <p className="text-gray-300 whitespace-pre-wrap text-sm mb-4">{selectedTicket.description}</p>
                {selectedTicket.stepsToReproduce && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-400 mb-1">Steps to Reproduce</h4>
                    <p className="text-gray-300 whitespace-pre-wrap text-sm bg-gray-800 rounded p-3">{selectedTicket.stepsToReproduce}</p>
                  </div>
                )}
                {selectedTicket.environment && (
                  <p className="text-xs text-gray-500">Environment: {selectedTicket.environment}</p>
                )}
              </div>

              {/* Attachments Display */}
              {selectedTicket.attachments?.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-3">Attachments ({selectedTicket.attachments.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedTicket.attachments.map((f: any, i: number) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3">
                        {isImage(f.name) ? (
                          <a href={f.data} target="_blank" rel="noopener">
                            <img src={f.data} alt={f.name} className="w-full h-32 object-cover rounded mb-2 cursor-pointer hover:opacity-80" />
                          </a>
                        ) : (
                          <div className="w-full h-16 bg-gray-700 rounded mb-2 flex items-center justify-center text-2xl">📄</div>
                        )}
                        <p className="text-sm text-white truncate">{f.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(f.size)}</p>
                        <a href={f.data} download={f.name} className="text-xs text-primary-400 hover:text-primary-300">Download</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-4">Comments ({selectedTicket.comments?.length || 0})</h3>
                <div className="space-y-3 mb-4">
                  {(selectedTicket.comments || []).map((c: any) => (
                    <div key={c.id} className={`p-3 rounded-lg ${c.isStaff ? "bg-primary-900/30 border border-primary-800" : "bg-gray-800 border border-gray-700"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{c.by}</span>
                        {c.isStaff && <span className="text-xs bg-primary-500 px-1.5 py-0.5 rounded text-white">Support</span>}
                        <span className="text-xs text-gray-500">{formatDate(c.at)}</span>
                      </div>
                      <p className="text-sm text-gray-300">{c.message}</p>
                    </div>
                  ))}
                </div>
                {selectedTicket.status !== "closed" && (
                  <div>
                    <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a reply..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none resize-y mb-2" />
                    <button onClick={addComment} disabled={loading || !comment.trim()} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg text-sm font-medium transition disabled:opacity-50">{loading ? "Sending..." : "Send Reply"}</button>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-bold mb-4">Timeline</h3>
                <div className="space-y-2">
                  {(selectedTicket.timeline || []).slice().reverse().map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-300">{t.message}</p>
                        <p className="text-xs text-gray-600">{t.by} | {formatDate(t.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="font-bold mb-3 text-sm">Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Category</dt><dd>{CATEGORIES.find(c => c.value === selectedTicket.category)?.label || selectedTicket.category}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Product</dt><dd>{selectedTicket.product}</dd></div>
                  {selectedTicket.version && <div className="flex justify-between"><dt className="text-gray-500">Version</dt><dd>{selectedTicket.version}</dd></div>}
                  <div className="flex justify-between"><dt className="text-gray-500">Assignee</dt><dd>{selectedTicket.assignee || "Pending"}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd>{formatDate(selectedTicket.createdAt)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Updated</dt><dd>{formatDate(selectedTicket.updatedAt)}</dd></div>
                </dl>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="font-bold mb-3 text-sm">SLA Status</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Response</dt>
                    <dd className={selectedTicket.firstResponseAt ? "text-green-400" : selectedTicket.slaStatus?.responseBreached ? "text-red-400" : "text-yellow-400"}>
                      {selectedTicket.firstResponseAt ? "Responded" : selectedTicket.slaStatus?.responseBreached ? "Breached" : formatTimeRemaining(selectedTicket.slaStatus?.responseTimeRemaining || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Resolution</dt>
                    <dd className={selectedTicket.resolvedAt ? "text-green-400" : selectedTicket.slaStatus?.resolutionBreached ? "text-red-400" : "text-yellow-400"}>
                      {selectedTicket.resolvedAt ? "Resolved" : selectedTicket.slaStatus?.resolutionBreached ? "Breached" : formatTimeRemaining(selectedTicket.slaStatus?.resolutionTimeRemaining || 0)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
