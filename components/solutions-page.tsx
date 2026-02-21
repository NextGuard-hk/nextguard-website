"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Brain, Tags, Blocks, Check, ShieldCheck, Users, GraduationCap, Server } from "lucide-react"

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

      {/* Products */}
      <section className="pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8">
            {t.solutions.products.map((product, i) => {
              const Icon = productIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="group rounded-xl border border-border/50 bg-card p-8 transition-all duration-300 hover:border-primary/20 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{product.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                          {product.features.map((feature, j) => (
                            <li key={j} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </AnimateIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Nextguard */}
      <section className="border-t border-border/50 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimateIn>
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t.solutions.whyChooseTitle}
            </h2>
          </AnimateIn>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {t.solutions.whyChoose.map((item, i) => {
              const Icon = whyIcons[i]
              return (
                <AnimateIn key={i} delay={i * 100}>
                  <div className="flex gap-5 rounded-xl border border-border/50 bg-background p-6 transition-all duration-300 hover:border-primary/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
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
