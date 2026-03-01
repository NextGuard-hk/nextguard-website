// Agent Configuration API - NextGuard Endpoint DLP Agent
// Reference: SecGator/Skyguard 3.15 SP3 Endpoint Parameters
// Provides configurable feature toggles for all agent capabilities
import { NextRequest, NextResponse } from 'next/server'

// === COMPLETE AGENT FEATURE CONFIGURATION ===
// Organized by category matching Skyguard SecGator Endpoint specification
let AGENT_CONFIG = {
  configVersion: '2.0.0',
  lastUpdated: new Date().toISOString(),

  // ========== 1. PLATFORM SUPPORT ==========
  platformSupport: {
    category: 'Platform Support',
    description: 'Supported operating systems and deployment',
    features: {
      windowsAgent: { id: 'plat-win', name: 'Windows Agent', description: 'Windows 7/8/10/11 32&64bit, Windows Server DLP', enabled: true, platforms: ['windows'] },
      windowsUsb: { id: 'plat-win-usb', name: 'Windows USB Deployment', description: 'Deploy via USB with HTTP/HTTPS/FTP/USB/SMTP channels', enabled: true, platforms: ['windows'] },
      macAgent: { id: 'plat-mac', name: 'macOS Agent', description: 'macOS 10.9-14.x Sonoma DLP agent', enabled: true, platforms: ['macos'] },
      linuxAgent: { id: 'plat-linux', name: 'Linux Agent', description: 'Linux kernel 3.7+ / UOS 3.9+ DLP agent', enabled: true, platforms: ['linux'] },
      sccmDeployment: { id: 'plat-sccm', name: 'SCCM/GPO Deployment', description: 'Microsoft SCCM & GPO deployment for Windows/Mac', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

  // ========== 2. NETWORK CHANNEL MONITORING ==========
  networkChannels: {
    category: 'Network Channel Monitoring',
    description: 'Monitor and control data transfer over network protocols',
    features: {
      httpMonitor: { id: 'net-http', name: 'HTTP Monitoring', description: 'Monitor HTTP upload/download with content inspection. Supports HTTP/2', enabled: true, action: 'audit', platforms: ['windows', 'macos', 'linux'] },
      httpsMonitor: { id: 'net-https', name: 'HTTPS/SSL Inspection', description: 'HTTPS traffic decryption and DLP inspection via SSL interception', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      ftpMonitor: { id: 'net-ftp', name: 'FTP Monitoring', description: 'FTP file upload monitoring and blocking', enabled: true, action: 'block', platforms: ['windows'] },
      smtpMonitor: { id: 'net-smtp', name: 'SMTP Email Monitoring', description: 'Outbound SMTP email content and attachment inspection', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      networkBypass: { id: 'net-bypass', name: 'Network Bypass Control', description: 'Control bypass rules for DLP block mode (networkbypass)', enabled: false, action: 'block', platforms: ['windows'] },
      sslInterception: { id: 'net-ssl', name: 'SSL/TLS Interception', description: 'Deep SSL inspection with certificate management', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      pacProxy: { id: 'net-pac', name: 'PAC Proxy Support', description: 'Proxy Auto-Configuration (PAC) file support for network routing', enabled: true, action: 'audit', platforms: ['windows'] },
      ipv6Support: { id: 'net-ipv6', name: 'IPv6 Support', description: 'IPv6 network traffic DLP inspection (SWG IPv6 compatible)', enabled: true, action: 'audit', platforms: ['windows', 'macos', 'linux'] },
    }
  },

  // ========== 3. INSTANT MESSAGING CONTROL ==========
  instantMessaging: {
    category: 'Instant Messaging Control',
    description: 'Monitor and control data sharing via IM applications',
    features: {
      wechatMonitor: { id: 'im-wechat', name: 'WeChat Monitoring', description: 'WeChat file transfer and clipboard monitoring', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      qqMonitor: { id: 'im-qq', name: 'QQ Monitoring', description: 'QQ and QQ International message & file monitoring', enabled: true, action: 'audit', platforms: ['windows'] },
      skypeMonitor: { id: 'im-skype', name: 'Skype Monitoring', description: 'Skype and Skype for Business message monitoring', enabled: true, action: 'audit', platforms: ['windows'] },
      timMonitor: { id: 'im-tim', name: 'TIM Monitoring', description: 'Tencent TIM instant messaging DLP', enabled: true, action: 'audit', platforms: ['windows'] },
      teamsMonitor: { id: 'im-teams', name: 'Microsoft Teams Monitoring', description: 'Teams chat, file sharing and meeting content DLP', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      slackMonitor: { id: 'im-slack', name: 'Slack Monitoring', description: 'Slack message and file upload DLP monitoring', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      dingTalkMonitor: { id: 'im-dingtalk', name: 'DingTalk Monitoring', description: 'Alibaba DingTalk messaging and file DLP', enabled: true, action: 'audit', platforms: ['windows'] },
      cocallMonitor: { id: 'im-cocall', name: 'CoCall Monitoring', description: 'CoCall application message monitoring (v3.5+)', enabled: true, action: 'audit', platforms: ['windows'] },
      imClipboardBlock: { id: 'im-clipboard', name: 'IM Clipboard Block', description: 'Block clipboard image paste in IM apps (clipboard-img-block)', enabled: true, action: 'block', platforms: ['windows'] },
      imForwardBlock: { id: 'im-forward', name: 'IM Forward Message Block', description: 'Block message forwarding in IM applications (forwardmsg-block)', enabled: true, action: 'block', platforms: ['windows'] },
    }
  },

  // ========== 4. EMAIL CONTROL ==========
  emailControl: {
    category: 'Email Control',
    description: 'Email client monitoring and DLP enforcement',
    features: {
      foxmailMonitor: { id: 'email-foxmail', name: 'Foxmail Monitoring', description: 'Foxmail email client content and attachment DLP', enabled: true, action: 'audit', platforms: ['windows'] },
      outlookMonitor: { id: 'email-outlook', name: 'Outlook Monitoring', description: 'Microsoft Outlook email DLP with MEP plugin support', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      outlookMep: { id: 'email-mep', name: 'Outlook MEP Plugin', description: 'Mail Encryption Plugin for Outlook with policy enforcement', enabled: true, action: 'audit', platforms: ['windows'] },
      webmailMonitor: { id: 'email-webmail', name: 'Webmail Monitoring', description: 'Browser-based email (Gmail, O365, Yahoo) DLP inspection', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
    }
  },

  // ========== 5. ENDPOINT DEVICE CONTROL ==========
  deviceControl: {
    category: 'Endpoint Device Control',
    description: 'Control peripheral devices and removable storage',
    features: {
      usbStorage: { id: 'dev-usb', name: 'USB Storage Control', description: 'USB mass storage device read/write/block control', enabled: true, action: 'audit', platforms: ['windows', 'macos', 'linux'] },
      usbDeviceId: { id: 'dev-usb-id', name: 'USB Device ID Whitelist', description: 'Allow only approved USB devices by hardware ID', enabled: true, action: 'block', platforms: ['windows'] },
      usbWifi: { id: 'dev-usb-wifi', name: 'USB WiFi Adapter Control', description: 'Block unauthorized USB WiFi adapters', enabled: false, action: 'block', platforms: ['windows'] },
      mtpPtp: { id: 'dev-mtp', name: 'MTP/PTP Device Control', description: 'Media Transfer Protocol and Picture Transfer Protocol device control', enabled: true, action: 'block', platforms: ['windows'] },
      cdDvd: { id: 'dev-cddvd', name: 'CD/DVD Drive Control', description: 'CD/DVD read and burn control', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      ieee1394: { id: 'dev-1394', name: 'IEEE 1394 (FireWire) Control', description: 'FireWire port device blocking', enabled: false, action: 'block', platforms: ['windows'] },
      pcmcia: { id: 'dev-pcmcia', name: 'PCMCIA Control', description: 'PCMCIA card slot device control', enabled: false, action: 'block', platforms: ['windows'] },
      airdrop: { id: 'dev-airdrop', name: 'AirDrop Control', description: 'macOS AirDrop file sharing control', enabled: true, action: 'block', platforms: ['macos'] },
      bluetooth: { id: 'dev-bluetooth', name: 'Bluetooth Control', description: 'Bluetooth file transfer and device pairing control', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      printControl: { id: 'dev-print', name: 'Print Control', description: 'Printer and print-to-file DLP control', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
    }
  },

  // ========== 6. CONTENT INSPECTION ==========
  contentInspection: {
    category: 'Content Inspection',
    description: 'File content analysis and document fingerprinting',
    features: {
      officeInspection: { id: 'ci-office', name: 'Office Document Inspection', description: 'Microsoft Office (Word/Excel/PPT) content inspection', enabled: true, platforms: ['windows', 'macos'] },
      wpsInspection: { id: 'ci-wps', name: 'WPS Office Inspection', description: 'WPS Office document content DLP', enabled: true, platforms: ['windows'] },
      pdfInspection: { id: 'ci-pdf', name: 'Adobe PDF Inspection', description: 'PDF document content inspection and text extraction', enabled: true, platforms: ['windows', 'macos'] },
      notepadInspection: { id: 'ci-notepad', name: 'Notepad/Text Inspection', description: 'Plain text file content monitoring (Notepad, TextEdit)', enabled: true, platforms: ['windows', 'macos'] },
      macKeynote: { id: 'ci-keynote', name: 'Keynote/Numbers/Pages', description: 'macOS iWork suite inspection', enabled: true, platforms: ['macos'] },
      imageOcr: { id: 'ci-ocr', name: 'Image OCR', description: 'OCR text extraction from images (screenshots, photos)', enabled: true, platforms: ['windows', 'macos'] },
      documentFingerprint: { id: 'ci-fingerprint', name: 'Document Fingerprinting', description: 'Structural document fingerprinting for IP protection', enabled: true, platforms: ['windows', 'macos'] },
      exactDataMatch: { id: 'ci-edm', name: 'Exact Data Match (EDM)', description: 'Match against registered sensitive data records', enabled: true, platforms: ['windows', 'macos', 'linux'] },
      microsoftRms: { id: 'ci-rms', name: 'Microsoft RMS Integration', description: 'Microsoft Rights Management Service DLP integration', enabled: true, platforms: ['windows'] },
      archiveInspection: { id: 'ci-archive', name: 'Archive File Inspection', description: 'Inspect ZIP/RAR/7z archive contents recursively', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

  // ========== 7. CLIPBOARD & SCREEN CONTROL ==========
  clipboardControl: {
    category: 'Clipboard & Screen Control',
    description: 'Monitor and control clipboard operations and screenshots',
    features: {
      clipboardMonitor: { id: 'clip-monitor', name: 'Clipboard Monitoring', description: 'Monitor clipboard copy/paste for sensitive content', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      clipboardBlock: { id: 'clip-block', name: 'Clipboard Block', description: 'Block sensitive content from being copied to clipboard', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      screenshotBlock: { id: 'clip-screenshot', name: 'Screenshot Block', description: 'Block screenshot when sensitive content is displayed', enabled: false, action: 'block', platforms: ['windows', 'macos'] },
      screenWatermark: { id: 'clip-watermark', name: 'Screen Watermark', description: 'Display invisible/visible watermark overlay on screen', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
    }
  },

  // ========== 8. APPLICATION CONTROL ==========
  applicationControl: {
    category: 'Application Control',
    description: 'Control which applications can access sensitive data',
    features: {
      appRunDir: { id: 'app-rundir', name: 'Application Run Directory', description: 'Restrict DLP-monitored application directories (AppRunDir)', enabled: false, platforms: ['windows'] },
      explorerMonitor: { id: 'app-explorer', name: 'Explorer.exe Monitoring', description: 'Windows Explorer file operation monitoring', enabled: true, platforms: ['windows'] },
      browserMonitor: { id: 'app-browser', name: 'Browser Monitoring', description: 'Monitor Chrome/Firefox/Edge/Safari file uploads', enabled: true, platforms: ['windows', 'macos'] },
      cloudAppControl: { id: 'app-cloud', name: 'Cloud App Control', description: 'Monitor/block uploads to cloud storage (Dropbox, OneDrive, Google Drive)', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      apiIntegration: { id: 'app-api', name: 'API Integration', description: 'Third-party application API DLP integration hooks', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

  // ========== 9. UCSS (Unstructured Content Security) ==========
  ucssControl: {
    category: 'UCSS - Content Discovery',
    description: 'Unstructured Content Search System for endpoint discovery',
    features: {
      ucssEndpoint: { id: 'ucss-endpoint', name: 'UCSS Endpoint Scan', description: 'Scan local storage for sensitive unstructured content', enabled: true, platforms: ['windows', 'macos'] },
      ucssLite: { id: 'ucss-lite', name: 'UCSS Lite (DM)', description: 'Lightweight UCSS Discovery Mode for endpoint scanning', enabled: true, platforms: ['windows'] },
      ucssScheduled: { id: 'ucss-schedule', name: 'UCSS Scheduled Scan', description: 'Schedule periodic UCSS scans (daily/weekly/monthly)', enabled: true, platforms: ['windows', 'macos'] },
      ucssIpMacFilter: { id: 'ucss-filter', name: 'UCSS IP/MAC Filter', description: 'Filter UCSS scan targets by IP/MAC address', enabled: true, platforms: ['windows'] },
      ucssFqdn: { id: 'ucss-fqdn', name: 'UCSS FQDN Support', description: 'Fully Qualified Domain Name support for UCSS targets', enabled: true, platforms: ['windows'] },
    }
  },

  // ========== 10. SYSTEM & AGENT MANAGEMENT ==========
  systemManagement: {
    category: 'System & Agent Management',
    description: 'Agent system-level configuration and management',
    features: {
      cpuWatchdog: { id: 'sys-cpu', name: 'CPU Watchdog', description: 'CPU usage limit watchdog to prevent resource overuse', enabled: true, platforms: ['windows', 'macos'] },
      debugMode: { id: 'sys-debug', name: 'Debug Mode', description: 'Enable debug logging for troubleshooting', enabled: false, platforms: ['windows', 'macos', 'linux'] },
      stealthMode: { id: 'sys-stealth', name: 'Stealth Mode', description: 'Hide agent from user (no tray icon, hidden process)', enabled: false, platforms: ['windows', 'macos'] },
      tamperProtection: { id: 'sys-tamper', name: 'Tamper Protection', description: 'Prevent agent uninstallation without auth', enabled: true, platforms: ['windows', 'macos'] },
      autoUpdate: { id: 'sys-update', name: 'Auto Update', description: 'Automatic agent update from management console', enabled: true, platforms: ['windows', 'macos', 'linux'] },
      heartbeatInterval: { id: 'sys-heartbeat', name: 'Heartbeat Interval', description: 'Agent heartbeat frequency (seconds)', enabled: true, value: 60, platforms: ['windows', 'macos', 'linux'] },
      offlinePolicy: { id: 'sys-offline', name: 'Offline Policy Cache', description: 'Cache policies locally for offline DLP enforcement', enabled: true, platforms: ['windows', 'macos'] },
      sipRecovery: { id: 'sys-sip', name: 'SIP/MEP Recovery', description: 'Self-Initiated Protection recovery mechanism', enabled: true, platforms: ['windows'] },
      adIntegration: { id: 'sys-ad', name: 'Active Directory Integration', description: 'Integrate with AD for user/group-based policies', enabled: true, platforms: ['windows'] },
    }
  },

  // ========== 11. INSIDER THREAT MANAGEMENT ==========
  insiderThreat: {
    category: 'Insider Threat Management (ITM)',
    description: 'Behavioral analytics for insider threat detection',
    features: {
      itmEngine: { id: 'itm-engine', name: 'ITM Engine', description: 'Insider Threat Management core detection engine', enabled: true, platforms: ['windows', 'macos'] },
      itmWebConsole: { id: 'itm-web', name: 'ITM Web Console', description: 'Web-based ITM investigation and case management', enabled: true, platforms: ['windows', 'macos'] },
      userBehaviorAnalytics: { id: 'itm-uba', name: 'User Behavior Analytics', description: 'UEBA - anomaly detection on user data access patterns', enabled: true, platforms: ['windows', 'macos'] },
      riskScoring: { id: 'itm-risk', name: 'Risk Adaptive Scoring', description: 'Dynamic risk score per user (Ref: Forcepoint RAP)', enabled: true, platforms: ['windows', 'macos'] },
      sessionRecording: { id: 'itm-session', name: 'Session Recording', description: 'Record user desktop sessions for forensic review', enabled: false, platforms: ['windows'] },
    }
  },

  // ========== 12. DISCOVERY & NETWORK ==========
  discoveryManagement: {
    category: 'Discovery & Network',
    description: 'Network-based data discovery and management',
    features: {
      dmDiscovery: { id: 'dm-discovery', name: 'DM Network Discovery', description: 'Data-at-rest discovery scan across network shares', enabled: true, platforms: ['windows'] },
      dmDnsPin: { id: 'dm-dns', name: 'DM DNS/Ping Discovery', description: 'Network host discovery via DNS and ICMP ping', enabled: true, platforms: ['windows'] },
      dmIpOsScan: { id: 'dm-ipos', name: 'DM IP/OS Scan', description: 'Scan IP ranges and identify OS types', enabled: true, platforms: ['windows', 'macos', 'linux'] },
      uncPathMonitor: { id: 'dm-unc', name: 'UNC Path Monitoring', description: 'Monitor file access on UNC network paths', enabled: true, platforms: ['windows'] },
      ipWhitelist: { id: 'dm-ipwhitelist', name: 'IP Whitelist/Blacklist', description: 'DLP bypass for trusted IP addresses', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

  // ========== 13. AI & ML FEATURES ==========
  aiFeatures: {
    category: 'AI & Machine Learning',
    description: 'AI-powered detection and classification',
    features: {
      aiClassification: { id: 'ai-classify', name: 'AI Content Classification', description: 'ML-based document and data classification', enabled: true, platforms: ['windows', 'macos'] },
      nlpDetection: { id: 'ai-nlp', name: 'NLP Detection', description: 'Natural Language Processing for context-aware DLP', enabled: true, platforms: ['windows', 'macos'] },
      aiImageRecognition: { id: 'ai-image', name: 'AI Image Recognition', description: 'Detect sensitive content in images (ID cards, checks)', enabled: true, platforms: ['windows', 'macos'] },
      genaiMonitor: { id: 'ai-genai', name: 'GenAI Service Monitor', description: 'Monitor data to ChatGPT/Claude/Gemini/Copilot', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      riskAdaptive: { id: 'ai-rap', name: 'Risk Adaptive Protection', description: 'Dynamic policy enforcement based on risk score', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

  // ========== 14. THIRD-PARTY INTEGRATION ==========
  integrations: {
    category: 'Third-Party Integration',
    description: 'Integration with security and IT management tools',
    features: {
      securityCompat: { id: 'int-360', name: 'Security Software Compat', description: 'Compatibility with 360, H3C, iNode client', enabled: true, platforms: ['windows'] },
      siemIntegration: { id: 'int-siem', name: 'SIEM Integration', description: 'Forward DLP events to SIEM (Splunk, QRadar, Sentinel)', enabled: true, platforms: ['windows', 'macos'] },
      metaDataExport: { id: 'int-meta', name: 'Metadata Export', description: 'Export file metadata for external analysis', enabled: true, platforms: ['windows', 'macos'] },
    }
  },
}

export async function GET() {
  const allCategories = Object.entries(AGENT_CONFIG).filter(([k]) => !['configVersion','lastUpdated'].includes(k))
  let totalFeatures = 0
  let enabledFeatures = 0
  const summary: Record<string, { total: number; enabled: number }> = {}
  allCategories.forEach(([, val]) => {
    if (typeof val === 'object' && val !== null && 'features' in val) {
      const cat = val as { category: string; features: Record<string, { enabled: boolean }> }
      const features = Object.values(cat.features)
      const enabled = features.filter(f => f.enabled).length
      totalFeatures += features.length
      enabledFeatures += enabled
      summary[cat.category] = { total: features.length, enabled }
    }
  })
  return NextResponse.json({
    success: true,
    config: AGENT_CONFIG,
    summary: { totalFeatures, enabledFeatures, disabledFeatures: totalFeatures - enabledFeatures, byCategory: summary }
  })
}


// POST: Toggle feature enabled/disabled
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { featureId, enabled, categoryKey, featureKey } = body

    if (!featureId && (!categoryKey || !featureKey)) {
      return NextResponse.json({ success: false, error: 'featureId or categoryKey+featureKey required' }, { status: 400 })
    }

    // Find and toggle the feature
    let found = false
    const configEntries = Object.entries(AGENT_CONFIG).filter(([k]) => !['configVersion', 'lastUpdated'].includes(k))

    for (const [catKey, catVal] of configEntries) {
      if (typeof catVal === 'object' && catVal !== null && 'features' in catVal) {
        const cat = catVal as { features: Record<string, { id: string; enabled: boolean }> }
        for (const [fKey, feature] of Object.entries(cat.features)) {
          if (feature.id === featureId || (catKey === categoryKey && fKey === featureKey)) {
            feature.enabled = typeof enabled === 'boolean' ? enabled : !feature.enabled
            found = true
            AGENT_CONFIG.lastUpdated = new Date().toISOString()
            return NextResponse.json({
              success: true,
              feature: { id: feature.id, enabled: feature.enabled },
              message: `Feature ${feature.id} ${feature.enabled ? 'enabled' : 'disabled'}`
            })
          }
        }
      }
    }

    if (!found) {
      return NextResponse.json({ success: false, error: 'Feature not found' }, { status: 404 })
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}
