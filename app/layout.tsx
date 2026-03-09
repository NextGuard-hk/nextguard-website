import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/lib/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

const siteUrl = "https://next-guard.com"

export const metadata: Metadata = {
  title: {
    default: "Nextguard - AI-Driven Data Loss Prevention | Enterprise DLP Solution",
    template: "%s | Nextguard",
  },
  description: "Nextguard leverages advanced AI to detect, classify, and prevent data loss across your entire organization in real time. Enterprise-grade DLP with intelligent content inspection, endpoint protection, and cloud security.",
  keywords: [
    "data loss prevention",
    "DLP",
    "AI security",
    "enterprise data protection",
    "endpoint security",
    "cloud DLP",
    "content inspection",
    "data classification",
    "cybersecurity",
    "Nextguard",
    "next-guard",
    "information security",
    "data leak prevention",
    "AI-driven security",
    "real-time data protection",
  ],
  authors: [{ name: "Nextguard Technology" }],
  creator: "Nextguard Technology",
  publisher: "Nextguard Technology",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Nextguard",
    title: "Nextguard - AI-Driven Data Loss Prevention",
    description: "Advanced AI-powered DLP solution to detect, classify, and prevent data loss across your entire organization in real time.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nextguard - AI-Driven Data Loss Prevention",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nextguard - AI-Driven Data Loss Prevention",
    description: "Advanced AI-powered DLP solution to detect, classify, and prevent data loss across your entire organization in real time.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: "#0d0f12",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nextguard Technology",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: "AI-Driven Data Loss Prevention solution for enterprises",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@next-guard.com",
      contactType: "sales",
    },
  }

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nextguard DLP",
    applicationCategory: "SecurityApplication",
    operatingSystem: "macOS, Windows",
    description: "AI-driven Data Loss Prevention platform with real-time content inspection, endpoint protection, and cloud security.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Contact us for enterprise pricing",
    },
  }

  return (
    <html lang="en" className={`${_inter.variable} ${_jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
