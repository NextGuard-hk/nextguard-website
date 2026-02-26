import { SocReviewPage } from "@/components/soc-review-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import SocAuthWrapper from "@/components/soc-auth-wrapper"

export const metadata = {
  title: "SOC Review – NextGuard",
  description: "AI-powered syslog analysis dashboard for SOC analysts",
}

export default function SocReview() {
  return (
    <div className="relative min-h-screen bg-black">
      <Header />
      <SocAuthWrapper>
        <main>
          <SocReviewPage />
        </main>
      </SocAuthWrapper>
      <Footer />
    </div>
  )
}
