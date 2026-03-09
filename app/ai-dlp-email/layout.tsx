import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Email DLP - Intelligent Email Data Protection",
  description: "Test Nextguard's AI-powered email DLP capabilities. Detect sensitive data in emails, prevent data leaks, and ensure compliance with real-time scanning.",
  keywords: ["email DLP", "email data protection", "email security", "AI email scanning", "email compliance", "sensitive data detection"],
  openGraph: {
    title: "AI Email DLP - Intelligent Email Data Protection",
    description: "AI-powered email DLP with real-time sensitive data detection.",
  },
}

export default function AiDlpEmailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
