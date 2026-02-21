"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ShieldCheck, Focus, Headset, Handshake, ArrowRightLeft, ArrowRight } from "lucide-react"

const commitmentIcons = [ShieldCheck, Focus, Headset, Handshake, ArrowRightLeft]

export function PartnersPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.partners.badge}
        headline={t.partners.headline}
        subheadline={t.partners.subheadline}
      />

      {/* Commitments */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.partners.commitments.map((commitment, i) => {
              const Icon = commitmentIcons[i] || ShieldCheck
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-primary/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">{commitment.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{commitment.description}</p>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <AnimateIn>
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-6 text-balance text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              {t.partners.ctaTitle}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {t.partners.ctaDescription}
            </p>
            <Link
              href="/contact"
              className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
            >
              {t.partners.ctaButton}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
