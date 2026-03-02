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

      // =========== 15. macOS APPLICATION DLP ===========
    macosAppDlp: {
      category: 'macOS Application DLP',
      description: 'Comprehensive DLP monitoring for macOS native and third-party applications',
      features: {
        // --- Office 365 Suite for Mac ---
        macWordDlp: { id: 'mac-word', name: 'Microsoft Word for Mac', description: 'Monitor Word document save, export, share & clipboard operations on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macExcelDlp: { id: 'mac-excel', name: 'Microsoft Excel for Mac', description: 'Monitor Excel spreadsheet operations including CSV/XLSX export on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macPowerPointDlp: { id: 'mac-ppt', name: 'Microsoft PowerPoint for Mac', description: 'Monitor PowerPoint presentation save/export/share on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macOneNoteDlp: { id: 'mac-onenote', name: 'Microsoft OneNote for Mac', description: 'Monitor OneNote notebook export and content sharing on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macOutlookDlp: { id: 'mac-outlook', name: 'Microsoft Outlook for Mac', description: 'Monitor Outlook email compose, attachment and calendar sharing on macOS. Includes new Outlook for Mac', enabled: true, action: 'audit', platforms: ['macos'] },
        macOneDriveDlp: { id: 'mac-onedrive', name: 'OneDrive for Mac', description: 'Monitor OneDrive sync folder file operations and sharing links on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macSharePointDlp: { id: 'mac-sharepoint', name: 'SharePoint Browser Access', description: 'Monitor SharePoint Online file upload/download via browser on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        // --- Instant Messaging Apps for Mac ---
        macWhatsAppDlp: { id: 'mac-whatsapp', name: 'WhatsApp for Mac', description: 'Monitor WhatsApp Desktop native app - message, file transfer, image/video sharing, voice note and document DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macWhatsAppWebDlp: { id: 'mac-whatsapp-web', name: 'WhatsApp Web (Browser)', description: 'Monitor WhatsApp Web accessed via Safari/Chrome - file upload, image paste and message content DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macWeChatDlp: { id: 'mac-wechat', name: 'WeChat for Mac', description: 'Enhanced WeChat macOS monitoring - message content, file transfer, Mini Program data sharing, Moments and clipboard operations', enabled: true, action: 'audit', platforms: ['macos'] },
        macTeamsDlp: { id: 'mac-teams', name: 'Microsoft Teams for Mac', description: 'Monitor Teams chat messages, file sharing, meeting chat, channel posts and screen sharing content on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macTelegramDlp: { id: 'mac-telegram', name: 'Telegram for Mac', description: 'Monitor Telegram Desktop native app - message, file transfer, secret chat and channel content DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macLineDlp: { id: 'mac-line', name: 'LINE for Mac', description: 'Monitor LINE Desktop app - message, file transfer, album sharing and Keep content DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macSignalDlp: { id: 'mac-signal', name: 'Signal for Mac', description: 'Monitor Signal Desktop - message content and file attachment DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macSlackDlp: { id: 'mac-slack', name: 'Slack for Mac', description: 'Enhanced Slack macOS monitoring - channel messages, DM, file upload, snippet and workflow DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macZoomDlp: { id: 'mac-zoom', name: 'Zoom for Mac', description: 'Monitor Zoom chat messages, file transfer in meetings, and recording content on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macDingTalkDlp: { id: 'mac-dingtalk', name: 'DingTalk for Mac', description: 'Monitor DingTalk macOS app - message, file transfer, doc sharing and mini-app DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macLarkDlp: { id: 'mac-lark', name: 'Lark/Feishu for Mac', description: 'Monitor Lark (Feishu) macOS app - message, doc, sheet, file sharing and approval DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        // --- macOS Native Apps ---
        macIMessageDlp: { id: 'mac-imessage', name: 'iMessage / Messages.app', description: 'Monitor macOS native Messages app (iMessage/SMS) - text, attachment, image and Tapback content DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macMailDlp: { id: 'mac-mail', name: 'Apple Mail.app', description: 'Monitor macOS native Mail app - email compose, reply, forward and attachment DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macNotesDlp: { id: 'mac-notes', name: 'Apple Notes.app', description: 'Monitor macOS Notes app - note creation, sharing, export and attachment DLP', enabled: true, action: 'audit', platforms: ['macos'] },
        macFinderDlp: { id: 'mac-finder', name: 'Finder File Operations', description: 'Monitor Finder copy, move, rename, compress, share and Quick Actions for sensitive files on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macPreviewDlp: { id: 'mac-preview', name: 'Preview.app', description: 'Monitor Preview app document/image export, markup, print and share operations on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macTerminalDlp: { id: 'mac-terminal', name: 'Terminal / iTerm2', description: 'Monitor command-line file transfer (scp, rsync, curl, wget, git push) and clipboard operations', enabled: true, action: 'audit', platforms: ['macos'] },
        macSafariDlp: { id: 'mac-safari', name: 'Safari Browser DLP', description: 'Safari-specific file upload, form submission, webmail and cloud storage DLP monitoring', enabled: true, action: 'audit', platforms: ['macos'] },
        // --- Cloud Storage & Productivity ---
        macGoogleDriveDlp: { id: 'mac-gdrive', name: 'Google Drive for Mac', description: 'Monitor Google Drive Desktop sync folder and browser upload/download DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macDropboxDlp: { id: 'mac-dropbox', name: 'Dropbox for Mac', description: 'Monitor Dropbox Desktop sync folder and sharing link generation DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macBoxDlp: { id: 'mac-box', name: 'Box for Mac', description: 'Monitor Box Drive sync and Box web upload/download DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        macNotionDlp: { id: 'mac-notion', name: 'Notion for Mac', description: 'Monitor Notion Desktop page export, database export, file upload and sharing DLP on macOS', enabled: true, action: 'audit', platforms: ['macos'] },
        // --- macOS System Features ---
        macAirDropDlp: { id: 'mac-airdrop-dlp', name: 'AirDrop Content DLP', description: 'Content-aware AirDrop DLP - scan file content before allowing AirDrop send/receive', enabled: true, action: 'block', platforms: ['macos'] },
        macShareSheetDlp: { id: 'mac-sharesheet', name: 'Share Sheet / Extensions', description: 'Monitor macOS Share Sheet and share extensions for data exfiltration across all apps', enabled: true, action: 'audit', platforms: ['macos'] },
        macUniversalClipboard: { id: 'mac-uclip', name: 'Universal Clipboard DLP', description: 'Monitor Handoff Universal Clipboard between Mac/iPhone/iPad for sensitive content', enabled: true, action: 'audit', platforms: ['macos'] },
        macSidecarDlp: { id: 'mac-sidecar', name: 'Sidecar / Continuity DLP', description: 'Monitor data transfer via Sidecar, Continuity Camera and iPhone Mirroring', enabled: true, action: 'audit', platforms: ['macos'] },
        macSpotlightDlp: { id: 'mac-spotlight', name: 'Spotlight Search DLP', description: 'Prevent sensitive file metadata from being indexed and exposed via Spotlight', enabled: false, action: 'audit', platforms: ['macos'] },
        macPrintToPdfDlp: { id: 'mac-print-pdf', name: 'Print-to-PDF DLP', description: 'Monitor macOS Print-to-PDF and Save-as-PDF operations for content exfiltration', enabled: true, action: 'audit', platforms: ['macos'] },
        macScreenRecordDlp: { id: 'mac-screenrec', name: 'Screen Recording DLP', description: 'Detect and control screen recording when sensitive content is displayed on macOS', enabled: true, action: 'block', platforms: ['macos'] }
      }
    },

    // ========== 16. WATERMARK & DOCUMENT PROTECTION ==========
  watermarkProtection: {
    category: 'Watermark & Document Protection',
    description: 'Comprehensive watermarking for documents, screens, prints and web content (Ref: Forcepoint/Symantec/McAfee)',
    features: {
      screenWatermarkAdvanced: { id: 'wm-screen', name: 'Screen Watermark', description: 'Visible/invisible screen overlay watermark with user identity, IP, timestamp. Supports dynamic and static modes', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      documentWatermark: { id: 'wm-document', name: 'Document Watermark', description: 'Auto-inject watermark into Office/PDF documents on open, save, print or share. Supports text, image and QR code watermarks', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      printWatermark: { id: 'wm-print', name: 'Print Watermark', description: 'Force watermark overlay on all printed documents with user identity and timestamp', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      emailWatermark: { id: 'wm-email', name: 'Email Watermark', description: 'Inject watermark into outbound email body and attachments for tracking and leak attribution', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      webWatermark: { id: 'wm-web', name: 'Web Content Watermark', description: 'Overlay invisible watermark on web browser content to trace screenshots and screen captures', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      imageWatermark: { id: 'wm-image', name: 'Image Watermark', description: 'Embed steganographic invisible watermark in image files for forensic tracing', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      clipboardWatermark: { id: 'wm-clipboard', name: 'Clipboard Watermark', description: 'Inject invisible tracking markers into clipboard content during copy operations', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      watermarkPolicy: { id: 'wm-policy', name: 'Watermark Policy Engine', description: 'Centralized watermark policy management - configure text, position, opacity, font, color and dynamic variables per user/group', enabled: true, platforms: ['windows', 'macos'] },
    }
  },

    // ========== 17. SMB/CIFS CHANNEL MONITORING ==========
  smbChannelMonitor: {
    category: 'SMB/CIFS Channel Monitoring',
    description: 'Monitor and control data transfer over SMB/CIFS network file sharing protocols',
    features: {
      smbFileTransfer: { id: 'smb-transfer', name: 'SMB File Transfer Monitor', description: 'Monitor file copy/move/read/write operations over SMB/CIFS shares with content inspection', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      smbShareAccess: { id: 'smb-access', name: 'SMB Share Access Control', description: 'Control and audit access to network SMB shares with allow/block/audit policies', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      smbContentScan: { id: 'smb-content', name: 'SMB Content Inspection', description: 'Deep content inspection of files transferred over SMB - scan for sensitive data patterns, PII, financials', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      smbBlockPolicy: { id: 'smb-block', name: 'SMB Block Policy', description: 'Block sensitive file transfers over SMB based on content, file type, size or destination share', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      smbShareWhitelist: { id: 'smb-whitelist', name: 'SMB Share Whitelist', description: 'Configure trusted SMB share paths that bypass DLP inspection', enabled: true, platforms: ['windows', 'macos'] },
      smbAuditLog: { id: 'smb-audit', name: 'SMB Audit Logging', description: 'Comprehensive logging of all SMB file operations with user, source, destination and content hash', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
    }
  },

    // ========== 18. EMAIL CHANNEL DLP (ADVANCED) ==========
  emailChannelDlp: {
    category: 'Email Channel DLP',
    description: 'Comprehensive email DLP across all channels - SMTP, IMAP, Exchange, O365, Gmail (Ref: Forcepoint Email Security/Symantec Email DLP)',
    features: {
      smtpGateway: { id: 'eml-smtp-gw', name: 'SMTP Gateway DLP', description: 'Inline SMTP gateway inspection - scan outbound email body and attachments before delivery', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      exchangeIntegration: { id: 'eml-exchange', name: 'Exchange Server Integration', description: 'Microsoft Exchange transport rules integration for server-side email DLP', enabled: true, action: 'audit', platforms: ['windows'] },
      o365EmailDlp: { id: 'eml-o365', name: 'Office 365 Email DLP', description: 'Cloud-native O365 email DLP via API integration with Exchange Online', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      gmailDlp: { id: 'eml-gmail', name: 'Gmail DLP', description: 'Gmail content inspection via browser extension and API for outbound email DLP', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      emailEncryption: { id: 'eml-encrypt', name: 'Email Encryption Enforcement', description: 'Force TLS/S-MIME/PGP encryption for emails containing sensitive data', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      emailQuarantine: { id: 'eml-quarantine', name: 'Email Quarantine', description: 'Quarantine policy-violating emails for review before delivery or rejection', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      emailHeaderAnalysis: { id: 'eml-header', name: 'Email Header Analysis', description: 'Analyze email headers for BCC leaks, unauthorized recipients and routing anomalies', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      attachmentSandbox: { id: 'eml-sandbox', name: 'Attachment Sandbox', description: 'Sandbox email attachments to detect sensitive content in macros, embedded objects and encrypted archives', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      dlpStamping: { id: 'eml-stamp', name: 'DLP Email Stamping', description: 'Add X-DLP headers and classification stamps to inspected emails for compliance tracking', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
    }
  },

    // ========== 19. WEB DLP ==========
  webDlp: {
    category: 'Web DLP',
    description: 'Comprehensive Web DLP for HTTP/HTTPS traffic inspection, cloud app control and browser-based data protection (Ref: Zscaler/Netskope/Forcepoint Web Security)',
    features: {
      webUploadDlp: { id: 'web-upload', name: 'Web Upload DLP', description: 'Inspect and block sensitive file uploads via HTTP/HTTPS POST to any website or cloud service', enabled: true, action: 'block', platforms: ['windows', 'macos', 'linux'] },
      webDownloadDlp: { id: 'web-download', name: 'Web Download DLP', description: 'Inspect downloaded files for sensitive content and enforce classification on download', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      webFormDlp: { id: 'web-form', name: 'Web Form DLP', description: 'Scan web form submissions (input fields, text areas) for sensitive data like PII, credit cards, SSN', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      webPasteDlp: { id: 'web-paste', name: 'Web Paste DLP', description: 'Detect and block paste of sensitive content into web browsers, GenAI tools and webmail', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      cloudAppDlp: { id: 'web-cloudapp', name: 'Cloud App DLP (CASB)', description: 'Inline CASB - inspect data uploaded to sanctioned/unsanctioned cloud apps (Box, Dropbox, Google Drive, OneDrive, iCloud)', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      webmailDlp: { id: 'web-webmail', name: 'Webmail DLP', description: 'Content inspection for browser-based email services (Gmail, Outlook.com, Yahoo Mail, ProtonMail)', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      socialMediaDlp: { id: 'web-social', name: 'Social Media DLP', description: 'Monitor and block sensitive data posted to social media (LinkedIn, Twitter/X, Facebook, Instagram)', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      genAiDlp: { id: 'web-genai', name: 'GenAI Web DLP', description: 'Block sensitive data submission to AI services (ChatGPT, Claude, Gemini, Copilot, Midjourney) via browser', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      sslDecryption: { id: 'web-ssl', name: 'SSL/TLS Decryption Engine', description: 'Man-in-the-middle SSL decryption for HTTPS traffic inspection with certificate pinning bypass', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      httpMethodControl: { id: 'web-method', name: 'HTTP Method Control', description: 'Control HTTP methods (POST, PUT, PATCH, DELETE) to prevent data exfiltration via API calls', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
    }
  },

    // ========== 20. WEB URL FILTERING ==========
  webUrlFiltering: {
    category: 'Web URL Filtering',
    description: 'URL categorization, filtering and access control for web browsing (Ref: Zscaler URL Filtering/Netskope/Palo Alto URL Filtering/Forcepoint Web Security)',
    features: {
      urlCategorization: { id: 'url-category', name: 'URL Categorization Engine', description: 'Real-time URL categorization with 80+ categories (malware, phishing, gambling, adult, social media, cloud storage, AI services)', enabled: true, action: 'audit', platforms: ['windows', 'macos', 'linux'] },
      urlBlockPolicy: { id: 'url-block', name: 'URL Block Policy', description: 'Block access to URLs by category, custom lists or reputation score', enabled: true, action: 'block', platforms: ['windows', 'macos', 'linux'] },
      urlAllowList: { id: 'url-allow', name: 'URL Allow List', description: 'Whitelist trusted URLs and domains that bypass URL filtering', enabled: true, platforms: ['windows', 'macos', 'linux'] },
      urlDenyList: { id: 'url-deny', name: 'URL Deny List', description: 'Custom blacklist of blocked URLs, domains and IP addresses', enabled: true, action: 'block', platforms: ['windows', 'macos', 'linux'] },
      urlTimeBased: { id: 'url-time', name: 'Time-Based URL Filtering', description: 'Apply different URL policies based on time of day, work hours or calendar schedule', enabled: true, platforms: ['windows', 'macos'] },
      urlUserGroupPolicy: { id: 'url-group', name: 'User/Group URL Policy', description: 'Apply URL filtering policies per user, AD group or organizational unit', enabled: true, platforms: ['windows', 'macos'] },
      urlSafeSearch: { id: 'url-safesearch', name: 'Safe Search Enforcement', description: 'Enforce safe search on Google, Bing, YouTube and other search engines', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      urlCloudAppVisibility: { id: 'url-cloudvis', name: 'Cloud App Visibility', description: 'Discover and categorize all cloud applications accessed by users with risk scoring', enabled: true, action: 'audit', platforms: ['windows', 'macos'] },
      urlSslBypass: { id: 'url-sslbypass', name: 'URL SSL Bypass List', description: 'Bypass SSL decryption for specific domains (banking, healthcare) for privacy compliance', enabled: true, platforms: ['windows', 'macos'] },
      urlThreatProtection: { id: 'url-threat', name: 'URL Threat Protection', description: 'Block known malicious URLs, phishing sites and command-and-control domains in real-time', enabled: true, action: 'block', platforms: ['windows', 'macos', 'linux'] },
      urlBandwidthControl: { id: 'url-bandwidth', name: 'URL Bandwidth Control', description: 'Throttle or block high-bandwidth URL categories (streaming, file hosting) during work hours', enabled: true, action: 'block', platforms: ['windows', 'macos'] },
      urlAuditReport: { id: 'url-report', name: 'URL Audit & Reporting', description: 'Comprehensive URL access logging with user attribution, category breakdown and compliance reports', enabled: true, action: 'audit', platforms: ['windows', 'macos', 'linux'] },
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
    const body = await request.json(); if (body.detectionMode) { const vm = ['traditional','ai','hybrid']; if (vm.includes(body.detectionMode)) { (AGENT_CONFIG as any).globalDetectionMode = body.detectionMode; AGENT_CONFIG.lastUpdated = new Date().toISOString(); return NextResponse.json({ success: true, detectionMode: body.detectionMode }); } return NextResponse.json({ success: false, error: 'Invalid' }, { status: 400 }); }
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
