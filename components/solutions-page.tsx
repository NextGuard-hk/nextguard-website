"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Brain, Tags, Blocks, Check, ShieldCheck, Users, GraduationCap, Server, Zap, Eye, Lock, Activity } from "lucide-react"

const productIcons = [Brain, Tags, Blocks]
const whyIcons = [ShieldCheck, Users, GraduationCap, Server]

export function SolutionsPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.solutions.badge}
        headline={t.solutions.headline}
        subheadline={t.solutions.subheadline}
      />

      {/* Visual Hero Banner */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.08),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          {/* DLP Architecture Visual */}
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="text-xs font-mono text-cyan-400/60 mb-4">// DLP ARCHITECTURE</div>
              <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                {[
                  { icon: Eye, label: "MONITOR", color: "cyan" },
                  { label: "→", isArrow: true },
                  { icon: Brain, label: "AI ANALYZE", color: "blue" },
                  { label: "→", isArrow: true },
                  { icon: Lock, label: "PROTECT", color: "green" },
                  { label: "→", isArrow: true },
                  { icon: Activity, label: "REPORT", color: "purple" },
                ].map((item, i) => (
                  item.isArrow ? (
                    <div key={i} className="text-zinc-600 font-mono hidden md:block">━━▶</div>
                  ) : (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${
                        item.color === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10' :
                        item.color === 'blue' ? 'border-blue-500/40 bg-blue-500/10' :
                        item.color === 'green' ? 'border-green-500/40 bg-green-500/10' :
                        'border-purple-500/40 bg-purple-500/10'
                      }`}>
                        {item.icon && <item.icon className={`h-6 w-6 ${
                          item.color === 'cyan' ? 'text-cyan-400' :
                          item.color === 'blue' ? 'text-blue-400' :
                          item.color === 'green' ? 'text-green-400' :
                          'text-purple-400'
                        }`} />}
                      </div>
                      <span className={`text-xs font-mono ${
                        item.color === 'cyan' ? 'text-cyan-400/70' :
                        item.color === 'blue' ? 'text-blue-400/70' :
                        item.color === 'green' ? 'text-green-400/70' :
                        'text-purple-400/70'
                      }`}>{item.label}</span>
                    </div>
                  )
                ))}
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {["Endpoint DLP", "Network DLP", "Cloud DLP", "Email DLP", "AI-Powered"].map((tag, i) => (
                  <span key={i} className="text-xs font-mono px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400/80">{tag}</span>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Products */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8">
            {t.solutions.products.map((product, i) => {
              const Icon = productIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="group rounded-xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-primary/20 md:p-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.04),transparent_60%)]" />
                    <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{product.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                          {product.features.map((feature, j) => (
                            <li key={j} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Visual accent */}
                      <div className="hidden lg:flex flex-col items-center justify-center w-32 h-32 rounded-xl border border-primary/10 bg-primary/5">
                        <Icon className="h-10 w-10 text-primary/40" />
                        <div className="mt-2 text-xs font-mono text-primary/40">{String(i + 1).padStart(2, '0')}</div>
                      </div>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Nextguard */}
      <section className="relative overflow-hidden border-t border-border/50 bg-zinc-950 py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.06),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Why Choose</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{t.solutions.whyChooseTitle}</h2>
            </div>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-2">
            {t.solutions.whyChoose.map((item, i) => {
              const Icon = whyIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="flex flex-col gap-4 rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-cyan-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/3 rounded-full blur-2xl" />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <Icon className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
