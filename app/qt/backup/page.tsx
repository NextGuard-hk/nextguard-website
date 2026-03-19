'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BackupResult {
  version: string;
  system: string;
  timestamp: string;
  duration_ms: number;
  integrity: { status: string; checks: string[]; errors: string[] };
  data: { counts: Record<string, number> };
}

interface User { id: string; email: string; name: string; role: string }

const CSS = `
.bk-root { min-height:100vh; background:#0a0f1a; color:#e0e0e0; font-family:system-ui,sans-serif; }
.bk-header { display:flex; align-items:center; padding:14px 24px; background:#0d1117; border-bottom:1px solid #1f2937; flex-wrap:wrap; gap:8px; }
.bk-logo { font-size:18px; font-weight:700; color:#fff; letter-spacing:1px; }
.bk-logo span { color:#22c55e; }
.bk-header-right { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.bk-container { max-width:900px; margin:0 auto; padding:24px 16px; }
.bk-title-row { display:flex; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
.bk-title { font-size:22px; font-weight:700; color:#f9fafb; }
.bk-subtitle { font-size:13px; color:#6b7280; margin-top:2px; }
.bk-actions { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
.bk-btn { padding:9px 18px; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap; }
.bk-btn-primary { background:#22c55e; color:#fff; }
.bk-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.bk-btn-secondary { background:#1f2937; color:#9ca3af; border:1px solid #374151; }
.bk-btn-sm { background:#1f2937; border:1px solid #374151; color:#9ca3af; border-radius:6px; padding:5px 10px; font-size:12px; cursor:pointer; white-space:nowrap; }
.bk-card { background:#0d1117; border:1px solid #1f2937; border-radius:12px; padding:20px; margin-bottom:16px; }
.bk-card-title { font-size:15px; font-weight:600; color:#f9fafb; margin-bottom:14px; }
.bk-error { background:rgba(239,68,68,0.15); border:1px solid #7f1d1d; border-radius:8px; padding:12px 16px; color:#fca5a5; margin-bottom:16px; font-size:13px; }
.bk-status-healthy { color:#22c55e; font-weight:700; font-size:16px; }
.bk-status-degraded { color:#ef4444; font-weight:700; font-size:16px; }
.bk-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:10px; margin-bottom:14px; }
.bk-stat { background:#111827; border-radius:8px; padding:12px; }
.bk-stat-label { font-size:11px; color:#6b7280; margin-bottom:4px; }
.bk-stat-val { font-size:20px; font-weight:700; color:#f9fafb; }
.bk-check { font-size:13px; color:#22c55e; margin-bottom:4px; }
.bk-check-err { font-size:13px; color:#ef4444; margin-bottom:4px; }
.bk-run { display:flex; align-items:center; justify-content:space-between; background:#111827; border-radius:8px; padding:10px 14px; margin-bottom:8px; }
.bk-run-ok { font-weight:600; color:#22c55e; }
.bk-run-fail { font-weight:600; color:#ef4444; }
.bk-run-pending { font-weight:600; color:#f59e0b; }
.bk-run-date { font-size:12px; color:#6b7280; }
.bk-arch-row { display:flex; gap:12px; margin-bottom:10px; font-size:13px; }
.bk-arch-key { color:#3b82f6; font-family:monospace; min-width:80px; }
.bk-arch-val { color:#d1d5db; }
.bk-ts { font-size:11px; color:#4b5563; margin-bottom:14px; }
`;

export default function BackupMonitorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [ghRuns, setGhRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/qt-auth').then(r => r.json()).then(d => {
      if (!d.authenticated) { router.replace('/qt-login'); return; }
      if (d.user.role !== 'admin') { router.replace('/qt'); return; }
      setUser(d.user);
    }).catch(() => router.replace('/qt-login'));
  }, [router]);

  const runCheck = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/qt-backup');
      if (res.status === 401) { router.replace('/qt-login'); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const checkGH = async () => {
    setGhLoading(true);
    try {
      const res = await fetch('https://api.github.com/repos/NextGuard-hk/nextguard-website/actions/workflows/daily-backup.yml/runs?per_page=7');
      const d = await res.json();
      setGhRuns(d.workflow_runs || []);
    } catch { setGhRuns([]); }
    finally { setGhLoading(false); }
  };

  const runClass = (r: any) => {
    const c = r.conclusion || r.status;
    if (c === 'success') return 'bk-run-ok';
    if (c === 'failure') return 'bk-run-fail';
    return 'bk-run-pending';
  };

  async function logout() {
    await fetch('/api/qt-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    router.replace('/qt-login');
  }

  if (!user) return <div style={{minHeight:'100vh',background:'#0a0f1a',display:'flex',alignItems:'center',justifyContent:'center',color:'#6b7280'}}>Loading...</div>;

  return (
    <div className="bk-root">
      <style>{CSS}</style>
      <header className="bk-header">
        <div className="bk-logo">NEXT<span>GUARD</span>&nbsp;&nbsp;|&nbsp;&nbsp;Backup Monitor</div>
        <div className="bk-header-right">
          <span style={{fontSize:13,color:'#9ca3af'}}>{user.name}</span>
          <span style={{fontSize:11,background:'#7c3aed',color:'#fff',padding:'2px 8px',borderRadius:4}}>Admin</span>
          <button onClick={() => router.push('/qt')} className="bk-btn-sm">&#8592; Dashboard</button>
          <button onClick={logout} className="bk-btn-sm">Logout</button>
        </div>
      </header>
      <div className="bk-container">
        <div className="bk-title-row">
          <div>
            <div className="bk-title">&#128274; Backup Monitor</div>
            <div className="bk-subtitle">Quotation System Database Backup Status &mdash; Admin Only</div>
          </div>
        </div>

        <div className="bk-actions">
          <button className="bk-btn bk-btn-primary" onClick={runCheck} disabled={loading}>
            {loading ? 'Checking...' : '&#9654; Run Integrity Check'}
          </button>
          <button className="bk-btn bk-btn-secondary" onClick={checkGH} disabled={ghLoading}>
            {ghLoading ? 'Loading...' : '&#9654; Check GitHub Actions'}
          </button>
          <a href="https://github.com/NextGuard-hk/nextguard-website/actions/workflows/daily-backup.yml"
            target="_blank" rel="noopener noreferrer"
            className="bk-btn bk-btn-secondary" style={{textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
            View All Runs &#8599;
          </a>
        </div>

        {error && <div className="bk-error">⚠️ {error}</div>}

        {result && (
          <div className="bk-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div className="bk-card-title" style={{margin:0}}>Integrity Check</div>
              <span className={result.integrity.status === 'healthy' ? 'bk-status-healthy' : 'bk-status-degraded'}>
                {result.integrity.status === 'healthy' ? '&#10003; HEALTHY' : '&#10007; DEGRADED'}
              </span>
            </div>
            <div className="bk-ts">{result.timestamp} &nbsp;&bull;&nbsp; {result.duration_ms}ms</div>
            <div className="bk-grid">
              {Object.entries(result.data.counts).map(([t, n]) => (
                <div key={t} className="bk-stat">
                  <div className="bk-stat-label">{t.replace('qt_', '')}</div>
                  <div className="bk-stat-val">{n}</div>
                </div>
              ))}
            </div>
            <div>
              {result.integrity.checks.map((c, i) => <div key={i} className="bk-check">&#10003; {c}</div>)}
              {result.integrity.errors.map((e, i) => <div key={i} className="bk-check-err">&#10007; {e}</div>)}
            </div>
          </div>
        )}

        {ghRuns.length > 0 && (
          <div className="bk-card">
            <div className="bk-card-title">Recent GitHub Actions Runs</div>
            {ghRuns.map((r: any) => (
              <div key={r.id} className="bk-run">
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span className={runClass(r)}>
                    {(r.conclusion || r.status || 'pending').toUpperCase()}
                  </span>
                  <span style={{fontSize:12,color:'#9ca3af'}}>#{r.run_number}</span>
                </div>
                <span className="bk-run-date">{new Date(r.created_at).toLocaleString('en-HK')}</span>
                <a href={r.html_url} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:12,color:'#3b82f6',textDecoration:'none'}}>View &#8599;</a>
              </div>
            ))}
          </div>
        )}

        <div className="bk-card">
          <div className="bk-card-title">Backup Architecture</div>
          <div className="bk-arch-row"><span className="bk-arch-key">Schedule</span><span className="bk-arch-val">Daily midnight HKT (4PM UTC) via GitHub Actions</span></div>
          <div className="bk-arch-row"><span className="bk-arch-key">Retention</span><span className="bk-arch-val">7 days &mdash; git tags + GitHub Artifacts</span></div>
          <div className="bk-arch-row"><span className="bk-arch-key">Scope</span><span className="bk-arch-val">All 7 QT tables: admin_users, products, prices, quotations, lines, files, audit_log</span></div>
          <div className="bk-arch-row"><span className="bk-arch-key">Method</span><span className="bk-arch-val">Integrity check + paginated JSON export stored as GitHub Artifacts</span></div>
          <div className="bk-arch-row"><span className="bk-arch-key">Alerts</span><span className="bk-arch-val">Email to oscar@next-guard.com via Resend API on failure</span></div>
          <div className="bk-arch-row"><span className="bk-arch-key">Audit</span><span className="bk-arch-val">Each check logged in qt_audit_log</span></div>
        </div>
      </div>
    </div>
  );
}
