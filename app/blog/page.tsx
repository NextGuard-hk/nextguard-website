import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Blog | Nextguard - AI-Driven DLP & Data Security Insights",
  description: "Explore Nextguard blog for insights on Data Loss Prevention (DLP), AI-driven data security, endpoint protection, and enterprise cybersecurity solutions. Next Guard DLP expertise.",
  keywords: ["Nextguard DLP", "Next Guard DLP", "data loss prevention blog", "AI DLP", "enterprise data security", "endpoint DLP", "Nextguard", "Next-guard"],
  alternates: {
    canonical: "https://next-guard.com/blog",
  },
}

const blogPosts = [
  {
    slug: "what-is-dlp-data-loss-prevention-guide-2025",
    title: "What is DLP? A Complete Guide to Data Loss Prevention in 2025",
    titleZh: "什麼是 DLP？2025 年數據防洩漏完整指南",
    excerpt: "Learn how Data Loss Prevention (DLP) technology protects sensitive enterprise data from unauthorized access, leakage, and theft. Discover why Nextguard DLP is the AI-driven choice for modern businesses.",
    excerptZh: "了解數據防洩漏 (DLP) 技術如何保護企業敏感數據免受未授權訪問、洩漏和盜竊。探索為什麼 Nextguard DLP 是現代企業的 AI 驅動選擇。",
    date: "2025-01-15",
    category: "DLP Fundamentals",
  },
  {
    slug: "ai-dlp-vs-traditional-dlp-nextguard",
    title: "AI DLP vs Traditional DLP: Why Nextguard is Redefining Data Security",
    titleZh: "AI DLP 與傳統 DLP 對比：為什麼 Nextguard 正在重新定義數據安全",
    excerpt: "Traditional rule-based DLP is no longer enough. Discover how Nextguard AI DLP uses machine learning and behavioral analytics to detect threats that legacy systems miss.",
    excerptZh: "傳統的基於規則的 DLP 已經不夠用了。了解 Nextguard AI DLP 如何使用機器學習和行為分析來檢測傳統系統遺漏的威脅。",
    date: "2025-01-10",
    category: "AI & Innovation",
  },
  {
    slug: "endpoint-dlp-protection-windows-macos-linux",
    title: "Endpoint DLP: Protecting Data on Windows, macOS & Linux with Nextguard",
    titleZh: "終端 DLP：使用 Nextguard 保護 Windows、macOS 和 Linux 上的數據",
    excerpt: "Comprehensive endpoint DLP coverage across all major operating systems. Learn how Nextguard endpoint agents provide real-time data protection without impacting productivity.",
    excerptZh: "全面的終端 DLP 覆蓋所有主要操作系統。了解 Nextguard 終端代理如何在不影響生產力的情況下提供即時數據保護。",
    date: "2025-01-05",
    category: "Endpoint Security",
  },
  {
    slug: "nextguard-skyguard-independent-dlp-vendor",
    title: "Nextguard: The Independent DLP Vendor with Full Skyguard Technology Rights",
    titleZh: "Nextguard：擁有完整 Skyguard 技術權利的獨立 DLP 廠商",
    excerpt: "Nextguard is the only vendor outside China with complete Skyguard source code, technology authorization, and development rights. Learn about our journey to rebuild data security for the global AI era.",
    excerptZh: "Nextguard 是中國以外唯一擁有完整 Skyguard 源代碼、技術授權和開發權的廠商。了解我們為全球 AI 時代重建數據安全的歷程。",
    date: "2025-01-01",
    category: "Company",
  },
  {
    slug: "hong-kong-data-protection-dlp-compliance",
    title: "Hong Kong Data Protection & DLP Compliance: What Enterprises Need to Know",
    titleZh: "香港數據保護與 DLP 合規：企業必須了解的事項",
    excerpt: "Navigate Hong Kong data protection regulations with confidence. Learn how Nextguard DLP helps enterprises achieve compliance with PDPO and international data security standards.",
    excerptZh: "自信地應對香港數據保護法規。了解 Nextguard DLP 如何幫助企業達成 PDPO 及國際數據安全標準的合規要求。",
    date: "2024-12-20",
    category: "Compliance",
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-4">Nextguard Blog</h1>
        <p className="text-gray-400 text-lg mb-12">
          Insights on AI-driven Data Loss Prevention, enterprise data security, and the future of DLP technology.
        </p>
        <div className="grid gap-8">
          {blogPosts.map((post) => (
            <article key={post.slug} className="border border-gray-800 rounded-xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">{post.category}</span>
                <time className="text-xs text-gray-500">{post.date}</time>
              </div>
              <h2 className="text-xl font-semibold mb-2 hover:text-blue-400">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-sm text-gray-500 mb-2">{post.titleZh}</p>
              <p className="text-gray-400 text-sm">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
