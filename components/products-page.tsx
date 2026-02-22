"use client"
import { useLanguage } from "@/lib/language-context"
import { AnimateFix ProductsPage: add missing React import and type safety
import { Shield, Mail, Globe, Smartphone, Code2, Database, Zap, Cloud, Network, Lock, Eye, Brain, Server, Activity, BarChart3, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

const productIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mdlp: Shield,
  ucss: Server,
  aseg: Mail,
  aswg: Globe,
  mag: Smartphone,
  ucwi: Code2,
  dss: Database,
  xdr: Eye,
  dct: BarChart3,
  casb: Cloud,
  itm: Brain,
  sase: Network,
}

export function ProductsPage() {
  const { t } = useLanguage()

  return (
    <>
      {/* Hero Banner */}
      <section className="relative bg-black py-20 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.15),transparent_60%)]" />
        <div className="container mx-auto max-w-6xl px-6 relative z-10">
          <AnimateIn>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-bold tracking-widest text-cyan-400 uppercase mb-6">
              <Shield className="w-3 h-3" />
              {t.products.badge}
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
              {t.products.headline}
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl">
              {t.products.subheadline}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Product Suite Overview */}
      <section className="py-16 bg-zinc-950 border-b border-white/5">
        <div className="container mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {t.products.suites.map((suite, i) => (
                <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
                  <div className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-1">{suite.tag}</div>
                  <div className="text-white font-semibold text-sm">{suite.name}</div>
                </div>
              ))}
            </div>
          </AnimateIn>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.products.items.map((product, i) => {
              const Icon = productIconMap[product.id] || Shield
              return (
                <AnimateIn key={i} delay={i * 50}>
                  <div className="group relative h-full rounded-2xl border border-white/10 bg-zinc-900/50 p-6 hover:border-cyan-500/40 hover:bg-zinc-900/80 transition-all duration-300 flex flex-col">
                    {/* Tag */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                        {product.tag}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white mb-1">{product.title}</h3>
                    <p className="text-xs text-cyan-400 font-mono mb-3">{product.abbr}</p>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4 flex-1">{product.description}</p>

                    {/* Features */}
                    <ul className="space-y-1.5 mb-4">
                      {product.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-zinc-300">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors mt-auto"
                    >
                      {t.products.learnMore} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Nextguard AI Add-ons */}
      <section className="py-16 bg-black border-b border-white/5">
        <div className="container mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-bold tracking-widest text-cyan-400 uppercase mb-4">
                <Zap className="w-3 h-3" />
                {t.products.addonsTag}
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                {t.products.addonsTitle}
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto">{t.products.addonsSubtitle}</p>
            </div>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.products.addons.map((addon, i) => (
              <AnimateIn key={i} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center mb-4">
                    {i === 0 && <Brain className="w-5 h-5 text-cyan-400" />}
                    {i === 1 && <BarChart3 className="w-5 h-5 text-cyan-400" />}
                    {i === 2 && <Lock className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{addon.title}</h3>
                  <p className="text-sm text-zinc-400">{addon.description}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-950">
        <div className="container mx-auto max-w-3xl px-6 text-center">
          <AnimateIn>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{t.products.ctaTitle}</h2>
            <p className="text-zinc-400 mb-8">{t.products.ctaSubtitle}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 text-black font-bold uppercase tracking-widest hover:bg-cyan-300 transition-colors"
            >
              {t.products.ctaButton} <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
