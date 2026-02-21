"use client"

import { AnimateIn } from "./animate-in"

type PageHeaderProps = {
  badge: string
  headline: string
  subheadline: string
}

export function PageHeader({ badge, headline, subheadline }: PageHeaderProps) {
  return (
    <section className="pb-16 pt-32 text-center md:pb-24 md:pt-40">
      <div className="mx-auto max-w-3xl px-6">
        <AnimateIn>
          <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
            {badge}
          </span>
        </AnimateIn>
        <AnimateIn delay={100}>
          <h1 className="mt-6 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            {headline}
          </h1>
        </AnimateIn>
        <AnimateIn delay={200}>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {subheadline}
          </p>
        </AnimateIn>
      </div>
    </section>
  )
}
