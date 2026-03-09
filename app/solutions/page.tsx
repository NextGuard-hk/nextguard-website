import type { Metadata } from "next"
import { SolutionsPage } from "@/components/solutions-page"

export const metadata: Metadata = {
  title: "Solutions - Enterprise Data Protection",
  description: "Discover how Nextguard's AI-driven DLP solutions protect your organization across endpoints, cloud, email, and web channels with real-time threat detection.",
  keywords: ["enterprise DLP", "data protection solutions", "endpoint DLP", "cloud security", "email security", "web DLP"],
  openGraph: {
    title: "Nextguard Solutions - Enterprise Data Protection",
    description: "AI-driven DLP solutions to protect your organization across all channels.",
  },
}

export default function Page() {
  return <SolutionsPage />
}
