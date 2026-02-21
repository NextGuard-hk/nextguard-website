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
                Get Started
              </Link>
              <Link href="/solutions" className="rounded-none border-2 border-white/20 bg-white/5 px-8 py-3 font-bold text-white transition-all hover:border-cyan-400 hover:text-cyan-400 uppercase tracking-widest">
                View Solutions
              </Link>
Update home-page: add cyber visuals, shield SVG, and stats section          </AnimateIn>
        </div>

        {/* Decorative Lines */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </section>

      {/* Stats / Visual Section */}
      <section className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: Zap, label: "Real-time Detection", value: "0.3s" },
              { icon: Lock, label: "Data Secured", value: "100%" },
              { icon: Globe, label: "Global Coverage", value: "24/7" }
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
    </>
  )
}
