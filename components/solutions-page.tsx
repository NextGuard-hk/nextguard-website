"use client"

import { useLanguage } from "@/lib/language-context"
import { AnimateIn } from "./animate-in"
import { Brain, Tags, Blocks, Check, ShieldCheck, Users, GraduationCap, Server, Zap, Eye, Lock, Activity, Shield, Database, Network, Globe, Mail, Sparkles, Star } from "lucide-react"

const productIcons = [Brain, Tags, Blocks]
const whyIcons = [ShieldCheck, Users, GraduationCap, Server]

export function SolutionsPage() {
  const { t } = useLanguage()

  return (
    <>
      {/* ===== NEW FEATURES HERO BANNER ===== */}
      <section className="relative pb-16 pt-32 text-center md:pb-24 md:pt-40 overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.08),transparent_60%)]" />

        {/* Floating sparkle particles */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute top-[20%] left-[15%] text-cyan-400 opacity-60 animate-bounce" style={{animationDuration:"2.1s",animationDelay:"0s"}}><Star className="w-3 h-3 fill-current" /></span>
          <span className="absolute top-[30%] right-[18%] text-violet-400 opacity-50 animate-bounce" style={{animationDuration:"2.8s",animationDelay:"0.4s"}}><Star className="w-2 h-2 fill-current" /></span>
          <span className="absolute top-[55%] left-[8%] text-cyan-300 opacity-40 animate-bounce" style={{animationDuration:"3.2s",animationDelay:"0.8s"}}><Sparkles className="w-4 h-4" /></span>
          <span className="absolute top-[15%] right-[30%] text-yellow-400 opacity-50 animate-bounce" style={{animationDuration:"2.5s",animationDelay:"1.2s"}}><Star className="w-2 h-2 fill-current" /></span>
          <span className="absolute top-[65%] right-[12%] text-cyan-400 opacity-40 animate-bounce" style={{animationDuration:"3.5s",animationDelay:"0.6s"}}><Star className="w-3 h-3 fill-current" /></span>
          <span className="absolute top-[40%] left-[25%] text-violet-300 opacity-30 animate-bounce" style={{animationDuration:"2.9s",animationDelay:"1.5s"}}><Sparkles className="w-3 h-3" /></span>
        </div>

        <div className="relative mx-auto max-w-3xl px-6">
          <AnimateIn>
            {/* Animated NEW FEATURES badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              {/* Outer pulse ring */}
              <span className="relative flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-30"></span>
                <span className="relative inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 px-5 py-2 text-sm font-bold tracking-widest text-cyan-300 uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{animationDuration:"3s"}} />
                  <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent font-extrabold tracking-[0.2em]">
                    ✦ NEW FEATURES
                  </span>
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" style={{animationDuration:"3s",animationDirection:"reverse"}} />
                </span>
              </span>
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <h1 className="mt-2 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {t.solutions.headline}
            </h1>
          </AnimateIn>

          <AnimateIn delay={200}>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.solutions.subheadline}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Visual Hero Banner */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-white/5 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.1),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />

        <div className="relative mx-auto max-w-7xl px-6">
          {/* DLP Architecture Visual */}
          <AnimateIn>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-8 md:p-12 overflow-hidden relative backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="flex flex-col gap-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 max-w-md text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-mono text-cyan-400">
                      <Shield className="w-3 h-3" />
                      ENTERPRISE DLP ARCHITECTURE
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      Unified Data Protection
                    </h3>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                      Our next-generation architecture provides seamless coverage across all data vectors, powered by AI-driven classification and real-time response.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full md:max-w-md">
                    {[
                      { icon: Database, label: "Data Discovery", desc: "Scan & identify" },
                      { icon: Shield, label: "Policy Engine", desc: "Unified control" },
                      { icon: Network, label: "Real-time Ops", desc: "Instant blocking" },
                      { icon: Globe, label: "Global Compliance", desc: "Auto-reporting" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{item.label}</div>
                          <div className="text-xs text-zinc-500">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { icon: Eye, label: "MONITOR", desc: "User Behavior", color: "cyan" },
                    { label: "→", isArrow: true },
                    { icon: Brain, label: "AI ANALYZE", desc: "Deep Inspection", color: "blue" },
                    { label: "→", isArrow: true },
                    { icon: Lock, label: "PROTECT", desc: "Action Engine", color: "green" },
                    { label: "→", isArrow: true },
                    { icon: Activity, label: "REPORT", desc: "Full Visibility", color: "purple" },
                  ].map((item, i) => (
                    item.isArrow ? (
                      <span key={i} className="text-zinc-600 text-2xl font-light hidden md:block">━━▶</span>
                    ) : (
                      <div key={i} className={`flex flex-col items-center gap-1 p-3 rounded-xl border border-white/10 bg-white/5 min-w-[90px]`}>
                        {item.icon && <item.icon className="w-5 h-5 text-cyan-400" />}
                        <span className="text-xs font-bold text-white">{item.label}</span>
                        <span className="text-[10px] text-zinc-500">{item.desc}</span>
                      </div>
                    )
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { label: "Endpoint DLP", icon: Database },
                    { label: "Network DLP", icon: Network },
                    { label: "Cloud DLP", icon: Globe },
                    { label: "Email DLP", icon: Mail },
                    { label: "AI-Powered", icon: Brain }
                  ].map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-medium text-cyan-400">
                      <tag.icon className="w-3 h-3" />
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {t.solutions.products.map((product, i) => {
              const Icon = productIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 h-full flex flex-col hover:border-cyan-500/30 transition-colors duration-300">
                    {Icon && <Icon className="w-8 h-8 text-cyan-400 mb-4" />}
                    <h3 className="text-xl font-bold text-white mb-2">{product.title}</h3>
                    <p className="text-zinc-400 text-sm mb-4 flex-1">{product.description}</p>
                    <ul className="space-y-2">
                      {product.features.map((feature, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-zinc-300">
                          <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Nextguard */}
      <section className="py-16 md:py-24 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-6">
          <AnimateIn>
            <h2 className="text-3xl font-bold text-center text-white mb-12">{t.solutions.whyChooseTitle}</h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.solutions.whyChoose.map((item, i) => {
              const Icon = whyIcons[i]
              return (
                <AnimateIn key={i} delay={i * 80}>
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 hover:border-cyan-500/30 transition-colors duration-300">
                    {Icon && <Icon className="w-7 h-7 text-cyan-400 mb-3" />}
                    <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-zinc-400">{item.description}</p>
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
