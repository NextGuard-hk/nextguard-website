"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/lib/language-context"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/images/nextguard-logo.png"
              alt="Nextguard Technology Limited"
              width={160}
              height={36}
              className="h-7 w-auto mix-blend-screen"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t.footer.description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.footer.quickLinks}
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.home}</Link>
              <Link href="/company" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.company}</Link>
              <Link href="/solutions" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.solutions}</Link>
              <Link href="/partners" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.partners}</Link>
              <Link href="/news" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.news}</Link>
              <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{t.nav.contact}</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.footer.resources} <span className="text-yellow-400 text-xs font-normal normal-case tracking-normal">(In Progress)</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground">{t.footer.documentation}</span>
              <span className="text-sm text-muted-foreground">{t.footer.apiReference}</span>
              <span className="text-sm text-muted-foreground">{t.footer.statusPage}</span>
              <span className="text-sm text-muted-foreground">{t.footer.releaseNotes}</span>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.footer.legal} <span className="text-yellow-400 text-xs font-normal normal-case tracking-normal">(In Progress)</span>
            </h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground">{t.footer.privacy}</span>
              <span className="text-sm text-muted-foreground">{t.footer.terms}</span>
              <span className="text-sm text-muted-foreground">{t.footer.security}</span>
              <span className="text-sm text-muted-foreground">{t.footer.compliance}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
