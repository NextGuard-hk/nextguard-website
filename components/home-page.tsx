"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context"
import { AnimateIn } from "./animate-in"
import { ArrowRight, ArrowRightLeft, Rocket, ShieldCheck, Cpu, Shield, Zap, Lock, Globe } from "lucide-react"

const pillarIcons = [Rocket, Cpu, ShieldCheck, ArrowRightLeft]

export function HomePage() {
  const { t } = useLanguage()

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black py-20">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <AnimateIn>
            <div className="flex justify-center mb-8">
               <div className="relative">
                 <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
                 <Shield className="h-20 w-20 text-cyan-400 relative z-10" />
               </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-2 italic">
              <span className="text-white">NEXT</span>
              <span className="text-cyan-400">GUARD</span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={200}>
            <p className="text-cyan-400 text-lg md:text-2xl tracking-[0.5em] uppercase font-mono mb-12">
              // AI-Driven Data Loss Prevention
            </p>
          </AnimateIn>

          <AnimateIn delay={300}>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="rounded-none border-2 border-cyan-400 bg-cyan-400 px-8 py-3 font-bold text-black transition-all hover:bg-transparent hover:text-cyan-400 uppercase tracking-widest">
                {t.home.heroGetStarted}
              </Link>
              <Link href="/solutions" className="rounded-none border-2 border-white/20 bg-white/5 px-8 py-3 font-bold text-white transition-all hover:border-cyan-400 hover:text-cyan-400 uppercase tracking-widest">
                {t.home.heroViewSolutions}
              </Link>
            </div>
          </AnimateIn>
        </div>

        {/* Decorative Lines */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </section>

      {/* Stats / Visual Section */}
      <section className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: Zap, label: t.home.heroStat1Label, value: "0.3s" },
              { icon: Lock, label: t.home.heroStat2Label, value: "100%" },
              { icon: Globe, label: t.home.heroStat3Label, value: "24/7" }
            ].map((stat, i) => (
              <AnimateIn key={i} delay={i * 100} className="flex flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-cyan-500/10 p-4">
                  <stat.icon className="h-8 w-8 text-cyan-400" />
                </div>
                <div className="text-4xl font-bold text-white mb-2 font-mono">{stat.value}</div>
                <div className="text-zinc-500 uppercase tracking-widest text-xs font-bold">{stat.label}</div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Featured visual section */}
      <section className="py-24 bg-black overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <AnimateIn>
                <h2 className="text-4xl font-bold text-white mb-6 uppercase tracking-tight">{t.home.featuredTitle}</h2>
                <p className="text-zinc-400 text-lg mb-8">
              {t.home.featuredDesc}
                </p>
                <div className="space-y-4">
                  {[
                    t.home.featuredFeature1,
                    t.home.featuredFeature2,
                    t.home.featuredFeature3
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-cyan-400 font-mono text-sm uppercase tracking-wider">
                      <div className="h-1 w-1 bg-cyan-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </AnimateIn>
            </div>
            <div className="flex-1 relative">
              <AnimateIn delay={200}>
                <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-4 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center border border-white/5 relative overflow-hidden">
                     {/* Mockup visual */}
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.2),transparent)]" />
                     <div className="p-8 w-full space-y-4">
                        <div className="h-2 w-1/3 bg-cyan-400/20 rounded" />
                        <div className="h-2 w-2/3 bg-zinc-700/50 rounded" />
                        <div className="h-32 w-full bg-zinc-900/80 rounded border border-cyan-400/30 flex items-center justify-center">
                           <Shield className="h-12 w-12 text-cyan-400/50 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div className="h-8 bg-zinc-700/30 rounded" />
                           <div className="h-8 bg-zinc-700/30 rounded" />
                           <div className="h-8 bg-cyan-400/10 rounded border border-cyan-400/20" />
                        </div>
                     </div>
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-6 -right-6 h-24 w-24 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-cyan-500/5 rounded-full blur-3xl" />
              </AnimateIn>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
