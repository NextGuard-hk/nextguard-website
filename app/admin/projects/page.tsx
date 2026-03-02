'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';

// ==================== TYPES ====================
type Department = 'R&D' | 'Presales' | 'Support' | 'Management';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type IssueType = 'Bug' | 'Feature' | 'Task' | 'Epic' | 'Story' | 'Incident';
type Status = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Closed';
type ViewMode = 'board' | 'list' | 'backlog' | 'reports' | 'kb';

interface User {
  id: string; name: string; email: string; department: Department; role: string; avatar: string;
}
interface Issue {
  id: string; key: string; title: string; description: string; type: IssueType; status: Status;
  priority: Priority; assignee: string; reporter: string; department: Department; sprint: string;
  points: number; labels: string[]; created: string; updated: string; dueDate?: string;
  comments: number; attachments: number;
}
interface ActivityLog {
  id: string; issueKey: string; issueTitle: string; action: 'Created' | 'Modified' | 'Deleted' | 'Closed' | 'Reopened' | 'Status Changed';
  field?: string; oldValue?: string; newValue?: string; user: string; timestamp: string;
}
interface KBArticle {
  id: string; title: string; category: string; department: Department; author: string;
  content: string; views: number; helpful: number; updated: string;
}

// ==================== CONFIG ====================
const priorityConfig: Record<string, {color:string;bg:string;icon:string}> = {
  Critical: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '🔴' },
  High: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '🟠' },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '🟡' },
  Low: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '🟢' },
};
const typeConfig: Record<string, {color:string;icon:string}> = {
  Bug: { color: 'text-red-400', icon: '🐛' },
  Feature: { color: 'text-purple-400', icon: '✨' },
  Task: { color: 'text-blue-400', icon: '📋' },
  Epic: { color: 'text-violet-400', icon: '⚡' },
  Story: { color: 'text-green-400', icon: '📖' },
  Incident: { color: 'text-red-500', icon: '🚨' },
};
const statusColumns: Status[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done', 'Closed'];
const departments: Department[] = ['R&D', 'Presales', 'Support', 'Management'];

// ==================== MOCK DATA ====================
const mockUsers: User[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex@nextguard.com', department: 'R&D', role: 'Tech Lead', avatar: 'AC' },
  { id: 'u2', name: 'Sarah Wong', email: 'sarah@nextguard.com', department: 'Presales', role: 'Solutions Architect', avatar: 'SW' },
  { id: 'u3', name: 'Mike Liu', email: 'mike@nextguard.com', department: 'Support', role: 'Support Engineer', avatar: 'ML' },
  { id: 'u4', name: 'Jenny Zhao', email: 'jenny@nextguard.com', department: 'R&D', role: 'Senior Developer', avatar: 'JZ' },
  { id: 'u5', name: 'David Lee', email: 'david@nextguard.com', department: 'Management', role: 'Project Manager', avatar: 'DL' },
  { id: 'u6', name: 'Karen Tam', email: 'karen@nextguard.com', department: 'Support', role: 'Support Lead', avatar: 'KT' },
];
const initialIssues: Issue[] = [
  { id: '1', key: 'NG-101', title: 'Implement DLP Policy Engine v2', description: 'Rebuild policy engine with rule chaining support', type: 'Epic', status: 'In Progress', priority: 'Critical', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 12', points: 13, labels: ['dlp-core', 'architecture'], created: '2025-01-10', updated: '2025-01-25', dueDate: '2025-02-15', comments: 8, attachments: 3 },
  { id: '2', key: 'NG-102', title: 'Email DLP Content Inspection Module', description: 'Deep content inspection for email attachments', type: 'Feature', status: 'In Progress', priority: 'High', assignee: 'u4', reporter: 'u1', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['email-dlp', 'inspection'], created: '2025-01-12', updated: '2025-01-24', dueDate: '2025-02-10', comments: 5, attachments: 2 },
  { id: '3', key: 'NG-103', title: 'Web DLP Browser Extension', description: 'Chrome/Edge extension for web content monitoring', type: 'Feature', status: 'To Do', priority: 'High', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['web-dlp', 'browser'], created: '2025-01-14', updated: '2025-01-20', comments: 3, attachments: 1 },
  { id: '4', key: 'NG-104', title: 'Customer onboarding automation', description: 'Automate enterprise customer deployment workflow', type: 'Task', status: 'In Review', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 5, labels: ['automation', 'onboarding'], created: '2025-01-15', updated: '2025-01-23', comments: 4, attachments: 2 },
  { id: '5', key: 'NG-105', title: 'SLA breach notification system', description: 'Alert system for approaching and breached SLAs', type: 'Task', status: 'Done', priority: 'High', assignee: 'u3', reporter: 'u6', department: 'Support', sprint: 'Sprint 12', points: 5, labels: ['sla', 'alerts'], created: '2025-01-08', updated: '2025-01-22', comments: 6, attachments: 1 },
  { id: '6', key: 'NG-106', title: 'Endpoint DLP agent memory optimization', description: 'Reduce agent memory footprint by 40%', type: 'Bug', status: 'In Progress', priority: 'Critical', assignee: 'u4', reporter: 'u3', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['endpoint', 'performance'], created: '2025-01-18', updated: '2025-01-25', dueDate: '2025-01-30', comments: 12, attachments: 4 },
  { id: '7', key: 'NG-107', title: 'Competitive analysis - Forcepoint DLP', description: 'Feature comparison matrix with Forcepoint', type: 'Task', status: 'Done', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 3, labels: ['competitive', 'analysis'], created: '2025-01-05', updated: '2025-01-20', comments: 2, attachments: 5 },
  { id: '8', key: 'NG-108', title: 'Cloud DLP API gateway integration', description: 'REST API gateway for cloud DLP service', type: 'Feature', status: 'Backlog', priority: 'Medium', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 13', points: 13, labels: ['cloud', 'api'], created: '2025-01-20', updated: '2025-01-20', comments: 1, attachments: 0 },
  { id: '9', key: 'NG-109', title: 'Incident response playbook templates', description: 'Pre-built response templates for common DLP incidents', type: 'Incident', status: 'To Do', priority: 'High', assignee: 'u6', reporter: 'u5', department: 'Support', sprint: 'Sprint 12', points: 5, labels: ['incident', 'templates'], created: '2025-01-19', updated: '2025-01-21', comments: 3, attachments: 2 },
  { id: '10', key: 'NG-110', title: 'Data classification ML model v3', description: 'Train new ML model for auto data classification', type: 'Story', status: 'Backlog', priority: 'High', assignee: 'u4', reporter: 'u1', department: 'R&D', sprint: 'Sprint 13', points: 13, labels: ['ml', 'classification'], created: '2025-01-22', updated: '2025-01-22', comments: 0, attachments: 0 },
  { id: '11', key: 'NG-111', title: 'Enterprise demo environment setup', description: 'Sandbox environment for customer demos', type: 'Task', status: 'To Do', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 3, labels: ['demo', 'environment'], created: '2025-01-16', updated: '2025-01-18', comments: 2, attachments: 1 },
  { id: '12', key: 'NG-112', title: 'USB device control policy bypass fix', description: 'Fix bypass vulnerability in USB device blocking', type: 'Bug', status: 'In Review', priority: 'Critical', assignee: 'u1', reporter: 'u3', department: 'R&D', sprint: 'Sprint 12', points: 5, labels: ['endpoint', 'security', 'urgent'], created: '2025-01-24', updated: '2025-01-25', dueDate: '2025-01-28', comments: 15, attachments: 3 },
];
const kbArticles: KBArticle[] = [
  { id: 'kb1', title: 'DLP Policy Configuration Best Practices', category: 'Configuration', department: 'R&D', author: 'u1', content: 'This guide covers best practices for configuring DLP policies across all channels including endpoints, email, web, and cloud storage. Key topics include: 1) Policy hierarchy and inheritance rules, 2) Regular expression patterns for sensitive data detection, 3) Fingerprinting configuration for document classification, 4) Action rules including block, encrypt, quarantine, and notify, 5) Exception handling and whitelist management, 6) Testing policies in monitor-only mode before enforcement, 7) Performance optimization tips for large-scale deployments.', views: 342, helpful: 89, updated: '2025-01-20' },
  { id: 'kb2', title: 'Customer Deployment Checklist', category: 'Deployment', department: 'Presales', author: 'u2', content: 'Complete checklist for enterprise customer deployment: Phase 1 - Discovery, Phase 2 - Planning, Phase 3 - Implementation, Phase 4 - Testing, Phase 5 - Go-Live.', views: 256, helpful: 67, updated: '2025-01-18' },
  { id: 'kb3', title: 'Incident Escalation Procedures', category: 'Process', department: 'Support', author: 'u6', content: 'Standard operating procedures for incident escalation: Level 1 (Support Engineer) - Initial triage, 4-hour SLA. Level 2 (Senior Support) - Advanced diagnostics, 8-hour SLA. Level 3 (Engineering) - Code-level investigation, 24-hour SLA. Critical Incidents: Immediate escalation to on-call engineer.', views: 189, helpful: 45, updated: '2025-01-15' },
  { id: 'kb4', title: 'API Integration Guide', category: 'Development', department: 'R&D', author: 'u4', content: 'NextGuard DLP RESTful API integration guide. Authentication: OAuth 2.0 with JWT tokens. Core Endpoints: POST /policies, GET /policies/{id}, PUT /policies/{id}, DELETE /policies/{id}. GET /incidents, POST /scan. Rate Limits: 1000 req/min standard, 5000 enterprise. SDKs for Python, Java, Node.js, Go.', views: 412, helpful: 102, updated: '2025-01-22' },
  { id: 'kb5', title: 'Competitive Positioning Guide', category: 'Sales', department: 'Presales', author: 'u2', content: 'Positioning NextGuard against competitors: vs Forcepoint - AI-driven classification, 40% fewer false positives. vs Symantec - Modern cloud-native architecture. vs Zscaler - Deeper endpoint DLP. vs McAfee/Trellix - Unified console, simpler licensing.', views: 567, helpful: 134, updated: '2025-01-24' },
  { id: 'kb6', title: 'Troubleshooting Agent Connectivity', category: 'Support', department: 'Support', author: 'u3', content: 'Common agent connectivity issues: Agent offline - check port 443, verify proxy, restart service. Policy not updating - clear cache, force sync. High CPU - check exclusions, update agent. Certificate errors - renew cert, verify CA chain.', views: 723, helpful: 201, updated: '2025-01-25' },
];

export default function ProjectsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSprint, setFilterSprint] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedKBArticle, setSelectedKBArticle] = useState<KBArticle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createType, setCreateType] = useState<IssueType>('Task');
  const [createPriority, setCreatePriority] = useState<Priority>('Medium');
  const [createDept, setCreateDept] = useState<Department>('R&D');
  const [createAssignee, setCreateAssignee] = useState('u1');
    const [createDueDate, setCreateDueDate] = useState('');
  const [createDueTime, setCreateDueTime] = useState('');
  const [createAttachments, setCreateAttachments] = useState<File[]>([]); const [kbArticles, setKbArticles] = useState<KBArticle[]>(mockKBArticles); const [showCreateKB, setShowCreateKB] = useState(false); const [showEditKB, setShowEditKB] = useState(false); const [editKBArticle, setEditKBArticle] = useState<KBArticle|null>(null); const [showDeleteKBConfirm, setShowDeleteKBConfirm] = useState(false); const [kbTitle, setKbTitle] = useState(''); const [kbContent, setKbContent] = useState(''); const [kbCategory, setKbCategory] = useState(''); const [kbDept, setKbDept] = useState<Department>('R&D');

  useEffect(() => { const h = document.querySelector('header'); const f = document.querySelector('footer'); if (h) (h as HTMLElement).style.display = 'none'; if (f) (f as HTMLElement).style.display = 'none'; return () => { if (h) (h as HTMLElement).style.display = ''; if (f) (f as HTMLElement).style.display = ''; }; }, []);

  const now = () => new Date().toISOString().split('T')[0];
  const logId = () => `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const getUserName = (id: string) => mockUsers.find(u => u.id === id)?.name || 'Unassigned';
  const getUserAvatar = (id: string) => mockUsers.find(u => u.id === id)?.avatar || '??';

  const addLog = useCallback((action: ActivityLog['action'], issue: Issue, field?: string, oldVal?: string, newVal?: string) => {
    setActivityLogs(prev => [{ id: logId(), issueKey: issue.key, issueTitle: issue.title, action, field, oldValue: oldVal, newValue: newVal, user: currentUser?.name || 'System', timestamp: new Date().toLocaleString() }, ...prev]);
  }, [currentUser]);

  const [loginLoading, setLoginLoading] = useState(false);   const [checking, setChecking] = useState(true);   useEffect(() => { fetch('/api/projects/auth').then(r => r.json()).then(d => { if (d.authenticated && d.user) { setCurrentUser({ id: d.user.id, name: d.user.name, email: d.user.email, department: 'R&D', role: 'User', avatar: d.user.name.split(' ').map((n: string) => n[0]).join('') }); setIsLoggedIn(true); } }).catch(() => {}).finally(() => setChecking(false)); }, []);   const handleLogin = async () => { setLoginLoading(true); setLoginError(''); try { const r = await fetch('/api/projects/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput, password: passwordInput }) }); const d = await r.json(); if (r.ok && d.success) { setCurrentUser({ id: d.user.id, name: d.user.name, email: d.user.email, department: 'R&D', role: 'User', avatar: d.user.name.split(' ').map((n: string) => n[0]).join('') }); setIsLoggedIn(true); } else { setLoginError(d.error || 'Login failed'); } } catch { setLoginError('Network error'); } finally { setLoginLoading(false); } };

  const handleCreateIssue = () => { if (!createTitle.trim()) return; const newIssue: Issue = { id: String(Date.now()), key: `NG-${113 + issues.length - 12}`, title: createTitle, description: createDesc, type: createType, status: 'To Do', priority: createPriority, assignee: createAssignee, reporter: currentUser?.id || 'u5', department: createDept, sprint: 'Sprint 12', points: 3, labels: [], created: now(), updated: now(), comments: 0, attachments: createAttachments.length, dueDate: createDueDate || undefined };  setIssues(prev => [...prev, newIssue]); addLog('Created', newIssue); setCreateTitle(''); setCreateDesc(''); setShowCreateModal(false); setCreateDueDate(''); setCreateDueTime(''); setCreateAttachments([]); };

  const handleEditIssue = () => { if (!editIssue) return; setIssues(prev => prev.map(i => { if (i.id === editIssue.id) { if (i.title !== editIssue.title) addLog('Modified', editIssue, 'Title', i.title, editIssue.title); if (i.description !== editIssue.description) addLog('Modified', editIssue, 'Description', 'changed', 'updated'); if (i.status !== editIssue.status) addLog('Status Changed', editIssue, 'Status', i.status, editIssue.status); if (i.priority !== editIssue.priority) addLog('Modified', editIssue, 'Priority', i.priority, editIssue.priority); if (i.assignee !== editIssue.assignee) addLog('Modified', editIssue, 'Assignee', getUserName(i.assignee), getUserName(editIssue.assignee)); if (i.type !== editIssue.type) addLog('Modified', editIssue, 'Type', i.type, editIssue.type); return { ...editIssue, updated: now() }; } return i; })); setShowEditModal(false); setEditIssue(null); setSelectedIssue(null); };

  const handleDeleteIssue = () => { if (!selectedIssue) return; addLog('Deleted', selectedIssue); setIssues(prev => prev.filter(i => i.id !== selectedIssue.id)); setShowDeleteConfirm(false); setSelectedIssue(null); };

  const handleCloseIssue = () => { if (!selectedIssue) return; const f = { ...selectedIssue, status: 'Closed' as Status, updated: now() }; addLog('Closed', f, 'Status', selectedIssue.status, 'Closed'); setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f); };

  const handleReopenIssue = () => { if (!selectedIssue) return; const f = { ...selectedIssue, status: 'To Do' as Status, updated: now() }; addLog('Reopened', f, 'Status', selectedIssue.status, 'To Do'); setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f); };

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (searchQuery && !issue.title.toLowerCase().includes(searchQuery.toLowerCase()) && !issue.key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
      if (filterType !== 'all' && issue.type !== filterType) return false;
      if (filterDepartment !== 'all' && issue.department !== filterDepartment) return false;
      if (filterSprint !== 'all' && issue.sprint !== filterSprint) return false;
      return true;
    });
  }, [issues, searchQuery, filterPriority, filterType, filterDepartment, filterSprint]);

  const completedPoints = filteredIssues.filter(i => i.status === 'Done' || i.status === 'Closed').reduce((s, i) => s + i.points, 0);
  const totalPoints = filteredIssues.reduce((s, i) => s + i.points, 0);

  if (checking) return (<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Checking authentication...</p></div>);   if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8"><h2 className="text-xl sm:text-2xl font-bold text-white">NextGuard DLP</h2><p className="text-gray-400 text-sm">Project Management Platform</p></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sign In</h3>
            {loginError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{loginError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your@nextguard.com" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Password</label><input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter password" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" /></div>
              <button onClick={handleLogin} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors text-white" disabled={loginLoading}>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800"><p className="text-xs text-gray-500">Use your registered account to sign in. Contact admin if you need Project Access permission.</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {mobileSidebarOpen && <div className="fixed inset-0 z-[60] lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} /></div>}
      <div className={`${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-[70] h-screen ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-lg font-bold text-cyan-400">NextGuard DLP</h1>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white hidden lg:block">{sidebarCollapsed ? '>' : '<'}</button>
          <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400 hover:text-white lg:hidden">X</button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { key: 'board' as ViewMode, label: 'Board', icon: '📊' },
            { key: 'list' as ViewMode, label: 'List View', icon: '📃' },
            { key: 'backlog' as ViewMode, label: 'Backlog', icon: '📥' },
            { key: 'reports' as ViewMode, label: 'Reports', icon: '📈' },
            { key: 'kb' as ViewMode, label: 'Knowledge Base', icon: '📚' },
          ].map(item => (
            <button key={item.key} onClick={() => { setActiveView(item.key); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeView === item.key ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span>{item.icon}</span>{!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={() => setShowActivityLog(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-white mb-2">
            <span>📝</span>{!sidebarCollapsed && <span>Activity Log</span>}{activityLogs.length > 0 && <span className="ml-auto bg-cyan-600 text-white text-xs px-1.5 py-0.5 rounded-full">{activityLogs.length}</span>}
          </button>
          <div className="flex items-center gap-3 px-3 py-2"><div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold">{currentUser?.avatar}</div>{!sidebarCollapsed && (<div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{currentUser?.name}</p><p className="text-xs text-gray-500 truncate">{currentUser?.department} - {currentUser?.role}</p></div>)}</div>
          {!sidebarCollapsed && <button onClick={() => { fetch('/api/projects/auth', { method: 'DELETE' }); setIsLoggedIn(false); setCurrentUser(null); }} className="w-full mt-3 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors">Sign Out</button>}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="bg-gray-900/50 border-b border-gray-800 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setMobileSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden text-xl">☰</button>
            <div className="flex-1 min-w-0"><h2 className="text-base sm:text-lg font-bold text-white truncate">NextGuard DLP - Project Board</h2><p className="text-xs text-gray-500">Sprint 12 - Jan 7, 2025</p></div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block"><span className="text-xs text-gray-400">Sprint Progress</span><div className="flex items-center gap-2"><div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${totalPoints > 0 ? (completedPoints/totalPoints)*100 : 0}%` }} /></div><span className="text-xs text-gray-400">{completedPoints}/{totalPoints} pts</span></div></div>
              <button onClick={() => setShowCreateModal(true)} className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">+ Create</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm w-full sm:w-64 focus:border-cyan-500 focus:outline-none" />
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none"><option value="all">All Priorities</option>{Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}</select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none"><option value="all">All Types</option>{Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}</select>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block"><option value="all">All Departments</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block"><option value="all">All Sprints</option><option value="Sprint 12">Sprint 12</option><option value="Sprint 13">Sprint 13</option></select>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-4">
        {activeView === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            {statusColumns.map(status => {
              const ci = filteredIssues.filter(i => i.status === status);
              return (<div key={status} className="flex-shrink-0 w-64 sm:w-72">
                <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-300">{status}</h3><span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">{ci.length}</span></div>
                <div className="space-y-2">{ci.map(issue => (
                  <div key={issue.id} onClick={() => setSelectedIssue(issue)} className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 transition-colors">
                    <div className="flex items-center gap-1 text-xs mb-1"><span>{typeConfig[issue.type].icon}</span><span className="text-gray-500">{issue.key}</span><span className={`ml-auto ${priorityConfig[issue.priority].bg} ${priorityConfig[issue.priority].color} px-1.5 py-0.5 rounded text-xs`}>{issue.priority}</span></div>
                    <p className="text-sm text-white font-medium mb-2">{issue.title}</p>
                    <div className="flex items-center justify-between"><div className="flex gap-1">{issue.labels.slice(0, 2).map(l => <span key={l} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{l}</span>)}</div><div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">{getUserAvatar(issue.assignee)}</div></div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><span>{issue.points} pts</span><span>{issue.comments} comments</span></div>
                  </div>
                ))}</div>
              </div>);
            })}
          </div>
        )}
        {activeView === 'list' && (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500 border-b border-gray-800"><th className="pb-3 px-2">Key</th><th className="pb-3 px-2">Title</th><th className="pb-3 px-2 hidden sm:table-cell">Type</th><th className="pb-3 px-2">Status</th><th className="pb-3 px-2 hidden sm:table-cell">Priority</th><th className="pb-3 px-2 hidden md:table-cell">Assignee</th><th className="pb-3 px-2">Pts</th></tr></thead><tbody>{filteredIssues.map(issue => (<tr key={issue.id} onClick={() => setSelectedIssue(issue)} className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer"><td className="py-3 px-2 text-cyan-400">{issue.key}</td><td className="py-3 px-2 text-white">{issue.title}</td><td className="py-3 px-2 hidden sm:table-cell">{typeConfig[issue.type].icon} {issue.type}</td><td className="py-3 px-2"><span className="px-2 py-1 bg-gray-800 rounded text-xs">{issue.status}</span></td><td className="py-3 px-2 hidden sm:table-cell"><span className={priorityConfig[issue.priority].color}>{priorityConfig[issue.priority].icon} {issue.priority}</span></td><td className="py-3 px-2 hidden md:table-cell">{getUserName(issue.assignee)}</td><td className="py-3 px-2">{issue.points}</td></tr>))}</tbody></table></div>)}
        {activeView === 'backlog' && (<div className="space-y-6">{['Sprint 12', 'Sprint 13', 'Backlog'].map(sprint => { const si = filteredIssues.filter(i => sprint === 'Backlog' ? (i.status === 'Backlog' && i.sprint !== 'Sprint 12' && i.sprint !== 'Sprint 13') : i.sprint === sprint); return (<div key={sprint} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-white">{sprint}</h3><span className="text-xs text-gray-500">{si.length} issues - {si.reduce((s, i) => s + i.points, 0)} pts</span></div><div className="space-y-1">{si.map(issue => (<div key={issue.id} onClick={() => setSelectedIssue(issue)} className="flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 hover:bg-gray-800 rounded-lg cursor-pointer"><span>{typeConfig[issue.type].icon}</span><span className="text-xs text-gray-500 w-16">{issue.key}</span><span className="text-sm text-white flex-1 truncate">{issue.title}</span><span className={`text-xs ${priorityConfig[issue.priority].color}`}>{issue.priority}</span><span className="text-xs text-gray-500">{issue.points} pts</span></div>))}</div></div>); })}</div>)}
        {activeView === 'reports' && (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4"><h3 className="font-semibold text-white mb-3">Sprint Velocity</h3><div className="space-y-3">{[{s:'Sprint 10',p:34},{s:'Sprint 11',p:42},{s:'Sprint 12',p:totalPoints}].map(v=>(<div key={v.s} className="flex items-center gap-3"><span className="text-xs text-gray-400 w-20">{v.s}</span><div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-600 rounded-full" style={{width:`${(v.p/50)*100}%`}}/></div><span className="text-xs text-gray-400">{v.p} pts</span></div>))}</div></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4"><h3 className="font-semibold text-white mb-3">Issues by Priority</h3><div className="space-y-2">{Object.entries(priorityConfig).map(([p,c])=>{const n=issues.filter(i=>i.priority===p).length;return(<div key={p} className="flex items-center justify-between"><span className={`text-sm ${c.color}`}>{c.icon} {p}</span><span className="text-xs text-gray-400">{n}</span></div>);})}</div></div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4"><h3 className="font-semibold text-white mb-3">Summary</h3><div className="grid grid-cols-2 gap-4"><div className="text-center"><div className="text-2xl font-bold text-white">{issues.length}</div><p className="text-xs text-gray-500">Total</p></div><div className="text-center"><div className="text-2xl font-bold text-green-400">{issues.filter(i=>i.status==='Done'||i.status==='Closed').length}</div><p className="text-xs text-gray-500">Done</p></div><div className="text-center"><div className="text-2xl font-bold text-red-400">{issues.filter(i=>i.priority==='Critical').length}</div><p className="text-xs text-gray-500">Critical</p></div><div className="text-center"><div className="text-2xl font-bold text-cyan-400">{totalPoints}</div><p className="text-xs text-gray-500">Points</p></div></div></div>
        </div>)}
        {activeView === 'kb' && (<div className="flex gap-6"><div className="w-56 shrink-0 hidden lg:block"><div className="sticky top-4 space-y-1"><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>{Array.from(new Set(kbArticles.map(a=>a.category))).map(cat=>(<button key={cat} onClick={()=>setSearchQuery(searchQuery===cat?'':cat)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${searchQuery===cat?'bg-cyan-600/20 text-cyan-400':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>{cat}<span className="ml-auto text-xs text-gray-600"> ({kbArticles.filter(a=>a.category===cat).length})</span></button>))}<div className="border-t border-gray-800 my-3"/><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Departments</h3>{departments.map(dept=>(<button key={dept} onClick={()=>setFilterDepartment(filterDepartment===dept?'all':dept)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${filterDepartment===dept?'bg-cyan-600/20 text-cyan-400':'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>{dept}</button>))}</div></div><div className="flex-1 min-w-0"><div className="mb-6"><input type="text" placeholder="Search knowledge base..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none text-sm"/><button onClick={()=>setShowCreateKB(true)} className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium text-sm whitespace-nowrap transition-colors">+ New Article</button></div><div className="space-y-3">{kbArticles.filter(a=>{const q=searchQuery.toLowerCase();const matchCat=kbArticles.some(x=>x.category===searchQuery);if(matchCat)return a.category===searchQuery;if(q&&!a.title.toLowerCase().includes(q)&&!a.content.toLowerCase().includes(q)&&!a.category.toLowerCase().includes(q))return false;if(filterDepartment!=='all'&&a.department!==filterDepartment)return false;return true;}).map(a=>(<div key={a.id} onClick={()=>setSelectedKBArticle(a)} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/30 transition-all cursor-pointer group"><div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-medium bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full">{a.category}</span><span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{a.department}</span></div><span className="text-xs text-gray-600">Updated {a.updated}</span></div><h3 className="text-base font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">{a.title}</h3><p className="text-sm text-gray-400 line-clamp-2 mb-3">{a.content.substring(0,150)}...</p><div className="flex items-center gap-4 text-xs text-gray-500"><span className="flex items-center gap-1">By {getUserName(a.author)}</span><span>{a.views} views</span><span>{a.helpful} found helpful</span></div></div>))}</div></div></div>)}
        </div>

        {selectedIssue && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={()=>setSelectedIssue(null)}><div className="absolute inset-0 bg-black/60"/>
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><span>{typeConfig[selectedIssue.type].icon}</span><span className="text-sm text-gray-400">{selectedIssue.key}</span><span className={`text-xs ${priorityConfig[selectedIssue.priority].bg} ${priorityConfig[selectedIssue.priority].color} px-2 py-0.5 rounded`}>{selectedIssue.priority}</span><span className={`text-xs px-2 py-0.5 rounded ${selectedIssue.status==='Closed'?'bg-gray-700 text-gray-400':'bg-cyan-500/20 text-cyan-400'}`}>{selectedIssue.status}</span></div><button onClick={()=>setSelectedIssue(null)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <h2 className="text-lg font-bold text-white mb-2">{selectedIssue.title}</h2>
            <p className="text-sm text-gray-400 mb-4">{selectedIssue.description}</p>
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
              <button onClick={()=>{setEditIssue({...selectedIssue});setShowEditModal(true);}} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors">Edit</button>
              {selectedIssue.status!=='Closed'?(<button onClick={handleCloseIssue} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors">Close</button>):(<button onClick={handleReopenIssue} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors">Reopen</button>)}
              <button onClick={()=>setShowDeleteConfirm(true)} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">Delete</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-gray-500">Status: </span><span className="text-white">{selectedIssue.status}</span></div><div><span className="text-gray-500">Type: </span><span className="text-white">{selectedIssue.type}</span></div><div><span className="text-gray-500">Assignee: </span><span className="text-white">{getUserName(selectedIssue.assignee)}</span></div><div><span className="text-gray-500">Reporter: </span><span className="text-white">{getUserName(selectedIssue.reporter)}</span></div><div><span className="text-gray-500">Department: </span><span className="text-white">{selectedIssue.department}</span></div><div><span className="text-gray-500">Sprint: </span><span className="text-white">{selectedIssue.sprint}</span></div><div><span className="text-gray-500">Points: </span><span className="text-white">{selectedIssue.points}</span></div><div><span className="text-gray-500">Due: </span><span className="text-white">{selectedIssue.dueDate||'Not set'}</span></div></div>
            <div className="flex flex-wrap gap-1 mt-3">{selectedIssue.labels.map(l=><span key={l} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{l}</span>)}</div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500"><span>Created: {selectedIssue.created}</span><span>Updated: {selectedIssue.updated}</span></div>
            {activityLogs.filter(l=>l.issueKey===selectedIssue.key).length>0&&(<div className="mt-4 pt-4 border-t border-gray-800"><h4 className="text-sm font-semibold text-white mb-2">Activity History</h4><div className="space-y-2 max-h-40 overflow-y-auto">{activityLogs.filter(l=>l.issueKey===selectedIssue.key).map(log=>(<div key={log.id} className="flex items-start gap-2 text-xs"><span className={`px-1.5 py-0.5 rounded font-medium ${log.action==='Created'?'bg-green-500/20 text-green-400':log.action==='Deleted'?'bg-red-500/20 text-red-400':log.action==='Closed'?'bg-gray-700 text-gray-300':'bg-blue-500/20 text-blue-400'}`}>{log.action}</span><span className="text-gray-400">{log.field&&`${log.field}: `}{log.oldValue&&<><span className="line-through text-gray-600">{log.oldValue}</span>{' '}</>}{log.newValue&&<span className="text-white">{log.newValue}</span>}</span><span className="ml-auto text-gray-600 whitespace-nowrap">{log.user}</span></div>))}</div></div>)}
          </div>
        </div>)}

        {showEditModal && editIssue && (<div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={()=>setShowEditModal(false)}><div className="absolute inset-0 bg-black/60"/>
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Edit - {editIssue.key}</h3><button onClick={()=>setShowEditModal(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={editIssue.title} onChange={e=>setEditIssue({...editIssue,title:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"/></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={editIssue.description} onChange={e=>setEditIssue({...editIssue,description:e.target.value})} rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={editIssue.status} onChange={e=>setEditIssue({...editIssue,status:e.target.value as Status})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{statusColumns.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={editIssue.priority} onChange={e=>setEditIssue({...editIssue,priority:e.target.value as Priority})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(priorityConfig).map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={editIssue.type} onChange={e=>setEditIssue({...editIssue,type:e.target.value as IssueType})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(typeConfig).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Assignee</label><select value={editIssue.assignee} onChange={e=>setEditIssue({...editIssue,assignee:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{mockUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div className="flex gap-2 pt-2"><button onClick={handleEditIssue} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Save Changes</button><button onClick={()=>setShowEditModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Cancel</button></div>
            </div>
          </div>
        </div>)}

        {showDeleteConfirm && selectedIssue && (<div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60"/><div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e=>e.stopPropagation()}><h3 className="text-lg font-semibold text-white mb-2">Delete Issue?</h3><p className="text-sm text-gray-400 mb-4">Delete <strong>{selectedIssue.key}</strong>? This cannot be undone.</p><div className="flex gap-2"><button onClick={handleDeleteIssue} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={()=>setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div></div></div>)}

        {showActivityLog && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={()=>setShowActivityLog(false)}><div className="absolute inset-0 bg-black/60"/>
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800"><h3 className="text-lg font-semibold text-white">Activity Log ({activityLogs.length})</h3><button onClick={()=>setShowActivityLog(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="flex-1 overflow-y-auto p-4">{activityLogs.length===0?(<p className="text-gray-500 text-center py-8">No activity yet.</p>):(<div className="space-y-2">{activityLogs.map(log=>(<div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-3 bg-gray-800/50 rounded-lg text-sm"><span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${log.action==='Created'?'bg-green-500/20 text-green-400':log.action==='Deleted'?'bg-red-500/20 text-red-400':log.action==='Closed'?'bg-gray-700 text-gray-300':log.action==='Reopened'?'bg-yellow-500/20 text-yellow-400':'bg-blue-500/20 text-blue-400'}`}>{log.action}</span><span className="text-cyan-400 font-mono text-xs">{log.issueKey}</span><span className="text-white text-xs truncate flex-1">{log.issueTitle}</span>{log.field&&<span className="text-gray-500 text-xs">{log.field}: {log.oldValue} -&gt; {log.newValue}</span>}<span className="text-gray-600 text-xs whitespace-nowrap">{log.user} - {log.timestamp}</span></div>))}</div>)}</div>
          </div>
        </div>)}

        {selectedKBArticle && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={()=>setSelectedKBArticle(null)}><div className="absolute inset-0 bg-black/60"/>
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{selectedKBArticle.category}</span><span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{selectedKBArticle.department}</span></div><button onClick={()=>setSelectedKBArticle(null)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <h2 className="text-lg font-bold text-white mb-4">{selectedKBArticle.title}</h2>
            <div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">{getUserAvatar(selectedKBArticle.author)}</div><div><p className="text-sm text-white">{getUserName(selectedKBArticle.author)}</p><p className="text-xs text-gray-500">{selectedKBArticle.views} views - {selectedKBArticle.helpful} helpful</p></div></div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedKBArticle.content}</p>
          </div>
        </div>)}

        {showCreateModal && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={()=>setShowCreateModal(false)}><div className="absolute inset-0 bg-black/60"/>
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Create New Task</h3><button onClick={()=>setShowCreateModal(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={createTitle} onChange={e=>setCreateTitle(e.target.value)} placeholder="Task title" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"/></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={createDesc} onChange={e=>setCreateDesc(e.target.value)} placeholder="Describe..." rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={createType} onChange={e=>setCreateType(e.target.value as IssueType)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(typeConfig).map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={createPriority} onChange={e=>setCreatePriority(e.target.value as Priority)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(priorityConfig).map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Department</label><select value={createDept} onChange={e=>setCreateDept(e.target.value as Department)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Assignee</label><select value={createAssignee} onChange={e=>setCreateAssignee(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{mockUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={createDueDate} onChange={e=>setCreateDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"/></div><div><label className="block text-sm text-gray-400 mb-1">Due Time</label><input type="time" value={createDueTime} onChange={e=>setCreateDueTime(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"/></div></div>
          <div><label className="block text-sm text-gray-400 mb-1">Attachments</label><input type="file" multiple onChange={e => { if (e.target.files) setCreateAttachments(Array.from(e.target.files)) }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-cyan-600 file:text-white cursor-pointer"/>{createAttachments.length > 0 && <div className="mt-2 space-y-1">{createAttachments.map((f,i) => <div key={i} className="flex items-center justify-between text-xs bg-gray-800 p-2 rounded"><span className="text-gray-300 truncate">{f.name}</span><button onClick={() => setCreateAttachments(prev => prev.filter((_,j) => j !== i))} className="text-red-400 hover:text-red-300 ml-2">X</button></div>)}</div>}</div>
              <button onClick={handleCreateIssue} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Create Task</button>
            </div>
          </div>
        </div>)}

      </div>
    </div>
  );
}
