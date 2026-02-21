"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ArrowUpRight, Newspaper, Radio, Clock } from "lucide-react"

const categoryColors: Record<string, string> = {
  Roadmap: "bg-primary/10 text-primary",
  Product: "bg-primary/10 text-primary",
  Integration: "bg-accent/10 text-accent",
  Company: "bg-secondary text-secondary-foreground",
  Partnership: "bg-primary/10 text-primary",
  // Chinese
  "\u8def\u7dda\u5716": "bg-primary/10 text-primary",
  "\u7522\u54c1": "bg-primary/10 text-primary",
  "\u6574\u5408": "bg-accent/10 text-accent",
  "\u516c\u53f8": "bg-secondary text-secondary-foreground",
  "\u5408\u4f5c": "bg-primary/10 text-primary",
}

export function NewsPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.news.badge}
        headline={t.news.headline}
        subheadline={t.news.subheadline}
      />

      {/* News Banner Visual */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.07),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-4xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-mono text-cyan-400">LIVE UPDATES</span>
                </div>
                <div className="flex-1 h-px bg-cyan-500/20" />
                <Radio className="h-4 w-4 text-cyan-400/60" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Newspaper, label: "Latest News", desc: "Product & roadmap updates" },
                  { icon: Clock, label: "Milestones", desc: "Company achievements" },
                  { icon: ArrowUpRight, label: "Partnerships", desc: "New collaborations" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-700/40 bg-zinc-800/30">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-zinc-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col gap-6">
            {t.news.articles.map((article, i) => (
              <AnimateIn key={i} delay={i * 80}>
                <div className="group cursor-pointer rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/20 md:p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.03),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryColors[article.category] || "bg-primary/10 text-primary"}`}
                        >
                          {article.category}
                        </span>
                        <time className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.date}
                        </time>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-center w-10 h-10 rounded-xl border border-border/50 bg-card group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300 self-start md:mt-1">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
