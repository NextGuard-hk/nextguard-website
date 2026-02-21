"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { Mail, Globe, Send, CheckCircle, Shield, MessageSquare, Lock } from "lucide-react"

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

      {/* Contact Visual Banner */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.07),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: MessageSquare, label: "Reach Us", desc: "Response within 24 hours" },
                  { icon: Shield, label: "Secure Channel", desc: "Encrypted communications" },
                  { icon: Lock, label: "Confidential", desc: "Your data stays private" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-zinc-700/40 bg-zinc-800/30">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-zinc-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <AnimateIn className="lg:col-span-3">
              <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.04),transparent_60%)]" />
                <div className="relative">
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-cyan-400" />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-foreground">
                        {t.contact.form.successTitle}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">{t.contact.form.successMessage}</p>
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
              </div>
            </AnimateIn>
            {/* Contact Info */}
            <AnimateIn delay={200} className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.05),transparent_60%)]" />
                  <div className="relative">
                    <h3 className="text-base font-semibold text-foreground">{t.contact.info.title}</h3>
                    <div className="mt-6 flex flex-col gap-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{t.contact.info.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{t.contact.info.website}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Security Assurance Visual */}
                <div className="rounded-xl border border-cyan-500/20 bg-zinc-900/50 p-6 relative overflow-hidden">
                  <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px"}} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Secure Contact</div>
                        <div className="text-xs text-zinc-500">Enterprise Grade</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        "End-to-end encrypted",
                        "No spam, ever",
                        "Data not shared",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span className="text-xs text-zinc-400">{item}</span>
                        </div>
                      ))}
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
