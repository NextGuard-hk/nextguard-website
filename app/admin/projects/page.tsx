'use client';
import { useState, useMemo, useEffect } from 'react';

// ==================== TYPES ====================
type Department = 'R&D' | 'Presales' | 'Support' | 'Management';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type IssueType = 'Bug' | 'Feature' | 'Task' | 'Epic' | 'Story' | 'Incident';
type Status = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done';
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
interface KBArticle {
  id: string; title: string; category: string; department: Department; author: string;
  content: string; views: number; helpful: number; updated: string;
}

// ==================== CONFIG ====================
const priorityConfig: Record<Priority, { color: string; bg: string; icon: string }> = {
  Critical: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '\ud83d\udd34' },
  High: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '\ud83d\udfe0' },
  Medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '\ud83d\udfe1' },
  Low: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '\ud83d\udfe2' },
};
const typeConfig: Record<IssueType, { color: string; icon: string }> = {
  Bug: { color: 'text-red-400', icon: '\ud83d\udc1b' },
  Feature: { color: 'text-purple-400', icon: '\u2728' },
  Task: { color: 'text-blue-400', icon: '\ud83d\udccb' },
  Epic: { color: 'text-violet-400', icon: '\u26a1' },
  Story: { color: 'text-green-400', icon: '\ud83d\udcd6' },
  Incident: { color: 'text-red-500', icon: '\ud83d\udea8' },
};
const statusColumns: Status[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
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

const mockIssues: Issue[] = [
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

const mockKBArticles: KBArticle[] = [
  { id: 'kb1', title: 'DLP Policy Configuration Best Practices', category: 'Configuration', department: 'R&D', author: 'u1', content: 'This guide covers best practices for configuring DLP policies across all channels including endpoints, email, web, and cloud storage. Key topics include: 1) Policy hierarchy and inheritance rules, 2) Regular expression patterns for sensitive data detection, 3) Fingerprinting configuration for document classification, 4) Action rules including block, encrypt, quarantine, and notify, 5) Exception handling and whitelist management, 6) Testing policies in monitor-only mode before enforcement, 7) Performance optimization tips for large-scale deployments.', views: 342, helpful: 89, updated: '2025-01-20' },
  { id: 'kb2', title: 'Customer Deployment Checklist', category: 'Deployment', department: 'Presales', author: 'u2', content: 'Complete checklist for enterprise customer deployment: Phase 1 - Discovery: Identify data classification requirements, map data flows, assess current security posture. Phase 2 - Planning: Design policy framework, define user groups, plan rollout phases. Phase 3 - Implementation: Install management server, deploy agents, configure policies. Phase 4 - Testing: Run in monitor mode for 2 weeks, review false positives, tune policies. Phase 5 - Go-Live: Enable enforcement, train administrators, establish support procedures.', views: 256, helpful: 67, updated: '2025-01-18' },
  { id: 'kb3', title: 'Incident Escalation Procedures', category: 'Process', department: 'Support', author: 'u6', content: 'Standard operating procedures for incident escalation: Level 1 (Support Engineer) - Initial triage, log collection, basic troubleshooting, 4-hour SLA. Level 2 (Senior Support) - Advanced diagnostics, configuration review, workaround implementation, 8-hour SLA. Level 3 (Engineering) - Code-level investigation, hotfix development, root cause analysis, 24-hour SLA. Critical Incidents: Immediate escalation to on-call engineer, customer communication every 2 hours, post-incident review within 48 hours.', views: 189, helpful: 45, updated: '2025-01-15' },
  { id: 'kb4', title: 'API Integration Guide', category: 'Development', department: 'R&D', author: 'u4', content: 'NextGuard DLP RESTful API integration guide. Authentication: OAuth 2.0 with JWT tokens. Base URL: api.nextguard.com/v2. Core Endpoints: POST /policies - Create new DLP policy, GET /policies/{id} - Retrieve policy details, PUT /policies/{id} - Update policy, DELETE /policies/{id} - Remove policy. GET /incidents - List DLP incidents with filtering, GET /incidents/{id} - Incident details with matched content. POST /scan - On-demand content scan. GET /reports/summary - Dashboard summary data. Rate Limits: 1000 requests/minute for standard tier, 5000 for enterprise. SDKs available for Python, Java, Node.js, and Go.', views: 412, helpful: 102, updated: '2025-01-22' },
  { id: 'kb5', title: 'Competitive Positioning Guide', category: 'Sales', department: 'Presales', author: 'u2', content: 'Positioning NextGuard against competitors: vs Forcepoint - Our AI-driven classification outperforms rule-based approach, 40% fewer false positives. vs Symantec/Broadcom - Modern cloud-native architecture vs legacy on-premises, faster deployment. vs Zscaler - Deeper endpoint DLP capabilities, better offline protection. vs McAfee/Trellix - Unified management console, simpler licensing model. Key differentiators: 1) AI-powered data classification, 2) Single agent for all channels, 3) Cloud-native management, 4) Real-time policy enforcement, 5) Built-in compliance templates (GDPR, PCI-DSS, HIPAA).', views: 567, helpful: 134, updated: '2025-01-24' },
  { id: 'kb6', title: 'Troubleshooting Agent Connectivity', category: 'Support', department: 'Support', author: 'u3', content: 'Common agent connectivity issues and resolution: Issue 1 - Agent shows offline: Check network connectivity to management server (port 443), verify proxy settings, restart NextGuard service. Issue 2 - Policy not updating: Clear local policy cache, force policy sync via CLI command ng-agent --sync, check server-side policy assignment. Issue 3 - High CPU usage: Check scan exclusions, verify recursive scan limits, update to latest agent version. Issue 4 - Certificate errors: Renew agent certificate, verify CA chain, check system clock synchronization. Diagnostic tools: ng-agent --status, ng-agent --test-connection, ng-agent --collect-logs.', views: 723, helpful: 201, updated: '2025-01-25' },
];

// ==================== MAIN COMPONENT ====================
export default function ProjectsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedKBArticle, setSelectedKBArticle] = useState<KBArticle | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); useEffect(() => { const h = document.querySelector('header'); const f = document.querySelector('footer'); if (h) (h as HTMLElement).style.display = 'none'; if (f) (f as HTMLElement).style.display = 'none'; return () => { if (h) (h as HTMLElement).style.display = ''; if (f) (f as HTMLElement).style.display = ''; }; }, []);

  const handleLogin = () => {
    const user = mockUsers.find(u => u.email === emailInput);
    if (user && passwordInput === 'nextguard2025') {
      setCurrentUser(user); setIsLoggedIn(true); setLoginError('');
    } else {
      setLoginError('Invalid credentials. Try any user email with password: nextguard2025');
    }
  };

  const filteredIssues = useMemo(() => {
    return mockIssues.filter(issue => {
      if (searchQuery && !issue.title.toLowerCase().includes(searchQuery.toLowerCase()) && !issue.key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
      if (filterType !== 'all' && issue.type !== filterType) return false;
      if (filterDepartment !== 'all' && issue.department !== filterDepartment) return false;
      if (filterSprint !== 'all' && issue.sprint !== filterSprint) return false;
      return true;
    });
  }, [searchQuery, filterPriority, filterType, filterDepartment, filterSprint]);

  const completedPoints = filteredIssues.filter(i => i.status === 'Done').reduce((s, i) => s + i.points, 0);
  const totalPoints = filteredIssues.reduce((s, i) => s + i.points, 0);
  const getUserName = (id: string) => mockUsers.find(u => u.id === id)?.name || 'Unassigned';
  const getUserAvatar = (id: string) => mockUsers.find(u => u.id === id)?.avatar || '??';

  // ==================== LOGIN PAGE ====================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">NextGuard DLP</h1>
            <p className="text-gray-400 mt-2">Project Management Platform</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>
            {loginError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{loginError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your@nextguard.com" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter password" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
              </div>
              <button onClick={handleLogin} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors">Sign In</button>
            </div>
            <div className="mt-6 border-t border-gray-800 pt-4">
              <p className="text-xs text-gray-500 mb-2">Demo Accounts (password: nextguard2025):</p>
              <div className="space-y-1">
                {mockUsers.map(u => (
                  <button key={u.id} onClick={() => { setEmailInput(u.email); setPasswordInput('nextguard2025'); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 rounded flex justify-between">
                    <span>{u.name} - {u.department}</span><span className="text-gray-600 hidden sm:inline">{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN LAYOUT ====================
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[60] lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className={`fixed lg:static inset-y-0 left-0 z-[70] ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-lg font-bold text-white">NextGuard DLP</h1>}
          <div className="flex gap-2">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white hidden lg:block">{sidebarCollapsed ? '▶' : '◀'}</button>
            <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400 hover:text-white lg:hidden">✕</button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
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
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">{currentUser?.avatar}</div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.department} - {currentUser?.role}</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }} className="w-full mt-3 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors">Sign Out</button>}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden text-xl">☰</button>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold">NextGuard DLP - Project Board</h1>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Sprint 12 &middot; Jan 7, 2025</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right mr-2 sm:mr-4 hidden sm:block">
                  <div className="text-sm text-gray-400">Sprint Progress</div>
                  <div className="text-lg font-bold text-cyan-400">{completedPoints}/{totalPoints} pts</div>
                </div>
                <div className="w-20 sm:w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${totalPoints > 0 ? (completedPoints/totalPoints)*100 : 0}%` }} />
                </div>
                <button onClick={() => setShowCreateModal(true)} className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">+ Create</button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm w-full sm:w-64 focus:border-cyan-500 focus:outline-none" />
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none">
              <option value="all">All Priorities</option>
              {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none">
              <option value="all">All Types</option>
              {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
            </select>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block">
              <option value="all">All Sprints</option>
              <option value="Sprint 12">Sprint 12</option>
              <option value="Sprint 13">Sprint 13</option>
            </select>
          </div>
        </div>

        {/* Board View - horizontal scroll on mobile */}
        {activeView === 'board' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
            <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-5 lg:overflow-x-visible">
              {statusColumns.map(status => {
                const columnIssues = filteredIssues.filter(i => i.status === status);
                return (
                  <div key={status} className="bg-gray-900/50 rounded-xl p-3 min-w-[280px] lg:min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-300">{status}</h3>
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-400">{columnIssues.length}</span>
                    </div>
                    <div className="space-y-2">
                      {columnIssues.map(issue => (
                        <div key={issue.id} onClick={() => setSelectedIssue(issue)} className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs">{typeConfig[issue.type].icon}</span>
                            <span className="text-xs text-gray-500">{issue.key}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig[issue.priority].bg} ${priorityConfig[issue.priority].color}`}>{issue.priority}</span>
                          </div>
                          <p className="text-sm text-white mb-2 line-clamp-2">{issue.title}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {issue.labels.slice(0, 2).map(l => <span key={l} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{l}</span>)}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300" title={getUserName(issue.assignee)}>{getUserAvatar(issue.assignee)}</div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{issue.points} pts</span><span>{issue.comments} comments</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View - responsive table */}
        {activeView === 'list' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Key</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Title</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Type</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Priority</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Assignee</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map(issue => (
                      <tr key={issue.id} onClick={() => setSelectedIssue(issue)} className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-sm text-cyan-400 font-mono">{issue.key}</td>
                        <td className="px-4 py-3 text-sm text-white">{issue.title}</td>
                        <td className="px-4 py-3 text-sm"><span className={typeConfig[issue.type].color}>{typeConfig[issue.type].icon} {issue.type}</span></td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">{issue.status}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded ${priorityConfig[issue.priority].bg} ${priorityConfig[issue.priority].color}`}>{priorityConfig[issue.priority].icon} {issue.priority}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-300">{getUserName(issue.assignee)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{issue.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Backlog View */}
        {activeView === 'backlog' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
            <div className="space-y-3">
              {['Sprint 12', 'Sprint 13', 'Backlog'].map(sprint => {
                const sprintIssues = filteredIssues.filter(i => sprint === 'Backlog' ? i.status === 'Backlog' : i.sprint === sprint);
                return (
                  <div key={sprint} className="bg-gray-900 rounded-xl border border-gray-800 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-white">{sprint}</h3>
                      <span className="text-xs sm:text-sm text-gray-400">{sprintIssues.length} issues &middot; {sprintIssues.reduce((s, i) => s + i.points, 0)} pts</span>
                    </div>
                    {sprintIssues.map(issue => (
                      <div key={issue.id} onClick={() => setSelectedIssue(issue)} className="flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 hover:bg-gray-800 rounded-lg cursor-pointer">
                        <span className="text-xs">{typeConfig[issue.type].icon}</span>
                        <span className="text-xs text-gray-500 font-mono w-14 sm:w-16 shrink-0">{issue.key}</span>
                        <span className="flex-1 text-sm text-white truncate">{issue.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig[issue.priority].bg} ${priorityConfig[issue.priority].color} hidden sm:inline`}>{issue.priority}</span>
                        <span className="text-xs text-gray-500 shrink-0">{issue.points} pts</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reports View - responsive grid */}
        {activeView === 'reports' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Sprint Velocity</h3>
                <div className="space-y-3">
                  {[{ sprint: 'Sprint 10', pts: 34 }, { sprint: 'Sprint 11', pts: 42 }, { sprint: 'Sprint 12', pts: totalPoints }].map(s => (
                    <div key={s.sprint}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">{s.sprint}</span><span className="text-cyan-400">{s.pts} pts</span></div>
                      <div className="h-2 bg-gray-700 rounded-full"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(s.pts/50)*100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Issues by Priority</h3>
                <div className="space-y-3">
                  {Object.entries(priorityConfig).map(([p, c]) => {
                    const count = mockIssues.filter(i => i.priority === p).length;
                    return (<div key={p} className="flex items-center gap-3"><span className="text-sm w-20">{c.icon} {p}</span><div className="flex-1 h-2 bg-gray-700 rounded-full"><div className={`h-full rounded-full ${p === 'Critical' ? 'bg-red-500' : p === 'High' ? 'bg-orange-500' : p === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${(count/mockIssues.length)*100}%` }} /></div><span className="text-sm text-gray-400 w-8">{count}</span></div>);
                  })}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Workload by Department</h3>
                <div className="space-y-3">
                  {departments.map(dept => {
                    const count = mockIssues.filter(i => i.department === dept).length;
                    return (<div key={dept} className="flex items-center gap-3"><span className="text-sm text-gray-300 w-24">{dept}</span><div className="flex-1 h-2 bg-gray-700 rounded-full"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(count/mockIssues.length)*100}%` }} /></div><span className="text-sm text-gray-400 w-8">{count}</span></div>);
                  })}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">SLA Compliance</h3>
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold text-green-400 mb-2">94%</div>
                  <p className="text-gray-400 text-sm">Issues resolved within SLA</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-lg font-bold text-green-400">8</div><div className="text-xs text-gray-500">On Time</div></div>
                    <div><div className="text-lg font-bold text-yellow-400">3</div><div className="text-xs text-gray-500">At Risk</div></div>
                    <div><div className="text-lg font-bold text-red-400">1</div><div className="text-xs text-gray-500">Breached</div></div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Team Capacity</h3>
                <div className="space-y-3">
                  {mockUsers.slice(0, 4).map(u => {
                    const userPts = mockIssues.filter(i => i.assignee === u.id).reduce((s, i) => s + i.points, 0);
                    return (<div key={u.id} className="flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-xs text-white font-bold">{u.avatar}</div><span className="text-sm text-gray-300 w-16 sm:w-24 truncate">{u.name.split(' ')[0]}</span><div className="flex-1 h-2 bg-gray-700 rounded-full"><div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min((userPts/20)*100, 100)}%` }} /></div><span className="text-xs text-gray-400">{userPts}/20</span></div>);
                  })}
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-3 bg-gray-800 rounded-lg"><div className="text-2xl font-bold text-cyan-400">{mockIssues.length}</div><div className="text-xs text-gray-500">Total Issues</div></div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg"><div className="text-2xl font-bold text-green-400">{mockIssues.filter(i => i.status === 'Done').length}</div><div className="text-xs text-gray-500">Completed</div></div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg"><div className="text-2xl font-bold text-red-400">{mockIssues.filter(i => i.priority === 'Critical').length}</div><div className="text-xs text-gray-500">Critical</div></div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg"><div className="text-2xl font-bold text-yellow-400">{totalPoints}</div><div className="text-xs text-gray-500">Story Points</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base View - clickable articles */}
        {activeView === 'kb' && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockKBArticles.map(article => (
                <div key={article.id} onClick={() => setSelectedKBArticle(article)} className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6 hover:border-cyan-500/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400">{article.category}</span>
                    <span className="text-xs text-gray-500">{article.department}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{article.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{article.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>By {getUserName(article.author)}</span>
                    <div className="flex gap-3"><span>{article.views} views</span><span>{article.helpful} helpful</span></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">Updated: {article.updated}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issue Detail Modal */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={() => setSelectedIssue(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span>{typeConfig[selectedIssue.type].icon}</span>
                    <span className="text-cyan-400 font-mono">{selectedIssue.key}</span>
                    <span className={`text-xs px-2 py-1 rounded ${priorityConfig[selectedIssue.priority].bg} ${priorityConfig[selectedIssue.priority].color}`}>{selectedIssue.priority}</span>
                  </div>
                  <button onClick={() => setSelectedIssue(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{selectedIssue.title}</h2>
                <p className="text-gray-400 mb-6 text-sm sm:text-base">{selectedIssue.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div><span className="text-gray-500">Status:</span> <span className="text-white ml-2">{selectedIssue.status}</span></div>
                  <div><span className="text-gray-500">Type:</span> <span className="text-white ml-2">{selectedIssue.type}</span></div>
                  <div><span className="text-gray-500">Assignee:</span> <span className="text-white ml-2">{getUserName(selectedIssue.assignee)}</span></div>
                  <div><span className="text-gray-500">Reporter:</span> <span className="text-white ml-2">{getUserName(selectedIssue.reporter)}</span></div>
                  <div><span className="text-gray-500">Department:</span> <span className="text-white ml-2">{selectedIssue.department}</span></div>
                  <div><span className="text-gray-500">Sprint:</span> <span className="text-white ml-2">{selectedIssue.sprint}</span></div>
                  <div><span className="text-gray-500">Story Points:</span> <span className="text-white ml-2">{selectedIssue.points}</span></div>
                  <div><span className="text-gray-500">Due Date:</span> <span className="text-white ml-2">{selectedIssue.dueDate || 'Not set'}</span></div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">{selectedIssue.labels.map(l => <span key={l} className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">{l}</span>)}</div>
                <div className="mt-4 flex gap-3 sm:gap-4 text-xs text-gray-500 flex-wrap">
                  <span>Created: {selectedIssue.created}</span><span>Updated: {selectedIssue.updated}</span><span>{selectedIssue.comments} comments</span><span>{selectedIssue.attachments} attachments</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KB Article Detail Modal */}
        {selectedKBArticle && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={() => setSelectedKBArticle(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400">{selectedKBArticle.category}</span>
                    <span className="text-xs text-gray-500">{selectedKBArticle.department}</span>
                  </div>
                  <button onClick={() => setSelectedKBArticle(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">{selectedKBArticle.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-xs text-white font-bold">{getUserAvatar(selectedKBArticle.author)}</div>
                    <span>{getUserName(selectedKBArticle.author)}</span>
                  </div>
                  <span>Updated: {selectedKBArticle.updated}</span>
                  <span>{selectedKBArticle.views} views</span>
                  <span>{selectedKBArticle.helpful} found helpful</span>
                </div>
                <div className="border-t border-gray-800 pt-6">
                  <div className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">{selectedKBArticle.content}</div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
                  <div className="text-sm text-gray-500">Was this article helpful?</div>
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 text-sm bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors">👍 Yes</button>
                    <button className="px-4 py-1.5 text-sm bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors">👎 No</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4" onClick={() => setShowCreateModal(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Create New Task</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>
                <div className="space-y-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" placeholder="Task title" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea placeholder="Describe the task..." rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none" /></div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div><label className="block text-sm text-gray-400 mb-1">Type</label><select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(typeConfig).map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(priorityConfig).map(p => <option key={p}>{p}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-400 mb-1">Department</label><select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d => <option key={d}>{d}</option>)}</select></div>
                    <div><label className="block text-sm text-gray-400 mb-1">Assignee</label><select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{mockUsers.map(u => <option key={u.id}>{u.name}</option>)}</select></div>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Create Task</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
