"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Code2, Cog, BarChart3, Shield, Users, Globe, Award, CheckCircle, Building2, Cpu, Lock } from "lucide-react"

const keyPointIcons = [Code2, Cog, BarChart3]

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
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">{point.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Visual Divider - Tech Architecture */}
      <section className="relative overflow-hidden bg-zinc-950 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/50 p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-cyan-400" />
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">// Company Identity</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t.company.independenceTitle}</h2>
                  <p className="text-zinc-400 text-sm leading-relaxed">{t.company.independenceSubtitle}</p>
                  <div className="mt-6 space-y-3">
                    {t.company.independencePoints.map((point, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                        <CheckCircle className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-white">{point.question}</div>
                          <div className="text-xs text-zinc-400 mt-1">{point.answer}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden md:block">
                  {/* Abstract tech visual */}
                  <div className="relative h-64 rounded-xl border border-cyan-500/20 bg-zinc-900 overflow-hidden">
                    <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px"}} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full border-2 border-cyan-400/50 flex items-center justify-center">
                            <Shield className="h-8 w-8 text-cyan-400" />
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 animate-pulse" />
                      </div>
                      <div className="text-xs font-mono text-cyan-400/70 text-center">
                        <div>NEXTGUARD_TECH</div>
                        <div className="text-zinc-600">v2.0 // INDEPENDENT</div>
                      </div>
                      <div className="flex gap-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-1.5 h-6 rounded-full bg-cyan-400/30" style={{animationDelay: `${i * 200}ms`}} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-sm text-zinc-500 border-t border-zinc-800 pt-4">{t.company.independenceFooter}</p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Core Team */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-mono text-primary uppercase tracking-wider">Leadership</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t.company.teamTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">{t.company.teamSubtitle}</p>
            </div>
          </AnimateIn>
          {/* Leaders */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.company.leaders.map((member, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-xl font-bold text-cyan-400 font-mono">{member.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{member.name}</h3>
                        <p className="text-xs text-primary/80 font-mono">{member.role}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
          {/* Advisor */}
          <AnimateIn delay={300}>
            <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">{t.company.advisorTitle}</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-amber-400 font-mono">{t.company.advisor.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{t.company.advisor.name}</h3>
                  <ul className="mt-2 space-y-1">
                    {t.company.advisor.credentials.map((cred, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-400" />
                        {cred}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </AnimateIn>
          <AnimateIn delay={400}>
            <p className="mt-6 text-center text-sm text-muted-foreground italic">{t.company.teamTagline}</p>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
