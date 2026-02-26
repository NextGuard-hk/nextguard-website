import { Metadata } from "next"
import { NewsFeedPage } from "@/components/news-feed-page"

export const metadata: Metadata = {
  title: "AI Cybersecurity News Feed | NextGuard",
  description: "Real-time AI-curated cybersecurity intelligence from trusted sources. Stay updated on the latest threats, vulnerabilities, and AI security developments.",
}

export default function Page() {
  return <NewsFeedPage />
}
