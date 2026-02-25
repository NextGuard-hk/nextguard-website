"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { CalendarDays, MapPin, Clock, Users, CheckCircle, Send, Building2, User, Mail, Phone, Briefcase } from "lucide-react"

interface Registration {
  id: string
  fullName: string
  email: string
  company: string
  jobTitle: string
  phone: string
  country: string
  attendees: string
  notes: string
  timestamp: string
}

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
        '/api/rsvp',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
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
      {/* Event Info Banner */}
      <section className="relative bg-zinc-950 pt-24 pb-8">
        <PageHeader title="Partner Day 2026" subtitle="NextGuard Partner Day 2026 - Hong Kong" />
        <div className="relative mx-auto max-w-6xl px-6 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CalendarDays, label: "Date", desc: "27 March 2026" },
              { icon: Clock, label: "Time", desc: "13:30 - 17:00" },
              { icon: MapPin, label: "Venue", desc: "4/F, HKPC Building, 78 Tat Chee Avenue, Kowloon, Hong Kong" },
              { icon: Users, label: "Capacity", desc: "Limited Seats" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-400">{item.label}</div>
                  <div className="text-sm text-white mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="relative bg-zinc-950 py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <AnimateIn className="lg:col-span-3">
              <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white">Registration Submitted!</h3>
                    <p className="text-sm text-zinc-400 mt-2">Thank you for registering. A confirmation email will be sent to you within 3 working days.</p>
                    <button onClick={() => setSubmitted(false)} className="mt-6 text-sm font-medium text-primary transition-colors hover:text-primary/80">Submit Another Registration</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-6">RSVP Registration Form</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="fullName" className="block text-xs font-medium text-zinc-400 mb-1.5"><User className="inline h-3.5 w-3.5 mr-1" />Full Name *</label>
                          <input name="fullName" id="fullName" type="text" required placeholder="Your full name" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5"><Mail className="inline h-3.5 w-3.5 mr-1" />Email Address *</label>
                          <input name="email" id="email" type="email" required placeholder="name@company.com" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="company" className="block text-xs font-medium text-zinc-400 mb-1.5"><Building2 className="inline h-3.5 w-3.5 mr-1" />Company Name *</label>
                          <input name="company" id="company" type="text" required placeholder="Your company name" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label htmlFor="jobTitle" className="block text-xs font-medium text-zinc-400 mb-1.5"><Briefcase className="inline h-3.5 w-3.5 mr-1" />Job Title *</label>
                          <input name="jobTitle" id="jobTitle" type="text" required placeholder="Your job title" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="phone" className="block text-xs font-medium text-zinc-400 mb-1.5"><Phone className="inline h-3.5 w-3.5 mr-1" />Phone Number</label>
                          <input name="phone" id="phone" type="tel" placeholder="+852 XXXX XXXX" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label htmlFor="country" className="block text-xs font-medium text-zinc-400 mb-1.5"><MapPin className="inline h-3.5 w-3.5 mr-1" />Country / Region *</label>
                          <input name="country" id="country" type="text" required placeholder="e.g. Hong Kong, Taiwan, Singapore" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="attendees" className="block text-xs font-medium text-zinc-400 mb-1.5"><Users className="inline h-3.5 w-3.5 mr-1" />Number of Attendees *</label>
                        <select name="attendees" id="attendees" required className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50">
                          <option value="">Please select</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5+</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="notes" className="block text-xs font-medium text-zinc-400 mb-1.5">Special Requirements / Notes</label>
                        <textarea name="notes" id="notes" rows={3} placeholder="Any dietary requirements, accessibility needs, or questions..." className="w-full resize-none rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <p className="text-xs text-muted-foreground">Please kindly RSVP by 10 March 2026. Limited seats available.</p>
                      <button type="submit" disabled={isSubmitting} className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90">
                        {isSubmitting ? 'Submitting...' : (<><Send className="h-4 w-4" /> Register Now</>)}
                      </button>
                    </form>
                  </>
                )}
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
