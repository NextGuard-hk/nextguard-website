"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Mail, Globe, Send, CheckCircle } from "lucide-react"

export function ContactPage() {
  const { t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <PageHeader
        badge={t.contact.badge}
        headline={t.contact.headline}
        subheadline={t.contact.subheadline}
      />

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <AnimateIn className="lg:col-span-3">
              <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle className="h-12 w-12 text-primary" />
                    <h3 className="mt-4 text-xl font-semibold text-foreground">
                      {t.contact.form.successTitle}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t.contact.form.successMessage}
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-6 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {t.contact.form.sendAnother}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-sm font-medium text-foreground">
                          {t.contact.form.name}
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          placeholder={t.contact.form.namePlaceholder}
                          className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                          {t.contact.form.email}
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          placeholder={t.contact.form.emailPlaceholder}
                          className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="company" className="text-sm font-medium text-foreground">
                        {t.contact.form.company}
                      </label>
                      <input
                        id="company"
                        type="text"
                        placeholder={t.contact.form.companyPlaceholder}
                        className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="message" className="text-sm font-medium text-foreground">
                        {t.contact.form.message}
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        placeholder={t.contact.form.messagePlaceholder}
                        className="resize-none rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <button
                      type="submit"
                      className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4" />
                      {t.contact.form.submit}
                    </button>
                  </form>
                )}
              </div>
            </AnimateIn>

            {/* Contact Info */}
            <AnimateIn delay={200} className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8">
                  <h3 className="text-base font-semibold text-foreground">{t.contact.info.title}</h3>
                  <div className="mt-6 flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm text-foreground">{t.contact.info.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm text-foreground">{t.contact.info.website}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  )
}
