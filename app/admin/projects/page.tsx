'use client'

import { useState } from 'react'

type Priority = 'critical' | 'high' | 'medium' | 'low'
type Status = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
type TaskType = 'bug' | 'feature' | 'improvement' | 'task' | 'epic'

interface Task {
  id: string
  key: string
  title: string
  description: string
  type: TaskType
  status: Status
  priority: Priority
  assignee: string
  reporter: string
  sprint: string
  storyPoints: number
  labels: string[]
  created: string
  updated: string
  dueDate: string
  comments: number
  attachments: number
}

const statusColumns: { key: Status; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'bg-gray-500' },
  { key: 'todo', label: 'To Do', color: 'bg-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { key: 'review', label: 'Review', color: 'bg-purple-500' },
  { key: 'done', label: 'Done', color: 'bg-green-500' },
]

const priorityConfig: Record<Priority, { label: string; color: string; icon: string }> = {
  critical: { label: 'Critical', color: 'text-red-500', icon: '🔴' },
  high: { label: 'High', color: 'text-orange-500', icon: '🟠' },
  medium: { label: 'Medium', color: 'text-yellow-500', icon: '🟡' },
  low: { label: 'Low', color: 'text-green-500', icon: '🟢' },
}

const typeConfig: Record<TaskType, { label: string; icon: string; color: string }> = {
  bug: { label: 'Bug', icon: '🐛', color: 'text-red-400' },
  feature: { label: 'Feature', icon: '✨', color: 'text-blue-400' },
  improvement: { label: 'Improvement', icon: '⬆️', color: 'text-cyan-400' },
  task: { label: 'Task', icon: '✅', color: 'text-green-400' },
  epic: { label: 'Epic', icon: '⚡', color: 'text-purple-400' },
}

const initialTasks: Task[] = [
  {
    id: '1', key: 'NG-101', title: 'Endpoint DLP Agent - Windows Clipboard Monitor',
    description: 'Implement clipboard monitoring for sensitive data patterns on Windows endpoints',
    type: 'feature', status: 'in_progress', priority: 'critical',
    assignee: 'Kevin Chen', reporter: 'Admin', sprint: 'Sprint 12',
    storyPoints: 8, labels: ['endpoint', 'windows', 'core'],
    created: '2025-01-15', updated: '2025-01-20', dueDate: '2025-02-01',
    comments: 12, attachments: 3
  },
  {
    id: '2', key: 'NG-102', title: 'Email DLP - O365 Integration API',
    description: 'Connect to Microsoft Graph API for email content inspection',
    type: 'feature', status: 'review', priority: 'high',
    assignee: 'Sarah Wong', reporter: 'Admin', sprint: 'Sprint 12',
    storyPoints: 13, labels: ['email', 'o365', 'api'],
    created: '2025-01-10', updated: '2025-01-22', dueDate: '2025-01-30',
    comments: 8, attachments: 2
  },
  {
    id: '3', key: 'NG-103', title: 'Web DLP - HTTPS Inspection Proxy',
    description: 'Build SSL/TLS inspection proxy for web traffic DLP scanning',
    type: 'epic', status: 'todo', priority: 'critical',
    assignee: 'David Liu', reporter: 'Admin', sprint: 'Sprint 13',
    storyPoints: 21, labels: ['web-dlp', 'proxy', 'ssl'],
    created: '2025-01-18', updated: '2025-01-18', dueDate: '2025-02-15',
    comments: 5, attachments: 1
  },
  {
    id: '4', key: 'NG-104', title: 'Policy Engine - Regex Pattern Matching Bug',
    description: 'Fix false positive rate in credit card number detection regex',
    type: 'bug', status: 'in_progress', priority: 'high',
    assignee: 'Kevin Chen', reporter: 'Sarah Wong', sprint: 'Sprint 12',
    storyPoints: 5, labels: ['policy', 'bug-fix', 'regex'],
    created: '2025-01-19', updated: '2025-01-21', dueDate: '2025-01-25',
    comments: 6, attachments: 0
  },
  {
    id: '5', key: 'NG-105', title: 'Dashboard - Real-time Incident Charts',
    description: 'Add real-time updating charts for DLP incident monitoring',
    type: 'improvement', status: 'backlog', priority: 'medium',
    assignee: 'Unassigned', reporter: 'Admin', sprint: 'Backlog',
    storyPoints: 8, labels: ['dashboard', 'ui', 'charts'],
    created: '2025-01-20', updated: '2025-01-20', dueDate: '2025-03-01',
    comments: 2, attachments: 0
  },
  {
    id: '6', key: 'NG-106', title: 'Cloud DLP - AWS S3 Bucket Scanner',
    description: 'Implement automated scanning of S3 buckets for sensitive data',
    type: 'feature', status: 'todo', priority: 'medium',
    assignee: 'David Liu', reporter: 'Admin', sprint: 'Sprint 13',
    storyPoints: 13, labels: ['cloud', 'aws', 's3'],
    created: '2025-01-17', updated: '2025-01-19', dueDate: '2025-02-20',
    comments: 4, attachments: 1
  },
  {
    id: '7', key: 'NG-107', title: 'Agent Auto-Update Mechanism',
    description: 'Build silent auto-update system for endpoint DLP agents',
    type: 'task', status: 'done', priority: 'high',
    assignee: 'Kevin Chen', reporter: 'Admin', sprint: 'Sprint 11',
    storyPoints: 8, labels: ['agent', 'update', 'deployment'],
    created: '2025-01-05', updated: '2025-01-18', dueDate: '2025-01-18',
    comments: 15, attachments: 4
  },
  {
    id: '8', key: 'NG-108', title: 'SIEM Integration - Syslog Forwarding',
    description: 'Forward DLP events to external SIEM via syslog/CEF format',
    type: 'feature', status: 'done', priority: 'medium',
    assignee: 'Sarah Wong', reporter: 'Admin', sprint: 'Sprint 11',
    storyPoints: 5, labels: ['siem', 'syslog', 'integration'],
    created: '2025-01-03', updated: '2025-01-16', dueDate: '2025-01-16',
    comments: 9, attachments: 2
  },
]

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.key.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const assignees = [...new Set(tasks.map(t => t.assignee))]
  const totalPoints = tasks.reduce((s, t) => s + t.storyPoints, 0)
  const completedPoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + t.storyPoints, 0)

  const moveTask = (taskId: string, newStatus: Status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated: new Date().toISOString().split('T')[0] } : t))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">NextGuard DLP - Project Board</h1>
              <p className="text-gray-400 text-sm mt-1">Sprint 12 · Jan 13 - Jan 27, 2025</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <div className="text-sm text-gray-400">Sprint Progress</div>
                <div className="text-lg font-bold text-cyan-400">{completedPoints}/{totalPoints} pts</div>
              </div>
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(completedPoints/totalPoints)*100}%` }} />
              </div>
              <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">
                + Create Task
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text" placeholder="Search tasks..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm w-64 focus:border-cyan-500 focus:outline-none"
          />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-cyan-500 focus:outline-none">
            <option value="all">All Priorities</option>
            {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-cyan-500 focus:outline-none">
            <option value="all">All Types</option>
            {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-cyan-500 focus:outline-none">
            <option value="all">All Assignees</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setView('board')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'board' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>Board</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${view === 'list' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>List</button>
          </div>
        </div>
      </div>

      {/* Board View */}
      {view === 'board' && (
        <div className="max-w-[1600px] mx-auto px-6 pb-8">
          <div className="grid grid-cols-5 gap-4">
            {statusColumns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.key)
              return (
                <div key={col.key} className="bg-gray-900 rounded-xl border border-gray-800">
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="font-medium text-sm">{col.label}</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <div className="p-3 space-y-3 min-h-[200px]">
                    {colTasks.map(task => (
                      <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`text-xs ${typeConfig[task.type].color}`}>{typeConfig[task.type].icon}</span>
                          <span className="text-xs text-gray-500 font-mono">{task.key}</span>
                        </div>
                        <p className="text-sm font-medium mb-2 leading-snug">{task.title}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{priorityConfig[task.priority].icon}</span>
                            <span className="text-xs text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">{task.storyPoints}pt</span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-cyan-600/20 flex items-center justify-center text-[10px] font-medium text-cyan-400">
                            {task.assignee.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        {task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.labels.slice(0, 2).map(l => <span key={l} className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 text-gray-400 rounded">{l}</span>)}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-gray-500">
                          {task.comments > 0 && <span className="text-[10px] flex items-center gap-0.5">💬 {task.comments}</span>}
                          {task.attachments > 0 && <span className="text-[10px] flex items-center gap-0.5">📎 {task.attachments}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="max-w-[1600px] mx-auto px-6 pb-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Key</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Assignee</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Points</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-cyan-400">{task.key}</td>
                    <td className="px-4 py-3 text-sm">{typeConfig[task.type].icon}</td>
                    <td className="px-4 py-3 text-sm font-medium">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColumns.find(s => s.key === task.status)?.color} bg-opacity-20`}>
                        {statusColumns.find(s => s.key === task.status)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{task.assignee}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{task.storyPoints}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{task.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={typeConfig[selectedTask.type].color}>{typeConfig[selectedTask.type].icon}</span>
                  <span className="font-mono text-cyan-400 text-sm">{selectedTask.key}</span>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
              </div>
              <h2 className="text-xl font-bold mt-2">{selectedTask.title}</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300 text-sm">{selectedTask.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500">Status</span><div className="text-sm mt-1">{statusColumns.find(s => s.key === selectedTask.status)?.label}</div></div>
                  <div><span className="text-xs text-gray-500">Priority</span><div className="text-sm mt-1">{priorityConfig[selectedTask.priority].icon} {priorityConfig[selectedTask.priority].label}</div></div>
                  <div><span className="text-xs text-gray-500">Assignee</span><div className="text-sm mt-1">{selectedTask.assignee}</div></div>
                  <div><span className="text-xs text-gray-500">Reporter</span><div className="text-sm mt-1">{selectedTask.reporter}</div></div>
                </div>
                <div className="space-y-3">
                  <div><span className="text-xs text-gray-500">Sprint</span><div className="text-sm mt-1">{selectedTask.sprint}</div></div>
                  <div><span className="text-xs text-gray-500">Story Points</span><div className="text-sm mt-1">{selectedTask.storyPoints}</div></div>
                  <div><span className="text-xs text-gray-500">Due Date</span><div className="text-sm mt-1">{selectedTask.dueDate}</div></div>
                  <div><span className="text-xs text-gray-500">Labels</span><div className="flex flex-wrap gap-1 mt-1">{selectedTask.labels.map(l => <span key={l} className="text-xs px-2 py-0.5 bg-gray-700 rounded">{l}</span>)}</div></div>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4">
                <span className="text-xs text-gray-500">Move to:</span>
                <div className="flex gap-2 mt-2">
                  {statusColumns.map(col => (
                    <button key={col.key} onClick={() => { moveTask(selectedTask.id, col.key); setSelectedTask(null) }}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedTask.status === col.key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-gray-700 hover:border-gray-500 text-gray-400'
                      }`}>{col.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
