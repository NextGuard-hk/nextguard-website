'use client';
import { useState } from 'react';

interface BackupResult {
  version: string;
  system: string;
  timestamp: string;
  duration_ms: number;
  integrity: {
    status: string;
    checks: string[];
    errors: string[];
  };
  data: { counts: Record<string, number> };
}

interface AuditEntry {
  id: number;
  action: string;
  details: string;
  created_at: string;
}

export default function BackupMonitorPage() {
  const [result, setResult] = useState<BackupResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ghStatus, setGhStatus] = useState<any>(null);
  const [ghLoading, setGhLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/qt-backup');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/qt-backup?table=qt_audit_log&limit=20');
      if (!res.ok) return;
      const data = await res.json();
      const backupLogs = (data.rows || []).filter((r: any) => r.action === 'backup_check');
      setAuditLogs(backupLogs.slice(0, 10));
    } catch { /* ignore */ }
  };

  const checkGitHubActions = async () => {
    setGhLoading(true);
    try {
      const res = await fetch('https://api.github.com/repos/NextGuard-hk/nextguard-website/actions/workflows/daily-backup.yml/runs?per_page=5');
      if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
      const data = await res.json();
      setGhStatus(data.workflow_runs || []);
    } catch (e: any) {
      setGhStatus([]);
    } finally {
      setGhLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'healthy' || s === 'success' || s === 'completed') return 'text-green-400';
    if (s === 'degraded' || s === 'failure') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Backup Monitor</h1>
            <p className="text-gray-400 text-sm mt-1">Quotation System Database Backup Status</p>
          </div>
          <a href="/qt" className="text-blue-400 hover:underline text-sm">&larr; Back to QT</a>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => { runCheck(); loadAuditLogs(); }} disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium">
            {loading ? 'Checking...' : 'Run Integrity Check'}
          </button>
          <button onClick={checkGitHubActions} disabled={ghLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded font-medium">
            {ghLoading ? 'Loading...' : 'Check GitHub Actions'}
          </button>
          <a href="https://github.com/NextGuard-hk/nextguard-website/actions/workflows/daily-backup.yml"
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium inline-flex items-center gap-1">
            View Workflow Runs &rarr;
          </a>
        </div>

        {error && <div className="bg-red-900/50 border border-red-700 rounded p-4 mb-6 text-red-300">{error}</div>}

        {/* Integrity Check Result */}
        {result && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Integrity Check Result</h2>
              <span className={`font-bold text-lg ${statusColor(result.integrity.status)}`}>
                {result.integrity.status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              {result.timestamp} | {result.duration_ms}ms
            </div>

            {/* Table Counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(result.data.counts).map(([table, count]) => (
                <div key={table} className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400">{table.replace('qt_', '')}</div>
                  <div className="text-xl font-bold">{count}</div>
                </div>
              ))}
            </div>

            {/* Checks */}
            <div className="space-y-1">
              {result.integrity.checks.map((c, i) => (
                <div key={i} className="text-sm text-green-400">&#10003; {c}</div>
              ))}
              {result.integrity.errors.map((e, i) => (
                <div key={i} className="text-sm text-red-400">&#10007; {e}</div>
              ))}
            </div>
          </div>
        )}

        {/* GitHub Actions Status */}
        {ghStatus && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Recent GitHub Actions Runs</h2>
            {ghStatus.length === 0 ? (
              <p className="text-gray-400 text-sm">No runs found (repo may be private - check GitHub directly)</p>
            ) : (
              <div className="space-y-2">
                {ghStatus.map((run: any) => (
                  <div key={run.id} className="flex items-center justify-between bg-gray-800 rounded p-3">
                    <div>
                      <span className={`font-medium ${statusColor(run.conclusion || run.status)}`}>
                        {(run.conclusion || run.status || 'unknown').toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">#{run.run_number}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(run.created_at).toLocaleString()}
                    </div>
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:underline">View</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backup History from Audit Log */}
        {auditLogs.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Recent Backup Checks</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => {
                let details: any = {};
                try { details = JSON.parse(log.details || '{}'); } catch {}
                return (
                  <div key={log.id} className="flex items-center justify-between bg-gray-800 rounded p-3">
                    <div>
                      <span className={details.errors_count === 0 ? 'text-green-400' : 'text-red-400'}>
                        {details.errors_count === 0 ? 'HEALTHY' : 'DEGRADED'}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        {Object.entries(details.counts || {}).map(([k, v]) => `${k.replace('qt_', '')}:${v}`).join(' | ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{log.created_at}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Architecture Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Backup Architecture</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Schedule</span>
              <span>Daily at midnight HKT (4PM UTC) via GitHub Actions</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Retention</span>
              <span>7 days (git tags + GitHub Artifacts)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Scope</span>
              <span>All 7 QT tables: admin_users, products, prices, quotations, lines, files, audit_log</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Method</span>
              <span>1) Integrity check via /api/qt-backup 2) Paginated JSON export of all tables 3) Stored as GitHub Artifacts</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Alerts</span>
              <span>Email alert to oscar@next-guard.com via Resend API on failure</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 font-mono w-24 shrink-0">Monitor</span>
              <span>Each backup check is logged in qt_audit_log for history tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
