// app/dashboard/swg/group-manager.tsx
// Group CRUD Management Component (P2-7b)
'use client'
import { useState } from 'react'

interface GroupData {
  id: number; name: string; description: string;
  priority: number; is_active: number;
  rules: { category: string; action: string }[];
  members: string[];
}

export function GroupManager({ groups, onRefresh }: { groups: GroupData[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<GroupData | null>(null)
  const [form, setForm] = useState({ name: '', description: '', priority: 10, rules: '' as string, members: '' as string })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setForm({ name: '', description: '', priority: 10, rules: '', members: '' })
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (g: GroupData) => {
    setEditing(g)
    setForm({
      name: g.name,
      description: g.description,
      priority: g.priority,
      rules: g.rules.map(r => `${r.category}:${r.action}`).join(', '),
      members: g.members.join(', '),
    })
    setShowForm(true)
  }

  const parseRules = (s: string) => s.split(',').map(r => r.trim()).filter(Boolean).map(r => {
    const [category, action = 'block'] = r.split(':')
    return { category: category.trim(), action: action.trim() }
  })

  const parseMembers = (s: string) => s.split(',').map(m => m.trim()).filter(Boolean)

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      if (editing) {
        await fetch('/api/v1/url-policy/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: editing.id,
            name: form.name,
            description: form.description,
            priority: form.priority,
            rules: parseRules(form.rules),
            members: parseMembers(form.members),
          }),
        })
      } else {
        await fetch('/api/v1/url-policy/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            priority: form.priority,
            rules: parseRules(form.rules),
            members: parseMembers(form.members),
          }),
        })
      }
      resetForm()
      onRefresh()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this group?')) return
    await fetch(`/api/v1/url-policy/groups?groupId=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const handleToggle = async (g: GroupData) => {
    await fetch('/api/v1/url-policy/groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: g.id, is_active: !g.is_active }),
    })
    onRefresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Policy Groups ({groups.length})</h3>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">
          + New Group
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4 space-y-3">
          <input type="text" placeholder="Group name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          <input type="number" placeholder="Priority" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value) || 10})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          <input type="text" placeholder="Rules: social:block, gambling:block" value={form.rules} onChange={e => setForm({...form, rules: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          <input type="text" placeholder="Members: user1@co.com, user2@co.com" value={form.members} onChange={e => setForm({...form, members: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Group' : 'Create Group'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition">Cancel</button>
          </div>
        </div>
      )}

      {groups.length === 0 && !showForm && <p className="text-gray-500 text-sm">No policy groups configured. Click "+ New Group" to create one.</p>}

      {groups.map(g => (
        <div key={g.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{g.name} <span className={`text-xs px-2 py-0.5 rounded ${g.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{g.is_active ? 'Active' : 'Disabled'}</span></h4>
              {g.description && <p className="text-gray-400 text-sm mt-1">{g.description}</p>}
              <p className="text-gray-500 text-xs mt-1">Priority: {g.priority} | {g.members.length} members | {g.rules.length} rules</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(g)} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition">Edit</button>
              <button onClick={() => handleToggle(g)} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition">{g.is_active ? 'Disable' : 'Enable'}</button>
              <button onClick={() => handleDelete(g.id)} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition">Delete</button>
            </div>
          </div>
          {g.rules.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{g.rules.map((r, i) => <span key={i} className={`text-xs px-2 py-0.5 rounded ${r.action === 'block' ? 'bg-red-500/20 text-red-400' : r.action === 'warn' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{r.category}: {r.action}</span>)}</div>}
          {g.members.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{g.members.map((m, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{m}</span>)}</div>}
        </div>
      ))}
    </div>
  )
}
