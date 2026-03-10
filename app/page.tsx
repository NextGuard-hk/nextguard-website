// app/page.tsx
import { HomePage } from "@/components/home-page"

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Nextguard DLP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nextguard DLP is an AI-driven Data Loss Prevention platform that detects, classifies, and prevents sensitive data leaks across endpoints, cloud, email, and web channels in real time.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms does Nextguard support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nextguard supports macOS and Windows endpoints, with cloud-based management console accessible from any modern web browser.",
      },
    },
    {
      "@type": "Question",
      name: "How does Nextguard use AI for data protection?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nextguard leverages multiple AI models including advanced LLMs for intelligent content inspection, detecting sensitive data patterns even when obfuscated or encoded, going beyond traditional regex-based DLP.",
      },
    },
    {
      "@type": "Question",
      name: "Can Nextguard prevent data leaks through email?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Nextguard provides AI-powered email DLP that scans outgoing emails and attachments in real time, blocking sensitive data before it leaves your organization.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started with Nextguard?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can request a demo or contact our sales team through the contact page. We offer enterprise deployment with full onboarding support.",
      },
    },
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePage />
    </>
  )
}
