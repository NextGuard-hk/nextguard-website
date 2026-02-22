"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { AnimateIn } from "./animate-in"
import { ArrowRightLeft, Rocket, ShieldCheck, Cpu, Zap, Lock, Globe } from "lucide-react"

export function HomePage() {
  const { t } = useLanguage()

  return (
    <>
      <style>{`
        @keyframes heroTextFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes heroGlow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(6,182,212,0.4)); opacity: 0.8; }
          50% { filter: drop-shadow(0 0 35px rgba(6,182,212,0.8)); opacity: 1; }
        }
        @keyframes heroScanning {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes heroGlitch {
          0% { transform: translate(0); text-shadow: none; }
          2% { transform: translate(-2px, 2px); text-shadow: 2px 0 #06b6d4, -2px 0 #ec4899; }
          4% { transform: translate(2px, -1px); }
          6% { transform: translate(0); text-shadow: none; }
          100% { transform: translate(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .hero-title-gradient {
          background: linear-gradient(90deg, #ffffff, #22d3ee, #ffffff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: heroTextFlow 4s linear infinite;
                    padding: 0 20px 6px 0;
        }
        .hero-main-visual {
          animation: heroGlow 3s ease-in-out infinite, heroFloat 6s ease-in-out infinite;
        }
        .hero-glitch-text {
          animation: heroGlitch 5s infinite;
        }
        .hero-scan-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #22d3ee, transparent);
          box-shadow: 0 0 15px #22d3ee;
          z-index: 20;
          animation: heroScanning 3s linear infinite;
        }
      `}</style>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black py-20">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 text-center">
          <div className="relative inline-block mb-4 hero-main-visual px-4 py-2 overflow-visible">
            <div className="hero-scan-line" />
            
            <AnimateIn>
              <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase italic leading-none hero-glitch-text">
                <span className="block text-white mb-2">NEXT</span>
                <span className="block hero-title-gradient pr-8">GUARD</span>
              </h1>
            </AnimateIn>
          </div>

          <AnimateIn delay={200}>
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500" />
              <p className="text-cyan-400 text-lg md:text-2xl tracking-[0.4em] uppercase font-mono">
                AI-Driven Data Loss Prevention
              </p>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500" />
            </div>
          </AnimateIn>

          <AnimateIn delay={300}>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/contact" className="group relative overflow-hidden px-10 py-4 bg-cyan-400 font-bold text-black transition-all hover:scale-105 active:scale-95">
                <span className="relative z-10 uppercase tracking-widest">{t.home.heroGetStarted}</span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
              <Link href="/solutions" className="group relative overflow-hidden px-10 py-4 border-2 border-white/20 font-bold text-white transition-all hover:border-cyan-400 hover:text-cyan-400">
                <span className="relative z-10 uppercase tracking-widest">{t.home.heroViewSolutions}</span>
                <div className="absolute inset-0 bg-cyan-400/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              </Link>
            </div>
          </AnimateIn>
        </div>

        {/* Floating Background Particles */}
        <div className="absolute top-1/4 left-10 w-2 h-2 bg-cyan-500 rounded-full animate-ping opacity-20" />
        <div className="absolute top-1/2 right-20 w-3 h-3 bg-blue-500 rounded-full animate-pulse opacity-20" />
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-white rounded-full animate-bounce opacity-10" />

        {/* Decorative HUD Lines */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-cyan-500" />
          <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-cyan-500" />
          <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-cyan-500" />
          <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-cyan-500" />
        </div>

        {/* Stats */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-16 md:gap-32 px-6">
          {[
            { label: t.home.heroStat1Label, value: "< 1s", color: "text-cyan-400" },
            { label: t.home.heroStat2Label, value: "100%", color: "text-white" },
            { label: t.home.heroStat3Label, value: "24/7", color: "text-cyan-400" }
          ].map((stat, i) => (
            <div key={i} className="text-center group cursor-default">
              <div className={`text-3xl md:text-4xl font-black mb-1 transition-transform group-hover:scale-110 ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-zinc-500 font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured visual section */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="container mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                  <Zap className="w-3 h-3" />
                  Performance First
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{t.home.featuredTitle}</h2>
                <p className="text-zinc-400 text-lg leading-relaxed">{t.home.featuredDesc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    t.home.featuredFeature1,
                    t.home.featuredFeature2,
                    t.home.featuredFeature3
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:border-cyan-500/30 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                      <span className="text-sm font-medium text-zinc-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup visual */}
              <div className="relative group">
                <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative rounded-3xl border border-white/10 bg-zinc-900/80 p-8 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/40" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                      <div className="w-3 h-3 rounded-full bg-green-500/40" />
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">System Core Status</div>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: "AI Threat Detection", value: "99.7%", color: "text-cyan-400", width: "w-[99.7%]" },
                      { label: "Policy Coverage", value: "100%", color: "text-green-400", width: "w-full" },
                      { label: "Response Latency", value: "< 1s", color: "text-blue-400", width: "w-[85%]" },
                    ].map((row, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                          <span className="text-zinc-500">{row.label}</span>
                          <span className={row.color}>{row.value}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-current ${row.color} ${row.width} rounded-full opacity-50`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
