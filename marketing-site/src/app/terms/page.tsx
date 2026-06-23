import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Professional AI Institute Terms of Service.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[148px] pb-20 bg-white">
        <div className="container-md">
          <h1 className="text-4xl font-display font-black text-ink-900 mb-3">Terms of Service</h1>
          <p className="text-ink-900 text-sm mb-10">Last updated: June 1, 2026</p>
          <div className="space-y-8">
            {[
              {
                title: "Acceptance of Terms",
                content: "By applying for or enrolling in a PAI certification program, you agree to be bound by these Terms of Service. If you do not agree, do not proceed with enrollment.",
              },
              {
                title: "Enrollment & Access",
                content: "Upon approval of your application and receipt of payment, you receive personal, non-transferable access to the course materials for the enrolled certification. Access is for individual use only and may not be shared.",
              },
              {
                title: "Refund Policy",
                content: "You are entitled to a full refund within 30 days of enrollment if you have not attempted the final certification exam. No refunds are issued after an exam attempt or after the 30-day window. Application rejections result in an automatic full refund within 5â€“7 business days.",
              },
              {
                title: "Exam Integrity",
                content: "You agree to complete all assessments independently without assistance from others. Any breach of exam integrity, including sharing questions, using unauthorized materials, or impersonating another individual, will result in immediate revocation of your credential and permanent disqualification from PAI programs.",
              },
              {
                title: "Credential Use",
                content: "PAI credentials are issued to the individual who completed the program. You may represent your credential accurately on professional profiles and resumes. Misrepresentation of PAI credentials (claiming credentials you have not earned) is prohibited and may result in legal action.",
              },
              {
                title: "Intellectual Property",
                content: "All course materials, videos, quizzes, and content are the intellectual property of the Professional AI Institute. You may not reproduce, distribute, or create derivative works from our content without written permission.",
              },
              {
                title: "Contact",
                content: "For questions about these terms, contact legal@paii.ca.",
              },
            ].map(({ title, content }) => (
              <div key={title}>
                <h2 className="text-xl font-display font-bold text-ink-900 mb-3">{title}</h2>
                <p className="text-ink-900 leading-relaxed text-sm">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

