import type { Metadata } from "next"
import { ContactPage } from "@/components/contact-page"

export const metadata: Metadata = {
  title: "Contact Us - Get in Touch with Nextguard",
  description: "Contact Nextguard Technology for enterprise DLP solutions, partnership inquiries, product demos, and technical support.",
  keywords: ["contact Nextguard", "DLP demo request", "enterprise security inquiry", "Nextguard support"],
  openGraph: {
    title: "Contact Nextguard Technology",
    description: "Get in touch for enterprise DLP solutions and partnership inquiries.",
  },
}

export default function Page() {
  return <ContactPage />
}
