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
  points: number; labels: string[]; created: string; updated: string; dueDate?: string; dueTime?: string;
  comments: number; attachments: number;
}
interface ActivityLog {
  id: string; issueKey: string; issueTitle: string;
  action: 'Created' | 'Modified' | 'Deleted' | 'Closed' | 'Reopened' | 'Status Changed';
  field?: string; oldValue?: string; newValue?: string;
  user: string; timestamp: string;
}
interface KBArticle {
  id: string; title: string; category: string; department: Department; author: string;
  content: string; views: number; helpful: number; updated: string;
  sections?: { title: string; content: string }[];
  tags?: string[]; relatedIds?: string[];
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
  { id: '1', key: 'NG-101', title: 'Implement DLP Policy Engine v2', description: 'Rebuild policy engine with rule chaining support', type: 'Epic', status: 'In Progress', priority: 'Critical', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 12', points: 13, labels: ['dlp-core','architecture'], created: '2025-01-10', updated: '2025-01-25', dueDate: '2025-02-15', dueTime: '18:00', comments: 8, attachments: 3 },
  { id: '2', key: 'NG-102', title: 'Email DLP Content Inspection Module', description: 'Deep content inspection for email attachments', type: 'Feature', status: 'In Progress', priority: 'High', assignee: 'u4', reporter: 'u1', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['email-dlp','inspection'], created: '2025-01-12', updated: '2025-01-24', dueDate: '2025-02-10', dueTime: '17:00', comments: 5, attachments: 2 },
  { id: '3', key: 'NG-103', title: 'Web DLP Browser Extension', description: 'Chrome/Edge extension for web content monitoring', type: 'Feature', status: 'To Do', priority: 'High', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['web-dlp','browser'], created: '2025-01-14', updated: '2025-01-20', comments: 3, attachments: 1 },
  { id: '4', key: 'NG-104', title: 'Customer onboarding automation', description: 'Automate enterprise customer deployment workflow', type: 'Task', status: 'In Review', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 5, labels: ['automation','onboarding'], created: '2025-01-15', updated: '2025-01-23', comments: 4, attachments: 2 },
  { id: '5', key: 'NG-105', title: 'SLA breach notification system', description: 'Alert system for approaching and breached SLAs', type: 'Task', status: 'Done', priority: 'High', assignee: 'u3', reporter: 'u6', department: 'Support', sprint: 'Sprint 12', points: 5, labels: ['sla','alerts'], created: '2025-01-08', updated: '2025-01-22', comments: 6, attachments: 1 },
  { id: '6', key: 'NG-106', title: 'Endpoint DLP agent memory optimization', description: 'Reduce agent memory footprint by 40%', type: 'Bug', status: 'In Progress', priority: 'Critical', assignee: 'u4', reporter: 'u3', department: 'R&D', sprint: 'Sprint 12', points: 8, labels: ['endpoint','performance'], created: '2025-01-18', updated: '2025-01-25', dueDate: '2025-01-30', dueTime: '12:00', comments: 12, attachments: 4 },
  { id: '7', key: 'NG-107', title: 'Competitive analysis - Forcepoint DLP', description: 'Feature comparison matrix with Forcepoint', type: 'Task', status: 'Done', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 3, labels: ['competitive','analysis'], created: '2025-01-05', updated: '2025-01-20', comments: 2, attachments: 5 },
  { id: '8', key: 'NG-108', title: 'Cloud DLP API gateway integration', description: 'REST API gateway for cloud DLP service', type: 'Feature', status: 'Backlog', priority: 'Medium', assignee: 'u1', reporter: 'u5', department: 'R&D', sprint: 'Sprint 13', points: 13, labels: ['cloud','api'], created: '2025-01-20', updated: '2025-01-20', comments: 1, attachments: 0 },
  { id: '9', key: 'NG-109', title: 'Incident response playbook templates', description: 'Pre-built response templates for common DLP incidents', type: 'Incident', status: 'To Do', priority: 'High', assignee: 'u6', reporter: 'u5', department: 'Support', sprint: 'Sprint 12', points: 5, labels: ['incident','templates'], created: '2025-01-19', updated: '2025-01-21', comments: 3, attachments: 2 },
  { id: '10', key: 'NG-110', title: 'Data classification ML model v3', description: 'Train new ML model for auto data classification', type: 'Story', status: 'Backlog', priority: 'High', assignee: 'u4', reporter: 'u1', department: 'R&D', sprint: 'Sprint 13', points: 13, labels: ['ml','classification'], created: '2025-01-22', updated: '2025-01-22', comments: 0, attachments: 0 },
  { id: '11', key: 'NG-111', title: 'Enterprise demo environment setup', description: 'Sandbox environment for customer demos', type: 'Task', status: 'To Do', priority: 'Medium', assignee: 'u2', reporter: 'u5', department: 'Presales', sprint: 'Sprint 12', points: 3, labels: ['demo','environment'], created: '2025-01-16', updated: '2025-01-18', comments: 2, attachments: 1 },
  { id: '12', key: 'NG-112', title: 'USB device control policy bypass fix', description: 'Fix bypass vulnerability in USB device blocking', type: 'Bug', status: 'In Review', priority: 'Critical', assignee: 'u1', reporter: 'u3', department: 'R&D', sprint: 'Sprint 12', points: 5, labels: ['endpoint','security','urgent'], created: '2025-01-24', updated: '2025-01-25', dueDate: '2025-01-28', dueTime: '09:00', comments: 15, attachments: 3 },
];

const mockKBArticles: KBArticle[] = [
  { id: 'kb1', title: 'DLP Policy Configuration Best Practices', category: 'Configuration', department: 'R&D', author: 'u1', content: 'Comprehensive guide for configuring DLP policies across all channels.', views: 342, helpful: 89, updated: '2025-01-20', tags: ['dlp','policy','configuration','best-practices'], relatedIds: ['kb4','kb5'], sections: [
    { title: 'Policy Hierarchy & Inheritance', content: 'DLP policies follow a hierarchical model. Global policies apply across all departments, while department-specific policies can override or extend global rules. Understanding this hierarchy is critical for effective deployment.' },
    { title: 'Regular Expression Patterns', content: 'Use predefined regex patterns for common sensitive data types: credit cards, SSNs, passport numbers. Custom patterns can be created for organization-specific data like internal project codes or customer IDs.' },
    { title: 'Document Fingerprinting', content: 'Fingerprinting allows classification of documents based on templates. Register source documents and the system will detect derivatives, partial copies, and modified versions across all channels.' },
    { title: 'Action Rules Configuration', content: 'Configure actions per policy: Block (prevent data transfer), Encrypt (auto-encrypt before sending), Quarantine (hold for review), Notify (alert and log). Multiple actions can be chained.' },
    { title: 'Testing & Rollout', content: 'Always test policies in monitor-only mode before enforcement. Review incident logs for false positives, adjust patterns, then gradually enable enforcement starting with high-confidence rules.' }
  ] },
  { id: 'kb2', title: 'Customer Deployment Checklist', category: 'Deployment', department: 'Presales', author: 'u2', content: 'Complete checklist for enterprise customer deployment workflow.', views: 256, helpful: 67, updated: '2025-01-18', tags: ['deployment','enterprise','checklist'], relatedIds: ['kb5'], sections: [
    { title: 'Phase 1 - Discovery', content: 'Identify customer requirements, existing infrastructure, compliance needs, and data flow patterns. Document all integration points and potential conflicts.' },
    { title: 'Phase 2 - Planning', content: 'Create deployment timeline, resource allocation, and rollback procedures. Define success criteria and KPIs for each phase.' },
    { title: 'Phase 3 - Implementation', content: 'Deploy agents, configure policies, set up monitoring dashboards. Follow the standard installation guide for each endpoint type.' },
    { title: 'Phase 4 - Testing', content: 'Execute test scenarios for each policy type. Verify all channels (endpoint, email, web, cloud) are functioning correctly.' },
    { title: 'Phase 5 - Go-Live', content: 'Enable enforcement mode, monitor for 48 hours, address any incidents. Hand off to support team with documentation.' }
  ] },
  { id: 'kb3', title: 'Incident Escalation Procedures', category: 'Process', department: 'Support', author: 'u6', content: 'Standard operating procedures for incident escalation.', views: 189, helpful: 45, updated: '2025-01-15', tags: ['incident','escalation','sla','support'], relatedIds: ['kb6'], sections: [
    { title: 'Level 1 - Support Engineer', content: 'Initial triage and classification. 4-hour SLA for first response. Gather logs, reproduce issue, check known issues database.' },
    { title: 'Level 2 - Senior Support', content: 'Advanced diagnostics and troubleshooting. 8-hour SLA. Deep log analysis, configuration review, environment-specific investigation.' },
    { title: 'Level 3 - Engineering', content: 'Code-level investigation and hotfix development. 24-hour SLA. Root cause analysis, patch development, regression testing.' },
    { title: 'Critical Incidents', content: 'Immediate escalation to on-call engineer. Bridge call setup within 15 minutes. Status updates every 30 minutes until resolution.' }
  ] },
  { id: 'kb4', title: 'API Integration Guide', category: 'Development', department: 'R&D', author: 'u4', content: 'NextGuard DLP RESTful API integration guide.', views: 412, helpful: 102, updated: '2025-01-22', tags: ['api','rest','integration','sdk','oauth'], relatedIds: ['kb1'], sections: [
    { title: 'Authentication', content: 'OAuth 2.0 with JWT tokens. Obtain client credentials from the admin console. Tokens expire after 1 hour. Use refresh tokens for long-lived sessions.' },
    { title: 'Core Endpoints', content: 'POST /policies - Create policy. GET /policies/{id} - Retrieve policy. PUT /policies/{id} - Update policy. DELETE /policies/{id} - Remove policy. GET /incidents - List incidents. POST /scan - Trigger content scan.' },
    { title: 'Rate Limits & Quotas', content: 'Standard tier: 1000 requests/minute. Enterprise tier: 5000 requests/minute. Bulk operations: 100 items per batch request.' },
    { title: 'SDKs & Libraries', content: 'Official SDKs available for Python, Java, Node.js, and Go. Community SDKs for Ruby and PHP. All SDKs include automatic retry and rate limit handling.' }
  ] },
  { id: 'kb5', title: 'Competitive Positioning Guide', category: 'Sales', department: 'Presales', author: 'u2', content: 'Positioning NextGuard against key competitors.', views: 567, helpful: 134, updated: '2025-01-24', tags: ['sales','competitive','positioning'], relatedIds: ['kb2'], sections: [
    { title: 'vs Forcepoint', content: 'NextGuard advantage: AI-driven classification with 40% fewer false positives. Modern cloud-native architecture vs legacy on-premise focus.' },
    { title: 'vs Symantec/Broadcom', content: 'NextGuard advantage: Unified modern console, faster deployment. Symantec requires multiple products for full coverage.' },
    { title: 'vs Zscaler', content: 'NextGuard advantage: Deeper endpoint DLP capabilities. Zscaler focuses on cloud/web but lacks comprehensive endpoint coverage.' },
    { title: 'vs McAfee/Trellix', content: 'NextGuard advantage: Simpler licensing, unified console. Trellix requires multiple SKUs and separate management for each channel.' }
  ] },
  { id: 'kb6', title: 'Troubleshooting Agent Connectivity', category: 'Support', department: 'Support', author: 'u3', content: 'Common agent connectivity issues and resolutions.', views: 723, helpful: 201, updated: '2025-01-25', tags: ['troubleshooting','agent','connectivity','endpoint'], relatedIds: ['kb3','kb1'], sections: [
    { title: 'Agent Offline', content: 'Check port 443 connectivity to management server. Verify proxy settings in agent config. Restart the NextGuard Agent service. Check firewall rules for outbound HTTPS.' },
    { title: 'Policy Not Updating', content: 'Clear local policy cache at C:/ProgramData/NextGuard/cache. Force policy sync from agent tray icon. Verify agent has valid authentication token.' },
    { title: 'High CPU Usage', content: 'Review scan exclusion list - add high-churn directories. Update agent to latest version. Check for conflicts with other security software.' },
    { title: 'Certificate Errors', content: 'Renew expired certificates from admin console. Verify CA chain is complete. Import intermediate certificates if using custom CA.' }
  ] },
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
  const [issues, setIssues] = useState(initialIssues);
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
  const [createAttachments, setCreateAttachments] = useState<File[]>([]);   const [editAttachments, setEditAttachments] = useState<File[]>([]);
  const [kbArticles, setKbArticles] = useState(mockKBArticles);
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [showEditKB, setShowEditKB] = useState(false);
  const [editKBArticle, setEditKBArticle] = useState<KBArticle | null>(null);
  const [showDeleteKBConfirm, setShowDeleteKBConfirm] = useState(false);
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbCategory, setKbCategory] = useState('');
  const [kbDept, setKbDept] = useState<Department>('R&D');
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbSelectedCategory, setKbSelectedCategory] = useState('all');
  const [kbActiveSection, setKbActiveSection] = useState(0);
  const [kbHelpfulVoted, setKbHelpfulVoted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const h = document.querySelector('header');
    const f = document.querySelector('footer');
    if (h) (h as HTMLElement).style.display = 'none';
    if (f) (f as HTMLElement).style.display = 'none';
    return () => { if (h) (h as HTMLElement).style.display = ''; if (f) (f as HTMLElement).style.display = ''; };
  }, []);

  const now = () => new Date().toISOString().split('T')[0];
  const logId = () => `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const getUserName = (id: string) => mockUsers.find(u => u.id === id)?.name || 'Unassigned';
  const getUserAvatar = (id: string) => mockUsers.find(u => u.id === id)?.avatar || '??';

  const addLog = useCallback((action: ActivityLog['action'], issue: Issue, field?: string, oldVal?: string, newVal?: string) => {
    setActivityLogs(prev => [{ id: logId(), issueKey: issue.key, issueTitle: issue.title, action, field, oldValue: oldVal, newValue: newVal, user: currentUser?.name || 'System', timestamp: new Date().toLocaleString() }, ...prev]);
  }, [currentUser]);

  const [loginLoading, setLoginLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/projects/auth').then(r => r.json()).then(d => {
      if (d.authenticated && d.user) {
        setCurrentUser({ id: d.user.id, name: d.user.name, email: d.user.email, department: 'R&D', role: 'User', avatar: d.user.name.split(' ').map((n: string) => n[0]).join('') });
        setIsLoggedIn(true);
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError('');
    try {
      const r = await fetch('/api/projects/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput, password: passwordInput }) });
      const d = await r.json();
      if (r.ok && d.success) {
        setCurrentUser({ id: d.user.id, name: d.user.name, email: d.user.email, department: 'R&D', role: 'User', avatar: d.user.name.split(' ').map((n: string) => n[0]).join('') });
        setIsLoggedIn(true);
      } else { setLoginError(d.error || 'Login failed'); }
    } catch { setLoginError('Network error'); } finally { setLoginLoading(false); }
  };

  const handleCreateIssue = () => {
    if (!createTitle.trim()) return;
    const newIssue: Issue = {
      id: String(Date.now()), key: `NG-${113 + issues.length - 12}`, title: createTitle, description: createDesc, type: createType, status: 'To Do', priority: createPriority, assignee: createAssignee, reporter: currentUser?.id || 'u5', department: createDept, sprint: 'Sprint 12', points: 3, labels: [], created: now(), updated: now(), comments: 0, attachments: createAttachments.length, dueDate: createDueDate || undefined, dueTime: createDueTime || undefined
    };
    setIssues(prev => [...prev, newIssue]);
    addLog('Created', newIssue);
    setCreateTitle(''); setCreateDesc(''); setShowCreateModal(false); setCreateDueDate(''); setCreateDueTime(''); setCreateAttachments([]);
  };

  const handleEditIssue = () => {
    if (!editIssue) return;
    setIssues(prev => prev.map(i => {
      if (i.id === editIssue.id) {
        if (i.title !== editIssue.title) addLog('Modified', editIssue, 'Title', i.title, editIssue.title);
        if (i.description !== editIssue.description) addLog('Modified', editIssue, 'Description', 'changed', 'updated');
        if (i.status !== editIssue.status) addLog('Status Changed', editIssue, 'Status', i.status, editIssue.status);
        if (i.priority !== editIssue.priority) addLog('Modified', editIssue, 'Priority', i.priority, editIssue.priority);
        if (i.assignee !== editIssue.assignee) addLog('Modified', editIssue, 'Assignee', getUserName(i.assignee), getUserName(editIssue.assignee));
        if (i.type !== editIssue.type) addLog('Modified', editIssue, 'Type', i.type, editIssue.type);
        return { ...editIssue, updated: now(), attachments: editIssue.attachments + editAttachments.length };
      } return i;
    }));
    setShowEditModal(false); setEditIssue(null); setSelectedIssue(null);
  };

  const handleDeleteIssue = () => {
    if (!selectedIssue) return;
    addLog('Deleted', selectedIssue);
    setIssues(prev => prev.filter(i => i.id !== selectedIssue.id));
    setShowDeleteConfirm(false); setSelectedIssue(null);
  };

  const handleCloseIssue = () => {
    if (!selectedIssue) return;
    const f = { ...selectedIssue, status: 'Closed' as Status, updated: now() };
    addLog('Closed', f, 'Status', selectedIssue.status, 'Closed');
    setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f);
  };

  const handleReopenIssue = () => {
    if (!selectedIssue) return;
    const f = { ...selectedIssue, status: 'To Do' as Status, updated: now() };
    addLog('Reopened', f, 'Status', selectedIssue.status, 'To Do');
    setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f);
  };


    const handleCreateKB = () => {
    if (!kbTitle.trim()) return;
    const newArticle: KBArticle = {
      id: `kb-${Date.now()}`,
      title: kbTitle,
      category: kbCategory || 'General',
      department: kbDept,
      author: currentUser?.id || 'u1',
      content: kbContent,
      views: 0,
      helpful: 0,
      updated: now(),
    };
    setKbArticles(prev => [...prev, newArticle]);
    setKbTitle(''); setKbContent(''); setKbCategory('');
    setShowCreateKB(false);
  };

  const openEditKB = (article: KBArticle) => {
    setEditKBArticle(article);
    setKbTitle(article.title);
    setKbContent(article.content);
    setKbCategory(article.category);
    setKbDept(article.department);
    setShowEditKB(true);
  };

  const handleEditKB = () => {
    if (!editKBArticle || !kbTitle.trim()) return;
    setKbArticles(prev => prev.map(a => a.id === editKBArticle.id ? { ...a, title: kbTitle, content: kbContent, category: kbCategory, department: kbDept, updated: now() } : a));
    const updated = { ...editKBArticle, title: kbTitle, content: kbContent, category: kbCategory, department: kbDept, updated: now() };
    setSelectedKBArticle(updated);
    setShowEditKB(false); setEditKBArticle(null);
    setKbTitle(''); setKbContent(''); setKbCategory('');
  };

  const handleDeleteKB = () => {
    if (!selectedKBArticle) return;
    setKbArticles(prev => prev.filter(a => a.id !== selectedKBArticle.id));
    setShowDeleteKBConfirm(false);
    setSelectedKBArticle(null);
  };
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

  const kbCategories = useMemo(() => Array.from(new Set(kbArticles.map(a => a.category))), [kbArticles]);
  const filteredKBArticles = useMemo(() => {
    return kbArticles.filter(a => {
      if (kbSelectedCategory !== 'all' && a.category !== kbSelectedCategory) return false;
      if (kbSearchQuery) {
        const q = kbSearchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q) && !(a.tags || []).some(t => t.includes(q))) return false;
      }
      return true;
    });
  }, [kbArticles, kbSelectedCategory, kbSearchQuery]);

  if (checking) return (<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400"><p>Checking authentication...</p></div>);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8"><h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">NextGuard DLP</h1><p className="text-gray-400 mt-2">Project Management Platform</p></div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Sign In</h3>
            {loginError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{loginError}</div>}
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="your@nextguard.com" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Password</label><input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter password" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" /></div>
              <button onClick={handleLogin} disabled={loginLoading} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors disabled:opacity-50">{loginLoading ? 'Signing in...' : 'Sign In'}</button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">Use your registered account to sign in. Contact admin if you need Project Access permission.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {mobileSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:sticky top-0 h-screen bg-gray-900 border-r border-gray-800 flex flex-col z-50 transition-all`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">NextGuard DLP</h1>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white hidden lg:block">{sidebarCollapsed ? '>' : '<'}</button>
          <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-400 hover:text-white lg:hidden">X</button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {([{key:'board' as ViewMode,label:'Board',icon:'\ud83d\udcca'},{key:'list' as ViewMode,label:'List View',icon:'\ud83d\udcc3'},{key:'backlog' as ViewMode,label:'Backlog',icon:'\ud83d\udce5'},{key:'reports' as ViewMode,label:'Reports',icon:'\ud83d\udcc8'},{key:'kb' as ViewMode,label:'Knowledge Base',icon:'\ud83d\udcda'}]).map(item => (
            <button key={item.key} onClick={() => { setActiveView(item.key); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeView === item.key ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span>{item.icon}</span>{!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          <button onClick={() => setShowActivityLog(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-white mb-2">
            <span>\ud83d\udcdd</span>{!sidebarCollapsed && <span>Activity Log</span>}{activityLogs.length > 0 && <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-1.5 rounded">{activityLogs.length}</span>}
          </button>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">{currentUser?.avatar}</div>
            {!sidebarCollapsed && (<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{currentUser?.name}</p><p className="text-xs text-gray-500 truncate">{currentUser?.department} - {currentUser?.role}</p></div>)}
          </div>
          {!sidebarCollapsed && <button onClick={() => { fetch('/api/projects/auth', { method: 'DELETE' }); setIsLoggedIn(false); setCurrentUser(null); }} className="w-full mt-3 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors">Sign Out</button>}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden text-xl">\u2630</button>
              <div><h2 className="text-lg font-bold">NextGuard DLP - Project Board</h2><p className="text-xs text-gray-500">Sprint 12 - Jan 7, 2025</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2"><span className="text-xs text-gray-400">Sprint Progress</span><div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full transition-all" style={{width:`${totalPoints>0?(completedPoints/totalPoints)*100:0}%`}} /></div><span className="text-xs text-gray-400">{completedPoints}/{totalPoints} pts</span></div>
              <button onClick={() => setShowCreateModal(true)} className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">+ Create</button>
            </div>
          </div>
          {activeView !== 'kb' && (
            <div className="flex flex-wrap gap-2 mt-3">
              <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm w-full sm:w-64 focus:border-cyan-500 focus:outline-none" />
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none">
                <option value="all">All Priorities</option>{Object.entries(priorityConfig).map(([k,v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none">
                <option value="all">All Types</option>{Object.entries(typeConfig).map(([k,v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
              </select>
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block">
                <option value="all">All Departments</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block">
                <option value="all">All Sprints</option><option value="Sprint 12">Sprint 12</option><option value="Sprint 13">Sprint 13</option>
              </select>
            </div>
          )}
        </header>

        <div className="p-4 sm:p-6">
          {activeView === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {statusColumns.map(status => { const ci = filteredIssues.filter(i => i.status === status); return (
                <div key={status} className="bg-gray-900/50 rounded-xl p-3 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-gray-300">{status}</h3><span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{ci.length}</span></div>
                  <div className="space-y-2">
                    {ci.map(issue => (
                      <div key={issue.id} onClick={() => setSelectedIssue(issue)} className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 transition-colors">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap"><span className="text-xs">{typeConfig[issue.type].icon}</span><span className="text-xs text-gray-500 font-mono">{issue.key}</span><span className={`text-xs ${priorityConfig[issue.priority].bg} ${priorityConfig[issue.priority].color} px-1.5 rounded`}>{issue.priority}</span></div>
                        <p className="text-sm font-medium mb-2 line-clamp-2">{issue.title}</p>
                        {issue.dueDate && <p className="text-xs text-gray-500 mb-1">Due: {issue.dueDate}{issue.dueTime ? ` ${issue.dueTime}` : ''}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">{issue.labels.slice(0,2).map(l => <span key={l} className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{l}</span>)}</div>
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">{getUserAvatar(issue.assignee)}</div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500"><span>{issue.points} pts</span><span>{issue.comments} comments</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ); })}
            </div>
          )}

          {activeView === 'list' && (
            <div className="bg-gray-900/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 text-gray-400 text-xs"><th className="p-3 text-left">Key</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Assignee</th><th className="p-3 text-left">Due</th><th className="p-3 text-left">Pts</th></tr></thead>
                <tbody>{filteredIssues.map(issue => (<tr key={issue.id} onClick={() => setSelectedIssue(issue)} className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer"><td className="p-3 font-mono text-cyan-400 text-xs">{issue.key}</td><td className="p-3">{issue.title}</td><td className="p-3"><span className="text-xs">{typeConfig[issue.type].icon} {issue.type}</span></td><td className="p-3"><span className="text-xs bg-gray-800 px-2 py-0.5 rounded">{issue.status}</span></td><td className="p-3"><span className={`text-xs ${priorityConfig[issue.priority].color}`}>{priorityConfig[issue.priority].icon} {issue.priority}</span></td><td className="p-3 text-sm">{getUserName(issue.assignee)}</td><td className="p-3 text-xs text-gray-500">{issue.dueDate || '-'}{issue.dueTime ? ` ${issue.dueTime}` : ''}</td><td className="p-3">{issue.points}</td></tr>))}</tbody>
              </table>
            </div>
          )}

          {activeView === 'backlog' && (
            <div className="space-y-6">
              {['Sprint 12','Sprint 13','Backlog'].map(sprint => { const si = filteredIssues.filter(i => sprint === 'Backlog' ? (i.status === 'Backlog' && i.sprint !== 'Sprint 12' && i.sprint !== 'Sprint 13') : i.sprint === sprint); return (
                <div key={sprint} className="bg-gray-900/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{sprint}</h3><span className="text-xs text-gray-500">{si.length} issues - {si.reduce((s,i)=>s+i.points,0)} pts</span></div>
                  <div className="space-y-1">{si.map(issue => (<div key={issue.id} onClick={() => setSelectedIssue(issue)} className="flex items-center gap-2 sm:gap-4 py-2 px-2 sm:px-3 hover:bg-gray-800 rounded-lg cursor-pointer"><span className="text-sm">{typeConfig[issue.type].icon}</span><span className="text-xs font-mono text-cyan-400 w-16">{issue.key}</span><span className="text-sm flex-1 truncate">{issue.title}</span><span className={`text-xs ${priorityConfig[issue.priority].color}`}>{issue.priority}</span><span className="text-xs text-gray-500">{issue.points} pts</span></div>))}</div>
                </div>
              ); })}
            </div>
          )}

          {activeView === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 rounded-xl p-6"><h3 className="font-semibold mb-4">Sprint Velocity</h3><div className="space-y-3">{[{s:'Sprint 10',p:34},{s:'Sprint 11',p:42},{s:'Sprint 12',p:totalPoints}].map(v=>(<div key={v.s} className="flex items-center gap-3"><span className="text-sm text-gray-400 w-20">{v.s}</span><div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{width:`${(v.p/50)*100}%`}} /></div><span className="text-sm font-medium w-12 text-right">{v.p} pts</span></div>))}</div></div>
              <div className="bg-gray-900/50 rounded-xl p-6"><h3 className="font-semibold mb-4">Issues by Priority</h3><div className="space-y-3">{Object.entries(priorityConfig).map(([p,c])=>{const n=issues.filter(i=>i.priority===p).length;return(<div key={p} className="flex items-center justify-between"><div className="flex items-center gap-2"><span>{c.icon}</span><span className="text-sm">{p}</span></div><span className="text-sm font-medium">{n}</span></div>);})}</div></div>
              <div className="bg-gray-900/50 rounded-xl p-6 lg:col-span-2"><h3 className="font-semibold mb-4">Summary</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-cyan-400">{issues.length}</p><p className="text-xs text-gray-500 mt-1">Total</p></div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-green-400">{issues.filter(i=>i.status==='Done'||i.status==='Closed').length}</p><p className="text-xs text-gray-500 mt-1">Done</p></div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-red-400">{issues.filter(i=>i.priority==='Critical').length}</p><p className="text-xs text-gray-500 mt-1">Critical</p></div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-blue-400">{totalPoints}</p><p className="text-xs text-gray-500 mt-1">Points</p></div>
              </div></div>
            </div>
          )}

          {activeView === 'kb' && !selectedKBArticle && (
            <div>
              {/* Hero Search - Document360 Style */}
              <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Knowledge Base</h2>
                <p className="text-gray-400 mb-6">Find guides, documentation, and best practices</p>
                <div className="max-w-2xl mx-auto relative">
                  <input type="text" placeholder="Search articles, topics, or tags..." value={kbSearchQuery} onChange={e => setKbSearchQuery(e.target.value)} className="w-full px-5 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none text-base pl-12" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">\ud83d\udd0d</span>
                </div>
              </div>
              <button onClick={() => setShowCreateKB(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">+ Create Article</button>{/* Category Pills */}
              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                <button onClick={() => setKbSelectedCategory('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${kbSelectedCategory === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>All Articles</button>
                {kbCategories.map(cat => (
                  <button key={cat} onClick={() => setKbSelectedCategory(kbSelectedCategory === cat ? 'all' : cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${kbSelectedCategory === cat ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>{cat}</button>
                ))}
              </div>
              {/* Category Cards - Stripe Style */}
              {!kbSearchQuery && kbSelectedCategory === 'all' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {kbCategories.map(cat => {
                    const catArticles = kbArticles.filter(a => a.category === cat);
                    const icons: Record<string,string> = { Configuration: '\u2699\ufe0f', Deployment: '\ud83d\ude80', Process: '\ud83d\udcca', Development: '\ud83d\udcbb', Sales: '\ud83d\udcc8', Support: '\ud83d\udee0\ufe0f' };
                    return (
                      <button key={cat} onClick={() => setKbSelectedCategory(cat)} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-left hover:border-cyan-500/40 transition-all group">
                        <div className="text-3xl mb-3">{icons[cat] || '\ud83d\udcc4'}</div>
                        <h3 className="text-lg font-semibold mb-1 group-hover:text-cyan-400 transition-colors">{cat}</h3>
                        <p className="text-sm text-gray-500">{catArticles.length} article{catArticles.length !== 1 ? 's' : ''}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Article List */}
              <div className="space-y-3">
                {filteredKBArticles.map(a => (
                  <div key={a.id} onClick={() => { setSelectedKBArticle(a); setKbActiveSection(0); }} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/30 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full font-medium">{a.category}</span>
                          <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{a.department}</span>
                        </div>
                        <h3 className="text-base font-semibold mb-1 group-hover:text-cyan-400 transition-colors">{a.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{a.content}</p>
                        {a.tags && <div className="flex flex-wrap gap-1.5 mt-3">{a.tags.slice(0,4).map(t => <span key={t} className="text-xs text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded">#{t}</span>)}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">{a.views} views</p>
                        <p className="text-xs text-gray-500">{a.helpful} helpful</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/50">
                      <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">{getUserAvatar(a.author)}</div>
                      <span className="text-xs text-gray-500">{getUserName(a.author)}</span>
                      <span className="text-xs text-gray-600">\u00b7</span>
                      <span className="text-xs text-gray-500">Updated {a.updated}</span>
                      {a.sections && <><span className="text-xs text-gray-600">\u00b7</span><span className="text-xs text-gray-500">{a.sections.length} sections</span></>}
                    </div>
                  </div>
                ))}
                {filteredKBArticles.length === 0 && <div className="text-center py-12 text-gray-500"><p className="text-lg mb-2">No articles found</p><p className="text-sm">Try adjusting your search or category filter</p></div>}
              </div>
            </div>
          )}

          {/* KB Article Detail - Document360 Style */}
          {activeView === 'kb' && selectedKBArticle && (
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-6 text-sm">
                <button onClick={() => setSelectedKBArticle(null)} className="text-cyan-400 hover:text-cyan-300">Knowledge Base</button>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">{selectedKBArticle.category}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-300 truncate">{selectedKBArticle.title}</span>
              </div>
              <div className="flex gap-8">
                {/* Left: Table of Contents */}
                {selectedKBArticle.sections && selectedKBArticle.sections.length > 0 && (
                  <div className="hidden lg:block w-56 shrink-0">
                    <div className="sticky top-24">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">On this page</p>
                      <nav className="space-y-1">
                        {selectedKBArticle.sections.map((sec, idx) => (
                          <button key={idx} onClick={() => setKbActiveSection(idx)} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${kbActiveSection === idx ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}>{sec.title}</button>
                        ))}
                      </nav>
                    </div>
                  </div>
                )}
                {/* Right: Article Content */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded-full font-medium">{selectedKBArticle.category}</span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{selectedKBArticle.department}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-4">{selectedKBArticle.title}</h1><div className="flex gap-2 mb-6"><button onClick={() => openEditKB(selectedKBArticle)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors">Edit</button><button onClick={() => setShowDeleteKBConfirm(true)} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">Delete</button></div>
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-800">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">{getUserAvatar(selectedKBArticle.author)}</div>
                      <div><p className="text-sm font-medium">{getUserName(selectedKBArticle.author)}</p><p className="text-xs text-gray-500">Updated {selectedKBArticle.updated} \u00b7 {selectedKBArticle.views} views</p></div>
                    </div>
                    <p className="text-gray-300 leading-relaxed mb-6">{selectedKBArticle.content}</p>
                    {/* Sections */}
                    {selectedKBArticle.sections && selectedKBArticle.sections.map((sec, idx) => (
                      <div key={idx} id={`kb-section-${idx}`} className={`mb-8 scroll-mt-24 ${kbActiveSection === idx ? '' : ''}`}>
                        <button onClick={() => setKbActiveSection(idx)} className="w-full text-left">
                          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            {sec.title}
                          </h2>
                        </button>
                        <p className="text-gray-400 leading-relaxed pl-8">{sec.content}</p>
                      </div>
                    ))}
                    {/* Tags */}
                    {selectedKBArticle.tags && selectedKBArticle.tags.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-800">
                        <p className="text-xs text-gray-500 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">{selectedKBArticle.tags.map(t => <span key={t} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">#{t}</span>)}</div>
                      </div>
                    )}
                    {/* Helpful Rating */}
                    <div className="mt-8 pt-6 border-t border-gray-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Was this article helpful?</p>
                        <div className="flex items-center gap-2">
                          {kbHelpfulVoted[selectedKBArticle.id] ? (
                            <span className="text-sm text-cyan-400">Thanks for your feedback!</span>
                          ) : (
                            <>
                              <button onClick={() => { setKbHelpfulVoted(prev => ({...prev, [selectedKBArticle.id]: true})); setKbArticles(prev => prev.map(a => a.id === selectedKBArticle.id ? {...a, helpful: a.helpful + 1} : a)); }} className="px-4 py-2 bg-gray-800 hover:bg-green-500/20 hover:text-green-400 rounded-lg text-sm transition-colors">\ud83d\udc4d Yes</button>
                              <button onClick={() => setKbHelpfulVoted(prev => ({...prev, [selectedKBArticle.id]: true}))} className="px-4 py-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-sm transition-colors">\ud83d\udc4e No</button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{selectedKBArticle.helpful} people found this helpful</p>
                    </div>
                    {/* Related Articles */}
                    {selectedKBArticle.relatedIds && selectedKBArticle.relatedIds.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-800">
                        <p className="text-sm font-semibold mb-3">Related Articles</p>
                        <div className="space-y-2">
                          {selectedKBArticle.relatedIds.map(rid => { const ra = kbArticles.find(a => a.id === rid); if (!ra) return null; return (
                            <button key={rid} onClick={() => { setSelectedKBArticle(ra); setKbActiveSection(0); }} className="w-full text-left flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors">
                              <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{ra.category}</span>
                              <span className="text-sm text-gray-300 flex-1 truncate">{ra.title}</span>
                              <span className="text-xs text-gray-600">\u2192</span>
                            </button>
                          ); })}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setSelectedKBArticle(null)} className="mt-4 text-sm text-gray-500 hover:text-cyan-400 transition-colors">\u2190 Back to all articles</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setSelectedIssue(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-sm">{typeConfig[selectedIssue.type].icon}</span><span className="text-sm font-mono text-cyan-400">{selectedIssue.key}</span>
              <span className={`text-xs ${priorityConfig[selectedIssue.priority].bg} ${priorityConfig[selectedIssue.priority].color} px-2 py-0.5 rounded`}>{selectedIssue.priority}</span>
              <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">{selectedIssue.status}</span>
              <button onClick={() => setSelectedIssue(null)} className="ml-auto text-gray-400 hover:text-white text-xl">X</button>
            </div>
            <h2 className="text-lg font-bold mb-2">{selectedIssue.title}</h2>
            <p className="text-sm text-gray-400 mb-4">{selectedIssue.description}</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => {setEditIssue({...selectedIssue});setEditAttachments([]);setShowEditModal(true);}} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors">Edit</button>
              {selectedIssue.status !== 'Closed' ? (<button onClick={handleCloseIssue} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors">Close</button>) : (<button onClick={handleReopenIssue} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-xs font-medium transition-colors">Reopen</button>)}
              <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">Delete</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Status: </span><span>{selectedIssue.status}</span></div>
              <div><span className="text-gray-500">Type: </span><span>{selectedIssue.type}</span></div>
              <div><span className="text-gray-500">Assignee: </span><span>{getUserName(selectedIssue.assignee)}</span></div>
              <div><span className="text-gray-500">Reporter: </span><span>{getUserName(selectedIssue.reporter)}</span></div>
              <div><span className="text-gray-500">Department: </span><span>{selectedIssue.department}</span></div>
              <div><span className="text-gray-500">Sprint: </span><span>{selectedIssue.sprint}</span></div>
              <div><span className="text-gray-500">Points: </span><span>{selectedIssue.points}</span></div>
              <div><span className="text-gray-500">Due: </span><span>{selectedIssue.dueDate || 'Not set'}{selectedIssue.dueTime ? ` ${selectedIssue.dueTime}` : ''}</span></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">{selectedIssue.labels.map(l => <span key={l} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{l}</span>)}</div>
            <div className="text-xs text-gray-600"><span>Created: {selectedIssue.created}</span><span className="mx-2">|</span><span>Updated: {selectedIssue.updated}</span></div>
            {activityLogs.filter(l => l.issueKey === selectedIssue.key).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800"><h4 className="text-sm font-semibold mb-2">Activity History</h4><div className="space-y-1">{activityLogs.filter(l => l.issueKey === selectedIssue.key).map(log => (<div key={log.id} className="text-xs p-2 bg-gray-800/50 rounded flex flex-wrap gap-2"><span className={`px-1.5 py-0.5 rounded font-medium ${log.action==='Created'?'bg-green-500/20 text-green-400':log.action==='Deleted'?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400'}`}>{log.action}</span>{log.field && <span className="text-gray-500">{log.field}: {log.oldValue} -&gt; {log.newValue}</span>}<span className="text-gray-600">{log.user}</span></div>))}</div></div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editIssue && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Edit - {editIssue.key}</h3><button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={editIssue.title} onChange={e => setEditIssue({...editIssue,title:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={editIssue.description} onChange={e => setEditIssue({...editIssue,description:e.target.value})} rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Status</label><select value={editIssue.status} onChange={e => setEditIssue({...editIssue,status:e.target.value as Status})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{statusColumns.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={editIssue.priority} onChange={e => setEditIssue({...editIssue,priority:e.target.value as Priority})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(priorityConfig).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={editIssue.type} onChange={e => setEditIssue({...editIssue,type:e.target.value as IssueType})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(typeConfig).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Assignee</label><select value={editIssue.assignee} onChange={e => setEditIssue({...editIssue,assignee:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Department</label><select value={editIssue.department} onChange={e => setEditIssue({...editIssue,department:e.target.value as Department})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d => <option key={d}>{d}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={editIssue.dueDate || ''} onChange={e => setEditIssue({...editIssue,dueDate:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div><div><label className="block text-sm text-gray-400 mb-1">Due Time</label><input type="time" value={editIssue.dueTime || ''} onChange={e => setEditIssue({...editIssue,dueTime:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div></div><div><label className="block text-sm text-gray-400 mb-1">Attachments</label><input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.xls,.xlsx,.ppt,.pptx,.doc,.docx,.txt,.csv,.json,.xml,.yaml,.yml,.md,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.sql,.sh,.bat,.zip,.rar,.7z,.tar,.gz" onChange={e => { if (e.target.files) setEditAttachments(Array.from(e.target.files)) }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-cyan-600 file:text-white cursor-pointer" />{editAttachments.length > 0 && <div className="mt-2 space-y-1">{editAttachments.map((f,i) => <div key={i} className="flex items-center justify-between text-xs bg-gray-800 p-2 rounded"><span className="text-gray-300 truncate">{f.name}</span><button onClick={() => setEditAttachments(prev => prev.filter((_,j) => j !== i))} className="text-red-400 hover:text-red-300 ml-2">X</button></div>)}</div>}</div><div className="flex gap-2 pt-2"><button onClick={handleEditIssue} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Save Changes</button><button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Cancel</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && selectedIssue && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Issue?</h3><p className="text-sm text-gray-400 mb-4">Delete <strong>{selectedIssue.key}</strong>? This cannot be undone.</p>
            <div className="flex gap-2"><button onClick={handleDeleteIssue} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setShowActivityLog(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800"><h3 className="text-lg font-semibold">Activity Log ({activityLogs.length})</h3><button onClick={() => setShowActivityLog(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="flex-1 overflow-y-auto p-4">{activityLogs.length === 0 ? (<p className="text-gray-500 text-center py-8">No activity yet.</p>) : (<div className="space-y-2">{activityLogs.map(log => (<div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-3 bg-gray-800/50 rounded-lg text-sm"><span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${log.action==='Created'?'bg-green-500/20 text-green-400':log.action==='Deleted'?'bg-red-500/20 text-red-400':log.action==='Closed'?'bg-gray-700 text-gray-300':log.action==='Reopened'?'bg-yellow-500/20 text-yellow-400':'bg-blue-500/20 text-blue-400'}`}>{log.action}</span><span className="text-cyan-400 font-mono text-xs">{log.issueKey}</span><span className="text-white text-xs truncate flex-1">{log.issueTitle}</span>{log.field && <span className="text-gray-500 text-xs">{log.field}: {log.oldValue} -&gt; {log.newValue}</span>}<span className="text-gray-600 text-xs whitespace-nowrap">{log.user} - {log.timestamp}</span></div>))}</div>)}</div>
          </div>
        </div>
      )}

      {/* Create/Edit KB Modal */}{(showCreateKB || showEditKB) && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => {setShowCreateKB(false);setShowEditKB(false);setEditKBArticle(null);setKbTitle('');setKbContent('');setKbCategory('');}}><div className="absolute inset-0 bg-black/60" /><div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">{showEditKB ? 'Edit Article' : 'Create New Article'}</h3><button onClick={() => {setShowCreateKB(false);setShowEditKB(false);setEditKBArticle(null);setKbTitle('');setKbContent('');setKbCategory('');}} className="text-gray-400 hover:text-white text-xl">X</button></div><div className="space-y-3"><div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={kbTitle} onChange={e => setKbTitle(e.target.value)} placeholder="Article title" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div><div><label className="block text-sm text-gray-400 mb-1">Category</label><input type="text" value={kbCategory} onChange={e => setKbCategory(e.target.value)} placeholder="e.g. Configuration, Deployment" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div><div><label className="block text-sm text-gray-400 mb-1">Department</label><select value={kbDept} onChange={e => setKbDept(e.target.value as Department)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d => <option key={d}>{d}</option>)}</select></div><div><label className="block text-sm text-gray-400 mb-1">Content</label><textarea value={kbContent} onChange={e => setKbContent(e.target.value)} placeholder="Article content..." rows={8} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none" /></div><button onClick={showEditKB ? handleEditKB : handleCreateKB} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">{showEditKB ? 'Save Changes' : 'Create Article'}</button></div></div></div>)}{/* Delete KB Confirm */}{showDeleteKBConfirm && selectedKBArticle && (<div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" /><div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}><h3 className="text-lg font-semibold mb-2">Delete Article?</h3><p className="text-sm text-gray-400 mb-4">Delete <strong>{selectedKBArticle.title}</strong>? This cannot be undone.</p><div className="flex gap-2"><button onClick={handleDeleteKB} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={() => setShowDeleteKBConfirm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div></div></div>)}{/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Create New Task</h3><button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
            <div className="space-y-3">
              <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="Task title" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="Describe..." rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={createType} onChange={e => setCreateType(e.target.value as IssueType)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(typeConfig).map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={createPriority} onChange={e => setCreatePriority(e.target.value as Priority)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{Object.keys(priorityConfig).map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Department</label><select value={createDept} onChange={e => setCreateDept(e.target.value as Department)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d => <option key={d}>{d}</option>)}</select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Assignee</label><select value={createAssignee} onChange={e => setCreateAssignee(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={createDueDate} onChange={e => setCreateDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Due Time</label><input type="time" value={createDueTime} onChange={e => setCreateDueTime(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Attachments</label>
                <input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.xls,.xlsx,.ppt,.pptx,.doc,.docx,.txt,.csv,.json,.xml,.yaml,.yml,.md,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.sql,.sh,.bat,.zip,.rar,.7z,.tar,.gz" onChange={e => { if (e.target.files) setCreateAttachments(Array.from(e.target.files)) }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-cyan-600 file:text-white cursor-pointer" />
                {createAttachments.length > 0 && <div className="mt-2 space-y-1">{createAttachments.map((f,i) => <div key={i} className="flex items-center justify-between text-xs bg-gray-800 p-2 rounded"><span className="text-gray-300 truncate">{f.name}</span><button onClick={() => setCreateAttachments(prev => prev.filter((_,j) => j !== i))} className="text-red-400 hover:text-red-300 ml-2">X</button></div>)}</div>}
              </div>
              <button onClick={handleCreateIssue} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
