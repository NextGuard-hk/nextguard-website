'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldAlert, ArrowLeft, Info } from 'lucide-react'

function BlockPageContent() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url') || 'Unknown URL'
  const domain = searchParams.get('domain') || 'Unknown Domain'
  const category = searchParams.get('category') || 'Uncategorized'
  const action = searchParams.get('action') || 'Block'
  const riskLevel = searchParams.get('risk') || 'high'
  const reason = searchParams.get('reason') || 'Policy violation'

  const riskColors: Record<string, string> = {
    high: 'text-red-500 bg-red-500/10 border-red-500/30',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  }
  const riskStyle = riskColors[riskLevel] || riskColors.high

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className={`inline-flex p-4 rounded-full ${riskStyle} border mb-4`}>
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Blocked</h1>
          <p className="text-gray-400">This website has been blocked by NextGuard URL Policy</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 mb-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Blocked URL</label>
            <p className="text-white font-mono text-sm break-all mt-1">{domain}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Category</label>
              <p className="text-white text-sm mt-1">{category}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Risk Level</label>
              <p className={`text-sm mt-1 capitalize ${riskLevel === 'high' ? 'text-red-400' : riskLevel === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`}>{riskLevel}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Reason</label>
            <p className="text-gray-300 text-sm mt-1">{reason}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.history.back()} className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <a href="/dashboard/url-policy" className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg transition-colors">
            <Info className="w-4 h-4" /> Request Review
          </a>
        </div>

        <p className="text-center text-gray-600 text-xs mt-8">
          Protected by NextGuard URL Policy Engine &bull; {new Date().toISOString()}
        </p>
      </div>
    </div>
  )
}

export default function BlockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <BlockPageContent />
    </Suspense>
  )
}
