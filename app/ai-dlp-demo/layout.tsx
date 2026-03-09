import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI DLP Demo - Live Data Loss Prevention Demo",
  description: "Try Nextguard's AI-powered DLP in action. Interactive demo showcasing real-time content inspection, data classification, and policy enforcement.",
  keywords: ["DLP demo", "data loss prevention demo", "AI DLP trial", "content inspection demo", "DLP live test"],
  openGraph: {
    title: "AI DLP Demo - Live Data Loss Prevention Demo",
    description: "Interactive demo of Nextguard's AI-powered Data Loss Prevention.",
  },
}

export default function AiDlpDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
