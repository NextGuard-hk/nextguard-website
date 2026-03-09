import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Downloads - Nextguard DLP Agent & Tools",
  description: "Download Nextguard DLP endpoint agents for macOS and Windows, management tools, and documentation for enterprise deployment.",
  keywords: ["Nextguard download", "DLP agent download", "endpoint agent", "macOS DLP", "Windows DLP"],
  openGraph: {
    title: "Downloads - Nextguard DLP Agent & Tools",
    description: "Download Nextguard DLP endpoint agents and management tools.",
  },
}

export default function DownloadsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
