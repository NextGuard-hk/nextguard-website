// lib/url-categories.ts
// Enterprise URL Categorization Engine v3.0 - Word-boundary keyword matching
// Provides accurate category for every URL - clean or malicious
// Enhanced: Dynamic DNS detection, suspicious TLD heuristics, domain pattern analysis

const DOMAIN_CATEGORIES: Record<string, string[]> = {
  'google.com':['Search Engine'],'bing.com':['Search Engine'],
  'yahoo.com':['Search Engine','News & Media'],'baidu.com':['Search Engine'],
  'duckduckgo.com':['Search Engine','Privacy Tools'],
  'facebook.com':['Social Media'],'instagram.com':['Social Media'],
  'twitter.com':['Social Media'],'x.com':['Social Media'],
  'linkedin.com':['Social Media','Job Search'],'tiktok.com':['Social Media'],
  'snapchat.com':['Social Media'],'pinterest.com':['Social Media'],
  'reddit.com':['Social Media','Forum & Community'],
  'discord.com':['Social Media','Gaming'],'slack.com':['Business & Economy'],
  'weibo.com':['Social Media'],'telegram.org':['Email & Messaging'],
  'whatsapp.com':['Email & Messaging'],'signal.org':['Email & Messaging','Privacy Tools'],
  'zoom.us':['Email & Messaging','Business & Economy'],
  'gmail.com':['Email & Messaging'],'outlook.com':['Email & Messaging'],
  'protonmail.com':['Email & Messaging','Privacy Tools'],
  'cnn.com':['News & Media'],'bbc.com':['News & Media'],
  'nytimes.com':['News & Media'],'reuters.com':['News & Media'],
  'bloomberg.com':['News & Media','Finance & Banking'],
  'wsj.com':['News & Media','Finance & Banking'],
  'techcrunch.com':['News & Media','Technology'],
  'theverge.com':['News & Media','Technology'],
  'scmp.com':['News & Media'],'hk01.com':['News & Media'],
  'mingpao.com':['News & Media'],'rthk.hk':['News & Media'],
  'sina.com.cn':['News & Media'],'163.com':['News & Media'],
  'nba.com':['Sports'],'nfl.com':['Sports'],'mlb.com':['Sports'],
  'espn.com':['Sports','Streaming Media'],'fifa.com':['Sports'],
  'premierleague.com':['Sports'],'uefa.com':['Sports'],
  'skysports.com':['Sports','News & Media'],
  'bleacherreport.com':['Sports','News & Media'],
  'goal.com':['Sports'],'formula1.com':['Sports'],'ufc.com':['Sports'],
  'olympics.com':['Sports'],'cricinfo.com':['Sports'],
  'netflix.com':['Streaming Media','Entertainment'],
  'youtube.com':['Streaming Media','Video'],
  'hulu.com':['Streaming Media','Entertainment'],
  'disneyplus.com':['Streaming Media','Entertainment'],
  'twitch.tv':['Streaming Media','Gaming'],
  'spotify.com':['Music','Streaming Media'],
  'soundcloud.com':['Music'],'tidal.com':['Music'],
  'vimeo.com':['Video'],'bilibili.com':['Streaming Media','Entertainment'],
  'iqiyi.com':['Streaming Media','Entertainment'],
  'steam.com':['Gaming'],'store.steampowered.com':['Gaming'],
  'epicgames.com':['Gaming'],'roblox.com':['Gaming'],
  'blizzard.com':['Gaming'],'ea.com':['Gaming'],
  'nintendo.com':['Gaming'],'playstation.com':['Gaming'],
  'xbox.com':['Gaming'],'ign.com':['Gaming','News & Media'],
  'paypal.com':['Finance & Banking'],'stripe.com':['Finance & Banking'],
  'hsbc.com':['Finance & Banking'],'citibank.com':['Finance & Banking'],
  'chase.com':['Finance & Banking'],'hangseng.com':['Finance & Banking'],
  'bochk.com':['Finance & Banking'],'hkex.com.hk':['Finance & Banking'],
  'wise.com':['Finance & Banking'],'revolut.com':['Finance & Banking'],
  'coinbase.com':['Cryptocurrency','Finance & Banking'],
  'binance.com':['Cryptocurrency'],'kraken.com':['Cryptocurrency'],
  'opensea.io':['Cryptocurrency'],'coingecko.com':['Cryptocurrency'],
  'amazon.com':['Shopping & E-Commerce'],'ebay.com':['Shopping & E-Commerce'],
  'shopify.com':['Shopping & E-Commerce'],'etsy.com':['Shopping & E-Commerce'],
  'aliexpress.com':['Shopping & E-Commerce'],'taobao.com':['Shopping & E-Commerce'],
  'jd.com':['Shopping & E-Commerce'],'hktvmall.com':['Shopping & E-Commerce'],
  'apple.com':['Technology','Shopping & E-Commerce'],
  'microsoft.com':['Technology','Software Development'],
  'ibm.com':['Technology'],'oracle.com':['Technology'],
  'salesforce.com':['Technology','SaaS'],'adobe.com':['Technology','SaaS'],
  'github.com':['Software Development'],'gitlab.com':['Software Development'],
  'stackoverflow.com':['Software Development','Forum & Community'],
  'aws.amazon.com':['Cloud Services'],'cloud.google.com':['Cloud Services'],
  'azure.microsoft.com':['Cloud Services'],'cloudflare.com':['Cloud Services'],
  'vercel.com':['Cloud Services','Software Development'],
  'dropbox.com':['Cloud Services','File Sharing'],
  'coursera.org':['Education'],'udemy.com':['Education'],
  'wikipedia.org':['Education','Reference'],
  'mit.edu':['Education'],'harvard.edu':['Education'],
  'hku.hk':['Education'],'cuhk.edu.hk':['Education'],
  'gov.hk':['Government'],'info.gov.hk':['Government'],
  'police.gov.hk':['Government'],'ird.gov.hk':['Government'],
  'usa.gov':['Government'],'gov.uk':['Government'],
  'who.int':['Healthcare'],'webmd.com':['Healthcare'],
  'mayoclinic.org':['Healthcare'],'ha.org.hk':['Healthcare'],
  'pornhub.com':['Adult Content'],'xvideos.com':['Adult Content'],
  'onlyfans.com':['Adult Content'],
  'bet365.com':['Gambling'],'draftkings.com':['Gambling'],
  'tinder.com':['Dating'],'match.com':['Dating'],'bumble.com':['Dating'],
  'nordvpn.com':['VPN & Proxy'],'expressvpn.com':['VPN & Proxy'],
  'torproject.org':['Privacy Tools'],
  'mega.nz':['File Sharing'],'wetransfer.com':['File Sharing'],
  'pastebin.com':['Paste Site'],
  'bit.ly':['URL Shortener'],'tinyurl.com':['URL Shortener'],
  't.co':['URL Shortener'],'rb.gy':['URL Shortener'],
  'cloudfront.net':['CDN & Infrastructure'],'fastly.net':['CDN & Infrastructure'],
  'booking.com':['Travel'],'airbnb.com':['Travel'],
  'expedia.com':['Travel'],'tripadvisor.com':['Travel'],
  'cathaypacific.com':['Travel'],'skyscanner.com':['Travel'],
  'doordash.com':['Food & Dining'],'ubereats.com':['Food & Dining'],
  'foodpanda.com':['Food & Dining'],'openrice.com':['Food & Dining'],
  'indeed.com':['Job Search'],'glassdoor.com':['Job Search'],
  'jobsdb.com':['Job Search'],
  'openai.com':['Generative AI','Technology'],
  'chat.openai.com':['Generative AI'],'claude.ai':['Generative AI'],
  'perplexity.ai':['Generative AI'],'gemini.google.com':['Generative AI'],
  'thepiratebay.org':['Torrent & P2P','Piracy'],
  '1337x.to':['Torrent & P2P','Piracy'],
};

const CATEGORY_KEYWORDS: Array<{keywords:string[];categories:string[]}> = [
  {keywords:['sport','nba','nfl','soccer','football','basketball','tennis','golf','cricket','rugby','hockey','boxing','wrestling','martial'],categories:['Sports']},
  {keywords:['news','herald','times','post','daily','gazette','press','journal','tribune','chronicle','reporter','media','broadcast'],categories:['News & Media']},
  {keywords:['bank','finance','invest','stock','trading','wallet','exchange','capital','fund','wealth','insurance','mortgage','loan','credit'],categories:['Finance & Banking']},
  {keywords:['bitcoin','ethereum','crypto','nft','defi','blockchain','coin','token','mining','ledger','web3'],categories:['Cryptocurrency']},
  {keywords:['shop','store','buy','mall','market','checkout','cart','deal','discount','sale','price','product','retail','ecommerce'],categories:['Shopping & E-Commerce']},
  {keywords:['game','gaming','esport','guild','quest','rpg','steam','gamer','play','xbox','playstation','nintendo','mmorpg','fps'],categories:['Gaming']},
  {keywords:['learn','course','school','university','college','academy','tutor','study','education','lecture','degree','campus','student'],categories:['Education']},
  {keywords:['gov','government','ministry','department','bureau','federal','municipal','council','senate','parliament','civic','public'],categories:['Government']},
  {keywords:['health','medical','clinic','hospital','pharma','doctor','patient','therapy','wellness','dental','surgery','diagnosis','medicine'],categories:['Healthcare']},
  {keywords:['travel','hotel','flight','booking','tour','vacation','airline','hostel','resort','cruise','trip','destination','airfare'],categories:['Travel']},
  {keywords:['porn','adult','xxx','sex','erotic','nsfw','nude','fetish'],categories:['Adult Content']},
  {keywords:['casino','bet','poker','gambling','lottery','wager','slots','jackpot','bingo','roulette','blackjack','sportsbook'],categories:['Gambling']},
  {keywords:['dating','tinder','single','romance','match','hookup','personals','cupid'],categories:['Dating']},
  {keywords:['vpn','proxy','anonymous','tunnel','unblock','bypass','hide','socks5','shadowsocks'],categories:['VPN & Proxy']},
  {keywords:['torrent','pirate','crack','warez','keygen','serial','nulled','cracked','p2p','magnet'],categories:['Torrent & P2P','Piracy']},
  {keywords:['phish','scam','fake','fraud','spoof','impersonat'],categories:['Phishing','Suspicious']},
  {keywords:['hack','exploit','malware','botnet','ransom','trojan','rootkit','keylog','backdoor','payload','shellcode','vulnerability','cve'],categories:['Hacking','Suspicious']},
  {keywords:['food','recipe','restaurant','dining','kitchen','cook','chef','meal','delivery','eat','menu','cuisine'],categories:['Food & Dining']},
  {keywords:['music','song','album','artist','lyrics','playlist','band','concert','dj','remix'],categories:['Music']},
  {keywords:['cloud','hosting','devops','deploy','server','container','docker','kubernetes','saas','paas','iaas'],categories:['Cloud Services']},
  {keywords:['ai','gpt','llm','chatbot','neural','openai','gemini','copilot','diffusion','transformer','deeplearn','machinelearn'],categories:['Generative AI','AI & Machine Learning']},
  {keywords:['tech','software','code','develop','program','engineer','debug','compile','api','framework','library','sdk'],categories:['Technology','Software Development']},
  {keywords:['blog','wordpress','medium','substack','newsletter','article','opinion','editorial'],categories:['Blog & Personal']},
  {keywords:['email','mail','smtp','imap','inbox','webmail','postfix'],categories:['Email & Messaging']},
  {keywords:['chat','messenger','messaging','signal','whatsapp','telegram','wechat','line'],categories:['Email & Messaging']},
  {keywords:['video','stream','watch','movie','film','cinema','tv','series','episode','anime','cartoon'],categories:['Streaming Media','Entertainment']},
  {keywords:['photo','image','gallery','picture','snapshot','camera','photography'],categories:['Photography & Images']},
  {keywords:['forum','community','discuss','board','thread','topic','answer','question'],categories:['Forum & Community']},
  {keywords:['wiki','encyclopedia','reference','dictionary','glossary','knowledge','library','archive'],categories:['Reference']},
  {keywords:['real','estate','property','apartment','house','rent','lease','condo','mortgage','realty'],categories:['Real Estate']},
  {keywords:['auto','car','vehicle','motor','drive','truck','suv','sedan','dealership'],categories:['Automotive']},
  {keywords:['fashion','clothing','apparel','wear','style','outfit','designer','boutique'],categories:['Fashion & Apparel']},
  {keywords:['pet','animal','dog','cat','vet','veterinary','puppy','kitten'],categories:['Pets & Animals']},
  {keywords:['weather','forecast','climate','temperature','rain','storm','meteorolog'],categories:['Weather']},
  {keywords:['legal','law','attorney','lawyer','court','justice','litigation','counsel'],categories:['Legal']},
  {keywords:['recruit','hire','job','career','resume','employment','talent','staffing'],categories:['Job Search']},
  {keywords:['charity','nonprofit','donate','volunteer','foundation','humanitarian','relief'],categories:['Charity & Nonprofit']},
  {keywords:['religion','church','mosque','temple','faith','spiritual','prayer','worship'],categories:['Religion & Spirituality']},
];

const TLD_CATEGORIES: Record<string,string[]> = {
  '.edu':['Education'],'.gov':['Government'],
  '.mil':['Government'],'.org':['Reference'],
  '.health':['Healthcare'],'.bank':['Finance & Banking'],
  '.sport':['Sports'],'.media':['News & Media'],
  '.travel':['Travel'],'.museum':['Education','Reference'],
  '.aero':['Travel'],'.coop':['Business & Economy'],
  '.jobs':['Job Search'],'.mobi':['Technology'],
  '.tel':['Technology'],'.pro':['Business & Economy'],
  '.church':['Religion & Spirituality'],
  '.casino':['Gambling'],'.bet':['Gambling'],
  '.dating':['Dating'],'.adult':['Adult Content'],
  '.sexy':['Adult Content'],'.porn':['Adult Content'],
  '.game':['Gaming'],'.games':['Gaming'],
  '.app':['Technology'],'.dev':['Software Development'],
  '.io':['Technology'],'.ai':['AI & Machine Learning','Technology'],
  '.tech':['Technology'],'.cloud':['Cloud Services'],
  '.shop':['Shopping & E-Commerce'],'.store':['Shopping & E-Commerce'],
  '.market':['Shopping & E-Commerce'],'.buy':['Shopping & E-Commerce'],
  '.news':['News & Media'],'.blog':['Blog & Personal'],
  '.video':['Streaming Media'],'.tv':['Streaming Media'],
  '.music':['Music'],'.film':['Entertainment'],
  '.food':['Food & Dining'],'.restaurant':['Food & Dining'],
  '.auto':['Automotive'],'.car':['Automotive'],'.cars':['Automotive'],
  '.fashion':['Fashion & Apparel'],'.style':['Fashion & Apparel'],
  '.beauty':['Fashion & Apparel'],
  '.law':['Legal'],'.legal':['Legal'],
  '.realty':['Real Estate'],'.property':['Real Estate'],
  '.photo':['Photography & Images'],'.photography':['Photography & Images'],
  '.wiki':['Reference'],
  '.chat':['Email & Messaging'],'.email':['Email & Messaging'],
  '.social':['Social Media'],
  '.finance':['Finance & Banking'],'.money':['Finance & Banking'],
  '.insurance':['Finance & Banking'],
};

// Dynamic DNS providers - domains hosted here are suspicious
const DYNAMIC_DNS_PROVIDERS: string[] = [
  'duckdns.org','no-ip.com','no-ip.org','noip.com',
  'ddns.net','dynu.com','freedns.afraid.org',
  'hopto.org','zapto.org','sytes.net','ddns.me',
  'linkpc.net','n-e.kr','r-e.kr','e-e.kr',
  'serveblog.net','servehttp.com','serveftp.com',
  'redirectme.net','bounceme.net','myftp.biz',
  'myftp.org','myvnc.com','synology.me',
  'myds.me','diskstation.me','dscloud.biz',
  'i234.me','myfritz.net','dyndns.org',
  'dyndns.tv','dyndns.info','changeip.com',
  'dns.army','dns.navy','ddnsking.com',
  'publicvm.com','kozow.com','gotdns.ch',
  'myddns.me','servecounterstrike.com',
  'servehalflife.com','servequake.com',
  'webhop.me','webredirect.org',
  'blogsyte.com','brasilia.me','cable-modem.org',
  'ciscofreak.com','collegefan.org',
  'couchpotatofries.org','damnserver.com',
  'ddns.info','ditchyourip.com','dnsfor.me',
  'dnsforfamily.com','eat-organic.net',
  'endofinternet.net','endofinternet.org',
  'from-ak.com','from-al.com','from-ar.com',
  'from-az.com','from-ca.com','from-co.com',
  'game-host.org','game-server.cc',
  'getmyip.com','giize.com','gleeze.com',
  'mypets.ws','myphotos.cc','scrapper-site.net',
  'twmail.cc','twmail.net','twmail.org',
];

// Suspicious TLDs commonly used in malware/phishing
const SUSPICIOUS_TLDS: string[] = [
  '.xyz','.top','.club','.work','.click',
  '.link','.info','.biz','.cc','.ws',
  '.tk','.ml','.ga','.cf','.gq',
  '.pw','.buzz','.rest','.icu','.cam',
  '.surf','.monster','.cyou','.cfd','.sbs',
  '.uno','.best','.loan','.win','.bid',
  '.stream','.racing','.download','.review',
  '.accountant','.cricket','.date','.faith',
  '.party','.science','.trade','.webcam',
  '.run','.ltd','.vip','.life','.site',
  '.online','.fun','.space','.host','.press',
  '.website','.rocks','.lol','.wang','.kim',
];

// Country-code TLDs for regional classification
const CCTLD_REGIONS: Record<string,string> = {
  '.cn':'China','.hk':'Hong Kong','.tw':'Taiwan','.jp':'Japan',
  '.kr':'South Korea','.sg':'Singapore','.my':'Malaysia',
  '.th':'Thailand','.vn':'Vietnam','.ph':'Philippines',
  '.in':'India','.au':'Australia','.nz':'New Zealand',
  '.uk':'United Kingdom','.de':'Germany','.fr':'France',
  '.it':'Italy','.es':'Spain','.nl':'Netherlands',
  '.ru':'Russia','.br':'Brazil','.mx':'Mexico',
  '.ca':'Canada','.us':'United States',
};

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
  return (ratio > 0.8 && name.length > 5) || hasDigitMix;
}

function getCountryFromCCTLD(domain: string): string | null {
  for (const [tld, country] of Object.entries(CCTLD_REGIONS)) {
    if (domain.endsWith(tld)) return country;
  }
  return null;
}

export function categorizeUrl(domain: string): string[] {
  let d = domain.toLowerCase();
  if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
  d = d.replace(/^www\./, '');

  const cats = new Set<string>();

  // 1. Exact domain match
  if (DOMAIN_CATEGORIES[d]) {
    DOMAIN_CATEGORIES[d].forEach(c => cats.add(c));
    return [...cats];
  }

  // 2. Parent domain match (e.g. sub.google.com -> google.com)
  for (const [key, c] of Object.entries(DOMAIN_CATEGORIES)) {
    if (d.endsWith('.' + key)) c.forEach(x => cats.add(x));
  }
  if (cats.size > 0) return [...cats];

  // 3. Dynamic DNS detection (HIGH PRIORITY)
  if (isDynamicDNS(d)) {
    cats.add('Dynamic DNS');
    cats.add('Suspicious');
    // Still check keywords for additional context
    const words = d.split(/[^a-z0-9]+/).join(' ');
    for (const rule of CATEGORY_KEYWORDS) {
      if (rule.keywords.some(kw => kw.length >= 4 && new RegExp('\b' + kw + '\b').test(words))) {
        rule.categories.forEach(c => cats.add(c));
      }
    }
    return [...cats];
  }

  // 4. TLD-based categories
  for (const [tld, c] of Object.entries(TLD_CATEGORIES)) {
    if (d.endsWith(tld)) c.forEach(x => cats.add(x));
  }

  // 5. Keyword-based categories
  const words = d.split(/[^a-z0-9]+/).join(' ');
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some(kw => kw.length >= 4 && new RegExp('\b' + kw + '\b').test(words))) {
      rule.categories.forEach(c => cats.add(c));
    }
  }

  // 6. If suspicious TLD and no category yet, mark suspicious
  if (hasSuspiciousTLD(d)) {
    cats.add('Suspicious TLD');
  }

  // 7. Random-looking domain name detection
  if (hasRandomLookingName(d)) {
    cats.add('Suspicious');
  }

  // 8. Country/region from ccTLD
  const country = getCountryFromCCTLD(d);
  if (country) {
    cats.add('Regional - ' + country);
  }

  // 9. Common infrastructure patterns
  if (/\b(cdn|cache|static|assets)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('CDN & Infrastructure');
  }
  if (/\b(api|gateway|endpoint)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('API & Web Services');
  }
  if (/\b(mail|smtp|mx)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('Email & Messaging');
  }
  if (/\b(ftp|upload|download|file)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('File Sharing');
  }
  if (/\b(login|auth|sso|account)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('Authentication');
  }
  if (/\b(tracker|analytics|pixel|telemetry)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('Tracking & Analytics');
  }
  if (/\b(adserver|adnetwork|adclick|adsense|adtech|doubleclick)\b/.test(d.split(/[^a-z0-9]+/).join(' '))) {
    cats.add('Advertising');
  }

  // 10. IP-based or numeric domains
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(d)) {
    cats.add('IP Address');
    cats.add('Suspicious');
  }

  // If we found any categories, return them
  if (cats.size > 0) return [...cats];

  // 11. Final fallback: classify based on general TLD type
  const parts = d.split('.');
  const tld = '.' + parts[parts.length - 1];
  if (['.com','.net','.org','.co'].includes(tld)) {
    return ['Uncategorized'];
  }

  return ['Uncategorized'];
}
