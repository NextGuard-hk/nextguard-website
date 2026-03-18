// app/dashboard/swg/export-button.tsx
// SWG Log Export Component (P2-5)
'use client'
import { useState } from 'react'

export function ExportButton() {
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<'csv' | 'json'>('csv')

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/v1/url-policy/export?format=${format}&hours=168`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `swg-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) { console.error('Export failed:', e) }
    setExporting(false)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={format}
        onChange={e => setFormat(e.target.value as 'csv' | 'json')}
        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
      </select>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-xs font-medium transition"
      >
        {exporting ? 'Exporting...' : 'Export Logs'}
      </button>
    </div>
  )
}
