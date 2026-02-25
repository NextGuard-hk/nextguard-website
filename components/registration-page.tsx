"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { CalendarDays, MapPin, Clock, Users, CheckCircle, Send, Building2, User, Mail, Phone, Briefcase } from "lucide-react"

export function RegistrationPage() {
  const { t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const form = e.currentTarget
    const data = {
      fullName: (form.elements.namedItem('fullName') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      company: (form.elements.namedItem('company') as HTMLInputElement).value,
      jobTitle: (form.elements.namedItem('jobTitle') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
      country: (form.elements.namedItem('country') as HTMLInputElement).value,
      attendees: (form.elements.namedItem('attendees') as HTMLSelectElement).value,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
    }
    try {
      await fetch(
                'https://script.google.com/macros/s/AKfycbzYACr_lf9Qg6zRBaaKEJPLcdq1qRGQW6gZ_xD9bP0Z9xyI9VsL2V7_ng3__dtKMgNl/exec',
        { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
      )
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        badge="PARTNER DAY 2026"
        headline="Nextguard Partner Day 2026"
        subheadline="Join us for an exclusive partner event to explore the future of AI-driven data security together."
      />

      {/* Event Info Banner */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-border/50 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.07),transparent_70%)]" />
        <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px"}} />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimateIn>
            <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { icon: CalendarDays, label: "Date", desc: "27 March 2026" },
                  { icon: Clock, label: "Time", desc: "13:30 - 17:00" },
                  { icon: MapPin, label: "Venue", desc: "4/F, HKPC Building, 78 Tat Chee Avenue, Kowloon, Hong Kong" },
                  { icon: Users, label: "Capacity", desc: "Limited Seats" },
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

      {/* Registration Form */}
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
                        Registration Submitted!
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">Thank you for registering. A confirmation email will be sent to you within 3 working days.</p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="mt-6 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        Submit Another Registration
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                      <h3 className="text-lg font-semibold text-foreground mb-2">RSVP Registration Form</h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                            Full Name *
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            required
                            placeholder="Your full name"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="email" className="text-sm font-medium text-foreground">
                            Email Address *
                          </label>
                          <input
                            id="email"
                            type="email"
                            required
                            placeholder="name@company.com"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="company" className="text-sm font-medium text-foreground">
                            Company Name *
                          </label>
                          <input
                            id="company"
                            type="text"
                            required
                            placeholder="Your company name"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="jobTitle" className="text-sm font-medium text-foreground">
                            Job Title *
                          </label>
                          <input
                            id="jobTitle"
                            type="text"
                            required
                            placeholder="Your job title"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="phone" className="text-sm font-medium text-foreground">
                            Phone Number
                          </label>
                          <input
                            id="phone"
                            type="tel"
                            placeholder="+852 XXXX XXXX"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="country" className="text-sm font-medium text-foreground">
                            Country / Region *
                          </label>
                          <input
                            id="country"
                            type="text"
                            required
                            placeholder="e.g. Hong Kong, Taiwan, Singapore"
                            className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="attendees" className="text-sm font-medium text-foreground">
                          Number of Attendees *
                        </label>
                        <select
                          id="attendees"
                          required
                          className="rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">Please select</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5+</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="notes" className="text-sm font-medium text-foreground">
                          Special Requirements / Notes
                        </label>
                        <textarea
                          id="notes"
                          rows={3}
                          placeholder="Any dietary requirements, accessibility needs, or questions..."
                          className="resize-none rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Please kindly RSVP by 10 March 2026. Limited seats available.</p>
                      <button
                        type="submit"
                                        disabled={isSubmitting}
                        className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
                      >
                        {isSubmitting ? 'Submitting...' : (<><Send className="h-4 w-4" /> Register Now</>)}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </AnimateIn>

            {/* Event Details Sidebar */}
            <AnimateIn delay={200} className="lg:col-span-2">
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.05),transparent_60%)]" />
                  <div className="relative">
                    <h3 className="text-base font-semibold text-foreground">Event Highlights</h3>
                    <div className="mt-6 flex flex-col gap-4">
                      {[
                        "Nextguard Product Roadmap 2026",
                        "AI-Powered DLP Live Demo",
                        "Partner Program Benefits",
                        "Technical Deep Dive Sessions",
                        "Networking & Business Matching",
                        "Exclusive Partner Offers",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0" />
                          <span className="text-sm text-zinc-300">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="rounded-xl border border-cyan-500/20 bg-zinc-900/50 p-6 relative overflow-hidden">
                  <div className="absolute inset-0" style={{backgroundImage: "linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px"}} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Questions?</div>
                        <div className="text-xs text-zinc-500">Contact our team</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">For event enquiries, please contact:</p>
                      <p className="text-sm text-cyan-400">sales@next-guard.com</p>
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
