"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Brain, Tags, Blocks, Check, ShieldCheck, Users, GraduationCap, Server, Zap, Eye, Lock, Activity, Shield, Database, Network, Globe, Mail } from "lucide-react"

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

                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    {[
                      { icon: Database, label: "Data Discovery", desc: "Scan & identify" },
                      { icon: Shield, label: "Policy Engine", desc: "Unified control" },
                      { icon: Network, label: "Real-time Ops", desc: "Instant blocking" },
                      { icon: Globe, label: "Global Compliance", desc: "Auto-reporting" }
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-white/5 bg-white/5 space-y-2 hover:border-cyan-500/30 transition-colors">
                        <item.icon className="w-6 h-6 text-cyan-400" />
                        <div className="font-semibold text-white">{item.label}</div>
                        <div className="text-xs text-zinc-500">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative p-8 rounded-2xl border border-cyan-500/20 bg-zinc-950/50">
                  <div className="flex flex-col md:flex-row items-center gap-6 justify-between relative z-10">
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
                        <div key={i} className="text-zinc-600 font-mono hidden md:block text-2xl animate-pulse">
                          ━━▶
                        </div>
                      ) : (
                        <div key={i} className="flex flex-col items-center gap-3 group">
                          <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                            item.color === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' :
                            item.color === 'blue' ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' :
                            item.color === 'green' ? 'border-green-500/40 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                            'border-purple-500/40 bg-purple-500/10 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                          }`}>
                            {item.icon && <item.icon className="w-10 h-10" />}
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-bold tracking-widest text-white uppercase">{item.label}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">{item.desc}</div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { label: "Endpoint DLP", icon: Database },
                    { label: "Network DLP", icon: Network },
                    { label: "Cloud DLP", icon: Globe },
                    { label: "Email DLP", icon: Mail },
                    { label: "AI-Powered", icon: Brain }
                  ].map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 text-sm text-zinc-300 hover:bg-white/10 transition-colors cursor-default">
                      <tag.icon className="w-4 h-4 text-cyan-400/60" />
                      {tag.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.solutions.products.map((product, i) => {
              const Icon = productIcons[i]
              return (
                <AnimateIn key={i} delay={i * 0.1}>
                  <div className="group relative p-8 rounded-3xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-800/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {Icon && <Icon className="w-6 h-6 text-cyan-400" />}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{product.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">{product.description}</p>
                    <ul className="space-y-3">
                      {product.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-zinc-500">
                          <Check className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
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
      <section className="py-24 bg-zinc-900/50 border-t border-white/5">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.solutions.whyChooseTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {t.solutions.whyChoose.map((item, i) => {
              const Icon = whyIcons[i]
              return (
                <AnimateIn key={i} delay={i * 0.1}>
                  <div className="flex gap-6 p-6 rounded-2xl bg-zinc-950/50 border border-white/5">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      {Icon && <Icon className="w-6 h-6 text-cyan-400" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
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
