import { NewsFeedPage } from "@/components/news-feed-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Cybersecurity News Feed | NextGuard",
  description: "Real-time AI-curated cybersecurity news and threat intelligence from trusted sources worldwide. Stay updated on the latest cyber threats, vulnerabilities, and AI security trends.",
  keywords: ["cybersecurity news", "AI security", "threat intelligence", "data breach", "ransomware", "vulnerability", "DLP"],
}

export default function AiNewsFeedPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <NewsFeedPage />
      <Footer />
    </main>
  )
}
