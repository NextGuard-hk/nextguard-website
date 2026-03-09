import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI DLP Comparison - Test AI Content Detection",
  description: "Compare Nextguard's AI-powered DLP content detection capabilities. Test PII detection, data classification, and evasion resistance with live demos.",
  keywords: ["AI DLP comparison", "content detection test", "PII detection", "DLP accuracy", "AI content inspection", "data classification demo"],
  openGraph: {
    title: "AI DLP Comparison - Test AI Content Detection",
    description: "Compare AI-powered DLP content detection capabilities with live demos.",
  },
}

export default function AiDlpCompareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
