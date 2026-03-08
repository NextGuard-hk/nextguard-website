// lib/url-categories.ts
// Enterprise URL Categorization Engine
// Provides accurate category for every URL - clean or malicious

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
  'jobsdb.com':['Job Search'],'linkedin.com':['Job Search','Social Media'],
  'openai.com':['Generative AI','Technology'],
  'chat.openai.com':['Generative AI'],'claude.ai':['Generative AI'],
  'perplexity.ai':['Generative AI'],'gemini.google.com':['Generative AI'],
  'thepiratebay.org':['Torrent & P2P','Piracy'],
  '1337x.to':['Torrent & P2P','Piracy'],
};

const CATEGORY_KEYWORDS: Array<{keywords:string[];categories:string[]}> = [
  {keywords:['sport','nba','nfl','soccer','football','basketball','tennis','golf'],categories:['Sports']},
  {keywords:['news','herald','times','post','daily','gazette','press','journal'],categories:['News & Media']},
  {keywords:['bank','finance','invest','stock','trading','wallet','exchange'],categories:['Finance & Banking']},
  {keywords:['bitcoin','ethereum','crypto','nft','defi','blockchain','coin'],categories:['Cryptocurrency']},
  {keywords:['shop','store','buy','mall','market','checkout','cart'],categories:['Shopping & E-Commerce']},
  {keywords:['game','gaming','esport','guild','quest','rpg','steam'],categories:['Gaming']},
  {keywords:['learn','course','school','university','college','academy'],categories:['Education']},
  {keywords:['gov','government','ministry','department','bureau'],categories:['Government']},
  {keywords:['health','medical','clinic','hospital','pharma','doctor'],categories:['Healthcare']},
  {keywords:['travel','hotel','flight','booking','tour','vacation','airline'],categories:['Travel']},
  {keywords:['porn','adult','xxx','sex','erotic'],categories:['Adult Content']},
  {keywords:['casino','bet','poker','gambling','lottery','wager'],categories:['Gambling']},
  {keywords:['dating','tinder','single','romance'],categories:['Dating']},
  {keywords:['vpn','proxy','anonymous','tunnel'],categories:['VPN & Proxy']},
  {keywords:['torrent','pirate','crack','warez','keygen'],categories:['Torrent & P2P','Piracy']},
  {keywords:['phish','scam','fake','fraud','spoof'],categories:['Phishing','Suspicious']},
  {keywords:['hack','exploit','malware','botnet','ransom','trojan'],categories:['Hacking','Suspicious']},
  {keywords:['food','recipe','restaurant','dining','kitchen'],categories:['Food & Dining']},
  {keywords:['music','song','album','artist','lyrics','playlist'],categories:['Music']},
  {keywords:['cloud','hosting','devops','deploy'],categories:['Cloud Services']},
  {keywords:['ai','gpt','llm','chatbot','neural','openai','gemini'],categories:['Generative AI','AI & Machine Learning']},
];

const TLD_CATEGORIES: Record<string,string[]> = {
  '.edu':['Education'],'.gov':['Government'],
  '.mil':['Government'],'.org':['Reference'],
  '.health':['Healthcare'],'.bank':['Finance & Banking'],
  '.sport':['Sports'],'.media':['News & Media'],
};

export function categorizeUrl(domain: string): string[] {
  const d = domain.toLowerCase().replace(/^www\./, '');
  const cats = new Set<string>();
  if (DOMAIN_CATEGORIES[d]) {
    DOMAIN_CATEGORIES[d].forEach(c => cats.add(c));
    return [...cats];
  }
  for (const [key, c] of Object.entries(DOMAIN_CATEGORIES)) {
    if (d.endsWith('.' + key)) c.forEach(x => cats.add(x));
  }
  if (cats.size > 0) return [...cats];
  for (const [tld, c] of Object.entries(TLD_CATEGORIES)) {
    if (d.endsWith(tld)) c.forEach(x => cats.add(x));
  }
  const words = d.split(/[^a-z0-9]+/).join(' ');
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some(kw => words.includes(kw))) {
      rule.categories.forEach(c => cats.add(c));
    }
  }
  return cats.size > 0 ? [...cats] : ['Uncategorized'];
}
