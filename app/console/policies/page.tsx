'use client'

import { useState, useEffect } from 'react'

interface Policy {
  id: string
  name: string
  description: string
  patterns: string[]
  keywords: string[]
  severity: string
  action: string
  channels: string[]
  enabled: boolean
  complianceFramework: string
  version: number
}

const API_BASE = '/api/v1'

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', patterns: '', keywords: '',
    severity: 'medium', action: 'audit', channels: ['file', 'clipboard', 'email'],
    enabled: true, complianceFramework: 'CUSTOM'
  })

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${API_BASE}/policies/bundle?agentId=console`)
      if (res.ok) {
        const data = await res.json()
        setPolicies(data.policies || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPolicies() }, [])

  const handleSubmit = async () => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        patterns: form.patterns.split('\n').filter(Boolean),
        keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
        severity: form.severity,
        action: form.action,
        channels: form.channels,
        enabled: form.enabled,
        complianceFramework: form.complianceFramework,
        ...(editPolicy ? { id: editPolicy.id } : {})
      }
      const res = await fetch(`${API_BASE}/policies/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        await fetchPolicies()
        setShowForm(false)
        setEditPolicy(null)
        resetForm()
      }
    } catch (e) { console.error(e) }
  }

  const resetForm = () => {
    setForm({ name: '', description: '', patterns: '', keywords: '',
      severity: 'medium', action: 'audit', channels: ['file', 'clipboard', 'email'],
      enabled: true, complianceFramework: 'CUSTOM' })
  }

  const startEdit = (p: Policy) => {
    setEditPolicy(p)
    setForm({
      name: p.name, description: p.description,
      patterns: p.patterns.join('\n'), keywords: p.keywords.join(', '),
      severity: p.severity, action: p.action, channels: p.channels,
      enabled: p.enabled, complianceFramework: p.complianceFramework
    })
    setShowForm(true)
  }

  const severityColor = (s: string) => {
    const m: Record<string, string> = { critical: 'bg-red-600', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-blue-500' }
    return m[s] || 'bg-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/console" className="text-gray-400 hover:text-white text-sm">&larr; Back to Console</a>
            <h1 className="text-xl font-bold">Policy Management</h1>
          </div>
          <button onClick={() => { resetForm(); setEditPolicy(null); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            + Create Policy
          </button>
        </div>
      </header>

      <main className="p-6">
        {showForm && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{editPolicy ? 'Edit Policy' : 'Create New Policy'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Policy Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Credit Card Detection" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compliance Framework</label>
                <select value={form.complianceFramework} onChange={e => setForm({...form, complianceFramework: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="CUSTOM">Custom</option>
                  <option value="PCI-DSS">PCI-DSS</option>
                  <option value="GDPR">GDPR</option>
                  <option value="HIPAA">HIPAA</option>
                  <option value="SOX">SOX</option>
                  <option value="PDPO">PDPO (HK)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="Policy description" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Regex Patterns (one per line)</label>
                <textarea value={form.patterns} onChange={e => setForm({...form, patterns: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm h-24" placeholder="\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Keywords (comma-separated)</label>
                <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm h-24" placeholder="credit card, visa, mastercard" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Action</label>
                <select value={form.action} onChange={e => setForm({...form, action: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="block">Block</option>
                  <option value="audit">Audit Only</option>
                  <option value="encrypt">Encrypt</option>
                  <option value="quarantine">Quarantine</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Channels</label>
                <div className="flex flex-wrap gap-3">
                  {['file', 'clipboard', 'email', 'browser', 'usb', 'print', 'network'].map(ch => (
                    <label key={ch} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.channels.includes(ch)}
                        onChange={e => setForm({...form, channels: e.target.checked
                          ? [...form.channels, ch] : form.channels.filter(c => c !== ch)})}
                        className="rounded" />
                      <span className="capitalize">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.enabled}
                    onChange={e => setForm({...form, enabled: e.target.checked})} className="rounded" />
                  <span>Policy Enabled</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
                {editPolicy ? 'Update Policy' : 'Create Policy'}
              </button>
              <button onClick={() => { setShowForm(false); setEditPolicy(null) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">{policies.length} Policies Configured</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Framework</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Channels</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Ver</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {policies.map(p => (
                    <tr key={p.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <span className={`w-2 h-2 rounded-full inline-block ${p.enabled ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{p.complianceFramework}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${severityColor(p.severity)}`}>{p.severity}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.action}</td>
                      <td className="px-4 py-3 text-xs">{p.channels.join(', ')}</td>
                      <td className="px-4 py-3 text-gray-400">v{p.version}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
