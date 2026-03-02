'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  detectionMode: string
  version: number
  category?: string
}

const API_BASE = '/api/v1'

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', patterns: '', keywords: '',
    severity: 'medium', action: 'audit',
    channels: ['file', 'clipboard', 'email'] as string[],
    enabled: true, complianceFramework: 'CUSTOM',
    detectionMode: 'hybrid', category: 'Custom'
  })

  const fetchPolicies = async () => {
    try {
      const res = await fetch(`${API_BASE}/policies/bundle?agentId=console`)
      if (res.ok) {
        const data = await res.json()
        setPolicies(data.bundle?.policies || data.policies || [])
      } else {
        setError('Failed to load policies')
      }
    } catch (e) {
      console.error(e)
      setError('Network error loading policies')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchPolicies() }, [])

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Policy name is required'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        patterns: form.patterns.split('\n').filter(Boolean),
        keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
        severity: form.severity,
        action: form.action,
        channels: form.channels,
        enabled: form.enabled,
        complianceFramework: form.complianceFramework,
        detectionMode: form.detectionMode,
        category: form.category
      }
      if (editPolicy) payload.id = editPolicy.id
      const res = await fetch(`${API_BASE}/policies/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(editPolicy ? `Policy "${form.name}" updated successfully!` : `Policy "${form.name}" created!`)
        await fetchPolicies()
        setShowForm(false); setEditPolicy(null); resetForm()
        setTimeout(() => setSuccess(''), 4000)
      } else {
        setError(data.error || 'Failed to save policy')
      }
    } catch (e) {
      console.error(e)
      setError('Network error saving policy')
    } finally { setSaving(false) }
  }

  const handleDelete = async (p: Policy) => {
    if (!confirm(`Delete policy "${p.name}"?`)) return
    setError(''); setSuccess('')
    try {
      const res = await fetch(`${API_BASE}/policies/bundle?id=${p.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(`Policy "${p.name}" deleted`)
        await fetchPolicies()
        setTimeout(() => setSuccess(''), 3000)
      } else { setError(data.error || 'Cannot delete') }
    } catch { setError('Network error') }
  }

  const handleToggle = async (p: Policy) => {
    try {
      const res = await fetch(`${API_BASE}/policies/bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, name: p.name, enabled: !p.enabled })
      })
      if (res.ok) {
        setSuccess(`Policy "${p.name}" ${!p.enabled ? 'enabled' : 'disabled'}`)
        await fetchPolicies()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch { setError('Toggle failed') }
  }

  const resetForm = () => {
    setForm({
      name: '', description: '', patterns: '', keywords: '',
      severity: 'medium', action: 'audit',
      channels: ['file', 'clipboard', 'email'],
      enabled: true, complianceFramework: 'CUSTOM',
      detectionMode: 'hybrid', category: 'Custom'
    })
  }

  const startEdit = (p: Policy) => {
    setEditPolicy(p)
    setForm({
      name: p.name, description: p.description,
      patterns: (p.patterns || []).join('\n'),
      keywords: (p.keywords || []).join(', '),
      severity: p.severity, action: p.action,
      channels: p.channels || [],
      enabled: p.enabled,
      complianceFramework: p.complianceFramework || 'CUSTOM',
      detectionMode: p.detectionMode || 'hybrid',
      category: p.category || 'Custom'
    })
    setShowForm(true)
    setError('')
  }

  const sevColor = (s: string) => ({
    critical: 'bg-red-600', high: 'bg-orange-500',
    medium: 'bg-yellow-500', low: 'bg-blue-500'
  } as Record<string,string>)[s] || 'bg-gray-500'

  const modeIcon = (m: string) => ({
    traditional: '\ud83d\udd0d', ai: '\ud83e\udd16', hybrid: '\u26a1'
  } as Record<string,string>)[m] || '\u2699\ufe0f'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/console" className="text-blue-400 hover:text-blue-300 text-sm">&larr; Back to Console</Link>
            <h1 className="text-2xl font-bold mt-2">Policy Management</h1>
            <p className="text-gray-400 text-sm mt-1">Configure DLP detection policies, rules, and compliance frameworks</p>
          </div>
          <button onClick={() => { resetForm(); setEditPolicy(null); setShowForm(true); setError('') }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">+ Create Policy</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex justify-between">
          <span>{error}</span><button onClick={() => setError('')} className="text-red-400 hover:text-red-200">&times;</button></div>}
        {success && <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">{success}</div>}

        {showForm && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">{editPolicy ? `Edit Policy: ${editPolicy.name}` : 'Create New Policy'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Policy Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Credit Card Detection" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="PII">PII</option><option value="Credentials">Credentials</option>
                  <option value="Classification">Classification</option><option value="IP">Intellectual Property</option>
                  <option value="Financial">Financial</option><option value="PHI">PHI (Healthcare)</option>
                  <option value="AI-Security">AI Security</option><option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Compliance Framework</label>
                <select value={form.complianceFramework} onChange={e => setForm({...form, complianceFramework: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="CUSTOM">Custom</option><option value="PCI-DSS">PCI-DSS</option>
                  <option value="GDPR">GDPR</option><option value="HIPAA">HIPAA</option>
                  <option value="SOX">SOX</option><option value="PDPO">PDPO (HK)</option>
                  <option value="PIPL">PIPL (China)</option><option value="ISO27001">ISO 27001</option>
                  <option value="NIST-800-171">NIST 800-171</option><option value="Trade-Secret">Trade Secret</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Detection Mode</label>
                <select value={form.detectionMode} onChange={e => setForm({...form, detectionMode: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="traditional">Traditional (Regex + Keyword)</option>
                  <option value="ai">AI (LLM-based NLP)</option>
                  <option value="hybrid">Hybrid (Traditional + AI) - Recommended</option>
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
                  <option value="critical">Critical</option><option value="high">High</option>
                  <option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Action</label>
                <select value={form.action} onChange={e => setForm({...form, action: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                  <option value="block">Block</option><option value="audit">Audit Only</option>
                  <option value="encrypt">Encrypt</option><option value="quarantine">Quarantine</option><option value="alert">Alert</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Channels</label>
                <div className="flex flex-wrap gap-3">
                  {['file','clipboard','email','browser','usb','print','network','cloud'].map(ch => (
                    <label key={ch} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.channels.includes(ch)}
                        onChange={e => setForm({...form, channels: e.target.checked ? [...form.channels, ch] : form.channels.filter(c => c !== ch)})}
                        className="rounded" />
                      <span className="capitalize">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} className="rounded" />
                  <span>Policy Enabled</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                {saving ? 'Saving...' : editPolicy ? 'Update Policy' : 'Create Policy'}
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
              <p className="text-gray-500 text-xs mt-1">Click Edit to modify any policy. All changes are saved to the server and pushed to agents.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Framework</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Mode</th>
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
                        <button onClick={() => handleToggle(p)} title={p.enabled ? 'Click to disable' : 'Click to enable'}>
                          <span className={`w-3 h-3 rounded-full inline-block ${p.enabled ? 'bg-green-400' : 'bg-gray-600'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{p.complianceFramework}</td>
                      <td className="px-4 py-3 text-xs">{modeIcon(p.detectionMode)} {p.detectionMode}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${sevColor(p.severity)}`}>{p.severity}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.action}</td>
                      <td className="px-4 py-3 text-xs">{(p.channels||[]).join(', ')}</td>
                      <td className="px-4 py-3 text-gray-400">v{p.version}</td>
                      <td className="px-4 py-3 space-x-2">
                        <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                        <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
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
