"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Code2, Cog, BarChart3, User, GraduationCap, HelpCircle, ShieldAlert } from "lucide-react"

const keyPointIcons = [Code2, Cog, BarChart3]

export function CompanyPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.company.badge}
        headline={t.company.headline}
        subheadline={t.company.subheadline}
      />

      {/* Key Points */}
      <section className="border-y border-border/50 bg-card/30 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {t.company.keyPoints.map((point, i) => {
              const Icon = keyPointIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="rounded-xl border border-border/50 bg-background p-8 text-center transition-all duration-300 hover:border-primary/20">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Core Team */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t.company.teamTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">{t.company.teamSubtitle}</p>
            </div>
          </AnimateIn>

          {/* Data Security Leaders */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.company.leaders.map((member, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="rounded-xl border border-border/50 bg-card p-6 text-center transition-all duration-300 hover:border-primary/20">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <User className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{member.bio}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Advisor */}
          <AnimateIn delay={500}>
            <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-8">
              <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.company.advisorTitle}</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{t.company.advisor.name}</h3>
                  <ul className="mt-2 flex flex-col gap-1">
                    {t.company.advisor.credentials.map((cred, i) => (
                      <li key={i} className="text-xs leading-relaxed text-muted-foreground">{cred}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={600}>
            <p className="mt-8 text-center text-sm font-medium tracking-wide text-muted-foreground">
              {t.company.teamTagline}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Nextguard != Skyguard */}
      <section className="border-t border-border/50 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t.company.independenceTitle}
              </h2>
              <p className="mt-2 text-lg font-medium text-primary">
                {t.company.independenceSubtitle}
              </p>
            </div>
          </AnimateIn>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {t.company.independencePoints.map((point, i) => (
              <AnimateIn key={i} delay={i * 100}>
                <div className="rounded-xl border border-border/50 bg-background p-6 transition-all duration-300 hover:border-primary/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-foreground">{point.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.answer}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn delay={400}>
            <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
              {t.company.independenceFooter}
            </p>
          </AnimateIn>
        </div>
      </section>
    </>
  )
}
