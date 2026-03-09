import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI SOC Review - Security Operations Center Analysis",
  description: "Nextguard AI-powered SOC review tool for security incident analysis, threat assessment, and automated security operations center workflows.",
  keywords: ["SOC review", "security operations center", "AI SOC", "threat analysis", "security incident review", "automated SOC"],
  openGraph: {
    title: "AI SOC Review - Security Operations Center Analysis",
    description: "AI-powered SOC review for security incident analysis and threat assessment.",
  },
}

export default function SocReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
