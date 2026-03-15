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
    'office.com':['Email & Messaging','Cloud Services'],'office365.com':['Email & Messaging','Cloud Services'],
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
  'olympics.com':['Sports'],'cricinfo.com':['Sports'],'livescore.com':['Sports'],'7m.com':['Gambling','Sports'],
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
  'hkjc.com':['Gambling','Sports'],'hkjc.com.hk':['Gambling','Sports'],
  'macauslot.com':['Gambling'],'sbobet.com':['Gambling','Sports'],
  'paddypower.com':['Gambling'],'williamhill.com':['Gambling'],
  'ladbrokes.com':['Gambling'],'888.com':['Gambling'],
  'pokerstars.com':['Gambling'],'betfair.com':['Gambling','Sports'],
  'unibet.com':['Gambling'],'bwin.com':['Gambling'],
  'betway.com':['Gambling'],'fanduel.com':['Gambling','Sports'],
  'mark6.com.hk':['Gambling'],'melco-resorts.com':['Gambling','Entertainment'],
  'galaxy-macau.com':['Gambling','Entertainment'],'venetianmacao.com':['Gambling','Entertainment'],
  'sjmresorts.com':['Gambling','Entertainment','Travel'],'sjmholdings.com':['Gambling','Entertainment'],
  'wynnresorts.com':['Gambling','Entertainment','Travel'],'wynnmacau.com':['Gambling','Entertainment'],
  'mgm.com':['Gambling','Entertainment'],'mgmresorts.com':['Gambling','Entertainment','Travel'],
  'sandschina.com':['Gambling','Entertainment'],'cotaistrip.com':['Gambling','Entertainment'],
  'studiocity-macau.com':['Gambling','Entertainment'],'grandlisboa.com':['Gambling','Entertainment'],
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
  '1337x.to':['Torrent & P2P','Piracy'],   'chatgpt.com':['Generative AI'],'copilot.microsoft.com':['Generative AI'],   'booking.com':['Travel'],'airbnb.com':['Travel'],   'uber.com':['Transportation'],'lyft.com':['Transportation'],   'weather.com':['Weather'],'accuweather.com':['Weather'],   'imdb.com':['Entertainment','Reference'],'rottentomatoes.com':['Entertainment'],   'craigslist.org':['Classifieds'],'zillow.com':['Real Estate'],   'webex.com':['Email & Messaging','Business & Economy'],   'teams.microsoft.com':['Email & Messaging','Business & Economy'],
    // v4.2 Extended domains for better coverage
  'example.com':['Reserved Domain'],'example.net':['Reserved Domain'],'example.org':['Reserved Domain'],
  'wix.com':['Web Hosting','Website Builder'],'squarespace.com':['Web Hosting','Website Builder'],
  'godaddy.com':['Web Hosting','Domain Services'],'namecheap.com':['Web Hosting','Domain Services'],
  'medium.com':['Blog & Personal','News & Media'],'substack.com':['Blog & Personal','News & Media'],
  'notion.so':['SaaS','Productivity'],'airtable.com':['SaaS','Productivity'],
  'figma.com':['SaaS','Software Development'],'canva.com':['SaaS','Design'],
  'trello.com':['SaaS','Productivity'],'asana.com':['SaaS','Productivity'],
  'hubspot.com':['SaaS','Marketing'],'mailchimp.com':['SaaS','Email & Messaging'],
  'zendesk.com':['SaaS','Customer Service'],'intercom.com':['SaaS','Customer Service'],
  'stripe.com':['Finance & Banking','SaaS'],'square.com':['Finance & Banking'],
  'robinhood.com':['Finance & Banking','Investment'],'etrade.com':['Finance & Banking','Investment'],
  'fidelity.com':['Finance & Banking','Investment'],'schwab.com':['Finance & Banking','Investment'],
  'ally.com':['Finance & Banking'],'sofi.com':['Finance & Banking'],
  'grammarly.com':['SaaS','Education'],'duolingo.com':['Education'],
  'khanacademy.org':['Education'],'edx.org':['Education'],
  'skillshare.com':['Education'],'masterclass.com':['Education','Entertainment'],
  'twitch.tv':['Streaming Media','Gaming'],'kick.com':['Streaming Media','Gaming'],
  'crunchyroll.com':['Streaming Media','Entertainment'],'funimation.com':['Streaming Media','Entertainment'],
  'hbomax.com':['Streaming Media','Entertainment'],'peacocktv.com':['Streaming Media','Entertainment'],
  'primevideo.com':['Streaming Media','Entertainment'],'paramountplus.com':['Streaming Media','Entertainment'],
  'nike.com':['Shopping & E-Commerce','Fashion & Apparel'],'adidas.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'walmart.com':['Shopping & E-Commerce'],'target.com':['Shopping & E-Commerce'],
  'bestbuy.com':['Shopping & E-Commerce','Technology'],'newegg.com':['Shopping & E-Commerce','Technology'],
  'costco.com':['Shopping & E-Commerce'],'wayfair.com':['Shopping & E-Commerce','Home & Garden'],
  'ikea.com':['Shopping & E-Commerce','Home & Garden'],
  'akamai.net':['CDN & Infrastructure'],'jsdelivr.net':['CDN & Infrastructure'],
  'unpkg.com':['CDN & Infrastructure'],'cdnjs.cloudflare.com':['CDN & Infrastructure'],
  'digitalocean.com':['Cloud Services'],'linode.com':['Cloud Services'],
  'heroku.com':['Cloud Services','Software Development'],'netlify.com':['Cloud Services','Software Development'],
  'render.com':['Cloud Services','Software Development'],'fly.io':['Cloud Services'],
  'docker.com':['Software Development'],'npm.js':['Software Development'],
  'pypi.org':['Software Development'],'npmjs.com':['Software Development'],
  'crates.io':['Software Development'],'rubygems.org':['Software Development'],
  'datadog.com':['SaaS','Monitoring'],'newrelic.com':['SaaS','Monitoring'],
  'sentry.io':['SaaS','Software Development'],'grafana.com':['SaaS','Monitoring'],
  'cloudflare.com':['Cloud Services','CDN & Infrastructure'],
  'ahrefs.com':['SaaS','Marketing'],'semrush.com':['SaaS','Marketing'],
  'moz.com':['SaaS','Marketing'],'similarweb.com':['SaaS','Marketing'],
  'whatsapp.com':['Email & Messaging'],'line.me':['Email & Messaging'],
  'viber.com':['Email & Messaging'],'kakaotalk.com':['Email & Messaging'],
  'webex.com':['Email & Messaging','Business & Economy'],
  'uber.com':['Transportation'],'lyft.com':['Transportation'],'grab.com':['Transportation'],
  'doordash.com':['Food & Dining'],'grubhub.com':['Food & Dining'],
  'yelp.com':['Food & Dining','Reference'],'zomato.com':['Food & Dining'],
  'naver.com':['Search Engine','News & Media'],'yandex.com':['Search Engine'],
  'dw.com':['News & Media'],'aljazeera.com':['News & Media'],'apnews.com':['News & Media'],
  'theguardian.com':['News & Media'],'washingtonpost.com':['News & Media'],
  'foxnews.com':['News & Media'],'nbcnews.com':['News & Media'],
  'abcnews.go.com':['News & Media'],'cbsnews.com':['News & Media'],
  'forbes.com':['News & Media','Business & Economy'],'fortune.com':['News & Media','Business & Economy'],
  'wired.com':['News & Media','Technology'],'arstechnica.com':['News & Media','Technology'],
  'engadget.com':['News & Media','Technology'],'zdnet.com':['News & Media','Technology'],
  'cnet.com':['News & Media','Technology'],'tomshardware.com':['News & Media','Technology'],
  'pcmag.com':['News & Media','Technology'],
  'arxiv.org':['Education','Reference'],'researchgate.net':['Education','Reference'],
  'scholar.google.com':['Education','Reference'],'jstor.org':['Education','Reference'],
  'archive.org':['Reference'],'gutenberg.org':['Reference','Education'],
  'quora.com':['Forum & Community','Reference'],
  'producthunt.com':['Technology','Forum & Community'],
  'hackernews.com':['Technology','Forum & Community'],'news.ycombinator.com':['Technology','Forum & Community'],
  'deviantart.com':['Entertainment','Photography & Images'],
  'flickr.com':['Photography & Images'],'unsplash.com':['Photography & Images'],
  'pexels.com':['Photography & Images'],'shutterstock.com':['Photography & Images'],
  'gettyimages.com':['Photography & Images'],
  'behance.net':['Design','Photography & Images'],'dribbble.com':['Design'],
  'fiverr.com':['Business & Economy','Job Search'],'upwork.com':['Business & Economy','Job Search'],
  'freelancer.com':['Business & Economy','Job Search'],
  'surveymonkey.com':['SaaS','Business & Economy'],'typeform.com':['SaaS','Business & Economy'],
  'calendly.com':['SaaS','Productivity'],'doodle.com':['SaaS','Productivity'],
  'loom.com':['SaaS','Productivity'],'miro.com':['SaaS','Productivity'],
  '1password.com':['Security'],'lastpass.com':['Security'],'bitwarden.com':['Security'],
  'malwarebytes.com':['Security'],'kaspersky.com':['Security'],'norton.com':['Security'],
  'mcafee.com':['Security'],'avast.com':['Security'],
  'zscaler.com':['Security','Cloud Services'],'paloaltonetworks.com':['Security'],
  'crowdstrike.com':['Security'],'fortinet.com':['Security'],
  'cisco.com':['Technology','Networking'],'juniper.net':['Technology','Networking'],
  'arista.com':['Technology','Networking'],'vmware.com':['Technology','Cloud Services'],
  'dell.com':['Technology','Shopping & E-Commerce'],'hp.com':['Technology','Shopping & E-Commerce'],
  'lenovo.com':['Technology','Shopping & E-Commerce'],'asus.com':['Technology','Shopping & E-Commerce'],
  'samsung.com':['Technology','Shopping & E-Commerce'],'sony.com':['Technology','Entertainment'],
  'lg.com':['Technology','Shopping & E-Commerce'],
  'reuters.com':['News & Media'],'ap.org':['News & Media'],
  // v4.6 Extended domains - Major coverage improvements
  // Gambling - Extended
  'hkjc.com':['Gambling','Sports'],'betfair.com':['Gambling'],'williamhill.com':['Gambling'],
  'paddypower.com':['Gambling'],'ladbrokes.com':['Gambling'],'coral.co.uk':['Gambling'],
  '888.com':['Gambling'],'pokerstars.com':['Gambling'],'partypoker.com':['Gambling'],
  'betway.com':['Gambling'],'unibet.com':['Gambling'],'bwin.com':['Gambling'],
  'pinnacle.com':['Gambling'],'sbobet.com':['Gambling'],'maxbet.com':['Gambling'],
  'fun88.com':['Gambling'],'w88.com':['Gambling'],'12bet.com':['Gambling'],
  'dafabet.com':['Gambling'],'m88.com':['Gambling'],'188bet.com':['Gambling'],
  'happyvalley.hk':['Gambling','Entertainment'],
  'venetianmacao.com':['Gambling','Entertainment','Travel'],
  'cotaistrip.com':['Gambling','Entertainment','Travel'],
  'casinolisboa.com':['Gambling','Entertainment'],
  'grandlisboa.com':['Gambling','Entertainment'],
  'fanduel.com':['Gambling','Sports'],'caesars.com':['Gambling','Entertainment'],
  'mgmresorts.com':['Gambling','Entertainment','Travel'],
  'lasvegassands.com':['Gambling','Entertainment'],
  'wynresorts.com':['Gambling','Entertainment','Travel'],
  'hardrock.com':['Gambling','Entertainment'],
  // Adult Content - Extended
  'xhamster.com':['Adult Content'],'redtube.com':['Adult Content'],
  'youporn.com':['Adult Content'],'tube8.com':['Adult Content'],
  'brazzers.com':['Adult Content'],'chaturbate.com':['Adult Content'],
  'stripchat.com':['Adult Content'],'bongacams.com':['Adult Content'],
  'cam4.com':['Adult Content'],'livejasmin.com':['Adult Content'],
  'pornhub.com':['Adult Content'],'xnxx.com':['Adult Content'],
  'spankbang.com':['Adult Content'],'eporner.com':['Adult Content'],
  // China/HK Popular Domains
  'wechat.com':['Email & Messaging','Social Media'],'weixin.qq.com':['Email & Messaging','Social Media'],
  'qq.com':['Email & Messaging','Social Media'],'douyin.com':['Social Media','Streaming Media'],
  'xiaohongshu.com':['Social Media','Shopping & E-Commerce'],
  'zhihu.com':['Forum & Community','Education'],
  'douban.com':['Entertainment','Forum & Community'],
  'tmall.com':['Shopping & E-Commerce'],'pinduoduo.com':['Shopping & E-Commerce'],
  'meituan.com':['Food & Dining','Shopping & E-Commerce'],
  'ele.me':['Food & Dining'],'dianping.com':['Food & Dining','Reference'],
  'ctrip.com':['Travel'],'trip.com':['Travel'],'qunar.com':['Travel'],
  'alipay.com':['Finance & Banking'],'ant.com':['Finance & Banking'],
  'tenpay.com':['Finance & Banking'],
  'icbc.com.cn':['Finance & Banking'],'ccb.com':['Finance & Banking'],
  'boc.cn':['Finance & Banking'],'abchina.com':['Finance & Banking'],
  'cmbchina.com':['Finance & Banking'],'bankcomm.com':['Finance & Banking'],
  'standardchartered.com.hk':['Finance & Banking'],
  'dbs.com.hk':['Finance & Banking'],'sc.com':['Finance & Banking'],
  'hkma.gov.hk':['Government','Finance & Banking'],
  'sfc.hk':['Government','Finance & Banking'],
  'ifeng.com':['News & Media'],'sohu.com':['News & Media'],
  'xinhuanet.com':['News & Media'],'people.com.cn':['News & Media'],
  'chinadaily.com.cn':['News & Media'],
  'thestandard.com.hk':['News & Media'],'hkfp.com':['News & Media'],
  'ejinsight.com':['News & Media'],'bastillepost.com':['News & Media'],
  'on.cc':['News & Media'],'orientaldaily.on.cc':['News & Media'],
  'am730.com.hk':['News & Media'],'hket.com':['News & Media'],
  'singtao.com':['News & Media'],'takungpao.com':['News & Media'],
  // More Shopping (Asia)
  'lazada.com':['Shopping & E-Commerce'],'shopee.com':['Shopping & E-Commerce'],
  'zalora.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'uniqlo.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'zara.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'hm.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'asos.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'sephora.com':['Shopping & E-Commerce','Fashion & Apparel'],
  'strawberrynet.com':['Shopping & E-Commerce'],
  'price.com.hk':['Shopping & E-Commerce','Reference'],
  'gmarket.co.kr':['Shopping & E-Commerce'],
  'rakuten.co.jp':['Shopping & E-Commerce'],
  'mercari.com':['Shopping & E-Commerce'],
  // More Streaming/Entertainment
  'pandora.com':['Music','Streaming Media'],'deezer.com':['Music','Streaming Media'],
  'applemusic.com':['Music','Streaming Media'],'music.apple.com':['Music','Streaming Media'],
  'music.youtube.com':['Music','Streaming Media'],
  'tv.apple.com':['Streaming Media','Entertainment'],
  'discoveryplus.com':['Streaming Media','Entertainment'],
  'showtime.com':['Streaming Media','Entertainment'],
  'starz.com':['Streaming Media','Entertainment'],
  'mytvsuper.com':['Streaming Media','Entertainment'],
  'viu.com':['Streaming Media','Entertainment'],
  'wetv.vip':['Streaming Media','Entertainment'],
  'mgtv.com':['Streaming Media','Entertainment'],
  'youku.com':['Streaming Media','Entertainment'],
  // VPN & Proxy - Extended
  'surfshark.com':['VPN & Proxy'],'cyberghostvpn.com':['VPN & Proxy'],
  'privateinternetaccess.com':['VPN & Proxy'],'protonvpn.com':['VPN & Proxy'],
  'mullvad.net':['VPN & Proxy'],'ipvanish.com':['VPN & Proxy'],
  'windscribe.com':['VPN & Proxy'],'hide.me':['VPN & Proxy'],
  'purevpn.com':['VPN & Proxy'],'astrill.com':['VPN & Proxy'],
  // Typosquatting/Phishing common
  'googel.com':['Phishing','Suspicious'],'gogle.com':['Phishing','Suspicious'],
  'gooogle.com':['Phishing','Suspicious'],'g00gle.com':['Phishing','Suspicious'],
  'faceb00k.com':['Phishing','Suspicious'],'faceboook.com':['Phishing','Suspicious'],
  'arnazon.com':['Phishing','Suspicious'],'armazon.com':['Phishing','Suspicious'],
  'arnazon.com':['Phishing','Suspicious'],'armazon.com':['Phishing','Suspicious'],
  'paypa1.com':['Phishing','Suspicious'],'paypaI.com':['Phishing','Suspicious'],
  'mircosoft.com':['Phishing','Suspicious'],'micorsoft.com':['Phishing','Suspicious'],
  'microsfot.com':['Phishing','Suspicious'],'microsotf.com':['Phishing','Suspicious'],
  'netfliix.com':['Phishing','Suspicious'],'netfl1x.com':['Phishing','Suspicious'],
  'lnstagram.com':['Phishing','Suspicious'],'1nstagram.com':['Phishing','Suspicious'],
  'twltter.com':['Phishing','Suspicious'],'tw1tter.com':['Phishing','Suspicious'],
  'linkedln.com':['Phishing','Suspicious'],'llnkedin.com':['Phishing','Suspicious'],
  'app1e.com':['Phishing','Suspicious'],'appIe.com':['Phishing','Suspicious'],
  // More Finance/Crypto
  'crypto.com':['Cryptocurrency','Finance & Banking'],
  'blockchain.com':['Cryptocurrency'],'gemini.com':['Cryptocurrency'],
  'ftx.com':['Cryptocurrency'],'kucoin.com':['Cryptocurrency'],
  'bitfinex.com':['Cryptocurrency'],'huobi.com':['Cryptocurrency'],
  'okx.com':['Cryptocurrency'],'bybit.com':['Cryptocurrency'],
  'gate.io':['Cryptocurrency'],'mexc.com':['Cryptocurrency'],
  'uniswap.org':['Cryptocurrency','Finance & Banking'],
  'aave.com':['Cryptocurrency','Finance & Banking'],
  'lido.fi':['Cryptocurrency'],'curve.fi':['Cryptocurrency'],
  // Weapons & Controversial
  'gunbroker.com':['Weapons'],'budsgunshop.com':['Weapons'],
  'palmettostatearmory.com':['Weapons'],'smith-wesson.com':['Weapons'],
  // More Education
  'udacity.com':['Education'],'codecademy.com':['Education','Software Development'],
  'pluralsight.com':['Education','Software Development'],
  'linkedin.com/learning':['Education'],
  'brilliant.org':['Education'],'ted.com':['Education','Entertainment'],
  'hkust.edu.hk':['Education'],'polyu.edu.hk':['Education'],
  'cityu.edu.hk':['Education'],'ln.edu.hk':['Education'],
  'eduhk.hk':['Education'],'hkbu.edu.hk':['Education'],
  // More Social Media
  'threads.net':['Social Media'],'mastodon.social':['Social Media'],
  'tumblr.com':['Social Media','Blog & Personal'],
  'lemon8-app.com':['Social Media'],
  'clubhouse.com':['Social Media'],
  'kuaishou.com':['Social Media','Streaming Media'],
  // Dating - Extended
  'hinge.co':['Dating'],'okcupid.com':['Dating'],
  'pof.com':['Dating'],'grindr.com':['Dating'],
  'tantan.com':['Dating'],'momo.com':['Dating','Social Media'],
  // Real Estate HK
  '28hse.com':['Real Estate'],'midland.com.hk':['Real Estate'],
  'centaline.com':['Real Estate'],'ricacorp.com':['Real Estate'],
  'squarefoot.com.hk':['Real Estate'],'spacious.hk':['Real Estate'],
  'hongkongproperty.com':['Real Estate'],
  // More Travel
  'agoda.com':['Travel'],'klook.com':['Travel','Entertainment'],
  'kkday.com':['Travel','Entertainment'],
  'hotels.com':['Travel'],'trivago.com':['Travel'],
  'hkexpress.com':['Travel'],'hongkongairlines.com':['Travel'],
  'dragonair.com':['Travel'],'airasia.com':['Travel'],
  // ISP/Telecom
  'pccw.com':['Technology','Telecommunications'],
  'hkt.com':['Technology','Telecommunications'],
  '3hk.com.hk':['Technology','Telecommunications'],
  'smartone.com':['Technology','Telecommunications'],
  'chinaunicom.com.hk':['Technology','Telecommunications'],
  'cmhk.com':['Technology','Telecommunications'],
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
  return (ratio > 0.7 && name.length >= 3) || hasDigitMix;
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


  // 2.5 Typosquatting detection for major brands
  const TYPOSQUAT_BRANDS: Record<string, {patterns: RegExp[]; category: string[]}> = {
    'google': {patterns: [/^g[o0]{1,3}g[e3]?l[e3]?\./, /^go+gle\./, /^googl[e3]\./], category: ['Search Engine','Suspicious','Typosquatting']},
    'facebook': {patterns: [/^f[a4]c[e3]b[o0]{1,2}k\./, /^facebo+k\./], category: ['Social Media','Suspicious','Typosquatting']},
    'amazon': {patterns: [/^[a4]m[a4]z[o0]n\./, /^amaz[o0]n[s5]?\./], category: ['Shopping & E-Commerce','Suspicious','Typosquatting']},
    'microsoft': {patterns: [/^m[i1]cr[o0]s[o0]ft\./, /^micros[o0]ft\./], category: ['Technology','Suspicious','Typosquatting']},
    'apple': {patterns: [/^[a4]pp[l1][e3]\./, /^aple\./], category: ['Technology','Suspicious','Typosquatting']},
    'paypal': {patterns: [/^p[a4]yp[a4][l1]\./, /^paypa[l1]\./], category: ['Finance & Banking','Suspicious','Typosquatting']},
    'netflix': {patterns: [/^n[e3]tf[l1][i1]x\./, /^netfl[i1]x\./], category: ['Streaming Media','Suspicious','Typosquatting']},
  };
  for (const [brand, info] of Object.entries(TYPOSQUAT_BRANDS)) {
    const knownDomain = brand + '.com';
    if (d !== knownDomain && d !== 'www.' + knownDomain) {
      for (const pat of info.patterns) {
        if (pat.test(d)) {
          info.category.forEach(c => cats.add(c));
          return [...cats];
        }
      }
    }
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

  // 5.5 Substring-based matching for commonly embedded category terms
  const SUBSTRING_RULES: Array<{substrings: string[]; categories: string[]}> = [
    {substrings: ['slot','casino','poker','roulette','blackjack','jackpot','bingo','lottery','gambl','sportsbet','wager','betting'], categories: ['Gambling']},
    {substrings: ['porn','xxx','nsfw','adult','erotic'], categories: ['Adult Content']},
    {substrings: ['phish','scam','fraud'], categories: ['Phishing','Suspicious']},
    {substrings: ['torrent','pirate','warez','crack','keygen'], categories: ['Torrent & P2P','Piracy']},
    {substrings: ['vpngate','proxyfree','unblock'], categories: ['VPN & Proxy']},
  ];
  const domainBase = d.split('.').slice(0, -1).join('');
  for (const rule of SUBSTRING_RULES) {
    if (rule.substrings.some(s => domainBase.includes(s))) {
      rule.categories.forEach(c => cats.add(c));
    }
  }
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

    const parts = d.split('.');    
  // 11. Suspicious multi-level subdomain on unknown parent domain
  // e.g. cacfn.despacito5.com, abc123.unknowndomain.com
  if (parts.length >= 3) {
    const parentDomain = parts.slice(-2).join('.');
    if (!DOMAIN_CATEGORIES[parentDomain]) {
      // Parent domain is not known - check if subdomain looks suspicious
      const subdomain = parts.slice(0, -2).join('.');
      if (hasRandomLookingName(d) || subdomain.length <= 6 || /\d/.test(subdomain)) {
        cats.add('Suspicious Subdomain');
        cats.add('Suspicious');
      }
    }
  }

  // 12. Unknown but has digits in domain name (common in DGA/malware)
  if (cats.size === 0 && /\d{2,}/.test(parts.slice(0, -1).join('.'))) {
    cats.add('Suspicious');
  }

  if (cats.size > 0) return [...cats];

  return ['Uncategorized'];
}


// =============================================
// Cloudflare Intel API Integration v4.0
// Commercial-grade URL categorization via Cloudflare
// =============================================

interface CfConfig {
  accountId: string;
  apiToken: string;
}

interface CfCacheEntry {
  categories: string[];
  timestamp: number;
}

const CF_CACHE = new Map<string, CfCacheEntry>();
const CF_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCfConfig(): CfConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

// Cloudflare category ID to human-readable name mapping
const CF_CATEGORY_MAP: Record<number, string> = {
  1: 'Technology', 2: 'Education', 3: 'Business & Economy',
  4: 'Government', 5: 'News & Media', 6: 'Entertainment',
  7: 'Shopping & E-Commerce', 8: 'Sports', 9: 'Health & Medicine',
  10: 'Travel', 11: 'Society', 12: 'Finance & Banking',
  13: 'Real Estate', 14: 'Reference', 15: 'Science',
  16: 'Recreation', 17: 'Automotive', 18: 'Food & Dining',
  19: 'Arts', 20: 'Fashion & Apparel', 21: 'Legal',
  22: 'Religion & Spirituality', 23: 'Pets & Animals',
  24: 'Weather', 25: 'Job Search', 26: 'Military',
  27: 'Personal Sites & Blogs', 28: 'Photography & Images',
  29: 'Home & Garden', 30: 'Kids & Family',
  32: 'Gambling', 33: 'Dating', 34: 'Adult Content',
  35: 'Alcohol & Tobacco', 36: 'Drugs', 37: 'Weapons',
  38: 'Violence', 39: 'Hate & Discrimination',
  40: 'Abortion', 41: 'Nudity',
  64: 'Social Media', 65: 'Email & Messaging',
  66: 'Streaming Media', 67: 'Gaming',
  68: 'Software Development', 69: 'Cloud Services',
  70: 'File Sharing', 71: 'VPN & Proxy',
  72: 'Generative AI', 73: 'Cryptocurrency',
  80: 'Search Engine', 81: 'Forum & Community',
  82: 'Advertising', 83: 'CDN & Infrastructure',
  84: 'URL Shortener', 85: 'Paste Site',
  // Security categories
  128: 'Malware', 129: 'Phishing', 130: 'Spam',
  131: 'Spyware', 132: 'Botnet', 133: 'Dynamic DNS',
  134: 'Newly Seen Domain', 135: 'Parked Domain',
  136: 'Suspicious', 137: 'Command & Control',
  138: 'DGA Domain',
};

async function queryCloudflareIntel(domain: string): Promise<string[]> {
  const config = getCfConfig();
  if (!config) return [];

  // Check cache first
  const cached = CF_CACHE.get(domain);
  if (cached && (Date.now() - cached.timestamp) < CF_CACHE_TTL) {
    return cached.categories;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/intel/domain?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

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
    if (data?.result?.application?.name) {
      cats.push(data.result.application.name);
    }

    // Cache the result
    CF_CACHE.set(domain, { categories: cats, timestamp: Date.now() });
    return cats;
  } catch {
    return [];
  }
}

// Batch query Cloudflare Intel for multiple domains
async function queryCloudflareIntelBatch(domains: string[]): Promise<Map<string, string[]>> {
  const config = getCfConfig();
  const result = new Map<string, string[]>();
  if (!config) return result;

  // Process in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const promises = batch.map(async (d) => {
      const cats = await queryCloudflareIntel(d);
      return { domain: d, categories: cats };
    });
    try {
      const results = await Promise.allSettled(promises);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.categories.length > 0) {
          result.set(r.value.domain, r.value.categories);
        }
      }
    } catch { continue; }
  }
  return result;
}

// Main async categorization: Cloudflare API first, local fallback
export async function categorizeUrlAsync(domain: string): Promise<string[]> {
  let d = domain.toLowerCase();
  if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
  d = d.replace(/^www\./, '');

  // 1. Try local exact match first (instant, no API call needed)
  if (DOMAIN_CATEGORIES[d]) return DOMAIN_CATEGORIES[d];
  for (const [key, c] of Object.entries(DOMAIN_CATEGORIES)) {
    if (d.endsWith('.' + key)) return c;
  }

  // 2. Try Cloudflare Intel API
  const cfCats = await queryCloudflareIntel(d);
  if (cfCats.length > 0) return cfCats;

  // 3. Fallback to local heuristic categorization
  return categorizeUrl(domain);
}

// Check if Cloudflare API is configured
export function isCloudflareIntelConfigured(): boolean {
  return getCfConfig() !== null;
}

// Export batch query for use in threat-intel
export { queryCloudflareIntelBatch };
