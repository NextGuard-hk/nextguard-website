"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Menu, X } from "lucide-react"
import type { Locale } from "@/lib/i18n"

export function Header() {
  const { locale, setLocale, t } = useLanguage()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: "/", label: t.nav.home },
        { href: "/products", label: t.nav.products },
    { href: "/company", label: t.nav.company },
    { href: "/solutions", label: t.nav.solutions },
    { href: "/partners", label: t.nav.partners },
    { href: "/news", label: t.nav.news },
    { href: "/contact", label: t.nav.contact },
  ]

  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: "EN" },
        { code: "zh-TW", label: "CN-繁" },
        { code: "zh-CN", label: "CN-简" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <Image
            src="/images/nextguard-logo.png"
            alt="Nextguard Technology Limited"
            width={234}
            height={52}
            className="h-[42px] w-auto mix-blend-screen"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[18px] transition-colors duration-200 ${
                pathname === link.href
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Language Switcher - 3 options */}
          <div className="hidden md:flex items-center rounded-md border border-border/50 overflow-hidden">
            {languages.map((lang, i) => (
              <button
                key={lang.code}
                onClick={() => setLocale(lang.code)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                  locale === lang.code
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                } ${i !== 0 ? "border-l border-border/50" : ""}`}
                aria-label={`Switch to ${lang.label}`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 px-6 py-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 text-[18px] transition-colors duration-200 ${
                pathname === link.href
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Mobile Language Switcher */}
          <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { setLocale(lang.code); setMobileOpen(false) }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  locale === lang.code
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
