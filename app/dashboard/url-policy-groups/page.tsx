'use client'
import { useState, useEffect, useCallback } from 'react'

interface Group { id: number; name: string; description: string; priority: number; is_active: number; rules: Rule[]; members: string[] }
interface Rule { id: number; category: string; action: string }
interface Override { id: number; domain: string; user_id: string|null; action: string; reason: string; expires_at: string|null }
interface ChangeReq { id: number; domain: string; current_category: string; requested_category: string; reason: string; submitted_by: string; status: string; created_at: string }

const BASE = '/api/v1/url-policy'
const ACTIONS = ['Allow','Warn','Block','Isolate']
const TABS = ['Groups','Overrides','Change Requests'] as const

export default function UrlPolicyGroupsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('Groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [changeReqs, setChangeReqs] = useState<ChangeReq[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [g, o, c] = await Promise.all([
        fetch(`${BASE}/groups`).then(r=>r.json()),
        fetch(`${BASE}/overrides`).then(r=>r.json()),
        fetch(`${BASE}/change-requests`).then(r=>r.json()),
      ])
      setGroups(g.groups || [])
      setOverrides(o.overrides || [])
      setChangeReqs(c.requests || [])
    } catch(e) { setMsg('Failed to load: '+(e as Error).message) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // --- Group CRUD ---
  const [newGroup, setNewGroup] = useState({ name:'', description:'', priority:10 })
  const createGroup = async () => {
    if (!newGroup.name) return
    await fetch(`${BASE}/groups`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newGroup) })
    setNewGroup({ name:'', description:'', priority:10 })
    setMsg('Group created'); fetchAll()
  }
  const deleteGroup = async (id: number) => {
    await fetch(`${BASE}/groups?groupId=${id}`, { method:'DELETE' })
    setMsg('Group deleted'); fetchAll()
  }

  // --- Override CRUD ---
  const [newOverride, setNewOverride] = useState({ domain:'', action:'Block', reason:'' })
  const createOverride = async () => {
    if (!newOverride.domain) return
    await fetch(`${BASE}/overrides`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newOverride) })
    setNewOverride({ domain:'', action:'Block', reason:'' })
    setMsg('Override created'); fetchAll()
  }
  const deleteOverride = async (id: number) => {
    await fetch(`${BASE}/overrides?id=${id}`, { method:'DELETE' })
    setMsg('Override deleted'); fetchAll()
  }

  // --- Change Request ---
  const [newReq, setNewReq] = useState({ domain:'', requestedCategory:'', reason:'' })
  const submitReq = async () => {
    if (!newReq.domain || !newReq.requestedCategory) return
    await fetch(`${BASE}/change-requests`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newReq) })
    setNewReq({ domain:'', requestedCategory:'', reason:'' })
    setMsg('Request submitted'); fetchAll()
  }
  const reviewReq = async (id: number, status: string) => {
    await fetch(`${BASE}/change-requests`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, status }) })
    setMsg(`Request ${status}`); fetchAll()
  }

  const badge = (s: string) => {
    const colors: Record<string,string> = { Block:'bg-red-600', Warn:'bg-yellow-600', Allow:'bg-green-600', Isolate:'bg-purple-600', pending:'bg-yellow-600', approved:'bg-green-600', rejected:'bg-red-600' }
    return <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${colors[s]||'bg-gray-600'}`}>{s}</span>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-1">URL Policy Management</h1>
      <p className="text-gray-400 text-sm mb-4">User/Group policies, domain overrides, and category change requests</p>
      {msg && <div className="mb-3 p-2 bg-blue-900/50 border border-blue-700 rounded text-sm">{msg} <button onClick={()=>setMsg('')} className="ml-2 text-blue-400">x</button></div>}

      <div className="flex gap-1 mb-4">
        {TABS.map(t => <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-t text-sm font-medium ${tab===t?'bg-gray-800 text-white':'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>{t}</button>)}
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : tab==='Groups' ? (
        <div>
          <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
            <h3 className="font-semibold mb-2">Create Group</h3>
            <div className="flex gap-2 flex-wrap">
              <input placeholder="Group name" value={newGroup.name} onChange={e=>setNewGroup({...newGroup,name:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]" />
              <input placeholder="Description" value={newGroup.description} onChange={e=>setNewGroup({...newGroup,description:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]" />
              <input type="number" placeholder="Priority" value={newGroup.priority} onChange={e=>setNewGroup({...newGroup,priority:+e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-20" />
              <button onClick={createGroup} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded text-sm font-medium">Create</button>
            </div>
          </div>
          {groups.length===0 ? <p className="text-gray-500 text-sm">No groups yet.</p> : groups.map(g => (
            <div key={g.id} className="bg-gray-900 rounded-lg p-4 mb-3 border border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <div><span className="font-semibold">{g.name}</span> <span className="text-gray-500 text-xs ml-2">Priority: {g.priority}</span></div>
                <button onClick={()=>deleteGroup(g.id)} className="text-red-400 text-xs hover:text-red-300">Delete</button>
              </div>
              <p className="text-gray-400 text-sm mb-2">{g.description}</p>
              <div className="text-xs text-gray-500">Rules: {g.rules?.length||0} | Members: {g.members?.length||0}</div>
            </div>
          ))}
        </div>
      ) : tab==='Overrides' ? (
        <div>
          <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
            <h3 className="font-semibold mb-2">Add Override</h3>
            <div className="flex gap-2 flex-wrap">
              <input placeholder="Domain" value={newOverride.domain} onChange={e=>setNewOverride({...newOverride,domain:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]" />
              <select value={newOverride.action} onChange={e=>setNewOverride({...newOverride,action:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm">
                {ACTIONS.map(a=><option key={a}>{a}</option>)}
              </select>
              <input placeholder="Reason" value={newOverride.reason} onChange={e=>setNewOverride({...newOverride,reason:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[100px]" />
              <button onClick={createOverride} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded text-sm font-medium">Add</button>
            </div>
          </div>
          {overrides.length===0 ? <p className="text-gray-500 text-sm">No overrides.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-800"><th className="text-left py-2">Domain</th><th>Action</th><th>User</th><th>Reason</th><th>Expires</th><th></th></tr></thead>
              <tbody>{overrides.map(o=>(
                <tr key={o.id} className="border-b border-gray-800/50">
                  <td className="py-2 font-mono text-xs">{o.domain}</td>
                  <td className="text-center">{badge(o.action)}</td>
                  <td className="text-center text-gray-400 text-xs">{o.user_id||'Global'}</td>
                  <td className="text-gray-400 text-xs">{o.reason||'-'}</td>
                  <td className="text-gray-500 text-xs">{o.expires_at||'Never'}</td>
                  <td><button onClick={()=>deleteOverride(o.id)} className="text-red-400 text-xs">Del</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
            <h3 className="font-semibold mb-2">Submit Change Request</h3>
            <div className="flex gap-2 flex-wrap">
              <input placeholder="Domain" value={newReq.domain} onChange={e=>setNewReq({...newReq,domain:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]" />
              <input placeholder="Requested Category" value={newReq.requestedCategory} onChange={e=>setNewReq({...newReq,requestedCategory:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]" />
              <input placeholder="Reason" value={newReq.reason} onChange={e=>setNewReq({...newReq,reason:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[100px]" />
              <button onClick={submitReq} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded text-sm font-medium">Submit</button>
            </div>
          </div>
          {changeReqs.length===0 ? <p className="text-gray-500 text-sm">No requests.</p> : changeReqs.map(r => (
            <div key={r.id} className="bg-gray-900 rounded-lg p-3 mb-2 border border-gray-800 flex justify-between items-center">
              <div>
                <span className="font-mono text-xs">{r.domain}</span>
                <span className="text-gray-500 text-xs ml-2">{r.current_category||'?'} &rarr; {r.requested_category}</span>
                <span className="ml-2">{badge(r.status)}</span>
                <p className="text-gray-500 text-xs mt-1">{r.reason} - by {r.submitted_by}</p>
              </div>
              {r.status==='pending' && (
                <div className="flex gap-1">
                  <button onClick={()=>reviewReq(r.id,'approved')} className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-xs">Approve</button>
                  <button onClick={()=>reviewReq(r.id,'rejected')} className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-xs">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
