import type { Metadata } from "next"
import { ProductsPage } from "@/components/products-page"

export const metadata: Metadata = {
  title: "Products - AI-Powered DLP Solutions",
  description: "Explore Nextguard's AI-powered Data Loss Prevention products including endpoint agents, cloud DLP, email protection, and web security gateway.",
  keywords: ["DLP products", "endpoint agent", "cloud DLP", "email DLP", "web security gateway", "data protection software"],
  openGraph: {
    title: "Nextguard Products - AI-Powered DLP Solutions",
    description: "Explore Nextguard's comprehensive suite of AI-powered Data Loss Prevention products.",
  },
}

export default function Page() {
  return <ProductsPage />
}
