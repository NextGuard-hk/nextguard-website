import type { Metadata } from "next"
import { CompanyPage } from "@/components/company-page"

export const metadata: Metadata = {
  title: "About Nextguard - AI-Driven Cybersecurity Company",
  description: "Learn about Nextguard Technology, a cybersecurity company specializing in AI-driven Data Loss Prevention solutions for enterprises worldwide.",
  keywords: ["Nextguard Technology", "cybersecurity company", "DLP vendor", "about Nextguard", "data security company"],
  openGraph: {
    title: "About Nextguard Technology",
    description: "AI-driven cybersecurity company specializing in Data Loss Prevention.",
  },
}

export default function Page() {
  return <CompanyPage />
}
