"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ShieldCheck, Focus, Headset, Handshake, ArrowRight, Globe, Building, TrendingUp, Network } from "lucide-react"

const commitmentIcons = [ShieldCheck, Focus, Headset, Handshake]

export function PartnersPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.partners.badge}
        headline={t.partners.headline}
        subheadline={t.partners.subheadline}
      />

      {/* Partnership Network Visual */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6 overflow-hidden relative">
              <div className="text-xs font-mono text-cyan-400/60 mb-4">// PARTNER NETWORK</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Globe, label: "Global Reach", value: "Asia Pacific" },
                  { icon: Building, label: "Partner Type", value: "Enterprise" },
                  { icon: TrendingUp, label: "Growth", value: "Expanding" },
                  { icon: Network, label: "Network", value: "Active" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl border border-zinc-700/50 bg-zinc-800/30">
                    <item.icon className="h-7 w-7 text-cyan-400 mb-2" />
                    <div className="text-sm font-bold text-white font-mono">{item.value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Commitments */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.partners.commitments.map((commitment, i) => {
              const Icon = commitmentIcons[i] || ShieldCheck
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-primary/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_60%)]" />
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-foreground">{commitment.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{commitment.description}</p>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/50 bg-zinc-950 py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px"}} />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <AnimateIn>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
              <ShieldCheck className="mx-auto h-8 w-8 text-cyan-400" />
            </div>
            <h2 className="mt-6 text-balance text-2xl font-bold tracking-tight text-white md:text-4xl">
              {t.partners.ctaTitle}
            </h2>
            <p className="mt-4 text-base text-zinc-400">
              {t.partners.ctaDescription}
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-cyan-400 hover:gap-3"
            >
              {t.partners.ctaButton}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
