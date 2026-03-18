// lib/url-categories.ts
// Enterprise URL Categorization Engine v5.0 - 100-Category Taxonomy
// NextGuard Technology - Tier-One Grade URL Classification

export const URL_TAXONOMY: Record<number,{slug:string;name:string;group:string;description:string;defaultAction:string;priority:number}> = {
  // Security & Risk
  1:{slug:'malware',name:'Malware',group:'Security & Risk',description:'Malware distribution, payloads, loaders',defaultAction:'Block',priority:1},
  2:{slug:'phishing',name:'Phishing',group:'Security & Risk',description:'Credential phishing, brand impersonation login pages',defaultAction:'Block',priority:1},
  3:{slug:'scam-fraud',name:'Scam/Fraud',group:'Security & Risk',description:'Investment scams, fake support, advance-fee fraud',defaultAction:'Block',priority:1},
  4:{slug:'botnet-c2',name:'Botnet/C2',group:'Security & Risk',description:'Command-and-control infrastructure, botnet beacons',defaultAction:'Block',priority:1},
  5:{slug:'exploit-attack-tools',name:'Exploit/Attack Tools',group:'Security & Risk',description:'Exploit kits, attack tools, weaponization resources',defaultAction:'Block',priority:2},
  6:{slug:'suspicious',name:'Suspicious',group:'Security & Risk',description:'Highly suspicious but insufficient evidence for malicious verdict',defaultAction:'Alert',priority:2},
  7:{slug:'newly-registered',name:'Newly Registered Domain',group:'Security & Risk',description:'Domain registered within past 30 days',defaultAction:'Alert',priority:2},
  8:{slug:'dynamic-dns',name:'Dynamic DNS',group:'Security & Risk',description:'Dynamic DNS provider subdomain - commonly abused by malware',defaultAction:'Alert',priority:2},
  9:{slug:'parked',name:'Parked/For Sale',group:'Security & Risk',description:'Parked or for-sale page with minimal content',defaultAction:'Alert',priority:3},
  10:{slug:'uncategorized',name:'Uncategorized',group:'Security & Risk',description:'Unable to assign any category with sufficient confidence',defaultAction:'Alert',priority:5},
  // Infrastructure
  11:{slug:'cdn',name:'CDN',group:'Infrastructure',description:'Content delivery networks and edge caching services',defaultAction:'Allow',priority:4},
  12:{slug:'dns-services',name:'DNS Services',group:'Infrastructure',description:'DNS resolvers, public DNS, DNS management tools',defaultAction:'Allow',priority:4},
  13:{slug:'dns-over-https',name:'DNS over HTTPS',group:'Infrastructure',description:'Encrypted DNS endpoints - may bypass enterprise DNS policy',defaultAction:'Alert',priority:3},
  14:{slug:'hosting',name:'Hosting/Colocation',group:'Infrastructure',description:'Web hosting, server rental, data-centre services',defaultAction:'Allow',priority:4},
  15:{slug:'cloud-infrastructure',name:'Cloud Infrastructure',group:'Infrastructure',description:'IaaS/PaaS cloud platforms (AWS, GCP, Azure)',defaultAction:'Allow',priority:4},
  16:{slug:'certificate-pki',name:'Certificate/PKI',group:'Infrastructure',description:'Certificate authorities, OCSP, CRL endpoints',defaultAction:'Allow',priority:4},
  17:{slug:'domain-registrar',name:'Domain/Registrar',group:'Infrastructure',description:'Domain registrars, WHOIS, DNS management portals',defaultAction:'Allow',priority:4},
  18:{slug:'network-utilities',name:'Network Utilities',group:'Infrastructure',description:'Ping, traceroute, port scanners, IP lookup tools',defaultAction:'Alert',priority:4},
  19:{slug:'api-platforms',name:'API Platforms',group:'Infrastructure',description:'API gateways, iPaaS, developer API service platforms',defaultAction:'Allow',priority:4},
  20:{slug:'software-updates',name:'Software Updates',group:'Infrastructure',description:'Legitimate vendor software updates and patch delivery',defaultAction:'Allow',priority:4},
  // Business SaaS
  21:{slug:'crm',name:'CRM',group:'Business SaaS',description:'Customer relationship management platforms',defaultAction:'Allow',priority:4},
  22:{slug:'erp',name:'ERP',group:'Business SaaS',description:'Enterprise resource planning systems',defaultAction:'Allow',priority:4},
  23:{slug:'hr-payroll',name:'HR/Payroll',group:'Business SaaS',description:'Human resources, payroll, leave, recruitment platforms',defaultAction:'Allow',priority:4},
  24:{slug:'accounting-saas',name:'Accounting/Finance SaaS',group:'Business SaaS',description:'Accounting, expense management, corporate finance SaaS',defaultAction:'Allow',priority:4},
  25:{slug:'project-management',name:'Project Management',group:'Business SaaS',description:'Task and project tracking, work management platforms',defaultAction:'Allow',priority:4},
  26:{slug:'itsm-helpdesk',name:'ITSM/Helpdesk',group:'Business SaaS',description:'IT service management, ticketing, helpdesk systems',defaultAction:'Allow',priority:4},
  27:{slug:'e-signature',name:'E-Signature',group:'Business SaaS',description:'Electronic signature and contract signing platforms',defaultAction:'Allow',priority:4},
  28:{slug:'forms-survey',name:'Forms/Survey Tools',group:'Business SaaS',description:'Online forms, surveys, data-collection platforms',defaultAction:'Allow',priority:4},
  29:{slug:'scheduling',name:'Scheduling/Booking',group:'Business SaaS',description:'Meeting booking and appointment scheduling tools',defaultAction:'Allow',priority:4},
  30:{slug:'customer-support',name:'Customer Support/Chat',group:'Business SaaS',description:'Live-chat widgets, ticketing and customer-service platforms',defaultAction:'Allow',priority:4},
  // Collaboration
  31:{slug:'email',name:'Email',group:'Collaboration',description:'Webmail and enterprise email services',defaultAction:'Allow',priority:4},
  32:{slug:'messaging',name:'Messaging',group:'Collaboration',description:'Instant messaging and real-time chat applications',defaultAction:'Allow',priority:4},
  33:{slug:'team-collaboration',name:'Team Collaboration',group:'Collaboration',description:'Team workspaces, channels, collaborative platforms',defaultAction:'Allow',priority:4},
  34:{slug:'video-conferencing',name:'Video Conferencing',group:'Collaboration',description:'Video meeting and voice-calling platforms',defaultAction:'Allow',priority:4},
  35:{slug:'web-meetings',name:'Web Meetings',group:'Collaboration',description:'Webinar and online presentation systems',defaultAction:'Allow',priority:4},
  36:{slug:'calendar',name:'Calendar/Contacts',group:'Collaboration',description:'Calendar, contacts and scheduling services',defaultAction:'Allow',priority:4},
  37:{slug:'knowledge-wiki',name:'Knowledge/Wiki',group:'Collaboration',description:'Internal knowledge bases, wikis, documentation portals',defaultAction:'Allow',priority:4},
  38:{slug:'doc-collaboration',name:'Document Collaboration',group:'Collaboration',description:'Online document co-editing and review platforms',defaultAction:'Allow',priority:4},
  39:{slug:'enterprise-portals',name:'Enterprise Portals',group:'Collaboration',description:'Company intranet portals, employee self-service',defaultAction:'Allow',priority:4},
  40:{slug:'productivity-suites',name:'Productivity Suites',group:'Collaboration',description:'Integrated office and productivity suites',defaultAction:'Allow',priority:4},
  // Storage & Transfer
  41:{slug:'cloud-storage',name:'Cloud Storage',group:'Storage & Transfer',description:'Cloud drives and file sync services',defaultAction:'Allow',priority:3},
  42:{slug:'file-sharing',name:'File Sharing',group:'Storage & Transfer',description:'Public file-sharing links and hosted file sites',defaultAction:'Alert',priority:3},
  43:{slug:'managed-file-transfer',name:'Managed File Transfer',group:'Storage & Transfer',description:'Secure managed file transfer platforms',defaultAction:'Allow',priority:4},
  44:{slug:'backup-sync',name:'Backup/Sync',group:'Storage & Transfer',description:'Backup, sync and disaster-recovery platforms',defaultAction:'Allow',priority:4},
  45:{slug:'object-storage',name:'Object Storage',group:'Storage & Transfer',description:'S3-compatible object storage endpoints',defaultAction:'Allow',priority:4},
  46:{slug:'large-file-transfer',name:'Large File Transfer',group:'Storage & Transfer',description:'Large-file sending and delivery services',defaultAction:'Alert',priority:3},
  47:{slug:'paste-sites',name:'Paste Sites',group:'Storage & Transfer',description:'Text paste, code snippet and clipboard-sharing sites',defaultAction:'Alert',priority:3},
  48:{slug:'temp-file-hosting',name:'Temporary File Hosting',group:'Storage & Transfer',description:'Ephemeral file hosting with auto-expiry links',defaultAction:'Alert',priority:3},
  49:{slug:'download-portals',name:'Download Portals',group:'Storage & Transfer',description:'Software, document and media download portals',defaultAction:'Allow',priority:4},
  50:{slug:'document-repositories',name:'Document Repositories',group:'Storage & Transfer',description:'Academic and enterprise document libraries',defaultAction:'Allow',priority:4},
  // Identity & Access
  51:{slug:'identity-sso',name:'Identity/SSO',group:'Identity & Access',description:'Single sign-on, SAML/OIDC identity providers',defaultAction:'Allow',priority:3},
  52:{slug:'mfa-authenticator',name:'MFA/Authenticator',group:'Identity & Access',description:'Multi-factor authentication and authenticator services',defaultAction:'Allow',priority:4},
  53:{slug:'password-managers',name:'Password Managers',group:'Identity & Access',description:'Password vault and credential management tools',defaultAction:'Allow',priority:4},
  54:{slug:'directory-services',name:'Directory Services',group:'Identity & Access',description:'Active Directory, LDAP and cloud directory services',defaultAction:'Allow',priority:4},
  55:{slug:'remote-access',name:'Remote Access Portals',group:'Identity & Access',description:'Remote desktop portals, VDI gateways, jump servers',defaultAction:'Allow',priority:3},
  56:{slug:'vpn-services',name:'VPN Services',group:'Identity & Access',description:'Commercial VPN service providers',defaultAction:'Alert',priority:3},
  57:{slug:'proxy-anonymizer',name:'Proxy/Anonymizer',group:'Identity & Access',description:'Anonymous web proxies and censorship-bypass tools',defaultAction:'Block',priority:2},
  58:{slug:'zero-trust',name:'Zero Trust Access',group:'Identity & Access',description:'ZTNA and application-layer secure access platforms',defaultAction:'Allow',priority:4},
  59:{slug:'admin-consoles',name:'Admin Consoles',group:'Identity & Access',description:'Management dashboards and control-plane portals',defaultAction:'Allow',priority:3},
  60:{slug:'privileged-access',name:'Privileged Access',group:'Identity & Access',description:'PAM platforms and privileged account operation portals',defaultAction:'Allow',priority:3},
  // AI & Developer
  61:{slug:'genai-chat',name:'Generative AI Chat',group:'AI & Developer',description:'General-purpose AI chat assistants and consumer AI tools',defaultAction:'Allow',priority:3},
  62:{slug:'ai-coding',name:'AI Coding Assistants',group:'AI & Developer',description:'AI-powered code generation and developer assistants',defaultAction:'Allow',priority:3},
  63:{slug:'ai-model-platforms',name:'AI Model Platforms',group:'AI & Developer',description:'Model APIs, fine-tuning, training and inference platforms',defaultAction:'Allow',priority:4},
  64:{slug:'developer-docs',name:'Developer Docs',group:'AI & Developer',description:'Developer documentation, SDK references, technical docs',defaultAction:'Allow',priority:4},
  65:{slug:'code-hosting',name:'Code Hosting',group:'AI & Developer',description:'Source-code hosting, version control and repository platforms',defaultAction:'Allow',priority:4},
  66:{slug:'ci-cd',name:'CI/CD',group:'AI & Developer',description:'Continuous integration and deployment pipelines',defaultAction:'Allow',priority:4},
  67:{slug:'package-repos',name:'Package Repositories',group:'AI & Developer',description:'Package registries and dependency download sources',defaultAction:'Allow',priority:4},
  68:{slug:'container-registries',name:'Container Registries',group:'AI & Developer',description:'Container image registries and OCI distribution endpoints',defaultAction:'Allow',priority:4},
  69:{slug:'devops-tools',name:'DevOps Tools',group:'AI & Developer',description:'Monitoring, observability, alerting and infrastructure tools',defaultAction:'Allow',priority:4},
  70:{slug:'technical-forums',name:'Technical Forums',group:'AI & Developer',description:'Developer Q&A, technical communities and discussion boards',defaultAction:'Allow',priority:4},
  // Media & Social
  71:{slug:'social-networking',name:'Social Networking',group:'Media & Social',description:'Social networks and user interaction platforms',defaultAction:'Alert',priority:4},
  72:{slug:'professional-networking',name:'Professional Networking',group:'Media & Social',description:'Professional social and job-recruiting platforms',defaultAction:'Allow',priority:4},
  73:{slug:'forums-communities',name:'Forums/Communities',group:'Media & Social',description:'Forums, discussion boards and community sites',defaultAction:'Alert',priority:4},
  74:{slug:'personal-blogs',name:'Personal Blogs',group:'Media & Social',description:'Personal websites, blogs and newsletters',defaultAction:'Alert',priority:4},
  75:{slug:'news-media',name:'News/Media',group:'Media & Social',description:'News websites and media platforms',defaultAction:'Allow',priority:4},
  76:{slug:'streaming-video',name:'Streaming Video',group:'Media & Social',description:'Video streaming and on-demand entertainment platforms',defaultAction:'Alert',priority:4},
  77:{slug:'streaming-audio',name:'Streaming Audio/Radio',group:'Media & Social',description:'Music streaming, podcasts and internet radio',defaultAction:'Alert',priority:4},
  78:{slug:'image-hosting',name:'Image Hosting',group:'Media & Social',description:'Image hosting, photo albums and gallery sites',defaultAction:'Alert',priority:4},
  79:{slug:'url-shorteners',name:'URL Shorteners',group:'Media & Social',description:'URL shortening and redirect services',defaultAction:'Alert',priority:3},
  80:{slug:'podcasts',name:'Podcasts',group:'Media & Social',description:'Podcast platforms and show directories',defaultAction:'Alert',priority:4},
  // Commerce
  81:{slug:'shopping',name:'Shopping',group:'Commerce',description:'Online shopping and retail stores',defaultAction:'Alert',priority:4},
  82:{slug:'marketplaces',name:'Marketplaces',group:'Commerce',description:'Multi-seller trading and marketplace platforms',defaultAction:'Alert',priority:4},
  83:{slug:'auctions-classifieds',name:'Auctions/Classifieds',group:'Commerce',description:'Auctions, classified ads and second-hand trading sites',defaultAction:'Alert',priority:4},
  84:{slug:'payments-wallets',name:'Payments/Wallets',group:'Commerce',description:'Payment gateways, digital wallets, payment platforms',defaultAction:'Allow',priority:3},
  85:{slug:'banking',name:'Banking',group:'Commerce',description:'Online banking, bank portals and financial service logins',defaultAction:'Allow',priority:3},
  86:{slug:'trading-investment',name:'Trading/Investment',group:'Commerce',description:'Stock, fund and investment platforms',defaultAction:'Alert',priority:3},
  87:{slug:'cryptocurrency',name:'Cryptocurrency',group:'Commerce',description:'Crypto exchanges, wallets and Web3 portals',defaultAction:'Alert',priority:3},
  88:{slug:'travel-transportation',name:'Travel/Transportation',group:'Commerce',description:'Flight, hotel, transport and travel reservation platforms',defaultAction:'Alert',priority:4},
  89:{slug:'food-dining',name:'Food/Dining',group:'Commerce',description:'Food delivery, restaurant discovery and dining info',defaultAction:'Alert',priority:4},
  90:{slug:'real-estate',name:'Real Estate',group:'Commerce',description:'Property listing, real estate and rental platforms',defaultAction:'Alert',priority:4},
  // Lifestyle & Regulated
  91:{slug:'education',name:'Education',group:'Lifestyle & Regulated',description:'Schools, education institutions and learning platforms',defaultAction:'Allow',priority:4},
  92:{slug:'government',name:'Government',group:'Lifestyle & Regulated',description:'Government agencies, public services and civic portals',defaultAction:'Allow',priority:4},
  93:{slug:'health-medicine',name:'Health/Medicine',group:'Lifestyle & Regulated',description:'Medical info, clinics, hospitals and health services',defaultAction:'Allow',priority:4},
  94:{slug:'legal',name:'Legal',group:'Lifestyle & Regulated',description:'Legal services, law firms and regulatory information',defaultAction:'Alert',priority:4},
  95:{slug:'religion',name:'Religion',group:'Lifestyle & Regulated',description:'Religious organizations and faith information sites',defaultAction:'Alert',priority:4},
  96:{slug:'adult',name:'Adult',group:'Lifestyle & Regulated',description:'Adult content and adult entertainment services',defaultAction:'Block',priority:1},
  97:{slug:'gambling',name:'Gambling',group:'Lifestyle & Regulated',description:'Betting, gambling, wagering and casino services',defaultAction:'Block',priority:1},
  98:{slug:'alcohol-tobacco',name:'Alcohol/Tobacco',group:'Lifestyle & Regulated',description:'Alcohol, tobacco and related product sites',defaultAction:'Alert',priority:4},
  99:{slug:'games',name:'Games',group:'Lifestyle & Regulated',description:'Video games, gaming platforms and game downloads',defaultAction:'Alert',priority:4},
  100:{slug:'recreation-hobbies',name:'Recreation/Hobbies',group:'Lifestyle & Regulated',description:'Hobbies, leisure, clubs and personal interest sites',defaultAction:'Alert',priority:4},
};

// Helper: get category name by ID
export function getCategoryName(id: number): string {
  return URL_TAXONOMY[id]?.name ?? 'Uncategorized';
}

// Helper: get all category slugs list
export const CATEGORY_SLUGS = Object.values(URL_TAXONOMY).map(c => c.slug);

// Helper: get categories by group
export function getCategoriesByGroup(group: string) {
  return Object.entries(URL_TAXONOMY)
    .filter(([,v]) => v.group === group)
    .map(([id,v]) => ({id: Number(id), ...v}));
}

// ══════════════════════════════════════════
// SECTION 2 - DOMAIN CATEGORIES
// ══════════════════════════════════════════
const DOMAIN_CATEGORIES: Record<string, string[]> = {
  // Social
  'facebook.com':['Social Networking'],'instagram.com':['Social Networking'],'twitter.com':['Social Networking'],'x.com':['Social Networking'],
  'linkedin.com':['Professional Networking'],'tiktok.com':['Social Networking'],'snapchat.com':['Social Networking'],'pinterest.com':['Social Networking'],
  'reddit.com':['Forums/Communities'],'threads.net':['Social Networking'],'mastodon.social':['Social Networking'],
  'weibo.com':['Social Networking'],'xiaohongshu.com':['Social Networking','Shopping'],'douyin.com':['Social Networking','Streaming Video'],
  // Messaging & Collaboration
  'discord.com':['Messaging','Team Collaboration'],'slack.com':['Team Collaboration'],'telegram.org':['Messaging'],'whatsapp.com':['Messaging'],
  'signal.org':['Messaging'],'line.me':['Messaging'],'wechat.com':['Messaging'],'qq.com':['Messaging'],
  'zoom.us':['Video Conferencing'],'webex.com':['Web Meetings'],'teams.microsoft.com':['Team Collaboration','Video Conferencing'],
  // Email & Productivity
  'gmail.com':['Email'],'outlook.com':['Email','Productivity Suites'],'protonmail.com':['Email'],'proton.me':['Email'],
  'office.com':['Productivity Suites'],'office365.com':['Productivity Suites'],'notion.so':['Team Collaboration','Document Collaboration'],
  'figma.com':['Team Collaboration'],'canva.com':['Productivity Suites'],'trello.com':['Project Management'],'asana.com':['Project Management'],
  'airtable.com':['Project Management'],'miro.com':['Team Collaboration'],'loom.com':['Video Conferencing'],
  'calendly.com':['Scheduling/Booking'],'doodle.com':['Scheduling/Booking'],
  // Business SaaS
  'salesforce.com':['CRM'],'hubspot.com':['CRM'],'zendesk.com':['Customer Support/Chat'],'intercom.com':['Customer Support/Chat'],
  'servicenow.com':['ITSM/Helpdesk'],'atlassian.com':['Team Collaboration','Project Management'],
  'sap.com':['ERP'],'oracle.com':['ERP','Cloud Infrastructure'],'netsuite.com':['ERP','Accounting/Finance SaaS'],
  'workday.com':['HR/Payroll'],'bamboohr.com':['HR/Payroll'],
  'xero.com':['Accounting/Finance SaaS'],'freshbooks.com':['Accounting/Finance SaaS'],
  'docusign.com':['E-Signature'],'hellosign.com':['E-Signature'],
  'surveymonkey.com':['Forms/Survey Tools'],'typeform.com':['Forms/Survey Tools'],'mailchimp.com':['Forms/Survey Tools'],
  // News & Media
  'cnn.com':['News/Media'],'bbc.com':['News/Media'],'nytimes.com':['News/Media'],'reuters.com':['News/Media'],
  'bloomberg.com':['News/Media','Trading/Investment'],'wsj.com':['News/Media','Trading/Investment'],
  'techcrunch.com':['News/Media'],'theverge.com':['News/Media'],'wired.com':['News/Media'],'arstechnica.com':['News/Media'],
  'scmp.com':['News/Media'],'hk01.com':['News/Media'],'mingpao.com':['News/Media'],'rthk.hk':['News/Media'],
  'theguardian.com':['News/Media'],'washingtonpost.com':['News/Media'],'apnews.com':['News/Media'],'aljazeera.com':['News/Media'],
  'forbes.com':['News/Media'],'fortune.com':['News/Media'],'cnet.com':['News/Media'],'zdnet.com':['News/Media'],
  'medium.com':['Personal Blogs','News/Media'],'substack.com':['Personal Blogs','News/Media'],
  'xinhuanet.com':['News/Media'],'people.com.cn':['News/Media'],'sina.com.cn':['News/Media'],'163.com':['News/Media'],
  // Streaming Video
  'netflix.com':['Streaming Video'],'youtube.com':['Streaming Video'],'hulu.com':['Streaming Video'],
  'disneyplus.com':['Streaming Video'],'twitch.tv':['Streaming Video','Games'],'bilibili.com':['Streaming Video'],
  'vimeo.com':['Streaming Video'],'primevideo.com':['Streaming Video'],'mytvsuper.com':['Streaming Video'],
  'viu.com':['Streaming Video'],'youku.com':['Streaming Video'],'iqiyi.com':['Streaming Video'],
  // Streaming Audio
  'spotify.com':['Streaming Audio/Radio'],'soundcloud.com':['Streaming Audio/Radio'],'tidal.com':['Streaming Audio/Radio'],
  'music.apple.com':['Streaming Audio/Radio'],'music.youtube.com':['Streaming Audio/Radio'],
  // Games
  'steam.com':['Games'],'store.steampowered.com':['Games'],'epicgames.com':['Games'],'roblox.com':['Games'],
  'blizzard.com':['Games'],'ea.com':['Games'],'nintendo.com':['Games'],'playstation.com':['Games'],'xbox.com':['Games'],
  // Finance & Banking
  'paypal.com':['Payments/Wallets'],'stripe.com':['Payments/Wallets'],'wise.com':['Payments/Wallets'],'revolut.com':['Payments/Wallets'],
  'alipay.com':['Payments/Wallets'],'hsbc.com':['Banking'],'citibank.com':['Banking'],'chase.com':['Banking'],
  'hangseng.com':['Banking'],'bochk.com':['Banking'],'icbc.com.cn':['Banking'],'ccb.com':['Banking'],
  'standardchartered.com.hk':['Banking'],'dbs.com.hk':['Banking'],
  'hkex.com.hk':['Trading/Investment'],'robinhood.com':['Trading/Investment'],'fidelity.com':['Trading/Investment'],
  'coinbase.com':['Cryptocurrency'],'binance.com':['Cryptocurrency'],'kraken.com':['Cryptocurrency'],'okx.com':['Cryptocurrency'],
  'crypto.com':['Cryptocurrency'],'opensea.io':['Cryptocurrency'],'coingecko.com':['Cryptocurrency'],
  // Shopping
  'amazon.com':['Shopping','Marketplaces'],'ebay.com':['Marketplaces','Auctions/Classifieds'],'shopify.com':['Shopping'],
  'etsy.com':['Marketplaces'],'aliexpress.com':['Shopping','Marketplaces'],'taobao.com':['Shopping','Marketplaces'],
  'jd.com':['Shopping'],'hktvmall.com':['Shopping'],'walmart.com':['Shopping'],'ikea.com':['Shopping'],
  'lazada.com':['Shopping','Marketplaces'],'shopee.com':['Shopping','Marketplaces'],
  'craigslist.org':['Auctions/Classifieds'],'zillow.com':['Real Estate'],
  // Cloud & Infrastructure
  'aws.amazon.com':['Cloud Infrastructure'],'cloud.google.com':['Cloud Infrastructure'],'azure.microsoft.com':['Cloud Infrastructure'],
  'cloudflare.com':['CDN','Cloud Infrastructure'],'vercel.com':['Cloud Infrastructure','CI/CD'],
  'digitalocean.com':['Cloud Infrastructure'],'heroku.com':['Cloud Infrastructure'],'netlify.com':['Cloud Infrastructure'],
  'cloudfront.net':['CDN'],'fastly.net':['CDN'],'akamai.net':['CDN'],'jsdelivr.net':['CDN'],
  'google.com':['Cloud Infrastructure','Productivity Suites'],'microsoft.com':['Software Updates','Productivity Suites'],
  'apple.com':['Shopping','Software Updates'],
  // Storage & File
  'dropbox.com':['Cloud Storage'],'box.com':['Cloud Storage'],'mega.nz':['Cloud Storage','File Sharing'],
  'wetransfer.com':['Large File Transfer'],'pastebin.com':['Paste Sites'],
  // Developer & AI
  'github.com':['Code Hosting'],'gitlab.com':['Code Hosting'],'stackoverflow.com':['Technical Forums'],
  'npmjs.com':['Package Repositories'],'pypi.org':['Package Repositories'],'docker.com':['Container Registries'],
  'datadog.com':['DevOps Tools'],'newrelic.com':['DevOps Tools'],'sentry.io':['DevOps Tools'],'grafana.com':['DevOps Tools'],
  'openai.com':['Generative AI Chat'],'chatgpt.com':['Generative AI Chat'],'claude.ai':['Generative AI Chat'],
  'perplexity.ai':['Generative AI Chat'],'gemini.google.com':['Generative AI Chat'],
  'copilot.microsoft.com':['AI Coding Assistants'],'huggingface.co':['AI Model Platforms'],
  // Identity & VPN
  'okta.com':['Identity/SSO'],'auth0.com':['Identity/SSO'],'duo.com':['MFA/Authenticator'],
  '1password.com':['Password Managers'],'lastpass.com':['Password Managers'],'bitwarden.com':['Password Managers'],
  'nordvpn.com':['VPN Services'],'expressvpn.com':['VPN Services'],'surfshark.com':['VPN Services'],'torproject.org':['Proxy/Anonymizer'],
  'teamviewer.com':['Remote Access Portals'],'anydesk.com':['Remote Access Portals'],
  // URL Shorteners
  'bit.ly':['URL Shorteners'],'tinyurl.com':['URL Shorteners'],'t.co':['URL Shorteners'],
  // Education
  'coursera.org':['Education'],'udemy.com':['Education'],'wikipedia.org':['Education'],
  'mit.edu':['Education'],'harvard.edu':['Education'],'hku.hk':['Education'],'cuhk.edu.hk':['Education'],
  'hkust.edu.hk':['Education'],'khanacademy.org':['Education'],'edx.org':['Education'],
  // Government
  'gov.hk':['Government'],'info.gov.hk':['Government'],'usa.gov':['Government'],'gov.uk':['Government'],
  'hkma.gov.hk':['Government','Banking'],'sfc.hk':['Government','Trading/Investment'],
  // Health
  'who.int':['Health/Medicine'],'webmd.com':['Health/Medicine'],'mayoclinic.org':['Health/Medicine'],'ha.org.hk':['Health/Medicine'],
  // Adult
  'pornhub.com':['Adult'],'xvideos.com':['Adult'],'onlyfans.com':['Adult'],'xhamster.com':['Adult'],'xnxx.com':['Adult'],
  // Gambling
  'bet365.com':['Gambling'],'draftkings.com':['Gambling'],'hkjc.com':['Gambling'],'hkjc.com.hk':['Gambling'],
  'sbobet.com':['Gambling'],'pokerstars.com':['Gambling'],'betway.com':['Gambling'],'888.com':['Gambling'],
  'fanduel.com':['Gambling'],'venetianmacao.com':['Gambling'],'melco-resorts.com':['Gambling'],
  // Travel & Food
  'booking.com':['Travel/Transportation'],'airbnb.com':['Travel/Transportation'],'expedia.com':['Travel/Transportation'],
  'agoda.com':['Travel/Transportation'],'klook.com':['Travel/Transportation'],'trip.com':['Travel/Transportation'],
  'doordash.com':['Food/Dining'],'ubereats.com':['Food/Dining'],'foodpanda.com':['Food/Dining'],'openrice.com':['Food/Dining'],
  // Real Estate
  '28hse.com':['Real Estate'],'midland.com.hk':['Real Estate'],'centaline.com':['Real Estate'],
  // Image Hosting
  'flickr.com':['Image Hosting'],'unsplash.com':['Image Hosting'],'imgur.com':['Image Hosting'],
  // Hosting
  'wix.com':['Hosting/Colocation'],'squarespace.com':['Hosting/Colocation'],
  'godaddy.com':['Domain/Registrar'],'namecheap.com':['Domain/Registrar'],
  // Phishing typosquats
  'googel.com':['Phishing','Suspicious'],'faceb00k.com':['Phishing','Suspicious'],
  'arnazon.com':['Phishing','Suspicious'],'paypa1.com':['Phishing','Suspicious'],
  'mircosoft.com':['Phishing','Suspicious'],'netfliix.com':['Phishing','Suspicious'],
  // DNS
  'dns.google':['DNS Services'],'cloudflare-dns.com':['DNS over HTTPS'],
  // Reserved
  'example.com':['Uncategorized'],'example.net':['Uncategorized'],
};

// SECTION 3 - KEYWORD RULES
const CATEGORY_KEYWORDS: Array<{keywords:string[];categories:string[]}> = [
  {keywords:['news','herald','times','post','daily','gazette','press','journal','tribune','media','broadcast'],categories:['News/Media']},
  {keywords:['bank','finance','invest','stock','trading','wallet','exchange','capital','fund','wealth','insurance','mortgage','loan'],categories:['Banking','Trading/Investment']},
  {keywords:['bitcoin','ethereum','crypto','nft','defi','blockchain','coin','token','web3'],categories:['Cryptocurrency']},
  {keywords:['shop','store','buy','mall','market','checkout','cart','deal','discount','sale','retail','ecommerce'],categories:['Shopping']},
  {keywords:['game','gaming','esport','guild','quest','rpg','gamer','mmorpg'],categories:['Games']},
  {keywords:['learn','course','school','university','college','academy','tutor','study','education','lecture','degree'],categories:['Education']},
  {keywords:['gov','government','ministry','department','bureau','federal','municipal','council'],categories:['Government']},
  {keywords:['health','medical','clinic','hospital','pharma','doctor','therapy','wellness','dental','surgery','medicine'],categories:['Health/Medicine']},
  {keywords:['travel','hotel','flight','booking','tour','vacation','airline','resort','cruise','trip'],categories:['Travel/Transportation']},
  {keywords:['porn','adult','xxx','sex','erotic','nsfw','nude','fetish'],categories:['Adult']},
  {keywords:['casino','bet','poker','gambling','lottery','wager','slots','jackpot','bingo','roulette','sportsbook'],categories:['Gambling']},
  {keywords:['vpn','proxy','anonymous','tunnel','unblock','bypass','socks5','shadowsocks'],categories:['VPN Services','Proxy/Anonymizer']},
  {keywords:['phish','scam','fake','fraud','spoof','impersonat'],categories:['Phishing','Scam/Fraud']},
  {keywords:['hack','exploit','malware','botnet','ransom','trojan','rootkit','keylog','backdoor','payload'],categories:['Malware','Exploit/Attack Tools']},
  {keywords:['food','recipe','restaurant','dining','cook','chef','meal','delivery','menu','cuisine'],categories:['Food/Dining']},
  {keywords:['music','song','album','artist','playlist','band','concert'],categories:['Streaming Audio/Radio']},
  {keywords:['cloud','hosting','devops','deploy','server','container','docker','kubernetes'],categories:['Cloud Infrastructure']},
  {keywords:['ai','gpt','llm','chatbot','neural','openai','gemini','copilot','transformer','deeplearn'],categories:['Generative AI Chat']},
  {keywords:['code','develop','program','engineer','debug','compile','api','framework','sdk','github','gitlab'],categories:['Code Hosting']},
  {keywords:['blog','wordpress','newsletter','editorial'],categories:['Personal Blogs']},
  {keywords:['email','mail','smtp','imap','inbox','webmail'],categories:['Email']},
  {keywords:['chat','messenger','messaging','signal','whatsapp','telegram','wechat'],categories:['Messaging']},
  {keywords:['video','stream','watch','movie','film','cinema','tv','series','anime'],categories:['Streaming Video']},
  {keywords:['forum','community','discuss','board','thread','topic','answer'],categories:['Forums/Communities']},
  {keywords:['estate','property','apartment','house','rent','lease','condo','realty'],categories:['Real Estate']},
  {keywords:['legal','law','attorney','lawyer','court','justice'],categories:['Legal']},
  {keywords:['recruit','hire','job','career','resume','employment'],categories:['Professional Networking']},
  {keywords:['religion','church','mosque','temple','faith','spiritual','prayer'],categories:['Religion']},
  {keywords:['crm','salesforce','hubspot','pipedrive'],categories:['CRM']},
  {keywords:['erp','sap','netsuite'],categories:['ERP']},
  {keywords:['helpdesk','itsm','ticketing','servicenow','servicedesk'],categories:['ITSM/Helpdesk']},
  {keywords:['payroll','humanresource','workday'],categories:['HR/Payroll']},
  {keywords:['accounting','invoice','bookkeeping','xero','quickbooks'],categories:['Accounting/Finance SaaS']},
  {keywords:['paste','pastebin','hastebin'],categories:['Paste Sites']},
  {keywords:['shorten','bitly','tinyurl','shorturl'],categories:['URL Shorteners']},
];

// SECTION 4 - TLD CATEGORIES
const TLD_CATEGORIES: Record<string,string[]> = {
  '.edu':['Education'],'.gov':['Government'],'.mil':['Government'],'.health':['Health/Medicine'],
  '.bank':['Banking'],'.travel':['Travel/Transportation'],'.jobs':['Professional Networking'],
  '.casino':['Gambling'],'.bet':['Gambling'],'.adult':['Adult'],'.porn':['Adult'],
  '.game':['Games'],'.games':['Games'],'.app':['Software Updates'],'.dev':['Code Hosting'],
  '.io':['Code Hosting'],'.ai':['AI Model Platforms'],'.tech':['Cloud Infrastructure'],
  '.cloud':['Cloud Infrastructure'],'.shop':['Shopping'],'.store':['Shopping'],
  '.news':['News/Media'],'.blog':['Personal Blogs'],'.video':['Streaming Video'],
  '.music':['Streaming Audio/Radio'],'.food':['Food/Dining'],'.law':['Legal'],
  '.realty':['Real Estate'],'.photo':['Image Hosting'],'.social':['Social Networking'],
  '.finance':['Banking'],'.money':['Payments/Wallets'],'.chat':['Messaging'],'.email':['Email'],
};

// SECTION 5 - DYNAMIC DNS & SUSPICIOUS TLDS
const DYNAMIC_DNS_PROVIDERS: string[] = [
  'duckdns.org','no-ip.com','noip.com','ddns.net','dynu.com','freedns.afraid.org',
  'hopto.org','zapto.org','sytes.net','ddns.me','synology.me','myds.me',
  'myfritz.net','dyndns.org','changeip.com','ddnsking.com','publicvm.com',
  'kozow.com','gotdns.ch','myddns.me','webhop.me','webredirect.org',
];
const SUSPICIOUS_TLDS: string[] = [
  '.xyz','.top','.club','.work','.click','.link','.info','.biz','.cc','.ws',
  '.tk','.ml','.ga','.cf','.gq','.pw','.buzz','.rest','.icu','.cam',
  '.surf','.monster','.cyou','.cfd','.sbs','.uno','.best','.loan','.win','.bid',
  '.stream','.racing','.download','.review','.accountant','.date','.faith',
  '.party','.science','.trade','.webcam','.run','.site','.online','.fun','.space',
];
const CCTLD_REGIONS: Record<string,string> = {
  '.cn':'China','.hk':'Hong Kong','.tw':'Taiwan','.jp':'Japan','.kr':'South Korea',
  '.sg':'Singapore','.in':'India','.au':'Australia','.uk':'United Kingdom',
  '.de':'Germany','.fr':'France','.ru':'Russia','.br':'Brazil','.ca':'Canada','.us':'United States',
};

// SECTION 6 - HELPER FUNCTIONS
function isDynamicDNS(domain: string): boolean {
  return DYNAMIC_DNS_PROVIDERS.some(p => domain === p || domain.endsWith('.' + p));
}
function hasSuspiciousTLD(domain: string): boolean {
  const tld = '.' + domain.split('.').pop();
  return SUSPICIOUS_TLDS.includes(tld);
}
function hasRandomLookingName(domain: string): boolean {
  const name = domain.split('.')[0];
  if (name.length < 3) return false;
  const consonants = name.replace(/[aeiou0-9\-_]/gi, '').length;
  const ratio = consonants / name.length;
  const hasDigitMix = /[a-z].*\d|\d.*[a-z]/i.test(name) && /\d{2,}/.test(name);
  return (ratio > 0.7 && name.length >= 3) || hasDigitMix;
}
function getCountryFromCCTLD(domain: string): string | null {
  for (const [tld, country] of Object.entries(CCTLD_REGIONS)) {
    if (domain.endsWith(tld)) return country;
  }
  return null;
}

// Typosquatting brands
const TYPOSQUAT_BRANDS: Record<string,{patterns:RegExp[];category:string[]}> = {
  'google':{patterns:[/^g[o0]{1,3}g[e3]?l[e3]?\./,/^go+gle\./],category:['Phishing','Suspicious']},
  'facebook':{patterns:[/^f[a4]c[e3]b[o0]{1,2}k\./],category:['Phishing','Suspicious']},
  'amazon':{patterns:[/^[a4]m[a4]z[o0]n\./],category:['Phishing','Suspicious']},
  'microsoft':{patterns:[/^m[i1]cr[o0]s[o0]ft\./],category:['Phishing','Suspicious']},
  'paypal':{patterns:[/^p[a4]yp[a4][l1]\./],category:['Phishing','Suspicious']},
  'netflix':{patterns:[/^n[e3]tf[l1][i1]x\./],category:['Phishing','Suspicious']},
};

// Substring rules
const SUBSTRING_RULES: Array<{substrings:string[];categories:string[]}> = [
  {substrings:['slot','casino','poker','roulette','jackpot','bingo','lottery','gambl','betting'],categories:['Gambling']},
  {substrings:['porn','xxx','nsfw','adult','erotic'],categories:['Adult']},
  {substrings:['phish','scam','fraud'],categories:['Phishing','Suspicious']},
  {substrings:['torrent','pirate','warez','crack','keygen'],categories:['Suspicious']},
  {substrings:['vpngate','proxyfree','unblock'],categories:['Proxy/Anonymizer']},
];

// SECTION 7 - MAIN CATEGORIZATION ENGINE
export function categorizeUrl(domain: string): string[] {
  let d = domain.toLowerCase();
  if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
  d = d.replace(/^www\./, '');
  const cats = new Set<string>();
  // 1. Exact domain match
  if (DOMAIN_CATEGORIES[d]) { DOMAIN_CATEGORIES[d].forEach(c => cats.add(c)); return [...cats]; }
  // 2. Typosquatting
  for (const [brand, info] of Object.entries(TYPOSQUAT_BRANDS)) {
    if (d !== brand + '.com') {
      for (const pat of info.patterns) { if (pat.test(d)) { info.category.forEach(c => cats.add(c)); return [...cats]; } }
    }
  }
  // 3. Parent domain match
  for (const [key, c] of Object.entries(DOMAIN_CATEGORIES)) { if (d.endsWith('.' + key)) c.forEach(x => cats.add(x)); }
  if (cats.size > 0) return [...cats];
  // 4. Dynamic DNS
  if (isDynamicDNS(d)) { cats.add('Dynamic DNS'); cats.add('Suspicious'); return [...cats]; }
  // 5. TLD categories
  for (const [tld, c] of Object.entries(TLD_CATEGORIES)) { if (d.endsWith(tld)) c.forEach(x => cats.add(x)); }
  // 6. Keyword match
  const words = d.split(/[^a-z0-9]+/).join(' ');
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some(kw => kw.length >= 4 && new RegExp('\\b' + kw + '\\b').test(words))) {
      rule.categories.forEach(c => cats.add(c));
    }
  }
  // 6.5 Substring match
  const domainBase = d.split('.').slice(0, -1).join('');
  for (const rule of SUBSTRING_RULES) { if (rule.substrings.some(s => domainBase.includes(s))) { rule.categories.forEach(c => cats.add(c)); } }
  // 7. Suspicious TLD
  if (hasSuspiciousTLD(d)) cats.add('Suspicious');
  // 8. Random name
  if (hasRandomLookingName(d)) cats.add('Suspicious');
  // 9. Country from ccTLD
  const country = getCountryFromCCTLD(d);
  if (country) cats.add('Regional - ' + country);
  // 10. Infrastructure patterns
  if (/\b(cdn|cache|static|assets)\b/.test(words)) cats.add('CDN');
  if (/\b(api|gateway|endpoint)\b/.test(words)) cats.add('API Platforms');
  if (/\b(mail|smtp|mx)\b/.test(words)) cats.add('Email');
  if (/\b(ftp|upload|download|file)\b/.test(words)) cats.add('File Sharing');
  if (/\b(login|auth|sso|account)\b/.test(words)) cats.add('Identity/SSO');
  // 11. IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(d)) cats.add('Suspicious');
  if (cats.size > 0) return [...cats];
  // 12. Suspicious subdomain
  const parts = d.split('.');
  if (parts.length >= 3 && !DOMAIN_CATEGORIES[parts.slice(-2).join('.')]) {
    if (hasRandomLookingName(d) || /\d/.test(parts[0])) cats.add('Suspicious');
  }
  if (cats.size > 0) return [...cats];
  return ['Uncategorized'];
}

// SECTION 8 - CLOUDFLARE INTEL API INTEGRATION
interface CfConfig { accountId: string; apiToken: string; }
interface CfCacheEntry { categories: string[]; timestamp: number; }
const CF_CACHE = new Map<string, CfCacheEntry>();
const CF_CACHE_TTL = 24 * 60 * 60 * 1000;
function getCfConfig(): CfConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}
const CF_CATEGORY_MAP: Record<number, string> = {
  1:'Cloud Infrastructure',2:'Education',3:'CRM',4:'Government',5:'News/Media',6:'Streaming Video',
  7:'Shopping',8:'Games',9:'Health/Medicine',10:'Travel/Transportation',11:'Forums/Communities',12:'Banking',
  13:'Real Estate',14:'Education',15:'Education',16:'Recreation/Hobbies',17:'Shopping',18:'Food/Dining',
  21:'Legal',22:'Religion',25:'Professional Networking',27:'Personal Blogs',28:'Image Hosting',
  32:'Gambling',33:'Social Networking',34:'Adult',35:'Alcohol/Tobacco',
  64:'Social Networking',65:'Email',66:'Streaming Video',67:'Games',
  68:'Code Hosting',69:'Cloud Infrastructure',70:'File Sharing',71:'VPN Services',
  72:'Generative AI Chat',73:'Cryptocurrency',80:'Cloud Infrastructure',81:'Forums/Communities',
  82:'CDN',83:'CDN',84:'URL Shorteners',85:'Paste Sites',
  128:'Malware',129:'Phishing',130:'Suspicious',131:'Malware',132:'Botnet/C2',
  133:'Dynamic DNS',134:'Newly Registered Domain',135:'Parked/For Sale',136:'Suspicious',137:'Botnet/C2',138:'Suspicious',
};
async function queryCloudflareIntel(domain: string): Promise<string[]> {
  const config = getCfConfig();
  if (!config) return [];
  const cached = CF_CACHE.get(domain);
  if (cached && (Date.now() - cached.timestamp) < CF_CACHE_TTL) return cached.categories;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/intel/domain?domain=${encodeURIComponent(domain)}`,
      { headers: { 'Authorization': `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const cats: string[] = [];
    if (data?.result?.content_categories) {
      for (const c of data.result.content_categories) {
        const id = typeof c === 'number' ? c : c?.id;
        if (id && CF_CATEGORY_MAP[id]) cats.push(CF_CATEGORY_MAP[id]);
        else if (c?.name) cats.push(c.name);
      }
    }
    if (data?.result?.risk_types) {
      for (const r of data.result.risk_types) {
        const id = typeof r === 'number' ? r : r?.id;
        if (id && CF_CATEGORY_MAP[id]) cats.push(CF_CATEGORY_MAP[id]);
        else if (r?.name) cats.push(r.name);
      }
    }
    CF_CACHE.set(domain, { categories: cats, timestamp: Date.now() });
    return cats;
  } catch { return []; }
}
async function queryCloudflareIntelBatch(domains: string[]): Promise<Map<string, string[]>> {
  const config = getCfConfig();
  const result = new Map<string, string[]>();
  if (!config) return result;
  const batchSize = 10;
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const promises = batch.map(async (d) => ({ domain: d, categories: await queryCloudflareIntel(d) }));
    try {
      const results = await Promise.allSettled(promises);
      for (const r of results) { if (r.status === 'fulfilled' && r.value.categories.length > 0) result.set(r.value.domain, r.value.categories); }
    } catch { continue; }
  }
  return result;
}
export async function categorizeUrlAsync(domain: string): Promise<string[]> {
  let d = domain.toLowerCase();
  if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
  d = d.replace(/^www\./, '');
  if (DOMAIN_CATEGORIES[d]) return DOMAIN_CATEGORIES[d];
  for (const [key, c] of Object.entries(DOMAIN_CATEGORIES)) { if (d.endsWith('.' + key)) return c; }
  const cfCats = await queryCloudflareIntel(d);
  if (cfCats.length > 0) return cfCats;
  return categorizeUrl(domain);
}
export function isCloudflareIntelConfigured(): boolean { return getCfConfig() !== null; }
export { queryCloudflareIntel, queryCloudflareIntelBatch };
