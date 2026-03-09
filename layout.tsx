import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { LanguageProvider } from "@/lib/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: {
    default: "Nextguard - AI-Driven Data Loss Prevention (DLP)",
    template: "%s | Nextguard",
  },
  description: "Nextguard leverages advanced AI to detect, classify, and prevent data loss across your entire organization in real time. Enterprise-grade DLP solution with endpoint protection, content inspection, and policy enforcement.",
  keywords: ["Nextguard", "DLP", "Data Loss Prevention", "cybersecurity", "data protection", "endpoint security", "AI security", "content inspection", "data classification", "enterprise security"],
  authors: [{ name: "Nextguard Technology" }],
  creator: "Nextguard Technology",
  publisher: "Nextguard Technology",
  metadataBase: new URL("https://next-guard.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://next-guard.com",
    siteName: "Nextguard",
    title: "Nextguard - AI-Driven Data Loss Prevention (DLP)",
    description: "Nextguard leverages advanced AI to detect, classify, and prevent data loss across your entire organization in real time.",
    images: [
      {
        url: "/nextguard-logo.png",
        width: 1200,
        height: 630,
        alt: "Nextguard - AI-Driven Data Loss Prevention",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nextguard - AI-Driven Data Loss Prevention (DLP)",
    description: "Nextguard leverages advanced AI to detect, classify, and prevent data loss across your entire organization in real time.",
    images: ["/nextguard-logo.png"],
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
  verification: {
    google: "4b0282b9e5e228df",
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
  return (
    <html lang="en" className={`${_inter.variable} ${_jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
