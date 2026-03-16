'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Shield, Globe, AlertTriangle, CheckCircle, Clock, TrendingUp, RefreshCw, Ban, Eye } from 'lucide-react'

interface Summary {
  period: string
  totalEvaluations: number
  allowed: number
  blocked: number
  warned: number
  riskDistribution: { risk_level: string; count: number }[]
}

interface TopDomain { domain: string; category: string; count: number; lastSeen: string }
interface RecentLog { domain: string; action: string; risk_level: string; category: string; timestamp: string; user_id?: string }

const RISK_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', safe: '#3b82f6'
}
const ACTION_COLOR: Record<string, string> = {
  block: '#ef4444', warn: '#f97316', allow: '#22c55e'
}

export default function UrlAnalyticsPage() {
  const [hours, setHours] = useState(24)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topBlocked, setTopBlocked] = useState<TopDomain[]>([])
  const [topWarned, setTopWarned] = useState<TopDomain[]>([])
  const [recent, setRecent] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const base = '/api/v1/analytics/url'
      const [sumRes, blockedRes, warnedRes, recentRes] = await Promise.all([
        fetch(`${base}/summary?hours=${hours}`),
        fetch(`${base}/top-blocked?hours=${hours}&limit=10`),
        fetch(`${base}/top-warned?hours=${hours}&limit=10`),
        fetch(`${base}/recent?hours=${hours}&limit=20`),
      ])
      const [sumData, blockedData, warnedData, recentData] = await Promise.all([
        sumRes.json(), blockedRes.json(), warnedRes.json(), recentRes.json()
      ])
      if (sumData.success) setSummary(sumData.data)
      if (blockedData.success) setTopBlocked(blockedData.data)
      if (warnedData.success) setTopWarned(warnedData.data)
      if (recentData.success) setRecent(recentData.data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      console.error('Failed to fetch URL analytics:', e)
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => { fetchData() }, [fetchData])

  const blockRate = summary ? Math.round((summary.blocked / (summary.totalEvaluations || 1)) * 100) : 0
  const warnRate = summary ? Math.round((summary.warned / (summary.totalEvaluations || 1)) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            URL Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">Web filtering activity and threat intelligence overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Updated {lastUpdated}</span>}
          <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="1">Last 1h</SelectItem>
              <SelectItem value="6">Last 6h</SelectItem>
              <SelectItem value="24">Last 24h</SelectItem>
              <SelectItem value="72">Last 3d</SelectItem>
              <SelectItem value="168">Last 7d</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Total Evaluations</p>
                <p className="text-2xl font-bold text-white">{summary?.totalEvaluations?.toLocaleString() ?? '--'}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Allowed</p>
                <p className="text-2xl font-bold text-green-400">{summary?.allowed?.toLocaleString() ?? '--'}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Blocked <span className="text-red-400">({blockRate}%)</span></p>
                <p className="text-2xl font-bold text-red-400">{summary?.blocked?.toLocaleString() ?? '--'}</p>
              </div>
              <Ban className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Warned <span className="text-orange-400">({warnRate}%)</span></p>
                <p className="text-2xl font-bold text-orange-400">{summary?.warned?.toLocaleString() ?? '--'}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.riskDistribution && summary.riskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={summary.riskDistribution} dataKey="count" nameKey="risk_level"
                    cx="50%" cy="50%" outerRadius={80} label={({ risk_level, percent }) =>
                      `${risk_level} ${(percent * 100).toFixed(0)}%`}>
                    {summary.riskDistribution.map((entry) => (
                      <Cell key={entry.risk_level} fill={RISK_COLOR[entry.risk_level] ?? '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Legend formatter={(v) => <span className="text-gray-300">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" /> Top Blocked Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBlocked.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topBlocked.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="domain" stroke="#9ca3af" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500">No blocked domains</div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Top Warned Domains
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topWarned.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left pb-2">Domain</th>
                    <th className="text-left pb-2">Category</th>
                    <th className="text-right pb-2">Count</th>
                    <th className="text-right pb-2">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {topWarned.map((d, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      <td className="py-2 text-white font-mono text-xs">{d.domain}</td>
                      <td className="py-2"><Badge variant="outline" className="text-orange-400 border-orange-800 text-xs">{d.category}</Badge></td>
                      <td className="py-2 text-right text-orange-400 font-semibold">{d.count}</td>
                      <td className="py-2 text-right text-gray-500 text-xs">{new Date(d.lastSeen).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-6">No warned domains</div>
          )}
        </CardContent>
      </Card>
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" /> Recent URL Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left pb-2">Domain</th>
                    <th className="text-left pb-2">Action</th>
                    <th className="text-left pb-2">Risk</th>
                    <th className="text-left pb-2">Category</th>
                    <th className="text-right pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((log, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      <td className="py-1.5 text-white font-mono text-xs max-w-[180px] truncate">{log.domain}</td>
                      <td className="py-1.5">
                        <Badge className="text-xs" style={{ backgroundColor: ACTION_COLOR[log.action] ?? '#6b7280', color: '#fff', border: 'none' }}>
                          {log.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-1.5">
                        <span className="text-xs font-medium" style={{ color: RISK_COLOR[log.risk_level] ?? '#9ca3af' }}>
                          {log.risk_level}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-400 text-xs">{log.category}</td>
                      <td className="py-1.5 text-right text-gray-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-6">No recent activity</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
