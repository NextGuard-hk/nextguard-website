"use client"

import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { ArrowUpRight } from "lucide-react"

const categoryColors: Record<string, string> = {
  Roadmap: "bg-primary/10 text-primary",
  Product: "bg-primary/10 text-primary",
  Integration: "bg-accent/10 text-accent",
  Company: "bg-secondary text-secondary-foreground",
  Partnership: "bg-primary/10 text-primary",
  // Chinese
  "\u8def\u7dda\u5716": "bg-primary/10 text-primary",
  "\u7522\u54c1": "bg-primary/10 text-primary",
  "\u6574\u5408": "bg-accent/10 text-accent",
  "\u516c\u53f8": "bg-secondary text-secondary-foreground",
  "\u5408\u4f5c": "bg-primary/10 text-primary",
}

export function NewsPage() {
  const { t } = useLanguage()

  return (
    <>
      <PageHeader
        badge={t.news.badge}
        headline={t.news.headline}
        subheadline={t.news.subheadline}
      />

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col gap-6">
            {t.news.articles.map((article, i) => (
              <AnimateIn key={i} delay={i * 80}>
                <article className="group cursor-pointer rounded-xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/20 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryColors[article.category] || "bg-secondary text-secondary-foreground"}`}>
                          {article.category}
                        </span>
                        <time className="text-xs text-muted-foreground">{article.date}</time>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                        {article.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {article.excerpt}
                      </p>
                    </div>
                    <ArrowUpRight className="hidden h-5 w-5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-primary md:block" />
                  </div>
                </article>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
