'use client';
import { useState } from 'react';

const swgTabs = ['Proxy Engine', 'SSL/TLS', 'Auth & SSO', 'URL Filter', 'Threat Prevention', 'CASB', 'Performance', 'Gartner Future'];

export default function WebProxySWGConfig() {
  const [activeTab, setActiveTab] = useState(0);
  const [proxyMode, setProxyMode] = useState('explicit');
  const [sslEnabled, setSslEnabled] = useState(true);

  return (
    <div className="mt-8 border border-gray-700 rounded-xl p-6 bg-gray-900/80">
      <h2 className="text-2xl font-bold text-white mb-1">Web Proxy / Secure Web Gateway</h2>
      <p className="text-gray-400 text-sm mb-4">BlueCoat + Palo Alto + Zscaler + CheckPoint + Forcepoint + Gartner SSE</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {swgTabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === i ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>{t}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">Proxy Engine Configuration (BlueCoat ProxySG Style)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Deployment Mode</h4>
              {['explicit', 'transparent', 'reverse', 'forward'].map(m => (
                <label key={m} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="radio" name="proxyMode" checked={proxyMode === m} onChange={() => setProxyMode(m)}
                    className="accent-cyan-500" />
                  <span className="text-gray-300 capitalize">{m} Proxy</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Protocol Support</h4>
              {['HTTP/HTTPS Forward Proxy', 'SOCKS5 Proxy', 'FTP over HTTP', 'WebSocket Inspection', 'ICAP Integration', 'DNS Proxy'].map(p => (
                <label key={p} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={p.includes('HTTP') || p.includes('DNS')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Traffic Steering & Optimization (SGOS Engine)</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Content Caching (BlueCoat)', 'Bandwidth Management', 'Stream Splitting', 'Connection Pooling', 'Object Pipelining', 'Adaptive Refresh', 'Protocol Optimization', 'WAN Acceleration'].map(f => (
                <label key={f} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={f.includes('Caching') || f.includes('Bandwidth')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">SSL/TLS Inspection (Palo Alto + BlueCoat Style)</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-medium">SSL Forward Proxy Decryption</span>
              <button onClick={() => setSslEnabled(!sslEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${sslEnabled ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${sslEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {['TLS 1.3 Inspection', 'Certificate Pinning Detection', 'OCSP Stapling', 'Custom CA Certificate', 'Encrypted Tap (BlueCoat)', 'SSL Inbound Inspection', 'Perfect Forward Secrecy', 'Hardware-Assisted Decryption'].map(f => (
              <label key={f} className="flex items-center gap-2 mb-2">
                <input type="checkbox" defaultChecked={f.includes('TLS') || f.includes('Custom')} className="accent-cyan-500" />
                <span className="text-gray-300 text-sm">{f}</span>
              </label>
            ))}
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Decryption Bypass Rules</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Financial/Banking Sites', 'Healthcare Portals', 'Government Sites', 'Certificate-Pinned Apps', 'User Privacy Categories', 'Custom Bypass List'].map(r => (
                <label key={r} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={r.includes('Financial') || r.includes('Health')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">Authentication & SSO (BlueCoat + Zscaler Style)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Authentication Methods</h4>
              {['SAML 2.0 / SSO', 'Kerberos / IWA', 'LDAP / Active Directory', 'RADIUS', 'NTLM', 'OAuth 2.0 / OIDC', 'Client Certificate (mTLS)', 'Multi-Factor Auth (MFA)', 'SCIM Provisioning'].map(a => (
                <label key={a} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={a.includes('SAML') || a.includes('LDAP') || a.includes('MFA')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{a}</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Identity & Access Control</h4>
              {['User-based Policy', 'Group-based Policy', 'Device Posture Check', 'Geo-location Rules', 'Time-based Access', 'Risk-based Auth (Adaptive)', 'Guest/BYOD Access', 'Identity Provider Chaining'].map(a => (
                <label key={a} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={a.includes('User') || a.includes('Group') || a.includes('Device')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{a}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">URL Filtering & App Control (Forcepoint + Zscaler Style)</h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">URL Categories (90+ Categories)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Adult Content', 'Gambling', 'Malware/Phishing', 'Social Media', 'Streaming Media', 'Cloud Storage', 'Webmail', 'News/Media', 'Shopping', 'Finance', 'Government', 'Education', 'GenAI/ChatGPT', 'Proxy/Anonymizer', 'P2P/Torrents', 'Weapons'].map(c => (
                <label key={c} className="flex items-center gap-1.5">
                  <input type="checkbox" defaultChecked={c.includes('Malware') || c.includes('Adult') || c.includes('Proxy')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{c}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Actions per Category</h4>
              {['Allow', 'Block', 'Warn/Coach', 'Isolate (RBI)', 'Bandwidth Limit', 'Time Quota'].map(a => (
                <div key={a} className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${a === 'Block' ? 'bg-red-500' : a === 'Allow' ? 'bg-green-500' : a === 'Warn/Coach' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <span className="text-gray-300 text-sm">{a}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Application Control (8,900+ Apps)</h4>
              {['Granular App Function Control', 'Shadow IT Discovery', 'App Risk Scoring', 'Tenant Restrictions', 'GenAI App Controls', 'Custom App Signatures'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('Shadow') || f.includes('GenAI')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">Advanced Threat Prevention (CheckPoint + PA Style)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Threat Engines</h4>
              {['AI-Powered Malware Detection', 'Zero-Day Sandboxing (WildFire/SandBlast)', 'Cloud IPS / Virtual Patching', 'Anti-Bot / C2 Prevention', 'Phishing Prevention (Real-time)', 'DNS Security', 'Advanced URL Filtering', 'Inline Machine Learning'].map(t => (
                <label key={t} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{t}</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">File Inspection</h4>
              {['Content Disarm & Reconstruct (CDR)', 'File Type Filtering', 'Archive Inspection (ZIP/RAR)', 'Macro Detection (Office)', 'Script Analysis (JS/PS)', 'Executable Blocking', 'Document Sanitization', 'Remote Browser Isolation (RBI)'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('CDR') || f.includes('RBI') || f.includes('File Type')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 5 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">CASB & SaaS Security (Zscaler + Forcepoint Style)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Inline CASB</h4>
              {['Real-time SaaS DLP', 'Tenant Restriction (M365/Google)', 'Upload/Download Control', 'Sharing Control', 'App Instance Awareness', 'Inline Threat Scan', 'GenAI Prompt Inspection'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('DLP') || f.includes('Tenant') || f.includes('GenAI')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">API CASB (Out-of-Band)</h4>
              {['SaaS Configuration Audit (SSPM)', 'Data-at-Rest Scanning', 'Collaboration Sharing Audit', 'Compliance Monitoring', 'Shadow IT Discovery', 'User Behavior Analytics', 'Third-Party App Governance'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('SSPM') || f.includes('Shadow')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 6 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">Performance & User Experience (Zscaler + PA Style)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Traffic Path Optimization</h4>
              {['Direct-to-Cloud (No Backhaul)', 'Peering with 150+ PoPs', 'Dynamic Path Selection', 'Split Tunneling Rules', 'Local Internet Breakout', 'SD-WAN Integration'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('Direct') || f.includes('Peering')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">User Experience</h4>
              {['Single-Pass Architecture', 'Sub-ms Latency SLA', 'Digital Experience Monitoring', 'App Performance Score', 'Endpoint Health Check', 'Bandwidth Fair Queuing'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('Single') || f.includes('Digital')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Scalability</h4>
              {['Auto-Scaling Cloud Proxy', '99.999% Uptime SLA', 'Multi-Tenant Architecture', 'Geo-Redundancy', 'Edge Computing Nodes', 'Carrier-Grade NAT'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked={f.includes('Auto') || f.includes('99')} className="accent-cyan-500" />
                  <span className="text-gray-300 text-xs">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 7 && (
        <div className="space-y-4">
          <h3 className="text-cyan-400 font-semibold text-lg">Gartner SSE/SASE Future Vision (2025+)</h3>
          <p className="text-gray-400 text-sm">Next-generation SWG capabilities recommended by Gartner Magic Quadrant 2025</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-900/40 to-gray-800 rounded-lg p-4 border border-purple-700/30">
              <h4 className="text-purple-400 font-medium mb-3">AI-Driven Security</h4>
              {['Precision AI Threat Detection', 'AI-Powered Policy Automation', 'Behavioral Analytics (UEBA)', 'Intelligent Orchestration', 'Autonomous Incident Response', 'ML-based Anomaly Detection', 'NLP Content Classification'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="accent-purple-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-gray-800 rounded-lg p-4 border border-purple-700/30">
              <h4 className="text-purple-400 font-medium mb-3">Zero Trust Architecture</h4>
              {['Continuous Trust Verification', 'Identity-First Security', 'Microsegmentation', 'Least Privilege Access', 'Device Trust Scoring', 'Context-Aware Policies', 'Universal ZTNA'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="accent-purple-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-gray-800 rounded-lg p-4 border border-purple-700/30">
              <h4 className="text-purple-400 font-medium mb-3">Unified SSE Platform</h4>
              {['Single-Vendor SASE', 'Converged SWG+CASB+ZTNA+FWaaS', 'Unified Policy Engine', 'Single Agent Architecture', 'Centralized Management Console', 'Cross-Pillar Analytics', 'API-First Integration'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="accent-purple-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-gray-800 rounded-lg p-4 border border-purple-700/30">
              <h4 className="text-purple-400 font-medium mb-3">Emerging Capabilities</h4>
              {['GenAI Security Controls', 'Digital Experience Monitoring (DEM)', 'Cloud-Native SASE Fabric', 'Edge Computing Security', 'IoT/OT Web Protection', 'Quantum-Ready Encryption', 'Sovereign Cloud Options'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-2">
                  <input type="checkbox" defaultChecked className="accent-purple-500" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
