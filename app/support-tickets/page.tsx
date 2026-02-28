import SupportTicketsPage from "@/components/support-tickets-page"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Support Tickets | NextGuard",
  description: "Submit and track your technical support requests",
}

export default function Page() {
  return (
    <>
      <Header />
      <SupportTicketsPage />
      <Footer />
    </>
  )
}
