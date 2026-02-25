"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { PageHeader } from "./page-header"
import { AnimateIn } from "./animate-in"
import { CalendarDays, MapPin, Clock, Users, CheckCircle, Send, Building2, User, Mail, Phone, Briefcase, Lock, Download, Eye } from "lucide-react"

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
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminData, setAdminData] = useState<Registration[] | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

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

  async function handleAdminLogin() {
    setAdminLoading(true)
    setAdminError('')
    try {
      const res = await fetch(`/api/rsvp?password=${encodeURIComponent(adminPassword)}`)
      const data = await res.json()
      if (data.status === 'success') {
        setAdminData(data.registrations)
        setShowAdminLogin(false)
      } else {
        setAdminError('Incorrect password')
      }
    } catch {
      setAdminError('Failed to fetch data')
    } finally {
      setAdminLoading(false)
    }
  }

  function handleDownloadCSV() {
    window.open(`/api/rsvp?password=${encodeURIComponent(adminPassword)}&format=csv`, '_blank')
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: CalendarDays, label: "Date", desc: "27 March 2026" },
                  { icon: Clock, label: "Time", desc: "13:30 - 17:00" },
                  { icon: MapPin, label: "Venue", desc: "4/F, HKPC Building, 78 Tat Chee Avenue, Kowloon, Hong Kong" },
                  { icon: Users, label: "Capacity", desc: "Limited Seats" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-cyan-400 uppercase tracking-wider">{item.label}</div>
                      <div className="text-sm text-zinc-300 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Registration Form */}
      <section className="relative bg-zinc-950 py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <AnimateIn className="lg:col-span-3">
              <div className="rounded-xl border border-border/50 bg-card p-6 md:p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Registration Submitted!</h3>
                    <p className="text-sm text-muted-foreground mt-2">Thank you for registering. A confirmation email will be sent to you within 3 working days.</p>
                    <button onClick={() => setSubmitted(false)} className="mt-6 text-sm font-medium text-primary transition-colors hover:text-primary/80">Submit Another Registration</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-lg font-semibold text-foreground">RSVP Registration Form</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="fullName" className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />Full Name *</label>
                        <input name="fullName" id="fullName" type="text" required placeholder="Your full name" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />Email Address *</label>
                        <input name="email" id="email" type="email" required placeholder="name@company.com" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="company" className="text-sm font-medium text-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />Company Name *</label>
                        <input name="company" id="company" type="text" required placeholder="Your company name" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="jobTitle" className="text-sm font-medium text-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" />Job Title *</label>
                        <input name="jobTitle" id="jobTitle" type="text" required placeholder="Your job title" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />Phone Number</label>
                        <input name="phone" id="phone" type="tel" placeholder="+852 XXXX XXXX" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="country" className="text-sm font-medium text-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Country / Region *</label>
                        <input name="country" id="country" type="text" required placeholder="e.g. Hong Kong, Taiwan, Singapore" className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="attendees" className="text-sm font-medium text-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" />Number of Attendees *</label>
                      <select name="attendees" id="attendees" required className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="">Please select</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="notes" className="text-sm font-medium text-foreground">Special Requirements / Notes</label>
                      <textarea name="notes" id="notes" rows={3} placeholder="Any dietary requirements, accessibility needs, or questions..." className="w-full resize-none rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">Please kindly RSVP by 10 March 2026. Limited seats available.</p>
                    <button type="submit" disabled={isSubmitting} className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90">
                      {isSubmitting ? 'Submitting...' : (<><Send className="h-4 w-4" /> Register Now</>)}
                    </button>
                  </form>
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

      {/* Admin Panel */}
      <section className="relative bg-zinc-950 py-8 border-t border-border/30">
        <div className="relative mx-auto max-w-6xl px-6">
          {!adminData && !showAdminLogin && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs text-zinc-400 transition-colors hover:border-cyan-500/30 hover:text-cyan-400"
              >
                <Lock className="h-3.5 w-3.5" />
                Admin Access
              </button>
            </div>
          )}

          {showAdminLogin && (
            <div className="mx-auto max-w-sm">
              <div className="rounded-xl border border-cyan-500/20 bg-zinc-900/80 p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  Admin Login
                </h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter admin password"
                    className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  {adminError && <p className="text-xs text-red-400">{adminError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdminLogin}
                      disabled={adminLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                    >
                      <Eye className="h-4 w-4" />
                      {adminLoading ? 'Loading...' : 'View Registrations'}
                    </button>
                    <button
                      onClick={() => { setShowAdminLogin(false); setAdminError('') }}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Registrations ({adminData.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdminLogin}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </button>
                  <button
                    onClick={() => { setAdminData(null); setAdminPassword('') }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/50 bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">#</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Email</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Company</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Job Title</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Phone</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Country</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Attendees</th>
                      <th className="px-4 py-3 text-xs font-medium text-zinc-400">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.map((r, i) => (
                      <tr key={r.id} className="border-b border-border/30 hover:bg-zinc-900/30">
                        <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                        <td className="px-4 py-3 text-white">{r.fullName}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.email}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.company}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.jobTitle}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.phone}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.country}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.attendees}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</td>
                      </tr>
                    ))}
                    {adminData.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-500">No registrations yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
