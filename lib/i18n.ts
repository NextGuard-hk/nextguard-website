export type Locale = "en" | "zh-TW" | "zh-CN"

export const translations = {
  "en": {
    nav: {
      products: "Products",
            aboutUs: "About Us",
      solutions: "New Features",
            becomePartner: "Become Partner",
      news: "News",
      contact: "Contact Us",
            kb: "Knowledge Base",
    },
    home: {
      badge: "Goodbye · Rebuild · Expand",
      headline: "Rethinking Data Security for the Global AI Era",
      subheadline: "Nextguard is the independent vendor globally (outside China) with complete technology authorization, source code, and development rights from Skyguard. We are building AI-driven, international data security.",
      cta: "Contact Us",
      ctaSecondary: "Explore Solutions",
      whyRebuildTitle: "Why Does Going Global Require 'Rebuilding'?",
      whyRebuildSubtitle: "Going global isn't copy-paste—it's abandoning single-market thinking and rebuilding products and brands that meet global standards.",
      whyRebuildCases: [
        { local: "Meituan", global: "Keeta", description: "Meituan in China, Keeta in Hong Kong—the same technology, but different brands, compliance, and localization strategies." },
        { local: "Douyin", global: "TikTok", description: "Douyin in China, TikTok overseas—the same underlying engine, but content, regulation, and operations are completely reconstructed." },
        { local: "Pinduoduo", global: "Temu", description: "Pinduoduo in China, Temu overseas—the product logic remains unchanged, but supply chain, payment, and trust systems are fully adapted to international markets." },
      ],
      heroGetStarted: "Get Started",
      heroViewSolutions: "View Solutions",
      heroStat1Label: "Real-time Detection",
      heroStat2Label: "Data Secured",
      heroStat3Label: "Global Coverage",
      featuredTitle: "Rethinking Data Security",
      featuredDesc: "From passive blocking to proactive intelligence—this is DLP rebuilt for the AI era. Nextguard provides autonomous protection that adapts to modern threats in milliseconds.",
      featuredFeature1: "AI-Powered Threat Intelligence",
      featuredFeature2: "Easy-Config Deployment",
      featuredFeature3: "Global Compliance Ready",
      statsTitle: "Nextguard at a Glance",
      stats: [
        { value: "20+", label: "Years of Data Security Experience" },
        { value: "4", label: "Co-Founders" },
        { value: "2", label: "PhD Degrees" },
        { value: "85+", label: "Combined Years of Expertise" },
      ],
      pillarsTitle: "Why We Founded Nextguard",
      pillars: [
        { number: "01", title: "Expand", description: "Help Chinese DLP technology confidently go global, meeting international standards and compliance requirements." },
        { number: "02", title: "Build AI-Driven International Data Security", description: "Move beyond traditional rules toward intelligent, adaptive, cloud-native data protection." },
        { number: "03", title: "Establish a Safer, More Reliable, Compliant Environment", description: "Deliver DLP that works in real business processes, protecting data without sacrificing productivity." },
        { number: "04", title: "Fusion of Domestic and International Technology", description: "Combine mature engineering excellence with global innovation best practices to build products that work in any market." },
      ],
      pillarsFooter: "Nextguard was born to help enterprises move beyond outdated DLP and rebuild data security for a borderless, AI-driven future.",
      ctaSection: {
        title: "Let's Rebuild Data Security Together",
        description: "We look forward to partnering with you to create a new landscape of data security for the AI era.",
        button: "Contact Sales",
      },
    },
    products: {
      badge: "Products",
      headline: "Comprehensive Data Security Suite",
      subheadline: "Nextguard provides a complete portfolio of data-centric security products, powered by Skyguard technology and enhanced with Nextguard AI.",
      learnMore: "Learn More",
      suites: [
        { tag: "DLP Suite", name: "Data Loss Prevention" },
        { tag: "Gateway Suite", name: "Network & Email Security" },
        { tag: "Terminal Suite", name: "Endpoint & Mobile" },
        { tag: "Cloud Suite", name: "CASB & SASE" },
      ],
      items: [
        {
          id: "mdlp",
          tag: "Core DLP",
          title: "Multi-level Data Loss Prevention",
          abbr: "MDLP",
          description: "Enterprise-grade data protection across network, endpoint, and discovery. Unified policy management for complex environments.",
          features: ["Content Discovery", "OCR Integration", "Fingerprinting", "Deep Content Inspection"]
        },
        {
          id: "ucss",
          tag: "Security Center",
          title: "Unified Content Security Server",
          abbr: "UCSS",
          description: "The central brain of the Nextguard ecosystem. Unified management, reporting, and policy orchestration for all security nodes.",
          features: ["Centralized Management", "Visual Reporting", "API Integration", "RBAC Access Control"]
        },
        {
          id: "aseg",
          tag: "Email Security",
          title: "Advanced Security Email Gateway",
          abbr: "ASEG",
          description: "Protect your most critical communication channel. Stop phishing, malware, and sensitive data leakage via email.",
          features: ["Anti-Phishing", "Email Encryption", "Spam Filtering", "DLP for Attachments"]
        },
        {
          id: "aswg",
          tag: "Web Security",
          title: "Advanced Security Web Gateway",
          abbr: "ASWG",
          description: "Secure web access for the modern workforce. Filter malicious sites and prevent data exfiltration to unauthorized web apps.",
          features: ["URL Filtering", "SSL Inspection", "Application Control", "Shadow IT Discovery"]
        },
        {
          id: "mag",
          tag: "Mobile",
          title: "Mobile Application Gateway",
          abbr: "MAG",
          description: "Secure data on mobile devices. Ensure company information stays safe on iOS and Android without compromising user privacy.",
          features: ["App Containerization", "Remote Wipe", "Per-app VPN", "Secure Viewing"]
        },
        {
          id: "ucwi",
          tag: "Endpoint",
          title: "Unified Content Web Inspector",
          abbr: "UCWI",
          description: "Endpoint-level web and application control. Direct visibility into how data is used on the workstation.",
          features: ["Agent-based Control", "Offline Protection", "Application Visibility", "Local Auditing"]
        },
        {
          id: "dss",
          tag: "Discovery",
          title: "Data Security Scanner",
          abbr: "DSS",
          description: "Find your sensitive data wherever it hides. Scan databases, file shares, and cloud storage for unprotected PII.",
          features: ["Database Scanning", "Cloud Storage Audit", "Classification Tagging", "Compliance Reporting"]
        },
        {
          id: "xdr",
          tag: "Intelligence",
          title: "Extended Detection & Response",
          abbr: "XDR",
          description: "Correlate data security events with endpoint and network logs for a complete picture of threats.",
          features: ["Cross-layer Analytics", "Threat Hunting", "Auto-Remediation", "Timeline Mapping"]
        },
        {
          id: "dct",
          tag: "Governance",
          title: "Data Classification Tool",
          abbr: "DCT",
          description: "The foundation of data security. Empower users and AI to tag data based on sensitivity and business value.",
          features: ["User-driven Tagging", "Automated AI Tagging", "MIP Integration", "Visual Labels"]
        },
        {
          id: "casb",
          tag: "Cloud",
          title: "Cloud Access Security Broker",
          abbr: "CASB",
          description: "Extend your DLP policies to SaaS applications like M365, Salesforce, and Box.",
          features: ["SaaS Visibility", "API-based DLP", "Account Takeover Detection", "Access Control"]
        },
        {
          id: "itm",
          tag: "Inside Threat",
          title: "Insider Threat Management",
          abbr: "ITM",
          description: "Identify high-risk behavior before data leaves the building. Focus on the 'who' as much as the 'what'.",
          features: ["UEBA", "Video Recording", "Risk Scoring", "Forensic Collection"]
        },
        {
          id: "sase",
          tag: "Modern Network",
          title: "Secure Access Service Edge",
          abbr: "SASE",
          description: "Converge networking and security in the cloud. Consistent protection for remote offices and roaming users.",
          features: ["Zero Trust Access", "Cloud-delivered FW", "Global Network", "SD-WAN Integration"]
        }
      ],
      addonsTag: "Coming in 2026",
      addonsTitle: "Nextguard AI & MIP Add-ons",
      addonsSubtitle: "Upgrade your existing deployment with our proprietary AI engine and deep Microsoft ecosystem integration.",
      addons: [
        {
          title: "AI-Powered Anomaly Detection",
          description: "Go beyond regex. Our AI identifies patterns of data misuse that traditional rules miss, significantly reducing false positives."
        },
        {
          title: "Intelligent Data Classification",
          description: "Leverage Large Language Models to automatically classify and protect documents with 99% accuracy."
        },
        {
          title: "Deep Microsoft MIP Integration",
          description: "Seamless synchronization between on-premise DLP and Microsoft Purview/MIP labels for unified data governance."
        }
      ],
      ctaTitle: "Ready to Secure Your Data?",
      ctaSubtitle: "Contact our team for a customized demo and technical consultation.",
      ctaButton: "Schedule a Demo"
    },
    company: {
      badge: "Who is Nextguard?",
      headline: "The Independent DLP Vendor with Complete Technical Sovereignty",
      subheadline: "The independent vendor globally (outside China) with complete technology authorization, source code, and development rights from Skyguard.",
      keyPoints: [
        { title: "Permanent Complete Source Code Ownership", description: "We own all core technology and development rights." },
        { title: "Complete Technical Autonomy", description: "Product R&D, upgrades, and maintenance are independent of any third party." },
        { title: "Sustainable Operations", description: "Nextguard can independently provide comprehensive services to customers." },
      ],
      teamTitle: "Our Core Team",
      teamSubtitle: "Our core R&D team comprises former Skyguard R&D members, ensuring technology continuity and innovation capability.",
      teamTagline: "Independent · Autonomous · Global-Focused · Not Constrained by Any Original Vendor",
      leaders: [
        { name: "Peter Zeng", role: "Co-Founder", bio: "Former Skyguard Co-Founder, 20+ years experience" },
        { name: "Harvey Huang", role: "Co-Founder", bio: "Former Skyguard Regional Technical Director, 20+ years Network and Data Security experience" },
        { name: "James Yang", role: "Co-Founder", bio: "Former Skyguard Co-Founder, 25+ years architecture experience" },
        { name: "Roscoe Cheung", role: "Co-Founder", bio: "Former Skyguard HK & Macau Technical Director, 25+ years project leadership experience" },
      ],
      advisorTitle: "Chief Advisor, AI & Intelligent Cybersecurity",
      advisor: {
        name: "Dr. Felix Lor",
        credentials: [
          "Dual PhDs: Artificial Intelligence & Interactive Systems (Imperial College London); Computational Neuroscience (Ruhr University Bochum)",
          "Led multiple fintech and data-intensive AI projects",
        ],
      },
      independenceTitle: "Nextguard ≠ Skyguard",
      independenceSubtitle: "We are completely independent and autonomous!",
      independencePoints: [
        { question: "What if the original vendor has problems?", answer: "Nextguard has complete source code and development rights, enabling sustainable maintenance, updates, and development." },
        { question: "Who do we depend on for technical support?", answer: "Nextguard has the former Skyguard core R&D team, fully controlling all underlying technology, independent of the original vendor." },
        { question: "Who do we decide the product roadmap?", answer: "Nextguard and partners and customers jointly determine it, aligned with global market needs." },
      ],
      independenceFooter: "Complete technical autonomy. Full team control. Sustainable operations commitment. Nextguard is not a subsidiary of Skyguard, but an independent brand with complete technical sovereignty.",
    },
    solutions: {
      badge: "2026 Roadmap",
      headline: "New Capabilities: AI-Driven Data Security in 2026",
      subheadline: "From passive blocking to proactive intelligence—this is DLP rebuilt for the AI era.",
      products: [
        {
          title: "AI DLP – Intelligent Data Leak Prevention",
          description: "Detect anomalous user behavior and suspicious transfers. Pre-built policies block sensitive data uploads to ChatGPT, Gemini, and cloud collaboration platforms.",
          features: ["Anomalous behavior detection", "Sensitive data upload blocking", "Pre-built AI platform policies", "Real-time transfer monitoring"],
        },
        {
          title: "AI Data Classification – Intelligent Classification",
          description: "Automatically discover and tag static/dynamic sensitive data. Reduce weeks of manual configuration to hours of AI-assisted setup.",
          features: ["Automatic data discovery", "Static/dynamic data tagging", "AI-assisted configuration", "Hours instead of weeks"],
        },
        {
          title: "Deep Integration with Microsoft MIP",
          description: "Support Microsoft Purview, Copilot, and Azure Information Protection. Achieve unified policies between on-premises DLP and cloud ecosystem.",
          features: ["Microsoft Purview support", "Copilot integration", "Azure Information Protection", "Unified on-prem & cloud policies"],
        },
      ],
      whyChooseTitle: "Why Choose Nextguard?",
      whyChoose: [
        { title: "Official Authorization & Proven Product Line", description: "Complete technology authorization and permanent source code development rights for Skyguard DLP platform. Product consistently selected in Gartner reports." },
        { title: "Deep Professional DLP Team", description: "Team has designed and deployed DLP for Fortune 500 banks, governments, insurance companies, and multinational enterprises. We focus exclusively on data security." },
        { title: "AI-First Roadmap, PhD-Level Guidance", description: "Dr. Felix Lor leads the team in integrating AI-driven classification and anomaly detection into the product. Redesigning DLP from the ground up." },
        { title: "Flexible Deployment", description: "Supports on-premises, private cloud, or hybrid architecture, designed for multi-site, multi-country, and data residency-sensitive environments." },
      ],
    },
    partners: {
      badge: "Partners",
      headline: "Why is Nextguard Your Ideal Partner?",
      subheadline: "Let's rebuild data security together.",
      commitments: [
        { title: "Never Bypass You", description: "We commit 100% to channel-first approach and never compete with partners." },
        { title: "Focus on Data Security", description: "We do one thing and do it exceptionally well: DLP and data security." },
        { title: "Exclusive Skyguard Support Capability", description: "The vendor globally capable of providing maintenance, upgrades, and migration for existing Skyguard customers." },
        { title: "Partner Enablement", description: "Full enablement programs, training, and go-to-market support for all our channel partners." },
        { title: "Seamless Migration", description: "Proven migration path from legacy Skyguard deployments to Nextguard-managed environments with zero downtime." },
      ],
      ctaTitle: "Become a Partner",
      ctaDescription: "Join our partner program and help enterprises rebuild data security for the AI era.",
      ctaButton: "Apply Now",
    },
    news: {
      badge: "News & Insights",
      headline: "Latest Updates",
      subheadline: "Stay informed with the latest from Nextguard’s product innovations, industry insights, and company news.",
      articles: [
        { date: "2026", category: "Roadmap", title: "2026 AI-Driven Data Security Roadmap Announced", excerpt: "Nextguard unveils its 2026 roadmap featuring AI DLP, intelligent data classification, and deep Microsoft MIP integration." },
        { date: "2026", category: "Product", title: "AI DLP: Intelligent Data Leak Prevention Launches", excerpt: "Detect anomalous user behavior and suspicious transfers. Pre-built policies block sensitive data uploads to ChatGPT, Gemini, and cloud collaboration platforms." },
        { date: "2026", category: "Product", title: "AI Data Classification Now Available", excerpt: "Automatically discover and tag sensitive data. Reduce weeks of manual configuration to hours with AI-assisted setup." },
        { date: "2026", category: "Integration", title: "Deep Integration with Microsoft MIP", excerpt: "Full support for Microsoft Purview, Copilot, and Azure Information Protection with unified on-premises and cloud policies." },
        { date: "2026", category: "Company", title: "Nextguard: Independent Vendor with Full Technical Sovereignty", excerpt: "Nextguard secures permanent complete source code ownership and development rights, ensuring complete technical autonomy." },
        { date: "2026", category: "Partnership", title: "Channel-First Partner Program Launched", excerpt: "Nextguard commits to 100% channel-first approach, never bypassing partners, with exclusive Skyguard support capabilities." },
      ],
    },
    contact: {
      badge: "Contact",
      headline: "Get in Touch",
      subheadline: "We look forward to partnering with you to create a new landscape of data security for the AI era. Feel free to reach out anytime.",
      form: {
        name: "Full Name",
        email: "Email Address",
        company: "Company Name",
        message: "Message",
        submit: "Send Message",
        namePlaceholder: "Your full name",
        emailPlaceholder: "you@company.com",
        companyPlaceholder: "Your company name",
        messagePlaceholder: "Tell us about your data security needs...",
        successTitle: "Message Sent!",
        successMessage: "Thank you for reaching out. We'll get back to you within 24 hours.",
        sendAnother: "Send another message",
      },
      info: {
        title: "Contact Information",
        email: "sales@next-guard.com",
        website: "www.next-guard.com",
      },
      officesTitle: "Our Offices",
    },
    footer: {
      description: "Rethinking Data Security for the Global AI Era. Independent · Autonomous · Global-Focused.",
      quickLinks: "Quick Links",
      resources: "Resources",
      documentation: "Documentation",
      apiReference: "API Reference",
      statusPage: "Status Page",
      releaseNotes: "Release Notes",
      legal: "Legal",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      security: "Security",
      compliance: "Compliance",
      copyright: "Nextguard Technology Limited. All rights reserved.",
    },
  },
  "zh-TW": {
    nav: {
      products: "產品中心",
      aboutUs: "關於我們",
      solutions: "最新功能",
            becomePartner: "成為合作伙伴",
      news: "最新消息",
      contact: "聯絡我們",
            kb: "知識庫",
    },
    home: {
      badge: "告別 · 重建 · 出海",
      headline: "為 AI 時代重建全球化數據安全",
      subheadline: "Nextguard 是全球（中國以外）獲得 Skyguard 完整技術授權、源代碼及開發權的獨立廠商。我們正在打造 AI 驅動的國際化數據安全。",
      cta: "聯絡我們",
      ctaSecondary: "探索解決方案",
      heroGetStarted: "立即開始",
      heroViewSolutions: "查看解決方案",
      heroStat1Label: "即時偵測",
      heroStat2Label: "數據安全",
      heroStat3Label: "全球覆蓋",
      featuredTitle: "重思數據安全",
      featuredDesc: "從被動阻擋到主動智能—這是為 AI 時代重建的 DLP。Nextguard 提供自主保護，在毫秒內適應現代威脅。",
      featuredFeature1: "AI 驅動的威脅情報",
      featuredFeature2: "Easy-Config 即可部署",
      featuredFeature3: "全球合規就緒",
      whyRebuildTitle: "為什麼出海需要「重建」？",
      whyRebuildSubtitle: "出海不是複製貼上，而是告別單一市場思維，重建符合全球標準的產品與品牌。",
      whyRebuildCases: [
        { local: "美團", global: "Keeta", description: "在中國是美團，在香港是 Keeta——同樣的技術，不同的品牌、合規與在地化策略。" },
        { local: "抖音", global: "TikTok", description: "在中國是抖音，在海外是 TikTok——同一個底層引擎，但內容、監管、運營完全重構。" },
        { local: "拼多多", global: "Temu", description: "在中國是拼多多，在海外是 Temu——產品邏輯不變，但供應鏈、支付、信任體系全面適配國際市場。" },
      ],
      statsTitle: "Nextguard 一覽",
      stats: [
        { value: "20+", label: "年數據安全經驗" },
        { value: "4", label: "位創辦人" },
        { value: "2", label: "博士學位" },
        { value: "85+", label: "累計專業經驗年數" },
      ],
      pillarsTitle: "為什麼創立 Nextguard？",
      pillars: [
        { number: "01", title: "出海 Expand", description: "幫助中國的 DLP 技術自信地走向全球，滿足國際標準與合規要求。" },
        { number: "02", title: "打造 AI 驅動的國際化數據安全", description: "告別傳統規則，邁向智能、自適應、雲原生的數據保護。" },
        { number: "03", title: "建立更安全、更可靠、更合規的環境", description: "提供在真實業務流程中運作的 DLP，保護數據同時不犧牲生產力。" },
        { number: "04", title: "中外技術融合", description: "結合成熟工程實力與全球創新最佳實踐，打造在任何市場都能運作的產品。" },
      ],
      pillarsFooter: "Nextguard 的誕生，是為了幫助企業告別過時的 DLP，為無國界、AI 驅動的未來重建數據安全。",
      ctaSection: {
        title: "讓我們一起重建數據安全",
        description: "期待與您攜手，共創 AI 時代的數據安全新格局。",
        button: "聯絡銷售團隊",
      },
    },
    products: {
      badge: "產品中心",
      headline: "全方位數據安全套件",
      subheadline: "Nextguard 提供完整的數據安全產品組合，由 Skyguard 技術提供動力，並通過 Nextguard AI 進行增強。",
      learnMore: "了解更多",
      suites: [
        { tag: "DLP 套件", name: "數據防洩露" },
        { tag: "網關套件", name: "網絡與郵件安全" },
        { tag: "終端套件", name: "終端與移動端" },
        { tag: "雲端套件", name: "CASB 與 SASE" },
      ],
      items: [
        {
          id: "mdlp",
          tag: "核心 DLP",
          title: "多層次數據防洩露",
          abbr: "MDLP",
          description: "企業級數據保護，覆蓋網絡、終端和發現。為複雜環境提供統一的策略管理。",
          features: ["內容發現", "OCR 整合", "指紋識別", "深度內容檢查"]
        },
        {
          id: "ucss",
          tag: "安全中心",
          title: "統一內容安全服務器",
          abbr: "UCSS",
          description: "Nextguard 生態系統的中樞。為所有安全節點提供統一管理、報告和策略編排。",
          features: ["集中化管理", "可視化報告", "API 整合", "RBAC 權限控制"]
        },
        {
          id: "aseg",
          tag: "郵件安全",
          title: "高級郵件安全網關",
          abbr: "ASEG",
          description: "保護您最關鍵的溝通渠道。阻止網絡釣魚、惡意軟件和通過郵件發生的敏感數據洩漏。",
          features: ["防釣魚", "郵件加密", "垃圾郵件過濾", "附件 DLP 檢查"]
        },
        {
          id: "aswg",
          tag: "網絡安全",
          title: "高級網絡安全網關",
          abbr: "ASWG",
          description: "為現代員工提供安全的網絡訪問。過濾惡意網站並防止數據外流到未經授權的 Web 應用。",
          features: ["URL 過濾", "SSL 檢查", "應用控制", "影子 IT 發現"]
        },
        {
          id: "mag",
          tag: "移動端",
          title: "移動應用網關",
          abbr: "MAG",
          description: "保護移動設備上的數據。確保公司信息在 iOS 和 Android 上保持安全，且不影響用戶隱私。",
          features: ["應用沙箱化", "遠程擦除", "應用級 VPN", "安全查看"]
        },
        {
          id: "ucwi",
          tag: "終端",
          title: "統一內容 Web 檢查器",
          abbr: "UCWI",
          description: "終端級別的 Web 和應用控制。直接觀察工作站上的數據使用情況。",
          features: ["客戶端控制", "離線保護", "應用可見性", "本地審計"]
        },
        {
          id: "dss",
          tag: "發現",
          title: "數據安全掃描器",
          abbr: "DSS",
          description: "尋找隱藏在各處的敏感數據。掃描數據庫、文件共享和雲存儲中的未受保護的個人身份信息 (PII)。",
          features: ["數據庫掃描", "雲存儲審計", "分類標記", "合規性報告"]
        },
        {
          id: "xdr",
          tag: "情報",
          title: "擴展檢測與響應",
          abbr: "XDR",
          description: "將數據安全事件與終端和網絡日誌相關聯，提供完整的威脅圖譜。",
          features: ["跨層分析", "威脅獵捕", "自動化處置", "時間線映射"]
        },
        {
          id: "dct",
          tag: "治理",
          title: "數據分類工具",
          abbr: "DCT",
          description: "數據安全的基石。賦能用戶和 AI 根據敏感度和業務價值標記數據。",
          features: ["用戶驅動標記", "AI 自動標記", "MIP 整合", "可視化標籤"]
        },
        {
          id: "casb",
          tag: "雲端",
          title: "雲訪問安全代理",
          abbr: "CASB",
          description: "將您的 DLP 策略擴展到 M365、Salesforce 和 Box 等 SaaS 應用。",
          features: ["SaaS 可見性", "基於 API 的 DLP", "賬戶盜用檢測", "訪問控制"]
        },
        {
          id: "itm",
          tag: "內部威脅",
          title: "內部威脅管理",
          abbr: "ITM",
          description: "在數據離開公司前識別高風險行為。既關注數據，也關注行為人。",
          features: ["UEBA 行為分析", "屏幕錄像", "風險評分", "取證收集"]
        },
        {
          id: "sase",
          tag: "現代網絡",
          title: "安全訪問服務邊緣",
          abbr: "SASE",
          description: "在雲端融合網絡與安全。為分支機構和漫遊用戶提供一致的保護。",
          features: ["零信任訪問", "雲端防火牆", "全球網絡", "SD-WAN 整合"]
        }
      ],
      addonsTag: "2026 年推出",
      addonsTitle: "Nextguard AI 與 MIP 增強組件",
      addonsSubtitle: "使用我們專有的 AI 引擎和深度的微軟生態系統整合，升級您的現有部署。",
      addons: [
        {
          title: "AI 驅動的異常行為偵測",
          description: "超越正則表達式。我們的 AI 能識別傳統規則遺漏的數據濫用模式，顯著降低誤報率。"
        },
        {
          title: "智能數據分類分級",
          description: "利用大語言模型自動對文檔進行分類和保護，準確率高達 99%。"
        },
        {
          title: "深度 Microsoft MIP 整合",
          description: "在本地 DLP 和 Microsoft Purview/MIP 標籤之間實現無縫同步，實現統一的數據治理。"
        }
      ],
      ctaTitle: "準備好保護您的數據了嗎？",
      ctaSubtitle: "聯絡我們的團隊，獲取量身定制的演示和技術諮詢。",
      ctaButton: "預約演示"
    },
    company: {
      badge: "Who is Nextguard?",
      headline: "擁有完整技術主權的獨立 DLP 廠商",
      subheadline: "全球（中國以外）獲得 Skyguard 完整技術授權、源代碼及開發權的獨立廠商。",
      keyPoints: [
        { title: "永久完整源代碼所有權", description: "我們擁有全部核心技術與開發權。" },
        { title: "完全技術自主", description: "產品研發、升級、維護不依賴任何第三方。" },
        { title: "永續運營能力", description: "Nextguard可以獨立持續為客戶提供完整服務。" },
      ],
      teamTitle: "我們的核心團隊",
      teamSubtitle: "我們的核心研發團隊由前 Skyguard R&D 成員組成，確保技術延續性與創新能力。",
      teamTagline: "獨立．自主．面向全球．不受制於任何原廠",
      leaders: [
        { name: "Peter Zeng", role: "聯合創辦人", bio: "前 Skyguard 聯合創辦人，20+ 年經驗" },
        { name: "Harvey Huang", role: "聯合創辦人", bio: "前 Skyguard 產品及技術總監，20+ 年網絡安全及 DLP 架構設計經驗" },
        { name: "James Yang", role: "聯合創辦人", bio: "前 Skyguard 聯合創辦人，25+ 年網絡安全及 DLP 架構設計經驗" },
        { name: "Roscoe Cheung", role: "聯合創辦人", bio: "前 Skyguard 港澳技術總監，25+ 年項目領導經驗" },
      ],
      advisorTitle: "AI 與智能網絡安全首席顧問",
      advisor: {
        name: "Dr. Felix Lor",
        credentials: [
          "雙博士學位：人工智慧與互動系統 (Imperial College London)；計算神經科學 (Ruhr University Bochum)",
          "主導多個金融科技與數據密集型 AI 項目",
        ],
      },
      independenceTitle: "Nextguard ≠ Skyguard",
      independenceSubtitle: "我們是完全獨立、自主的！",
      independencePoints: [
        { question: "原廠有問題怎麼辦？", answer: "Nextguard 完整源代碼及開發權，可永續維護、更新及開發。" },
        { question: "技術支持依賴誰？", answer: "Nextguard 擁有前 Skyguard核心研發團隊，掌握全部底層技術，不依賴原廠。" },
        { question: "產品路線圖由誰決定？", answer: "由 Nextguard 與合作伙伴及客戶共同制定，貼近全球市場需求。" },
      ],
      independenceFooter: "技術完全自主。團隊完整掌控。永續運營承諾。Nextguard 不是 Skyguard 的附屬品，而是擁有完整技術主權的獨立品牌。",
    },
    solutions: {
      badge: "2026 路線圖",
      headline: "全新能力：2026 年 AI 驅動的數據安全",
      subheadline: "从被动阻挡到主动智能——这是为 AI 时代重建的 DLP。",
      products: [
        {
          title: "AI DLP – 智能數據防洩",
          description: "偵測異常用戶行為與可疑傳輸。預建策略阻止敏感數據上傳至 ChatGPT、Gemini 等等與雲端協作平台。",
          features: ["異常行為偵測", "敏感數據上傳阻止", "預建 AI 平台策略", "即時傳輸監控"],
        },
        {
          title: "AI Data Classification – 智能分類",
          description: "自動發現與標記靜態/動態敏感數據。將數週的手動設定縮減為數小時的 AI 輔助設定。",
          features: ["自動數據發現", "靜態/動態數據標記", "AI 輔助設定", "數小時代替數週"],
        },
        {
          title: "與 Microsoft MIP 深度整合",
          description: "支持 Microsoft Purview、Copilot 與 Azure Information Protection。在本地 DLP 和云端生态系统间实现统一策略。",
          features: ["Microsoft Purview 支持", "Copilot 整合", "Azure Information Protection", "統一本地與雲端策略"],
        },
      ],
      whyChooseTitle: "為什麼選擇 Nextguard？",
      whyChoose: [
        { title: "官方授權與經驗驗證的產品線", description: "擁有 Skyguard DLP 平台完整技術授權與永久源代碼開發權。產品連續入選 Gartner 報告。" },
        { title: "深度專業的 DLP 團隊", description: "團隊曾為世界500強的銀行、政府、保險與跨國企業設計與部署 DLP。而且我們只專注數據安全。" },
        { title: "AI 優先路線圖，博士級指導", description: "Dr. Felix Lor 帶領團隊將 AI 驅動的分類與異常檢測整合進產品。從底層重新設計 DLP。" },
        { title: "靈活部署", description: "支持本地、私有雲或混合架構，專為多站點、多國家與數據駐留敏感環境設計。" },
      ],
    },
    partners: {
      badge: "合作伙伴",
      headline: "為什麼 Nextguard 是您理想的合作伙伴？",
      subheadline: "讓我們一起重建數據安全。",
      commitments: [
        { title: "絕不繞過您", description: "我們 100% 承諾渠道優先，不與合作伙伴競爭。" },
        { title: "專注數據安全", description: "我們只做一件事並做到極致：DLP 與數據安全。" },
        { title: "獨有 Skyguard 支持能力", description: "全球能為現有 Skyguard 客戶提供維保、升級與遷移的廠商。" },
        { title: "合作伙伴賦能", description: "完整的賦能計劃、培訓和市場推廣支持。" },
        { title: "無縫遷移", description: "經驗驗證的從舊版 Skyguard 部署遷移到 Nextguard 管理環境的路徑，零停機時間。" },
      ],
      ctaTitle: "成為合作伙伴",
      ctaDescription: "加入我們的夥伴計劃，幫助企業為 AI 時代重建數據安全。",
      ctaButton: "立即申請",
    },
    news: {
      badge: "最新消息",
      headline: "最新動態",
      subheadline: "掌握 Nextguard 的產品創新、產業洞察和公司新聞。",
      articles: [
        { date: "2026", category: "路線圖", title: "2026 AI 驅動數據安全路線圖發佈", excerpt: "Nextguard 揭曉 2026 路線圖，包含 AI DLP、智能數據分類和深度 Microsoft MIP 整合。" },
        { date: "2026", category: "產品", title: "AI DLP：智能數據防洩正式推出", excerpt: "偵測異常用戶行為與可疑傳輸。預建策略阻止敏感數據上傳至 ChatGPT、Gemini 等雲端協作平台。" },
        { date: "2026", category: "產品", title: "AI 數據分類功能現已推出", excerpt: "自動發現與標記敏感數據。將數週的手動設定縮減為數小時的 AI 輔助設定。" },
        { date: "2026", category: "整合", title: "與 Microsoft MIP 深度整合", excerpt: "完全支持 Microsoft Purview、Copilot 與 Azure Information Protection，实现本地与云端统一策略。" },
        { date: "2026", category: "公司", title: "Nextguard：擁有完整技術主權的獨立廠商", excerpt: "Nextguard 獲得永久完整源代碼所有權和開發權，確保完全技術自主。" },
        { date: "2026", category: "合作", title: "渠道優先合作伙伴計劃啟動", excerpt: "Nextguard 承諾 100% 渠道優先，絕不繞過合作伙伴，並提供獨家 Skyguard 支持能力。" },
      ],
    },
    contact: {
      badge: "聯絡我們",
      headline: "與我們聯絡",
      subheadline: "期待與您攜手，共創 AI 時代的數據安全新格局。歡迎隨時聯絡我們。",
      form: {
        name: "姓名",
        email: "電子郵件",
        company: "公司名稱",
        message: "訊息",
        submit: "發送訊息",
        namePlaceholder: "您的姓名",
        emailPlaceholder: "you@company.com",
        companyPlaceholder: "您的公司名稱",
        messagePlaceholder: "告訴我們您的數據安全需求...",
        successTitle: "訊息已發送！",
        successMessage: "感謝您的聯絡，我們將在 24 小時內回覆您。",
        sendAnother: "發送另一則訊息",
      },
      info: {
        title: "聯絡資訊",
        email: "sales@next-guard.com",
        website: "www.next-guard.com",
      },
      officesTitle: "辦事處",
    },
    footer: {
      description: "為 AI 時代重建全球化數據安全。獨立．自主．面向全球。",
      quickLinks: "快速連結",
      resources: "資源",
      documentation: "技術文件",
      apiReference: "API 參考",
      statusPage: "服務狀態",
      releaseNotes: "版本更新",
      legal: "法律聲明",
      privacy: "隱私權政策",
      terms: "服務條款",
      security: "安全性",
      compliance: "合規性",
      copyright: "Nextguard Technology Limited. 版權所有。",
    },
  },
  "zh-CN": {
    nav: {
      products: "产品中心",
      aboutUs: "关于我们",
      solutions: "最新功能",
            becomePartner: "成为合作伙伴",
      news: "最新动态",
      contact: "联系我们",
            kb: "知识库",
    },
    home: {
      badge: "告别 · 重建 · 出海",
      headline: "为 AI 时代重建全球化数据安全",
      subheadline: "Nextguard 是全球（中国以外）获得 Skyguard 完整技术授权、源代码及开发权的独立厂商。我们正在打造 AI 驱动的国际化数据安全。",
      cta: "联系我们",
      ctaSecondary: "探索解决方案",
      heroGetStarted: "立即开始",
      heroViewSolutions: "查看解决方案",
      heroStat1Label: "实时侦测",
      heroStat2Label: "数据安全",
      heroStat3Label: "全球覆盖",
      featuredTitle: "重思数据安全",
      featuredDesc: "从被动阻挡到主动智能—这是为 AI 时代重建的 DLP。Nextguard 提供自主保护，在毫秒内适应现代威胁。",
      featuredFeature1: "AI 驱动的威胁情报",
      featuredFeature2: "Easy-Config 即可部署",
      featuredFeature3: "全球合规就绪",
      whyRebuildTitle: "为什么出海需要「重建」？",
      whyRebuildSubtitle: "出海不是复制粘贴，而是告别单一市场思维，重建符合全球标准的产品与品牌。",
      whyRebuildCases: [
        { local: "美团", global: "Keeta", description: "在中国是美团，在香港是 Keeta——同样的技术，不同的品牌、合规与本土化策略。" },
        { local: "抖音", global: "TikTok", description: "在中国是抖音，在海外是 TikTok——同一个底层引擎，但内容、监管、运营完全重构。" },
        { local: "拼多多", global: "Temu", description: "在中国是拼多多，在海外是 Temu——产品逻辑不变，但供应链、支付、信任体系全面适配国际市场。" },
      ],
      statsTitle: "Nextguard 一览",
      stats: [
        { value: "20+", label: "年数据安全经验" },
        { value: "4", label: "位创始人" },
        { value: "2", label: "博士学位" },
        { value: "85+", label: "累计专业经验年数" },
      ],
      pillarsTitle: "为什么创立 Nextguard？",
      pillars: [
        { number: "01", title: "出海 Expand", description: "帮助中国的数据安全技术自信地走向全球，满足国际标准与合规要求。" },
        { number: "02", title: "打造 AI 驱动的国际化数据安全", description: "告别传统规则，迈向智能、自适应、云原生的数据保护。" },
        { number: "03", title: "建立更安全、更可靠、更合规的环境", description: "提供在真实业务流程中运作的 DLP，保护数据同时不牺牲生产力。" },
        { number: "04", title: "中外技术融合", description: "结合成熟工程实力与全球创新最佳实践，打造在任何市场都能运作的产品。" },
      ],
      pillarsFooter: "Nextguard 的诞生，是为了帮助企业告别过时的 DLP，为无国界、AI 驱动的未来重建数据安全。",
      ctaSection: {
        title: "让我们一起重建数据安全",
        description: "期待与您携手，共创 AI 时代的数据安全新格局。",
        button: "联系销售团队",
      },
    },
    products: {
      badge: "产品中心",
      headline: "全方位数据安全套件",
      subheadline: "Nextguard 提供完整的数据安全产品组合，由 Skyguard 技术提供动力，并通过 Nextguard AI 进行增强。",
      learnMore: "了解更多",
      suites: [
        { tag: "DLP 套件", name: "数据防泄漏" },
        { tag: "网关套件", name: "网络与邮件安全" },
        { tag: "终端套件", name: "终端与移动端" },
        { tag: "云端套件", name: "CASB 与 SASE" },
      ],
      items: [
        {
          id: "mdlp",
          tag: "核心 DLP",
          title: "多层次数据防泄漏",
          abbr: "MDLP",
          description: "企业级数据保护，覆盖网络、终端和发现。为复杂环境提供统一的策略管理。",
          features: ["内容发现", "OCR 整合", "指纹识别", "深度内容检查"]
        },
        {
          id: "ucss",
          tag: "安全中心",
          title: "统一内容安全服务器",
          abbr: "UCSS",
          description: "Nextguard 生态系统的枢纽。为所有安全节点提供统一管理、报告和策略编排。",
          features: ["集中化管理", "可视化报告", "API 整合", "RBAC 权限控制"]
        },
        {
          id: "aseg",
          tag: "邮件安全",
          title: "高级邮件安全网关",
          abbr: "ASEG",
          description: "保护您最关键的沟通渠道。阻止网络钓鱼、恶意软件和通过邮件发生的敏感数据泄露。",
          features: ["防钓鱼", "邮件加密", "垃圾邮件过滤", "附件 DLP 检查"]
        },
        {
          id: "aswg",
          tag: "网络安全",
          title: "高级网络安全网关",
          abbr: "ASWG",
          description: "为现代员工提供安全的网络访问。过滤恶意网站并防止数据外流到未经授权的 Web 应用。",
          features: ["URL 过滤", "SSL 检查", "应用控制", "影子 IT 发现"]
        },
        {
          id: "mag",
          tag: "移动端",
          title: "移动应用网关",
          abbr: "MAG",
          description: "保护移动设备上的数据。确保公司信息在 iOS 和 Android 上保持安全，且不影响用户隐私。",
          features: ["应用沙箱化", "远程擦除", "应用级 VPN", "安全查看"]
        },
        {
          id: "ucwi",
          tag: "终端",
          title: "统一内容 Web 检查器",
          abbr: "UCWI",
          description: "终端级别的 Web 和应用控制。直接观察工作站上的数据使用情况。",
          features: ["客户端控制", "离线保护", "应用可见性", "本地审计"]
        },
        {
          id: "dss",
          tag: "发现",
          title: "数据安全扫描器",
          abbr: "DSS",
          description: "寻找隐藏在各处的敏感数据。扫描数据库、文件共享和云存储中的未受保护的个人身份信息 (PII)。",
          features: ["数据库扫描", "云存储审计", "分类标记", "合规性报告"]
        },
        {
          id: "xdr",
          tag: "情报",
          title: "扩展检测与响应",
          abbr: "XDR",
          description: "将数据安全事件与终端和网络日志相关联，提供完整的威胁图谱。",
          features: ["跨层分析", "威胁猎捕", "自动化处置", "时间线映射"]
        },
        {
          id: "dct",
          tag: "治理",
          title: "数据分类工具",
          abbr: "DCT",
          description: "数据安全的基石。赋能用户和 AI 根据敏感度和业务价值标记数据。",
          features: ["用户驱动标记", "AI 自动标记", "MIP 整合", "可视化标签"]
        },
        {
          id: "casb",
          tag: "云端",
          title: "云访问安全代理",
          abbr: "CASB",
          description: "将您的 DLP 策略扩展到 M365、Salesforce 和 Box 等 SaaS 应用。",
          features: ["SaaS 可见性", "基于 API 的 DLP", "账户盗用检测", "访问控制"]
        },
        {
          id: "itm",
          tag: "内部威胁",
          title: "内部威胁管理",
          abbr: "ITM",
          description: "在数据离开公司前识别高风险行为。既关注数据，也关注行为人。",
          features: ["UEBA 行为分析", "屏幕录像", "风险评分", "取证收集"]
        },
        {
          id: "sase",
          tag: "现代网络",
          title: "安全访问服务边缘",
          abbr: "SASE",
          description: "在云端融合网络与安全。为分支机构和漫游用户提供一致的保护。",
          features: ["零信任访问", "云端防火墙", "全球网络", "SD-WAN 整合"]
        }
      ],
      addonsTag: "2026 年推出",
      addonsTitle: "Nextguard AI 与 MIP 增强组件",
      addonsSubtitle: "使用我们专有的 AI 引擎和深度的微软生态系统整合，升级您的现有部署。",
      addons: [
        {
          title: "AI 驱动的异常行为侦测",
          description: "超越正则表达式。我们的 AI 能识别传统规则遗漏的数据滥用模式，显著降低误报率。"
        },
        {
          title: "智能数据分类分级",
          description: "利用大语言模型自动对文档进行分类和保护，准确率高达 99%。"
        },
        {
          title: "深度 Microsoft MIP 整合",
          description: "在本地 DLP 和 Microsoft Purview/MIP 标签之间实现无缝同步，实现统一的数据治理。"
        }
      ],
      ctaTitle: "准备好保护您的数据了吗？",
      ctaSubtitle: "联系我们的团队，获取量身定制的演示和技术咨询。",
      ctaButton: "预约演示"
    },
    company: {
      badge: "Who is Nextguard?",
      headline: "拥有完整技术主权的独立 DLP 厂商",
      subheadline: "全球（中国以外）获得 Skyguard 完整技术授权、源代码及开发权的独立厂商。",
      keyPoints: [
        { title: "永久完整源代码所有权", description: "我们拥有全部核心技术与开发权。" },
        { title: "完全技术自主", description: "产品研发、升级、维护不依赖任何第三方。" },
        { title: "永续运营能力", description: "Nextguard可以独立持续为客户提供完整服务。" },
      ],
      teamTitle: "我们的核心团队",
      teamSubtitle: "我们的核心研发团队由前 Skyguard R&D 成员组成，确保技术延续性与创新能力。",
      teamTagline: "独立．自主．面向全球．不受制于任何原厂",
      leaders: [
        { name: "Peter Zeng", role: "联合创始人", bio: "前 Skyguard 联合创始人，20+ 年经验" },
        { name: "Harvey Huang", role: "联合创始人", bio: "前 Skyguard 产品及技术总监，20+ 年网络安全及 DLP 架构设计经验" },
        { name: "James Yang", role: "联合创始人", bio: "前 Skyguard 联合创始人，25+ 年网络安全及 DLP 架构设计经验" },
        { name: "Roscoe Cheung", role: "联合创始人", bio: "前 Skyguard 港澳技术总监，25+ 年项目领导经验" },
      ],
      advisorTitle: "AI 与智能网络安全首席顾问",
      advisor: {
        name: "Dr. Felix Lor",
        credentials: [
          "双博士学位：人工智能与互动系统 (Imperial College London)；计算神经科学 (Ruhr University Bochum)",
          "主导多个金融科技与数据密集型 AI 项目",
        ],
      },
      independenceTitle: "Nextguard ≠ Skyguard",
      independenceSubtitle: "我们是完全独立、自主的！",
      independencePoints: [
        { question: "原厂有问题怎么办？", answer: "Nextguard 完整源代码及开发权，可永续维护、更新及开发。" },
        { question: "技术支持依赖谁？", answer: "Nextguard 拥有前 Skyguard核心研发团队，掌握全部底层技术，不依赖原厂。" },
        { question: "产品路线图由谁决定？", answer: "由 Nextguard 与合作伙伴及客户共同制定，贴近全球市场需求。" },
      ],
      independenceFooter: "技术完全自主。团队完整掌控。永续运营承诺. Nextguard 不是 Skyguard 的附属品，而是拥有完整技术主权的独立品牌。",
    },
    solutions: {
      badge: "2026 路线图",
      headline: "全新能力：2026 年 AI 驱动的数据安全",
      subheadline: "从被動阻擋到主動智能——這是為 AI 時代重建的 DLP。",
      products: [
        {
          title: "AI DLP – 智能数据防泄",
          description: "侦测异常用户行为与可疑传输。预建策略阻止敏感数据上传至 ChatGPT、Gemini 等等与云端协作平台。",
          features: ["异常行为侦测", "敏感数据上传阻止", "预建 AI 平台策略", "实时传输监控"],
        },
        {
          title: "AI Data Classification – 智能分类",
          description: "自动发现与标记静态/动态敏感数据。将数周的手动设定缩减为数小时的 AI 辅助设定。",
          features: ["自动数据发现", "静态/动态数据标记", "AI 辅助设定", "数小时代替数周"],
        },
        {
          title: "与 Microsoft MIP 深度整合",
          description: "支持 Microsoft Purview、Copilot 与 Azure Information Protection。在本地 DLP 和云端生态系统间实现统一策略。",
          features: ["Microsoft Purview 支持", "Copilot 整合", "Azure Information Protection", "统一本地与云端策略"],
        },
      ],
      whyChooseTitle: "为什么选择 Nextguard？",
      whyChoose: [
        { title: "官方授权与经验验证的产品线", description: "拥有 Skyguard DLP 平台完整技术授权与永久源代码开发权。产品连续入选 Gartner 报告。" },
        { title: "深度专业的 DLP 团队", description: "团队曾为世界500强的银行、政府、保险与跨国企业设计与部署 DLP。而且我们只专注数据安全。" },
        { title: "AI 优先路线图，博士级指导", description: "Dr. Felix Lor 带领团队将 AI 驱动的分类与异常检测整合进产品。从底层重新设计 DLP。" },
        { title: "灵活部署", description: "支持本地、私有云或混合架构，专为多站点、多国家与数据驻留敏感环境设计。" },
      ],
    },
    partners: {
      badge: "合作伙伴",
      headline: "为什么 Nextguard 是您理想的合作伙伴？",
      subheadline: "让我们一起重建数据安全。",
      commitments: [
        { title: "绝不绕过您", description: "我们 100% 承诺渠道优先，不与合作伙伴竞争。" },
        { title: "专注数据安全", description: "我们只做一件事并做到极致：DLP 与数据安全。" },
        { title: "独有 Skyguard 支持能力", description: "全球能为现有 Skyguard 客户提供维保、升级与迁移的厂商。" },
        { title: "合作伙伴赋能", description: "完整的赋能计划、培训和市场推广支持。" },
        { title: "无缝迁移", description: "经验验证的从旧版 Skyguard 部署迁移到 Nextguard 管理环境的路径，零停机时间。" },
      ],
      ctaTitle: "成为合作伙伴",
      ctaDescription: "加入我们的伙伴计划，帮助企业为 AI 时代重建数据安全。",
      ctaButton: "立即申请",
    },
    news: {
      badge: "最新消息",
      headline: "最新动态",
      subheadline: "掌握 Nextguard 的产品创新、产业洞察和公司新闻。",
      articles: [
        { date: "2026", category: "路线图", title: "2026 AI 驱动数据安全路线图发布", excerpt: "Nextguard 揭晓 2026 路线图，包含 AI DLP、智能数据分类和深度 Microsoft MIP 整合。" },
        { date: "2026", category: "产品", title: "AI DLP：智能数据防泄正式推出", excerpt: "侦测异常用户行为与可疑传输。预建策略阻止敏感数据上传至 ChatGPT、Gemini 等云端协作平台。" },
        { date: "2026", category: "产品", title: "AI 数据分类功能现已推出", excerpt: "自动发现与标记敏感数据。将数周的手动设定缩减为数小时的 AI 辅助设定。" },
        { date: "2026", category: "整合", title: "与 Microsoft MIP 深度整合", excerpt: "完全支持 Microsoft Purview、Copilot 與 Azure Information Protection，实现本地与云端统一策略。" },
        { date: "2026", category: "公司", title: "Nextguard：拥有完整技术主权的独立厂商", excerpt: "Nextguard 获得永久完整源代码所有权和开发权，确保完全技术自主。" },
        { date: "2026", category: "合作", title: "渠道优先合作伙伴计划启动", excerpt: "Nextguard 承诺 100% 渠道优先，绝不绕过合作伙伴，并提供独家 Skyguard 支持能力。" },
      ],
    },
    contact: {
      badge: "联系我们",
      headline: "与我们联系",
      subheadline: "期待与您携手，共创 AI 时代的数据安全新格局。欢迎随时联系我们。",
      form: {
        name: "姓名",
        email: "电子邮件",
        company: "公司名称",
        message: "消息",
        submit: "发送消息",
        namePlaceholder: "您的姓名",
        emailPlaceholder: "you@company.com",
        companyPlaceholder: "您的公司名称",
        messagePlaceholder: "告诉我们您的数据安全需求...",
        successTitle: "消息已发送！",
        successMessage: "感谢您的联系，我们将在 24 小时内回复您。",
        sendAnother: "发送另一条消息",
      },
      info: {
        title: "联系信息",
        email: "sales@next-guard.com",
        website: "www.next-guard.com",
      },
      officesTitle: "办事处",
    },
    footer: {
      description: "为 AI 时代重建全球化数据安全。独立．自主．面向全球。",
      quickLinks: "快速链接",
      resources: "资源",
      documentation: "技术文档",
      apiReference: "API 参考",
      statusPage: "服务状态",
      releaseNotes: "版本更新",
      legal: "法律声明",
      privacy: "隐私政策",
      terms: "服务条款",
      security: "安全性",
      compliance: "合规性",
      copyright: "Nextguard Technology Limited. 版权所有。",
    },
  },
} as const

export function getTranslations(locale: Locale) {
  return translations[locale]
}
