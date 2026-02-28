"use client"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ArrowUpRight, Rss, Shield, Filter, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
interface NewsArticle { id: string; title: string; summary: string; url: string; source: string; publishedAt: string; tags: string[]; importance: "high"|"medium"|"low" }
const tagColors: Record<string,string> = { AI:"bg-purple-500/10 text-purple-400 border-purple-500/20", Ransomware:"bg-red-500/10 text-red-400 border-red-500/20", Phishing:"bg-orange-500/10 text-orange-400 border-orange-500/20", "Data Breach":"bg-yellow-500/10 text-yellow-400 border-yellow-500/20", Vulnerability:"bg-rose-500/10 text-rose-400 border-rose-500/20", Malware:"bg-red-600/10 text-red-500 border-red-600/20", DLP:"bg-primary/10 text-primary border-primary/20", "Cloud Security":"bg-sky-500/10 text-sky-400 border-sky-500/20", Cybersecurity:"bg-accent/10 text-accent border-accent/20", "Hong Kong":"bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
const importBadge: Record<string,string> = { high:"bg-red-500/20 text-red-400", medium:"bg-yellow-500/20 text-yellow-400", low:"bg-muted text-muted-foreground" }
function timeAgo(d: string) { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60)return"just now"; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; if(s<604800)return`${Math.floor(s/86400)}d ago`; return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}) }
export function NewsFeedPage() {
  const { locale: language } = useLanguage()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string|null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const ps = 12
  useEffect(() => { fetchArticles() }, [page, activeTag])
  async function fetchArticles() {
    setLoading(true)
    try {
      const p = new URLSearchParams({page:page.toString(),pageSize:ps.toString(),status:"published",sortBy:"publishedAt"})
      if(activeTag) p.set("tag",activeTag)
      const r = await fetch(`/api/news-feed?${p}`)
      const d = await r.json()
      setArticles(d.items||[]); setTotal(d.total||0)
    } catch { setArticles([]) } finally { setLoading(false) }
  }
  const tags=["AI","Ransomware","Phishing","Data Breach","Vulnerability","Malware","DLP","Cloud Security","Hong Kong"]
  const tp=Math.ceil(total/ps)
  const hdr:Record<string,{title:string;subtitle:string}>={en:{title:"AI Cybersecurity News Feed",subtitle:"Real-time AI-curated cybersecurity intelligence from trusted sources"},"zh-TW":{title:"AI \u7db2\u7d61\u5b89\u5168\u65b0\u805e",subtitle:"\u5373\u6642 AI \u7be9\u9078\u5168\u7403\u53ef\u4fe1\u4f86\u6e90\u7684\u7db2\u7d61\u5b89\u5168\u60c5\u5831"},"zh-CN":{title:"AI \u7f51\u7edc\u5b89\u5168\u65b0\u95fb",subtitle:"\u5b9e\u65f6 AI \u7b5b\u9009\u5168\u7403\u53ef\u4fe1\u6765\u6e90\u7684\u7f51\u7edc\u5b89\u5168\u60c5\u62a5"}}
  const h=hdr[language]||hdr.en
  return (<>
    <PageHeader badge="AI News" headline={h.title} subheadline={h.subtitle} />
    <div className="container mx-auto px-4 py-6"><div className="flex items-center gap-2 flex-wrap"><Filter className="h-4 w-4 text-muted-foreground" /><button onClick={()=>{setActiveTag(null);setPage(1)}} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTag===null?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-muted/80"}`}>All</button>{tags.map(t=>(<button key={t} onClick={()=>{setActiveTag(t);setPage(1)}} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag===t?tagColors[t]||"bg-primary/10 text-primary border-primary/20":"bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>{t}</button>))}</div></div>
    <div className="container mx-auto px-4 pb-20">{loading?(<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>):articles.length===0?(<div className="text-center py-20"><Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4"/><p className="text-muted-foreground">{language==="en"?"No articles found. Check back soon!":"\u627e\u4e0d\u5230\u6587\u7ae0"}</p></div>):(<><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{articles.map((a,i)=>(<AnimateIn key={a.id} delay={i*0.05}><a href={a.url} target="_blank" rel="noopener noreferrer" className="group block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 h-full"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2"><Rss className="h-3 w-3 text-muted-foreground"/><span className="text-xs text-muted-foreground">{a.source}</span></div><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${importBadge[a.importance]}`}>{a.importance}</span></div><h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">{a.title}<ArrowUpRight className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"/></h3><p className="text-xs text-muted-foreground mb-4 line-clamp-3">{a.summary}</p><div className="flex items-center justify-between mt-auto"><div className="flex gap-1 flex-wrap">{a.tags.slice(0,3).map(t=>(<span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border ${tagColors[t]||"bg-muted text-muted-foreground border-transparent"}`}>{t}</span>))}</div><span className="text-[10px] text-muted-foreground">{timeAgo(a.publishedAt)}</span></div></a></AnimateIn>))}</div>{tp>1&&(<div className="flex items-center justify-center gap-2 mt-12"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 rounded-lg bg-muted text-sm font-medium disabled:opacity-50 hover:bg-muted/80">Previous</button><span className="text-sm text-muted-foreground px-4">{page}/{tp}</span><button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="px-4 py-2 rounded-lg bg-muted text-sm font-medium disabled:opacity-50 hover:bg-muted/80">Next</button></div>)}</>)}</div>
  </>)
}
