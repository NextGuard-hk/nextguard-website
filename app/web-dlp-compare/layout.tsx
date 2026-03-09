import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Web DLP Comparison - Compare DLP Vendors",
  description: "Compare Nextguard's web DLP capabilities against leading vendors including Forcepoint, Symantec, Zscaler, and more. Feature-by-feature comparison.",
  keywords: ["DLP comparison", "DLP vendor comparison", "Forcepoint vs Nextguard", "web DLP", "DLP features", "best DLP solution"],
  openGraph: {
    title: "Web DLP Comparison - Compare DLP Vendors",
    description: "Feature-by-feature comparison of leading DLP solutions.",
  },
}

export default function WebDlpCompareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
