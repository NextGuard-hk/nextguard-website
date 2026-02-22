"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context"
import { AnimateIn } from "./animate-in"
import { ArrowRight, ArrowRightLeft, Rocket, ShieldCheck, Cpu, Zap, Lock, Globe } from "lucide-react"

const pillarIcons = [Rocket, Cpu, ShieldCheck, ArrowRightLeft]

export function HomePage() {
  const { t } = useLanguage()

  return (
    <>
      <style>{`
        @keyframes heroLetterFadeIn {
          0% { opacity: 0; transform: translateY(20px) skewX(-4deg); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0) skewX(0deg); filter: blur(0); }
        }
        @keyframes heroSubtitleReveal {
          0% { opacity: 0; letter-spacing: 0.6em; filter: blur(4px); }
          100% { opacity: 1; letter-spacing: 0.5em; filter: blur(0); }
        }
        @keyframes heroGlowPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.2); }
          50% { text-shadow: 0 0 40px rgba(6,182,212,0.8), 0 0 80px rgba(6,182,212,0.4); }
        }
        .hero-next {
          display: inline-block;
          opacity: 0;
          animation: heroLetterFadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s forwards;
        }
        .hero-guard {
          display: inline-block;
          opacity: 0;
          animation: heroLetterFadeIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s forwards, heroGlowPulse 3s ease-in-out 1.4s infinite;
        }
        .hero-subtitle {
          opacity: 0;
          animation: heroSubtitleReveal 1s ease-out 1s forwards;
        }
      `}</style>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black py-20">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <AnimateIn>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-2 italic">
              <span className="hero-next text-white">NEXT</span>
              <span className="hero-guard text-cyan-400">GUARD</span>
            </h1>
          </AnimateIn>

          <AnimateIn delay={200}>
            <p className="hero-subtitle text-cyan-400 text-lg md:text-2xl tracking-[0.5em] uppercase font-mono mb-12">
              // AI-Driven Data Loss Prevention
            </p>
          </AnimateIn>

          <AnimateIn delay={300}>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="rounded-none border-2 border-cyan-400 bg-cyan-400 px-8 py-3 font-bold text-black transition-all hover:bg-transparent hover:text-cyan-400 uppercase tracking-widest">
                {t.home.heroGetStarted}
              </Link>
              <Link href="/solutions" className="rounded-none border-2 border-white/20 bg-transparent px-8 py-3 font-bold text-white transition-all hover:border-cyan-400 hover:text-cyan-400 uppercase tracking-widest">
                {t.home.heroViewSolutions}
              </Link>
            </div>
          </AnimateIn>
        </div>

        {/* Decorative Lines */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        {/* Stats / Visual Section */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
          {[
            { icon: Zap, label: t.home.heroStat1Label, value: "< 1s" },
            { icon: Lock, label: t.home.heroStat2Label, value: "100%" },
            { icon: Globe, label: t.home.heroStat3Label, value: "24/7" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured visual section */}
      <section className="py-24 bg-zinc-950 border-t border-white/5">
        <div className="container mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white">{t.home.featuredTitle}</h2>
                <p className="text-zinc-400 text-lg leading-relaxed">{t.home.featuredDesc}</p>
                <ul className="space-y-3">
                  {[
                    t.home.featuredFeature1,
                    t.home.featuredFeature2,
                    t.home.featuredFeature3
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-300">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup visual */}
              <div className="relative">
                <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    <div className="ml-auto text-xs font-mono text-zinc-600">nextguard.dlp</div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "AI Threat Detection", value: "99.7%", color: "cyan" },
                      { label: "Policy Coverage", value: "100%", color: "green" },
                      { label: "Response Latency", value: "< 1s", color: "blue" },
                      { label: "Global Compliance", value: "Active", color: "purple" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-sm text-zinc-400">{row.label}</span>
                        <span className={`text-sm font-mono font-bold ${
                          row.color === 'cyan' ? 'text-cyan-400' :
                          row.color === 'green' ? 'text-green-400' :
                          row.color === 'blue' ? 'text-blue-400' :
                          'text-purple-400'
                        }`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl" />
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
