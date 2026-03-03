'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
// ==================== TYPES ====================
type Department = 'R&D' | 'Presales' | 'Support' | 'Management';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type IssueType = 'Bug' | 'Feature' | 'Task' | 'Epic' | 'Story' | 'Incident';
type Status = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Closed';
type ViewMode = 'board' | 'list' | 'backlog' | 'reports' | 'kb';
interface User { id: string; name: string; email: string; department: Department; role: string; avatar: string; }
interface Issue {
  id: string; key: string; title: string; description: string; type: IssueType; status: Status;
  priority: Priority; assignee: string; reporter: string; department: Department; sprint: string;
  points: number; labels: string[]; created: string; updated: string; dueDate?: string; dueTime?: string;
  comments: number; attachments: number; attachmentFiles?: {name: string; url: string; size: number}[];
}
interface ActivityLog {
  id: string; issueKey: string; issueTitle: string;
  action: 'Created' | 'Modified' | 'Deleted' | 'Closed' | 'Reopened' | 'Status Changed';
  field?: string; oldValue?: string; newValue?: string;
  user: string; timestamp: string;
}
// ==================== 3-LAYER KB MODEL ====================
interface KBPage {
  id: string; title: string; content: string; author: string; views: number; helpful: number; updated: string;
  sections?: { title: string; content: string }[];
  tags?: string[]; images?: {id: string; name: string; dataUrl: string}[]; files?: {id: string; name: string; dataUrl: string; size: number; type: string}[];
}
interface KBSectionGroup {
  id: string; name: string; pages: KBPage[];
}
interface KBSection {
  id: string; name: string; color: string; icon: string; groups: KBSectionGroup[];
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
// ==================== 3-LAYER KB MOCK DATA ====================
const initialKBSections: KBSection[] = [
  {
    id: 'sec-1', name: 'APP', color: '#3b82f6', icon: '📱',
    groups: [
      {
        id: 'grp-1-1', name: 'APP Management Platform',
        pages: [
          { id: 'p1', title: 'Auto Patch Script for Backend', content: 'Guide for running automatic patching scripts on the APP management backend servers.', author: 'u1', views: 342, helpful: 89, updated: '2025-01-20', tags: ['patch','script','backend'], sections: [
            { title: 'Prerequisites', content: 'Ensure you have SSH access to the target server and sudo privileges. Verify the hotfix package is available in /opt/skyguard/download/hotfix/.' },
            { title: 'Execution Steps', content: 'cd /opt/skyguard/download/hotfix/ && dpkg -i Hotfix-SPS-3.15.0-HF038_all.deb' },
            { title: 'Verification', content: 'After installation, run systemctl status skyguard-sps to verify the service is running correctly.' }
          ] },
          { id: 'p2', title: 'v3.3 Keepalived Log Method', content: 'How to adjust keepalived.log settings in version 3.3.', author: 'u4', views: 156, helpful: 34, updated: '2025-01-18', tags: ['keepalived','logging','v3.3'] },
          { id: 'p3', title: 'Apache2 Logging & Monitoring', content: 'Comprehensive guide for Apache2 log configuration and real-time monitoring setup.', author: 'u1', views: 412, helpful: 102, updated: '2025-01-22', tags: ['apache','logging','monitoring'], sections: [
            { title: 'Log Configuration', content: 'Edit /etc/apache2/apache2.conf to customize LogLevel, ErrorLog, and CustomLog directives.' },
            { title: 'Real-time Monitoring', content: 'Use tail -f /var/log/apache2/access.log for real-time monitoring. Consider setting up logrotate for log management.' }
          ] },
        ]
      },
      {
        id: 'grp-1-2', name: 'APP Deployment',
        pages: [
          { id: 'p4', title: 'Docker Deployment Guide', content: 'Step-by-step Docker deployment for APP services.', author: 'u4', views: 289, helpful: 76, updated: '2025-01-21', tags: ['docker','deployment'] },
          { id: 'p5', title: 'Kubernetes Cluster Setup', content: 'K8s cluster configuration for high-availability APP deployment.', author: 'u1', views: 198, helpful: 52, updated: '2025-01-19', tags: ['k8s','cluster','ha'] },
        ]
      }
    ]
  },
  {
    id: 'sec-2', name: 'Endpoint', color: '#8b5cf6', icon: '💻',
    groups: [
      {
        id: 'grp-2-1', name: 'Agent Installation',
        pages: [
          { id: 'p6', title: 'Windows Agent Installation', content: 'Complete guide for deploying the NextGuard endpoint agent on Windows systems.', author: 'u3', views: 723, helpful: 201, updated: '2025-01-25', tags: ['windows','agent','installation'], sections: [
            { title: 'System Requirements', content: 'Windows 10/11 or Windows Server 2016+. 4GB RAM minimum, 500MB disk space.' },
            { title: 'Installation Steps', content: 'Download the agent MSI package from the admin console. Run the installer with administrator privileges.' },
            { title: 'Post-Installation', content: 'Verify agent connectivity in the admin console. Check Windows Services for NextGuard Agent status.' }
          ] },
          { id: 'p7', title: 'macOS Agent Installation', content: 'Deployment guide for macOS endpoint agent.', author: 'u3', views: 345, helpful: 89, updated: '2025-01-23', tags: ['macos','agent'] },
          { id: 'p8', title: 'Linux Agent Installation', content: 'DEB/RPM package installation for Linux endpoints.', author: 'u4', views: 267, helpful: 71, updated: '2025-01-20', tags: ['linux','agent','deb','rpm'] },
        ]
      },
      {
        id: 'grp-2-2', name: 'Troubleshooting',
        pages: [
          { id: 'p9', title: 'Agent Connectivity Issues', content: 'Common agent connectivity issues and resolutions.', author: 'u3', views: 567, helpful: 145, updated: '2025-01-25', tags: ['troubleshooting','connectivity'], sections: [
            { title: 'Agent Offline', content: 'Check port 443 connectivity to management server. Verify proxy settings.' },
            { title: 'Policy Not Updating', content: 'Clear local policy cache. Force policy sync from agent tray icon.' },
            { title: 'High CPU Usage', content: 'Review scan exclusion list. Update agent to latest version.' }
          ] },
          { id: 'p10', title: 'USB Device Control Issues', content: 'Troubleshooting USB device blocking and policy bypass issues.', author: 'u6', views: 189, helpful: 45, updated: '2025-01-24', tags: ['usb','device-control'] },
        ]
      }
    ]
  },
  {
    id: 'sec-3', name: 'SEG', color: '#10b981', icon: '📧',
    groups: [
      {
        id: 'grp-3-1', name: 'Email Gateway Config',
        pages: [
          { id: 'p11', title: 'DLP Policy Configuration Best Practices', content: 'Comprehensive guide for configuring DLP policies across all channels.', author: 'u1', views: 456, helpful: 120, updated: '2025-01-22', tags: ['dlp','policy','configuration'], sections: [
            { title: 'Policy Hierarchy', content: 'DLP policies follow a hierarchical model. Global policies apply across all departments.' },
            { title: 'Regex Patterns', content: 'Use predefined regex patterns for common sensitive data types.' },
            { title: 'Testing & Rollout', content: 'Always test policies in monitor-only mode before enforcement.' }
          ] },
          { id: 'p12', title: 'Email Content Inspection Setup', content: 'Configure deep content inspection for email attachments.', author: 'u4', views: 234, helpful: 67, updated: '2025-01-20', tags: ['email','inspection'] },
        ]
      }
    ]
  },
  {
    id: 'sec-4', name: 'API', color: '#f59e0b', icon: '🔗',
    groups: [
      {
        id: 'grp-4-1', name: 'REST API',
        pages: [
          { id: 'p13', title: 'API Integration Guide', content: 'NextGuard DLP RESTful API integration guide.', author: 'u4', views: 512, helpful: 134, updated: '2025-01-24', tags: ['api','rest','integration'], sections: [
            { title: 'Authentication', content: 'OAuth 2.0 with JWT tokens. Obtain client credentials from the admin console.' },
            { title: 'Core Endpoints', content: 'POST /policies - Create policy. GET /policies/{id} - Retrieve policy.' },
            { title: 'Rate Limits', content: 'Standard tier: 1000 requests/minute. Enterprise tier: 5000 requests/minute.' }
          ] },
        ]
      },
      {
        id: 'grp-4-2', name: 'SDKs',
        pages: [
          { id: 'p14', title: 'Python SDK Guide', content: 'Official Python SDK documentation and examples.', author: 'u4', views: 178, helpful: 45, updated: '2025-01-21', tags: ['python','sdk'] },
          { id: 'p15', title: 'Node.js SDK Guide', content: 'Official Node.js SDK documentation and examples.', author: 'u1', views: 156, helpful: 38, updated: '2025-01-19', tags: ['nodejs','sdk'] },
        ]
      }
    ]
  },
  {
    id: 'sec-5', name: 'Sales', color: '#ec4899', icon: '📈',
    groups: [
      {
        id: 'grp-5-1', name: 'Competitive Analysis',
        pages: [
          { id: 'p16', title: 'Competitive Positioning Guide', content: 'Positioning NextGuard against key competitors.', author: 'u2', views: 567, helpful: 134, updated: '2025-01-24', tags: ['sales','competitive'], sections: [
            { title: 'vs Forcepoint', content: 'NextGuard advantage: AI-driven classification with 40% fewer false positives.' },
            { title: 'vs Symantec/Broadcom', content: 'NextGuard advantage: Unified modern console, faster deployment.' },
            { title: 'vs Zscaler', content: 'NextGuard advantage: Deeper endpoint DLP capabilities.' }
          ] },
        ]
      },
      {
        id: 'grp-5-2', name: 'Deployment Playbook',
        pages: [
          { id: 'p17', title: 'Customer Deployment Checklist', content: 'Complete checklist for enterprise customer deployment.', author: 'u2', views: 256, helpful: 67, updated: '2025-01-18', tags: ['deployment','checklist'], sections: [
            { title: 'Phase 1 - Discovery', content: 'Identify customer requirements, existing infrastructure, compliance needs.' },
            { title: 'Phase 2 - Planning', content: 'Create deployment timeline, resource allocation, and rollback procedures.' },
            { title: 'Phase 3 - Implementation', content: 'Deploy agents, configure policies, set up monitoring dashboards.' }
          ] },
        ]
      }
    ]
  },
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
  const [createAttachments, setCreateAttachments] = useState<File[]>([]); const [editAttachments, setEditAttachments] = useState<File[]>([]);
  // ==================== 3-LAYER KB STATE ====================
  const [kbSections, setKbSections] = useState<KBSection[]>(initialKBSections);
  const [kbActiveSectionId, setKbActiveSectionId] = useState<string>('sec-1');
  const [kbActivePageId, setKbActivePageId] = useState<string | null>('p1');
  const [kbActiveContentSection, setKbActiveContentSection] = useState(0);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbHelpfulVoted, setKbHelpfulVoted] = useState<Record<string, boolean>>({});
  // KB CRUD modals
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [showEditSection, setShowEditSection] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showEditPage, setShowEditPage] = useState(false);
  const [showDeletePage, setShowDeletePage] = useState(false);
  const [editTargetId, setEditTargetId] = useState('');
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIcon, setFormIcon] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState(''); const [formImages, setFormImages] = useState<{id: string; name: string; dataUrl: string}[]>([]); const [formFiles, setFormFiles] = useState<{id: string; name: string; dataUrl: string; size: number; type: string}[]>([]);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
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
    const newIssue: Issue = { id: String(Date.now()), key: `NG-${113 + issues.length - 12}`, title: createTitle, description: createDesc, type: createType, status: 'To Do', priority: createPriority, assignee: createAssignee, reporter: currentUser?.id || 'u5', department: createDept, sprint: 'Sprint 12', points: 3, labels: [], created: now(), updated: now(), comments: 0, attachments: createAttachments.length, attachmentFiles: createAttachments.map(f => ({name: f.name, url: URL.createObjectURL(f), size: f.size})), dueDate: createDueDate || undefined, dueTime: createDueTime || undefined };
    setIssues(prev => [...prev, newIssue]); addLog('Created', newIssue);
    setCreateTitle(''); setCreateDesc(''); setShowCreateModal(false); setCreateDueDate(''); setCreateDueTime(''); setCreateAttachments([]);
  };
  const handleEditIssue = () => {
    if (!editIssue) return;
    setIssues(prev => prev.map(i => {
      if (i.id === editIssue.id) {
        if (i.title !== editIssue.title) addLog('Modified', editIssue, 'Title', i.title, editIssue.title);
        if (i.status !== editIssue.status) addLog('Status Changed', editIssue, 'Status', i.status, editIssue.status);
        if (i.priority !== editIssue.priority) addLog('Modified', editIssue, 'Priority', i.priority, editIssue.priority);
        if (i.assignee !== editIssue.assignee) addLog('Modified', editIssue, 'Assignee', getUserName(i.assignee), getUserName(editIssue.assignee));
        return { ...editIssue, updated: now(), attachments: editIssue.attachments + editAttachments.length, attachmentFiles: [...(editIssue.attachmentFiles || []), ...editAttachments.map(f => ({name: f.name, url: URL.createObjectURL(f), size: f.size}))] };
      } return i;
    })); setShowEditModal(false); setEditIssue(null); setSelectedIssue(null);
  };
  const handleDeleteIssue = () => { if (!selectedIssue) return; addLog('Deleted', selectedIssue); setIssues(prev => prev.filter(i => i.id !== selectedIssue.id)); setShowDeleteConfirm(false); setSelectedIssue(null); };
  const handleCloseIssue = () => { if (!selectedIssue) return; const f = { ...selectedIssue, status: 'Closed' as Status, updated: now() }; addLog('Closed', f, 'Status', selectedIssue.status, 'Closed'); setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f); };
  const handleReopenIssue = () => { if (!selectedIssue) return; const f = { ...selectedIssue, status: 'To Do' as Status, updated: now() }; addLog('Reopened', f, 'Status', selectedIssue.status, 'To Do'); setIssues(prev => prev.map(i => i.id === selectedIssue.id ? f : i)); setSelectedIssue(f); };
  // ==================== KB 3-LAYER CRUD ====================
  // Layer 1: Section CRUD
  const handleCreateKBSection = () => {
    if (!formName.trim()) return;
    const newSec: KBSection = { id: `sec-${Date.now()}`, name: formName, color: formColor, icon: formIcon || '📁', groups: [] };
    setKbSections(prev => [...prev, newSec]);
    setFormName(''); setFormColor('#3b82f6'); setFormIcon(''); setShowCreateSection(false);
  };
  const handleEditKBSection = () => {
    if (!formName.trim()) return;
    setKbSections(prev => prev.map(s => s.id === editTargetId ? { ...s, name: formName, color: formColor, icon: formIcon || s.icon } : s));
    setFormName(''); setShowEditSection(false);
  };
  const handleDeleteKBSection = () => {
    setKbSections(prev => prev.filter(s => s.id !== editTargetId));
    if (kbActiveSectionId === editTargetId) { setKbActiveSectionId(kbSections[0]?.id || ''); setKbActivePageId(null); }
    setShowDeleteSection(false);
  };
  // Layer 2: Section Group CRUD
  const handleCreateKBGroup = () => {
    if (!formName.trim()) return;
    const newGrp: KBSectionGroup = { id: `grp-${Date.now()}`, name: formName, pages: [] };
    setKbSections(prev => prev.map(s => s.id === targetSectionId ? { ...s, groups: [...s.groups, newGrp] } : s));
    setFormName(''); setShowCreateGroup(false);
  };
  const handleEditKBGroup = () => {
    if (!formName.trim()) return;
    setKbSections(prev => prev.map(s => ({ ...s, groups: s.groups.map(g => g.id === editTargetId ? { ...g, name: formName } : g) })));
    setFormName(''); setShowEditGroup(false);
  };
  const handleDeleteKBGroup = () => {
    setKbSections(prev => prev.map(s => ({ ...s, groups: s.groups.filter(g => g.id !== editTargetId) })));
    setShowDeleteGroup(false);
  };
  // Layer 3: Page CRUD
  const handleCreateKBPage = () => {
    if (!formTitle.trim()) return;
    const newPage: KBPage = { id: `page-${Date.now()}`, title: formTitle, content: formContent, author: currentUser?.id || 'u1', views: 0, helpful: 0, updated: now(), tags: formTags ? formTags.split(',').map(t => t.trim()) : [], images: formImages.length > 0 ? formImages : undefined, files: formFiles.length > 0 ? formFiles : undefined };
    setKbSections(prev => prev.map(s => ({ ...s, groups: s.groups.map(g => g.id === targetGroupId ? { ...g, pages: [...g.pages, newPage] } : g) })));
    setFormTitle(''); setFormContent(''); setFormTags(''); setFormImages([]); setFormFiles([]); setShowCreatePage(false);
  };
  const handleEditKBPage = () => {
    if (!formTitle.trim()) return;
    setKbSections(prev => prev.map(s => ({ ...s, groups: s.groups.map(g => ({ ...g, pages: g.pages.map(p => p.id === editTargetId ? { ...p, title: formTitle, content: formContent, tags: formTags ? formTags.split(',').map(t => t.trim()) : p.tags, images: formImages, files: formFiles, updated: now() } : p) })) })));
    setFormTitle(''); setFormContent(''); setFormTags(''); setFormImages([]); setFormFiles([]); setShowEditPage(false);
  };
  const handleDeleteKBPage = () => {
    setKbSections(prev => prev.map(s => ({ ...s, groups: s.groups.map(g => ({ ...g, pages: g.pages.filter(p => p.id !== editTargetId) })) })));
    if (kbActivePageId === editTargetId) setKbActivePageId(null);
    setShowDeletePage(false);
  };
  // Computed
  const activeSection = kbSections.find(s => s.id === kbActiveSectionId);
  const activePage = activeSection?.groups.flatMap(g => g.pages).find(p => p.id === kbActivePageId) || kbSections.flatMap(s => s.groups).flatMap(g => g.pages).find(p => p.id === kbActivePageId);
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
  if (checking) return (<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400"><p>Checking authentication...</p></div>);
  if (!isLoggedIn) {
    return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-4"><img src="/nextguard-logo.svg" alt="NextGuard" className="w-10 h-10" onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} /><span className="text-xl font-bold text-white">NextGuard DLP</span></div><h2 className="text-2xl font-bold text-center mb-2">Project Management Platform</h2><p className="text-gray-400 text-center text-sm mb-6">Sign in with your account</p>
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
        {([{key:'board' as ViewMode,label:'Board',icon:'📊'},{key:'list' as ViewMode,label:'List View',icon:'📃'},{key:'backlog' as ViewMode,label:'Backlog',icon:'📥'},{key:'reports' as ViewMode,label:'Reports',icon:'📈'},{key:'kb' as ViewMode,label:'Knowledge Base',icon:'📚'}]).map(item => (
          <button key={item.key} onClick={() => { setActiveView(item.key); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeView === item.key ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <span>{item.icon}</span>{!sidebarCollapsed && <span>{item.label}</span>}
          </button>
        ))}
        <button onClick={() => setShowActivityLog(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-white mb-2">
          <span>📝</span>{!sidebarCollapsed && <span>Activity Log</span>}{activityLogs.length > 0 && <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-1.5 rounded">{activityLogs.length}</span>}
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
            <button onClick={() => setMobileSidebarOpen(true)} className="text-gray-400 hover:text-white lg:hidden text-xl">☰</button>
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
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none"><option value="all">All Priorities</option>{Object.entries(priorityConfig).map(([k,v]) => <option key={k} value={k}>{v.icon} {k}</option>)}</select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none"><option value="all">All Types</option>{Object.entries(typeConfig).map(([k,v]) => <option key={k} value={k}>{v.icon} {k}</option>)}</select>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block"><option value="all">All Departments</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm flex-1 sm:flex-none hidden sm:block"><option value="all">All Sprints</option><option value="Sprint 12">Sprint 12</option><option value="Sprint 13">Sprint 13</option></select>
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
            <div className="bg-gray-900/50 rounded-xl p-6 lg:col-span-2"><h3 className="font-semibold mb-4">Summary</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-4"><div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-cyan-400">{issues.length}</p><p className="text-xs text-gray-500 mt-1">Total</p></div><div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-green-400">{issues.filter(i=>i.status==='Done'||i.status==='Closed').length}</p><p className="text-xs text-gray-500 mt-1">Done</p></div><div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-red-400">{issues.filter(i=>i.priority==='Critical').length}</p><p className="text-xs text-gray-500 mt-1">Critical</p></div><div className="text-center p-4 bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold text-blue-400">{totalPoints}</p><p className="text-xs text-gray-500 mt-1">Points</p></div></div></div>
          </div>
        )}
        {/* ==================== 3-LAYER KB VIEW ==================== */}
        {activeView === 'kb' && (
          <div className="flex gap-0 -m-4 sm:-m-6 h-[calc(100vh-64px)]">
            {/* Layer 1: Sections (Left Sidebar) */}
            <div className="w-56 bg-gray-900/80 border-r border-gray-800 flex flex-col shrink-0">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sections</span>
                <button onClick={() => { setFormName(''); setFormColor('#3b82f6'); setFormIcon(''); setShowCreateSection(true); }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-cyan-400 hover:text-cyan-300 text-sm font-medium border border-gray-700 hover:border-cyan-500/50 transition-colors" title="Create Section">+ Add Section</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {kbSections.map(sec => (
                  <div key={sec.id} onClick={() => { setKbActiveSectionId(sec.id); setKbActivePageId(null); }} className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${kbActiveSectionId === sec.id ? 'bg-gray-800 border-l-2' : 'hover:bg-gray-800/50 border-l-2 border-transparent'}`} style={kbActiveSectionId === sec.id ? {borderColor: sec.color} : {}}>
                    <div className="flex items-center gap-2 truncate"><span>{sec.icon}</span><span className="text-sm truncate">{sec.name}</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600 group-hover:hidden">{sec.groups.reduce((a, g) => a + g.pages.length, 0)}</span>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setEditTargetId(sec.id); setFormName(sec.name); setFormColor(sec.color); setFormIcon(sec.icon); setShowEditSection(true); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded text-xs transition-colors" title="Edit">✏</button>
                        <button onClick={e => { e.stopPropagation(); setEditTargetId(sec.id); setShowDeleteSection(true); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded text-xs transition-colors" title="Delete">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Layer 2: Section Groups & Pages (Middle Panel) */}
            <div className="w-72 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
              {activeSection ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{color: activeSection.color}}>{activeSection.icon} {activeSection.name}</h3>
                    <button onClick={() => { setTargetSectionId(activeSection.id); setFormName(''); setShowCreateGroup(true); }} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-cyan-400 hover:text-cyan-300 text-sm font-medium border border-gray-700 hover:border-cyan-500/50 transition-colors" title="Add Group">+ Add Group</button>
                  </div>
                  <div className="px-3 py-2 border-b border-gray-800"><input type="text" placeholder="Search pages..." value={kbSearchQuery} onChange={e => setKbSearchQuery(e.target.value)} className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" /></div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {activeSection.groups.map(grp => {
                      const filteredPages = kbSearchQuery ? grp.pages.filter(p => p.title.toLowerCase().includes(kbSearchQuery.toLowerCase())) : grp.pages;
                      if (kbSearchQuery && filteredPages.length === 0) return null;
                      return (
                      <div key={grp.id}>
                        <div className="group flex items-center justify-between px-2 py-1.5 mb-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{grp.name} ({grp.pages.length})</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setTargetGroupId(grp.id); setFormTitle(''); setFormContent(''); setFormTags(''); setFormImages([]); setFormFiles([]); setShowCreatePage(true); }} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-green-400 hover:text-green-300 text-xs border border-gray-700 hover:border-green-500/50 transition-colors" title="Add Page">+</button>
                            <button onClick={() => { setEditTargetId(grp.id); setFormName(grp.name); setShowEditGroup(true); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded text-xs transition-colors" title="Edit">✏</button>
                            <button onClick={() => { setEditTargetId(grp.id); setShowDeleteGroup(true); }} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded text-xs transition-colors" title="Delete">✕</button>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {filteredPages.map(page => (
                            <div key={page.id} onClick={() => { setKbActivePageId(page.id); setKbActiveContentSection(0); }} className={`group/page flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm transition-colors ${kbActivePageId === page.id ? 'bg-cyan-600/15 text-cyan-400' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'}`}>
                              <span className="truncate pr-2">{page.title}</span>
                              <div className="hidden group-hover/page:flex items-center gap-0.5 shrink-0">
                                <button onClick={e => { e.stopPropagation(); setEditTargetId(page.id); setFormTitle(page.title); setFormContent(page.content); setFormTags(page.tags?.join(', ') || ''); setFormImages(page.images || []); setFormFiles(page.files || []); setShowEditPage(true); }} className="px-2 py-1 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded text-sm transition-colors">✏</button>
                                <button onClick={e => { e.stopPropagation(); setEditTargetId(page.id); setShowDeletePage(true); }} className="px-2 py-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded text-sm transition-colors">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                </>
              ) : <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Select a section</div>}
            </div>
            {/* Layer 3: Page Content (Right Panel) */}
            <div className="flex-1 overflow-y-auto bg-gray-950">
              {activePage ? (
                <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
                  <div className="flex items-center gap-2 mb-6 text-sm"><button onClick={() => setKbActivePageId(null)} className="text-cyan-400 hover:text-cyan-300">KB</button><span className="text-gray-600">/</span><span className="text-gray-400">{activeSection?.name}</span><span className="text-gray-600">/</span><span className="text-gray-300 truncate">{activePage.title}</span></div>
                  <h1 className="text-2xl font-bold mb-4">{activePage.title}</h1>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">{getUserAvatar(activePage.author)}</div>
                    <div><p className="text-sm font-medium">{getUserName(activePage.author)}</p><p className="text-xs text-gray-500">Updated {activePage.updated} · {activePage.views} views</p></div>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => { setEditTargetId(activePage.id); setFormTitle(activePage.title); setFormContent(activePage.content); setFormTags(activePage.tags?.join(', ') || ''); setFormImages(activePage.images || []); setFormFiles(activePage.files || []); setShowEditPage(true); }} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-medium">Edit</button>
                      <button onClick={() => { setEditTargetId(activePage.id); setShowDeletePage(true); }} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-xs font-medium">Delete</button>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">{activePage.content}</p> {activePage.images && activePage.images.length > 0 && <div className="mb-6"><h3 className="text-sm font-semibold text-gray-400 mb-3">Images ({activePage.images.length})</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{activePage.images.map(img => <div key={img.id} className="group relative"><img src={img.dataUrl} alt={img.name} className="w-full rounded-lg border border-gray-700 cursor-pointer hover:border-cyan-500 transition-colors" onClick={() => window.open(img.dataUrl, '_blank')} /><div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><a href={img.dataUrl} download={img.name} className="px-2 py-1 bg-gray-900/90 hover:bg-cyan-600 rounded text-xs text-white">Download</a></div><p className="text-xs text-gray-500 mt-1 truncate">{img.name}</p></div>)}</div></div>} {activePage.files && activePage.files.length > 0 && <div className="mb-6"><h3 className="text-sm font-semibold text-gray-400 mb-3">Attachments ({activePage.files.length})</h3><div className="space-y-2">{activePage.files.map(f => <div key={f.id} className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"><div className="flex items-center gap-3 truncate"><span className="text-lg">{f.type.startsWith('image/') ? '🖼' : f.type.includes('pdf') ? '📄' : '📎'}</span><div className="truncate"><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-gray-500">{(f.size/1024).toFixed(1)} KB</p></div></div><div className="flex gap-2 shrink-0"><button onClick={() => window.open(f.dataUrl, '_blank')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors">View</button><a href={f.dataUrl} download={f.name} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-medium transition-colors">Download</a></div></div>)}</div></div>}
                  {activePage.sections && activePage.sections.map((sec, idx) => (
                    <div key={idx} className="mb-6"><h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">{idx+1}</span>{sec.title}</h2><p className="text-gray-400 leading-relaxed pl-8">{sec.content}</p></div>
                  ))}
                  {activePage.tags && activePage.tags.length > 0 && (<div className="mt-6 pt-4 border-t border-gray-800"><div className="flex flex-wrap gap-2">{activePage.tags.map(t => <span key={t} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full">#{t}</span>)}</div></div>)}
                  <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between"><p className="text-sm text-gray-400">Was this helpful?</p>{kbHelpfulVoted[activePage.id] ? <span className="text-sm text-cyan-400">Thanks!</span> : <div className="flex gap-2"><button onClick={() => { setKbHelpfulVoted(prev => ({...prev, [activePage.id]: true})); setKbSections(prev => prev.map(s => ({...s, groups: s.groups.map(g => ({...g, pages: g.pages.map(p => p.id === activePage.id ? {...p, helpful: p.helpful+1} : p)}))}))) }} className="px-3 py-1.5 bg-gray-800 hover:bg-green-500/20 hover:text-green-400 rounded text-sm">👍 Yes</button><button onClick={() => setKbHelpfulVoted(prev => ({...prev, [activePage.id]: true}))} className="px-3 py-1.5 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 rounded text-sm">👎 No</button></div>}</div>
                </div>
              ) : <div className="flex-1 flex h-full items-center justify-center text-gray-600"><div className="text-center"><p className="text-lg mb-2">📚</p><p>Select a page to view</p></div></div>}
            </div>
          </div>
        )}
      </div>
    </main>
    {/* Issue Detail Modal */}
    {selectedIssue && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setSelectedIssue(null)}><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-3 flex-wrap"><span className="text-sm">{typeConfig[selectedIssue.type].icon}</span><span className="text-sm font-mono text-cyan-400">{selectedIssue.key}</span><span className={`text-xs ${priorityConfig[selectedIssue.priority].bg} ${priorityConfig[selectedIssue.priority].color} px-2 py-0.5 rounded`}>{selectedIssue.priority}</span><span className="text-xs bg-gray-800 px-2 py-0.5 rounded">{selectedIssue.status}</span><button onClick={() => setSelectedIssue(null)} className="ml-auto text-gray-400 hover:text-white text-xl">X</button></div>
          <h2 className="text-lg font-bold mb-2">{selectedIssue.title}</h2><p className="text-sm text-gray-400 mb-4">{selectedIssue.description}</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => {setEditIssue({...selectedIssue});setEditAttachments([]);setShowEditModal(true);}} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors">Edit</button>
            {selectedIssue.status !== 'Done' && selectedIssue.status !== 'Closed' && <button onClick={() => { const done = {...selectedIssue, status: 'Done' as Status, updated: now()}; setIssues(prev => prev.map(i => i.id === selectedIssue.id ? done : i)); setSelectedIssue(done); }} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition-colors">✅ Done</button>}
            {selectedIssue.status !== 'Closed' ? (<button onClick={handleCloseIssue} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors">Close</button>) : (<button onClick={handleReopenIssue} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-xs font-medium transition-colors">Reopen</button>)}
            <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors">Delete</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="text-gray-500">Status: </span><span>{selectedIssue.status}</span></div><div><span className="text-gray-500">Type: </span><span>{selectedIssue.type}</span></div>
            <div><span className="text-gray-500">Assignee: </span><span>{getUserName(selectedIssue.assignee)}</span></div><div><span className="text-gray-500">Reporter: </span><span>{getUserName(selectedIssue.reporter)}</span></div>
            <div><span className="text-gray-500">Department: </span><span>{selectedIssue.department}</span></div><div><span className="text-gray-500">Sprint: </span><span>{selectedIssue.sprint}</span></div>
            <div><span className="text-gray-500">Points: </span><span>{selectedIssue.points}</span></div><div><span className="text-gray-500">Due Date: </span><span>{selectedIssue.dueDate || 'Not set'}{selectedIssue.dueTime ? ` ${selectedIssue.dueTime}` : ''}</span></div>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">{selectedIssue.labels.map(l => <span key={l} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{l}</span>)}</div>
          {selectedIssue.attachmentFiles && selectedIssue.attachmentFiles.length > 0 && <div className="mt-4 border-t border-gray-800 pt-3"><h4 className="text-sm font-medium text-gray-300 mb-2">Attachments ({selectedIssue.attachmentFiles.length})</h4><div className="space-y-1">{selectedIssue.attachmentFiles.map((f, i) => <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-lg text-sm"><div className="flex items-center gap-2 truncate"><span>{f.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'File'}</span><span className="truncate">{f.name}</span><span className="text-xs text-gray-500">({(f.size / 1024).toFixed(1)}KB)</span></div><div className="flex gap-2 ml-2"><button onClick={() => window.open(f.url, '_blank')} className="text-cyan-400 hover:text-cyan-300 text-xs">View</button><a href={f.url} download={f.name} className="text-green-400 hover:text-green-300 text-xs">Download</a></div></div>)}</div></div>}
          <div className="text-xs text-gray-600"><span>Created: {selectedIssue.created}</span><span className="mx-2">|</span><span>Updated: {selectedIssue.updated}</span></div>
        </div>
      </div>
    )}
    {/* Edit Issue Modal */}
    {showEditModal && editIssue && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}><div className="absolute inset-0 bg-black/60" />
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
            <div><label className="block text-sm text-gray-400 mb-1">Department</label><select value={editIssue.department} onChange={e => setEditIssue({...editIssue,department:e.target.value as Department})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">{departments.map(d => <option key={d}>{d}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={editIssue.dueDate || ''} onChange={e => setEditIssue({...editIssue,dueDate:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div><div><label className="block text-sm text-gray-400 mb-1">Due Time</label><input type="time" value={editIssue.dueTime || ''} onChange={e => setEditIssue({...editIssue,dueTime:e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div></div>
            <div><label className="block text-sm text-gray-400 mb-1">Upload Files <span className="text-gray-600">(PDF, DOC, XLS, PPT, ZIP, images, code, etc.)</span></label><input type="file" multiple onChange={e => { const _ef = Array.from(e.target.files || []); e.target.value=''; if (_ef.length) setEditAttachments(prev => [...prev, ..._ef]); }} className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600 cursor-pointer" /></div>{editIssue.attachmentFiles && editIssue.attachmentFiles.length > 0 && <div><label className="block text-sm text-gray-400 mb-1">Existing Files ({editIssue.attachmentFiles.length})</label><div className="space-y-1">{editIssue.attachmentFiles.map((f,i) => <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-lg text-sm"><span className="truncate">{f.name} <span className="text-xs text-gray-500">({(f.size/1024).toFixed(1)}KB)</span></span><div className="flex gap-1 ml-2"><button onClick={() => window.open(f.url,'_blank')} className="text-cyan-400 text-xs">View</button><a href={f.url} download={f.name} className="text-green-400 text-xs">DL</a></div></div>)}</div></div>}{editAttachments.length > 0 && <div><label className="block text-sm text-gray-400 mb-1">New Files ({editAttachments.length})</label><div className="space-y-1">{editAttachments.map((f,i) => <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-lg text-sm"><span className="truncate">{f.name} <span className="text-xs text-gray-500">({(f.size/1024).toFixed(1)}KB)</span></span><button onClick={() => setEditAttachments(p => p.filter((_,j) => j!==i))} className="text-red-400 text-xs ml-2">✕</button></div>)}</div></div>}<div className="flex gap-2 pt-2"><button onClick={handleEditIssue} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Save Changes</button><button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Cancel</button></div>
          </div>
        </div>
      </div>
    )}
    {/* Delete Issue Confirm */}
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
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setShowActivityLog(false)}><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800"><h3 className="text-lg font-semibold">Activity Log ({activityLogs.length})</h3><button onClick={() => setShowActivityLog(false)} className="text-gray-400 hover:text-white text-xl">X</button></div>
          <div className="flex-1 overflow-y-auto p-4">{activityLogs.length === 0 ? (<p className="text-gray-500 text-center py-8">No activity yet.</p>) : (<div className="space-y-2">{activityLogs.map(log => (<div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-3 bg-gray-800/50 rounded-lg text-sm"><span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${log.action==='Created'?'bg-green-500/20 text-green-400':log.action==='Deleted'?'bg-red-500/20 text-red-400':'bg-blue-500/20 text-blue-400'}`}>{log.action}</span><span className="text-cyan-400 font-mono text-xs">{log.issueKey}</span><span className="text-white text-xs truncate flex-1">{log.issueTitle}</span>{log.field && <span className="text-gray-500 text-xs">{log.field}: {log.oldValue} -&gt; {log.newValue}</span>}<span className="text-gray-600 text-xs whitespace-nowrap">{log.user} - {log.timestamp}</span></div>))}</div>)}</div>
        </div>
      </div>
    )}
    {/* Create Task Modal */}
    {showCreateModal && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}><div className="absolute inset-0 bg-black/60" />
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
            <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="date" value={createDueDate} onChange={e => setCreateDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div><div><label className="block text-sm text-gray-400 mb-1">Due Time</label><input type="time" value={createDueTime} onChange={e => setCreateDueTime(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div></div>
            <div><label className="block text-sm text-gray-400 mb-1">Upload Files <span className="text-gray-600">(PDF, DOC, XLS, PPT, ZIP, images, code, etc.)</span></label><input type="file" multiple onChange={e => { const _cf = Array.from(e.target.files || []); e.target.value=''; if (_cf.length) setCreateAttachments(prev => [...prev, ..._cf]); }} className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600 cursor-pointer" /></div>{createAttachments.length > 0 && <div><label className="block text-sm text-gray-400 mb-1">Attached ({createAttachments.length})</label><div className="space-y-1">{createAttachments.map((f,i) => <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded-lg text-sm"><div className="flex items-center gap-2 truncate"><span>{f.type?.startsWith('image/') ? '🖼' : f.type?.includes('pdf') ? '📄' : '📎'}</span><span className="truncate">{f.name}</span><span className="text-xs text-gray-500">({(f.size/1024).toFixed(1)}KB)</span></div><button onClick={() => setCreateAttachments(p => p.filter((_,j) => j!==i))} className="text-red-400 text-xs ml-2">✕</button></div>)}</div></div>}<button onClick={handleCreateIssue} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm transition-colors">Create Task</button>
          </div>
        </div>
      </div>
    )}
    {/* ==================== KB CRUD MODALS ==================== */}
    {/* Create/Edit Section Modal */}
    {(showCreateSection || showEditSection) && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => {setShowCreateSection(false);setShowEditSection(false);}}><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">{showEditSection ? 'Edit Section' : 'Create Section'}</h3>
          <div className="space-y-3">
            <div><label className="block text-sm text-gray-400 mb-1">Name</label><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Section name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Icon (emoji)</label><input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="e.g. 📱" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Color</label><input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer" /></div>
            <button onClick={showEditSection ? handleEditKBSection : handleCreateKBSection} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm">{showEditSection ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </div>
    )}
    {/* Delete Section Confirm */}
    {showDeleteSection && (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-2">Delete Section?</h3><p className="text-sm text-gray-400 mb-4">All groups and pages inside will be deleted.</p>
          <div className="flex gap-2"><button onClick={handleDeleteKBSection} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={() => setShowDeleteSection(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div>
        </div>
      </div>
    )}
    {/* Create/Edit Group Modal */}
    {(showCreateGroup || showEditGroup) && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => {setShowCreateGroup(false);setShowEditGroup(false);}}><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">{showEditGroup ? 'Edit Group' : 'Create Group'}</h3>
          <div className="space-y-3">
            <div><label className="block text-sm text-gray-400 mb-1">Group Name</label><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Group name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
            <button onClick={showEditGroup ? handleEditKBGroup : handleCreateKBGroup} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm">{showEditGroup ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </div>
    )}
    {/* Delete Group Confirm */}
    {showDeleteGroup && (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-2">Delete Group?</h3><p className="text-sm text-gray-400 mb-4">All pages inside will be deleted.</p>
          <div className="flex gap-2"><button onClick={handleDeleteKBGroup} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={() => setShowDeleteGroup(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div>
        </div>
      </div>
    )}
    {/* Create/Edit Page Modal */}
    {(showCreatePage || showEditPage) && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => {setShowCreatePage(false);setShowEditPage(false);}}><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">{showEditPage ? 'Edit Page' : 'Create Page'}</h3>
          <div className="space-y-3">
            <div><label className="block text-sm text-gray-400 mb-1">Title</label><input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Page title" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Content <span className="text-gray-600">(paste images with Ctrl+V)</span></label><textarea value={formContent} onChange={e => setFormContent(e.target.value)} onPaste={e => { const items = e.clipboardData?.items; if (items) { for (let i = 0; i < items.length; i++) { if (items[i].type.startsWith('image/')) { e.preventDefault(); const file = items[i].getAsFile(); if (file) { const reader = new FileReader(); reader.onload = ev => { setFormImages(prev => [...prev, {id: `img-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: file.name || `pasted-image-${Date.now()}.png`, dataUrl: ev.target?.result as string}]); }; reader.readAsDataURL(file); } break; } } } }} placeholder="Page content... (you can paste images here)" rows={8} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none resize-none" /></div> {formImages.length > 0 && <div className="mt-2"><label className="block text-sm text-gray-400 mb-1">Images ({formImages.length})</label><div className="grid grid-cols-2 gap-2">{formImages.map(img => <div key={img.id} className="relative group"><img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover rounded-lg border border-gray-700" /><button onClick={() => setFormImages(prev => prev.filter(i => i.id !== img.id))} className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button></div>)}</div></div>} <div><label className="block text-sm text-gray-400 mb-1">Upload Images</label><input type="file" multiple accept="image/*" onChange={e => { const files = e.target.files; if (files) { Array.from(files).forEach(file => { const reader = new FileReader(); reader.onload = ev => { setFormImages(prev => [...prev, {id: `img-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: file.name, dataUrl: ev.target?.result as string}]); }; reader.readAsDataURL(file); }); } e.target.value = ''; }} className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600 cursor-pointer" /></div> <div><label className="block text-sm text-gray-400 mb-1">Upload Files</label><input type="file" multiple onChange={e => { const files = e.target.files; if (files) { Array.from(files).forEach(file => { const reader = new FileReader(); reader.onload = ev => { setFormFiles(prev => [...prev, {id: `file-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: file.name, dataUrl: ev.target?.result as string, size: file.size, type: file.type}]); }; reader.readAsDataURL(file); }); } e.target.value = ''; }} className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600 cursor-pointer" /></div> {formFiles.length > 0 && <div><label className="block text-sm text-gray-400 mb-1">Attached Files ({formFiles.length})</label><div className="space-y-1">{formFiles.map(f => <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm"><div className="flex items-center gap-2 truncate"><span>{f.type.startsWith('image/') ? '🖼' : f.type.includes('pdf') ? '📄' : '📎'}</span><span className="truncate">{f.name}</span><span className="text-xs text-gray-500">({(f.size/1024).toFixed(1)}KB)</span></div><button onClick={() => setFormFiles(prev => prev.filter(x => x.id !== f.id))} className="text-red-400 hover:text-red-300 text-sm ml-2 px-2 py-0.5 hover:bg-red-500/10 rounded transition-colors">✕ Remove</button></div>)}</div></div>}
            <div><label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label><input type="text" value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="tag1, tag2, tag3" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none" /></div>
            <button onClick={showEditPage ? handleEditKBPage : handleCreateKBPage} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium text-sm">{showEditPage ? 'Save Changes' : 'Create Page'}</button>
          </div>
        </div>
      </div>
    )}
    {/* Delete Page Confirm */}
    {showDeletePage && (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-xl border border-red-800 w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-2">Delete Page?</h3><p className="text-sm text-gray-400 mb-4">This cannot be undone.</p>
          <div className="flex gap-2"><button onClick={handleDeleteKBPage} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-sm">Delete</button><button onClick={() => setShowDeletePage(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button></div>
        </div>
      </div>
    )}
  </div>
  );
}
