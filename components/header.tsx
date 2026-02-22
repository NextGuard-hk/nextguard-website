"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Menu, X, Globe } from "lucide-react"

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
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === "en" ? "zh-TW" : "en")}
            className="flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-foreground"
            aria-label="Switch language"
          >
            <Globe className="h-[18px] w-[18px]" />
            {locale === "en" ? "中文" : "EN"}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <nav className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3 text-[18px] transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
