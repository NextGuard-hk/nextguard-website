"use client"

import { useState, useEffect } from "react"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500" },
  open: { label: "Open", color: "bg-cyan-500" },
  in_progress: { label: "In Progress", color: "bg-purple-500" },
  waiting_customer: { label: "Waiting Customer", color: "bg-yellow-500" },
  waiting_vendor: { label: "Waiting Vendor", color: "bg-orange-500" },
  resolved: { label: "Resolved", color: "bg-green-500" },
  closed: { label: "Closed", color: "bg-gray-500" },
}
const STATUSES = ["new","open","in_progress","waiting_customer","waiting_vendor","resolved","closed"]
const PRIORITIES = ["critical","high","medium","low"]
const PRIORITY_COLORS: Record<string,string> = { critical:"bg-red-600", high:"bg-orange-500", medium:"bg-yellow-500", low:"bg-green-500" }

function isImage(name: string) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name) }
function fmtSize(b: number) { return b < 1024 ? b+" B" : b < 1048576 ? (b/1024).toFixed(1)+" KB" : (b/1048576).toFixed(1)+" MB" }

export default function AdminTicketsPage() {
  const [secret, setSecret] = useState("")
  const [authed, setAuthed] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [kpi, setKpi] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState("")
  const [staffName, setStaffName] = useState("Support Team")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPriority, setFilterPriority] = useState("")

  async function loadTickets() {
    setLoading(true)
    try {
      let url = `/api/tickets?secret=${encodeURIComponent(secret)}`
      if (filterStatus) url += `&status=${filterStatus}`
      if (filterPriority) url += `&priority=${filterPriority}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setTickets(data.tickets || [])
      setKpi(data.kpi)
      setAuthed(true)
    } catch { alert("Failed to load") }
    finally { setLoading(false) }
  }

  async function doAction(ticketId: string, action: string, extra: any = {}) {
    setLoading(true)
    try {
      const res = await fetch("/api/tickets", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action, secret, staffName, ...extra }),
      })
      const data = await res.json()
      if (data.ticket) { setSelected(data.ticket); loadTickets() }
    } catch { alert("Action failed") }
    finally { setLoading(false) }
  }

  function fmt(d: string) { return new Date(d).toLocaleString("en-HK", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) }

  if (!authed) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold mb-4">Admin - Ticket Dashboard</h1>
        <input type="password" placeholder="Admin Secret" value={secret} onChange={e => setSecret(e.target.value)} onKeyDown={e => e.key === "Enter" && loadTickets()} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4" />
        <button onClick={loadTickets} disabled={loading} className="w-full py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium">{loading ? "Loading..." : "Login"}</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Ticket Management Dashboard</h1>
          <div className="flex items-center gap-3">
            <input placeholder="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white w-40" />
            <button onClick={loadTickets} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 rounded text-sm">Refresh</button>
          </div>
        </div>

        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold">{kpi.totalTickets}</div><div className="text-xs text-gray-500">Total</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-cyan-400">{kpi.openTickets}</div><div className="text-xs text-gray-500">Open</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-400">{kpi.resolvedTickets}</div><div className="text-xs text-gray-500">Resolved</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-400">{kpi.breachedResponse}</div><div className="text-xs text-gray-500">Resp Breached</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-400">{kpi.breachedResolution}</div><div className="text-xs text-gray-500">Res Breached</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{kpi.avgResolutionHours}h</div><div className="text-xs text-gray-500">Avg Resolution</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-red-500">{kpi.byPriority?.critical || 0}</div><div className="text-xs text-gray-500">Critical</div></div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTimeout(loadTickets, 100) }} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label}</option>)}
          </select>
          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setTimeout(loadTickets, 100) }} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white">
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {tickets.map((t: any) => (
              <div key={t.ticketId} onClick={() => setSelected(t)} className={`bg-gray-900 border rounded-lg p-3 cursor-pointer transition ${selected?.ticketId === t.ticketId ? "border-primary-500" : "border-gray-800 hover:border-gray-600"}`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-500">{t.ticketId}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${STATUS_LABELS[t.status]?.color}`}>{STATUS_LABELS[t.status]?.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  {t.slaStatus?.resolutionBreached && <span className="text-xs text-red-400 font-bold">SLA!</span>}
                  {t.attachments?.length > 0 && <span className="text-xs text-gray-500">📎{t.attachments.length}</span>}
                </div>
                <h3 className="text-sm font-medium truncate">{t.subject}</h3>
                <p className="text-xs text-gray-500">{t.customerName} ({t.customerCompany}) | {fmt(t.createdAt)}</p>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-gray-500 text-center py-8">No tickets found</p>}
          </div>

          {selected ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-sm text-gray-400">{selected.ticketId}</span>
                <span className={`text-xs px-2 py-0.5 rounded text-white ${STATUS_LABELS[selected.status]?.color}`}>{STATUS_LABELS[selected.status]?.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded text-white ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
              </div>
              <h2 className="text-lg font-bold mb-2">{selected.subject}</h2>
              <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap">{selected.description}</p>

              {selected.stepsToReproduce && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-1">Steps to Reproduce</h4>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 rounded p-2">{selected.stepsToReproduce}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><span className="text-gray-500">Customer:</span> {selected.customerName}</div>
                <div><span className="text-gray-500">Email:</span> {selected.customerEmail}</div>
                <div><span className="text-gray-500">Company:</span> {selected.customerCompany}</div>
                <div><span className="text-gray-500">Product:</span> {selected.product} {selected.version}</div>
                <div><span className="text-gray-500">Assignee:</span> {selected.assignee || "Unassigned"}</div>
                {selected.environment && <div><span className="text-gray-500">Environment:</span> {selected.environment}</div>}
              </div>

              {/* Attachments */}
              {selected.attachments?.length > 0 && (
                <div className="border-t border-gray-800 pt-3 mb-3">
                  <h3 className="text-sm font-bold mb-2">📎 Attachments ({selected.attachments.length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.attachments.map((f: any, i: number) => (
                      <div key={i} className="bg-gray-800 rounded p-2">
                        {isImage(f.name) ? (
                          <a href={f.data} target="_blank" rel="noopener"><img src={f.data} alt={f.name} className="w-full h-20 object-cover rounded mb-1 hover:opacity-80" /></a>
                        ) : (
                          <div className="w-full h-12 bg-gray-700 rounded mb-1 flex items-center justify-center text-xl">📄</div>
                        )}
                        <p className="text-xs text-white truncate">{f.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{fmtSize(f.size)}</span>
                          <a href={f.data} download={f.name} className="text-xs text-primary-400 hover:text-primary-300">Download</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-800 pt-3 mb-3">
                <h3 className="text-sm font-bold mb-2">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <select onChange={e => e.target.value && doAction(selected.ticketId, "update_status", { status: e.target.value })} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" defaultValue=""><option value="" disabled>Change Status</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label}</option>)}</select>
                  <select onChange={e => e.target.value && doAction(selected.ticketId, "update_priority", { priority: e.target.value })} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" defaultValue=""><option value="" disabled>Change Priority</option>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  <input placeholder="Assign to..." onKeyDown={e => { if (e.key === "Enter") { doAction(selected.ticketId, "assign", { assignee: (e.target as HTMLInputElement).value }); (e.target as HTMLInputElement).value = "" } }} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white w-32" />
                </div>
              </div>

              {/* Comments */}
              <div className="border-t border-gray-800 pt-3 mb-3">
                <h3 className="text-sm font-bold mb-2">Comments ({selected.comments?.length || 0})</h3>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {(selected.comments || []).map((c: any) => (
                    <div key={c.id} className={`p-2 rounded text-xs ${c.isStaff ? "bg-primary-900/30 border border-primary-800" : "bg-gray-800"}`}>
                      <span className="font-medium">{c.by}</span>{c.isStaff && <span className="text-primary-400 ml-1">[Staff]</span>} <span className="text-gray-600">{fmt(c.at)}</span>
                      <p className="text-gray-300 mt-1">{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Staff reply..." className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white" />
                  <button onClick={() => { doAction(selected.ticketId, "comment", { comment }); setComment("") }} disabled={!comment.trim()} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 rounded text-sm disabled:opacity-50">Reply</button>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-gray-800 pt-3">
                <h3 className="text-sm font-bold mb-2">Timeline</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(selected.timeline || []).slice().reverse().map((t: any, i: number) => (
                    <div key={i} className="text-xs text-gray-400"><span className="text-gray-600">{fmt(t.at)}</span> - {t.message} <span className="text-gray-600">by {t.by}</span></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex items-center justify-center text-gray-500">Select a ticket to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
