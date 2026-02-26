"use client"
import { useState, useEffect, useRef } from "react"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText, Search, ChevronDown, ChevronRight, RefreshCw, Upload, X, Loader2 } from "lucide-react"

interface AnalysisResult {
  id: string
  eventId: string
  verdict: string
  confidence: number
  reasoning: string
  recommendation: string
  analyzedAt: string
  reviewedBy?: string
  reviewedAt?: string
  socOverride?: string
  socNotes?: string
}

interface SyslogEvent {
  id: string
  timestamp: string
  facility: string
  severity: string
  host: string
  message: string
  raw: string
}

interface SyslogAnalysis {
  id: string
  fileName: string
  filePath: string
  analyzedAt: string
  totalEvents: number
  falsePositives: number
  truePositives: number
  needsReview: number
  events: SyslogEvent[]
  results: AnalysisResult[]
  status: string
}

const verdictConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  false_positive: { label: 'False Positive', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle },
  true_positive: { label: 'True Positive', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: XCircle },
  needs_review: { label: 'Needs Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle },
}

export function SocReviewPage() {
  const [analyses, setAnalyses] = useState<SyslogAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<SyslogAnalysis | null>(null)
  const [filter, setFilter] = useState<'all' | 'false_positive' | 'true_positive' | 'needs_review'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [uploadContent, setUploadContent] = useState('')
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchAnalyses() }, [])

  async function fetchAnalyses() {
    setLoading(true)
    try {
      const r = await fetch('/api/syslog-analysis?action=results')
      if (r.ok) {
        const d = await r.json()
        setAnalyses(d.analyses || [])
        if (d.analyses?.length > 0 && !selectedAnalysis) setSelectedAnalysis(d.analyses[d.analyses.length - 1])
      }
    } catch {} finally { setLoading(false) }
  }

  async function handleOverride(analysisId: string, resultId: string, verdict: string, notes: string) {
    try {
      const r = await fetch('/api/syslog-analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, resultId, socOverride: verdict, socNotes: notes, reviewedBy: 'SOC Analyst' }),
      })
      if (r.ok) fetchAnalyses()
    } catch {}
  }

  async function handleUpload() {
    if (!uploadContent.trim()) { setUploadError('Please paste syslog content or upload a file'); return }
    setUploading(true)
    setUploadError('')
    try {
      const r = await fetch('/api/syslog-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: uploadContent, fileName: uploadFileName || undefined }),
      })
      const data = await r.json()
      if (r.ok && data.success) {
        setShowUpload(false)
        setUploadContent('')
        setUploadFileName('')
        await fetchAnalyses()
        if (data.analysis) setSelectedAnalysis(data.analysis)
      } else {
        setUploadError(data.error || 'Upload failed')
      }
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => { setUploadContent(ev.target?.result as string || '') }
    reader.readAsText(file)
  }

  function toggleEvent(id: string) {
    setExpandedEvents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filteredResults = selectedAnalysis?.results.filter(r => {
    if (filter !== 'all' && (r.socOverride || r.verdict) !== filter) return false
    if (searchTerm) {
      const evt = selectedAnalysis.events.find(e => e.id === r.eventId)
      if (!evt?.raw.toLowerCase().includes(searchTerm.toLowerCase()) && !r.reasoning.toLowerCase().includes(searchTerm.toLowerCase())) return false
    }
    return true
  }) || []

  return (
    <>
      <PageHeader badge="SOC Review" headline="Syslog Analysis Dashboard" subheadline="AI-powered false positive detection for SOC analysts" />

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Upload className="w-5 h-5 text-cyan-400" /> Upload Syslog for Analysis</h3>
              <button onClick={() => { setShowUpload(false); setUploadError('') }} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">File Name (optional)</label>
                <input type="text" value={uploadFileName} onChange={e => setUploadFileName(e.target.value)} placeholder="e.g. firewall-2024-06-21.log" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Syslog Content</label>
                <textarea value={uploadContent} onChange={e => setUploadContent(e.target.value)} placeholder={"Paste syslog lines here...\n\nExample:\nJun 21 09:15:22 fw-hk-01 kernel: DLP policy violation: USB storage device detected\nJun 21 09:17:45 fw-hk-01 sshd[2241]: Accepted publickey for admin from 10.0.1.50"} rows={10} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none font-mono" />
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".log,.txt,.csv,.syslog" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-zinc-700"><FileText className="w-4 h-4" /> Choose File</button>
                <span className="text-xs text-zinc-500">Supports .log, .txt, .csv, .syslog</span>
              </div>
              {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowUpload(false); setUploadError('') }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || !uploadContent.trim()} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2">{uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Upload className="w-4 h-4" /> Analyze Syslog</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {selectedAnalysis && (
        <AnimateIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Events', value: selectedAnalysis.totalEvents, icon: FileText, color: 'text-cyan-400' },
              { label: 'False Positives', value: selectedAnalysis.falsePositives, icon: CheckCircle, color: 'text-green-400' },
              { label: 'True Positives', value: selectedAnalysis.truePositives, icon: XCircle, color: 'text-red-400' },
              { label: 'Needs Review', value: selectedAnalysis.needsReview, icon: AlertTriangle, color: 'text-yellow-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </AnimateIn>
      )}

      {/* Analysis Selector + Upload + Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedAnalysis?.id || ''} onChange={e => setSelectedAnalysis(analyses.find(a => a.id === e.target.value) || null)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none">
            {analyses.map(a => (
              <option key={a.id} value={a.id}>{a.fileName} - {new Date(a.analyzedAt).toLocaleDateString()}</option>
            ))}
          </select>
          <button onClick={() => { setShowUpload(true); setUploadError(''); setUploadContent(''); setUploadFileName('') }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Syslog</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'false_positive', 'true_positive', 'needs_review'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {f === 'all' ? 'All' : verdictConfig[f]?.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search events..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none" />
          </div>
          <button onClick={fetchAnalyses} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading analysis results...</div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">No syslog analyses available yet.</p>
          <p className="text-zinc-600 text-sm mt-1">Click &quot;Upload Syslog&quot; above to analyze your first log file.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map(result => {
            const evt = selectedAnalysis?.events.find(e => e.id === result.eventId)
            const vc = verdictConfig[result.socOverride || result.verdict] || verdictConfig.needs_review
            const VIcon = vc.icon
            const isExpanded = expandedEvents.has(result.id)
            return (
              <div key={result.id} className={`border ${vc.bg} rounded-xl overflow-hidden`}>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5" onClick={() => toggleEvent(result.id)}>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                  <VIcon className={`w-5 h-5 ${vc.color}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${vc.bg} ${vc.color}`}>{vc.label}</span>
                  <span className="text-xs text-zinc-500">Confidence: {result.confidence}%</span>
                  {result.reviewedBy && <span className="text-xs text-cyan-400">Reviewed by {result.reviewedBy}</span>}
                  <p className="text-sm text-zinc-300 truncate flex-1 ml-2">{evt?.raw || 'Event data unavailable'}</p>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-zinc-500 mb-1">Raw Event</p>
                      <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{evt?.raw}</pre>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><p className="text-xs text-zinc-500 mb-1">AI Reasoning</p><p className="text-sm text-zinc-300">{result.reasoning}</p></div>
                      <div><p className="text-xs text-zinc-500 mb-1">Recommendation</p><p className="text-sm text-zinc-300">{result.recommendation}</p></div>
                    </div>
                    {evt && (
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                        <span>Host: <span className="text-zinc-300">{evt.host}</span></span>
                        <span>Facility: <span className="text-zinc-300">{evt.facility}</span></span>
                        <span>Severity: <span className="text-zinc-300">{evt.severity}</span></span>
                        <span>Time: <span className="text-zinc-300">{evt.timestamp}</span></span>
                      </div>
                    )}
                    {result.socNotes && <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3"><p className="text-xs text-cyan-400 mb-1">SOC Notes</p><p className="text-sm text-zinc-300">{result.socNotes}</p></div>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleOverride(selectedAnalysis!.id, result.id, 'false_positive', '')} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium">Mark False Positive</button>
                      <button onClick={() => handleOverride(selectedAnalysis!.id, result.id, 'true_positive', '')} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium">Mark True Positive</button>
                      <button onClick={() => { const n = prompt('SOC Notes:'); if (n) handleOverride(selectedAnalysis!.id, result.id, result.socOverride || result.verdict, n) }} className="bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium">Add Notes</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filteredResults.length === 0 && <div className="text-center py-8 text-zinc-500">No events match your filters.</div>}
        </div>
      )}
    </>
  )
}
