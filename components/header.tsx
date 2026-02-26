"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
import { Menu, X, Globe, ChevronDown } from "lucide-react"
import type { Locale } from "@/lib/i18n"
export function Header() {
  const { locale, setLocale, t } = useLanguage()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  const links = [
    { href: "/company", label: t.nav.aboutUs },
    { href: "/products", label: t.nav.products },
    { href: "/solutions", label: t.nav.solutions },
    { href: "/contact", label: t.nav.contact },
    { href: "/partner-day-2026-registration", label: "RSVP" },
        { href: "/news/ai-feed", label: t.nav.aiFeed || "AI News" },
    { href: "https://kb.next-guard.com", label: t.nav.kb },
        { href: "/soc-review", label: "SOC Review" },
  ]
  const languages: { code: Locale; label: string }[] = [
    { code: "en", label: "English" },
    { code: "zh-CN", label: "简体中文" },
    { code: "zh-TW", label: "繁體中文" },
  ]
  const currentLang = languages.find((l) => l.code === locale)
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 mix-blend-screen" onClick={() => setMobileOpen(false)}>
          <Image
            src="/images/nextguard-logo.png"
            alt="Nextguard Technology Limited"
            width={234}
            height={52}
            className="h-[42px] w-auto"
            priority
          />
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
          {/* Language Dropdown */}
          <div ref={langRef} className="relative hidden md:block">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border/50 rounded-md hover:text-foreground hover:border-primary/50 transition-colors duration-200"
              aria-label="Select language"
            >
              <Globe className="h-4 w-4" />
              <span>Languages</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-md border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg py-1 z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLocale(lang.code); setLangOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                      locale === lang.code
                        ? "text-primary bg-primary/10 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
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
              {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
          {/* Mobile Language Options */}
          <div className="mt-4 border-t border-border/50 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Globe className="h-3.5 w-3.5" />
              <span>Languages</span>
            </div>
            <div className="flex flex-col gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code); setMobileOpen(false) }}
                  className={`text-left py-2 text-sm transition-colors duration-150 ${
                    locale === lang.code
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
