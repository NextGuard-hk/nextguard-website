"use client"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ArrowUpRight, Rss, Shield, Filter, Loader2, Newspaper } from "lucide-react"
import { useEffect, useState } from "react"
interface NewsArticle { id: string; title: string; summary: string; url: string; source: string; publishedAt: string; tags: string[]; importance: "high"|"medium"|"low" }
const tagColors: Record<string,string> = { AI:"bg-purple-500/10 text-purple-400 border-purple-500/20", Ransomware:"bg-red-500/10 text-red-400 border-red-500/20", Phishing:"bg-orange-500/10 text-orange-400 border-orange-500/20", "Data Breach":"bg-yellow-500/10 text-yellow-400 border-yellow-500/20", Vulnerability:"bg-rose-500/10 text-rose-400 border-rose-500/20", Malware:"bg-red-600/10 text-red-500 border-red-600/20", DLP:"bg-primary/10 text-primary border-primary/20", "Cloud Security":"bg-sky-500/10 text-sky-400 border-sky-500/20", Cybersecurity:"bg-accent/10 text-accent border-accent/20", "Hong Kong":"bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
const importBadge: Record<string,string> = { high:"bg-red-500/20 text-red-400", medium:"bg-yellow-500/20 text-yellow-400", low:"bg-muted text-muted-foreground" }

// Source filter groups for HK news
const sourceFilters = [
  { label: "Wepro180", value: "Wepro180", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  { label: "HK01", value: "HK01 Tech", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { label: "ezone.hk", value: "ezone.hk", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { label: "HKCERT", value: "HKCERT", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "RTHK", value: "RTHK Local News", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { label: "TVB News", value: "TVB News Tech", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
]

function timeAgo(d: string) { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60)return"just now"; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; if(s<604800)return`${Math.floor(s/86400)}d ago`; return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}) }
export function NewsFeedPage() {
  const { locale: language } = useLanguage()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string|null>(null)
  const [activeSource, setActiveSource] = useState<string|null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const ps = 12
  useEffect(() => { fetchArticles() }, [page, activeTag, activeSource])
  async function fetchArticles() {
    setLoading(true)
    try {
      const p = new URLSearchParams({page:page.toString(),pageSize:ps.toString(),status:"published",sortBy:"publishedAt"})
      if(activeTag) p.set("tag",activeTag)
      if(activeSource) p.set("source",activeSource)
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
    <PageHeader badge="AI News" title={h.title} subtitle={h.subtitle} />
    <section className="py-8 px-4 max-w-6xl mx-auto">
      {/* Tag Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <button onClick={()=>{setActiveTag(null);setActiveSource(null);setPage(1)}} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTag===null&&activeSource===null?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-muted/80"}`}>All</button>
        {tags.map(t=>(<button key={t} onClick={()=>{setActiveTag(t);setActiveSource(null);setPage(1)}} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag===t?tagColors[t]||"bg-primary/10 text-primary border-primary/20":"bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>{t}</button>))}
      </div>
      {/* Source Filters - HK News */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Newspaper className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">{language==="zh-TW"?"\u4f86\u6e90":language==="zh-CN"?"\u6765\u6e90":"Source"}:</span>
        {sourceFilters.map(s=>(<button key={s.value} onClick={()=>{setActiveSource(activeSource===s.value?null:s.value);setActiveTag(null);setPage(1)}} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeSource===s.value?s.color:"bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>{s.label}</button>))}
      </div>
      {loading?(
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ):articles.length===0?(
        <div className="text-center py-20 text-muted-foreground">
          {language==="en"?"No articles found. Check back soon!":"\u627e\u4e0d\u5230\u6587\u7ae0"}
        </div>
      ):(<>
        <div className="space-y-4">
          {articles.map((a,i)=>(
            <AnimateIn key={a.id} delay={i*50}>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="block p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <Rss className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{a.source}</span>
                  <span className="ml-auto">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${importBadge[a.importance]}`}>{a.importance}</span>
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">{a.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {a.tags.slice(0,3).map(t=>(<span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border ${tagColors[t]||"bg-muted text-muted-foreground border-muted"}`}>{t}</span>))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.publishedAt).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})} &middot; {a.source}
                  </span>
                </div>
              </a>
            </AnimateIn>
          ))}
        </div>
        {tp>1&&(
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 rounded-lg bg-muted text-sm font-medium disabled:opacity-50 hover:bg-muted/80">Previous</button>
            <span className="text-sm text-muted-foreground">{page}/{tp}</span>
            <button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="px-4 py-2 rounded-lg bg-muted text-sm font-medium disabled:opacity-50 hover:bg-muted/80">Next</button>
          </div>
        )}
      </>)}
    </section>
  </>)
}
