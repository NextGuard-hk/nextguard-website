"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context"
import { AnimateIn } from "./animate-in"
import { ArrowRight, ArrowRightLeft, Rocket, ShieldCheck, Cpu } from "lucide-react"

const pillarIcons = [Rocket, Cpu, ShieldCheck, ArrowRightLeft]

export function HomePage() {
  const { t } = useLanguage()

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background Grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,197,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,197,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <AnimateIn>
            <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
              {t.home.badge}
            </span>
          </AnimateIn>

          <AnimateIn delay={100}>
            <Image
              src="/images/nextguard-logo.png"
              alt="Nextguard Technology Limited"
              width={320}
              height={72}
              className="mx-auto mt-8 h-16 w-auto md:h-20"
              priority
            />
          </AnimateIn>

          <AnimateIn delay={200}>
            <h1 className="mt-8 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {t.home.headline}
            </h1>
          </AnimateIn>

          <AnimateIn delay={300}>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.home.subheadline}
            </p>
          </AnimateIn>

          <AnimateIn delay={400}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
              >
                {t.home.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/solutions"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary"
              >
                {t.home.ctaSecondary}
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Why Rebuild */}
      <section className="border-y border-border/50 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center">
              <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                {t.home.whyRebuildTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground">
                {t.home.whyRebuildSubtitle}
              </p>
            </div>
          </AnimateIn>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {t.home.whyRebuildCases.map((item, i) => (
              <AnimateIn key={i} delay={i * 120}>
                <div className="group rounded-xl border border-border/50 bg-background p-6 transition-all duration-300 hover:border-primary/20">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">{item.local}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-primary">{item.global}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <p className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.home.statsTitle}
            </p>
          </AnimateIn>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {t.home.stats.map((stat, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="text-center">
                  <p className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Founded Nextguard */}
      <section className="border-t border-border/50 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <h2 className="text-center text-balance text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              {t.home.pillarsTitle}
            </h2>
          </AnimateIn>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {t.home.pillars.map((pillar, i) => {
              const Icon = pillarIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="group flex gap-5 rounded-xl border border-border/50 bg-background p-6 transition-all duration-300 hover:border-primary/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-primary">{pillar.number}</span>
                        <h3 className="text-base font-semibold text-foreground">{pillar.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>

          <AnimateIn delay={500}>
            <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
              {t.home.pillarsFooter}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <AnimateIn>
            <Image
              src="/images/nextguard-logo.png"
              alt="Nextguard"
              width={160}
              height={36}
              className="mx-auto h-8 w-auto"
            />
            <h2 className="mt-8 text-balance text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              {t.home.ctaSection.title}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {t.home.ctaSection.description}
            </p>
            <Link
              href="/contact"
              className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
            >
              {t.home.ctaSection.button}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
