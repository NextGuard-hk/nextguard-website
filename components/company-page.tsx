"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Code2, Cog, BarChart3, Shield, Users, Globe, Award, CheckCircle, Building2, Cpu, Lock, ArrowUpRight, Newspaper, Radio, Clock } from "lucide-react"

const keyPointIcons = [Code2, Cog, BarChart3]

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

export function CompanyPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.company.badge}
        headline={t.company.headline}
        subheadline={t.company.subheadline}
      />

      {/* Visual Banner - Cyber Stats */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, value: "100%", label: "Ownership" },
              { icon: Cpu, value: "AI", label: "Powered Engine" },
              { icon: Globe, value: "HK", label: "Headquartered" },
              { icon: Lock, value: "DLP", label: "Core Product" },
            ].map((stat, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="flex flex-col items-center text-center p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                  <stat.icon className="h-8 w-8 text-cyan-400 mb-3" />
                  <div className="text-3xl font-bold text-cyan-400 font-mono">{stat.value}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Key Points */}
      <section className="border-y border-border/50 bg-card/30 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {t.company.keyPoints.map((point, i) => {
              const Icon = keyPointIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="rounded-xl border border-border/50 bg-background p-8 text-center transition-all duration-300 hover:border-primary/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.06),transparent_60%)]" />
                    <div className="relative">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-3">{point.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Visual Divider - Tech Architecture */}
      <section className="relative overflow-hidden bg-zinc-950 border-y border-border/50 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-400 mb-6">
                // Company Identity
              </div>
              <h2 className="text-3xl font-bold mb-4">{t.company.independenceTitle}</h2>
              <p className="text-muted-foreground mb-8">{t.company.independenceSubtitle}</p>
              <div className="space-y-4">
                {t.company.independencePoints.map((point, i) => (
                  <AnimateIn key={i} delay={i * 100}>
                    <div className="rounded-lg border border-border/50 bg-card/30 p-4">
                      <div className="text-xs font-mono text-cyan-400 mb-1">{point.question}</div>
                      <div className="text-sm text-muted-foreground">{point.answer}</div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
            <div className="relative">
              {/* Abstract tech visual */}
              <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/50 p-8 font-mono text-sm">
                <div className="text-cyan-400 mb-2">NEXTGUARD_TECH</div>
                <div className="text-zinc-500 mb-6">v2.0 // INDEPENDENT</div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <div className="h-2 rounded-full bg-cyan-500/20" style={{width: `${[80, 65, 90, 50, 75][i]}%`}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-12 max-w-2xl mx-auto">{t.company.independenceFooter}</p>
        </div>
      </section>

      {/* Core Team */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1 text-xs font-mono text-muted-foreground mb-6">
              LEADERSHIP
            </div>
            <h2 className="text-3xl font-bold mb-4">{t.company.teamTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.company.teamSubtitle}</p>
          </div>

          {/* Leaders */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {t.company.leaders.map((member, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="rounded-xl border border-border/50 bg-card/30 p-6 text-center hover:border-primary/20 transition-colors">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xl font-bold text-primary mb-4">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="font-semibold mb-1">{member.name}</h3>
                  <div className="text-xs text-cyan-400 mb-2">{member.role}</div>
                  <p className="text-xs text-muted-foreground">{member.bio}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Advisor */}
          <AnimateIn delay={400}>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-8">
              <div className="text-xs font-mono text-cyan-400 mb-4">{t.company.advisorTitle}</div>
              <div className="flex items-start gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xl font-bold text-cyan-400">
                  {t.company.advisor.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t.company.advisor.name}</h3>
                  <ul className="space-y-1">
                    {t.company.advisor.credentials.map((cred, i) => (
                      <li key={i} className="text-sm text-muted-foreground">•&nbsp;&nbsp;{cred}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </AnimateIn>

          <p className="text-center text-sm text-muted-foreground mt-8">{t.company.teamTagline}</p>
        </div>
      </section>

      {/* News & Insights Section */}
      <section className="relative overflow-hidden bg-zinc-950 border-t border-border/50 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.07),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-4xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono text-cyan-400">LIVE UPDATES</span>
                <Radio className="h-4 w-4 text-cyan-400/60 ml-auto" />
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
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          <div className="mb-10 text-center">
            <div className="inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-400 mb-4">
              {t.news.badge}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t.news.headline}</h2>
            <p className="text-muted-foreground">{t.news.subheadline}</p>
          </div>

          <div className="space-y-4">
            {t.news.articles.map((article, i) => (
              <AnimateIn key={i} delay={i * 80}>
                <div className="rounded-xl border border-border/50 bg-card/20 p-6 hover:border-cyan-500/30 transition-colors">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[article.category] || "bg-primary/10 text-primary"}`}>
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {["Roadmap", "Product", "Integration", "\u8def\u7dda\u5716", "\u7522\u54c1", "\u6574\u5408"].includes(article.category) ? (
                        <><span className="text-cyan-400">&#9679;</span> In Progress</>
                      ) : (
                        <><span className="text-green-400">&#10003;</span> Launched</>
                      )}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">{article.date}</span>
                  </div>
                  <h3 className="font-semibold text-base mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
