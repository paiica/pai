import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/faq`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getCmsPage();
  return {
    title: cms?.title ?? "Frequently Asked Questions",
    description: cms?.meta_description ?? "Answers to the most common questions about PAI certifications, exams, enrollment, and credentials.",
  };
}

const FAQS = [
  {
    category: "Certifications & Programs",
    items: [
      { q: "Do I need a technical background to enroll?", a: "No. PAI certifications are designed for business professionals, not engineers. CAIP, CAIM, and CAIE require no programming or data science background. CAIDA benefits from familiarity with data tools but doesn't require coding." },
      { q: "Which certification should I start with?", a: "87% of PAI professionals start with CAIP regardless of seniority. It establishes a common foundation. After CAIP, choose CAIM (management), CAIDA (data), or CAIE (executive) based on your role." },
      { q: "Can I take multiple certifications?", a: "Yes. Many professionals complete CAIP followed by CAIM or CAIDA. CAIP alumni receive a 15% discount on subsequent certifications." },
      { q: "Are there prerequisites?", a: "CAIP has no prerequisites. CAIM and CAIDA recommend CAIP but don't require it. CAIE is designed for senior professionals and recommends 3+ years in a leadership role." },
    ],
  },
  {
    category: "Application & Enrollment",
    items: [
      { q: "How does the application process work?", a: "You submit a brief application (5 minutes), pay the enrollment fee, and PAI reviews your application within 3–5 business days. You receive your LMS access credentials via email upon approval." },
      { q: "Why do I need to apply? Can't I just enroll?", a: "PAI's application process ensures credential integrity and helps us understand your professional context for the best learning experience. Applications are rarely declined — it's not an exclusionary process." },
      { q: "What if my application is rejected?", a: "You'll receive a full refund within 5–7 business days. In most cases, rejections come with guidance on reapplying or on alternative pathways." },
    ],
  },
  {
    category: "The Exam",
    items: [
      { q: "How is the exam delivered?", a: "Online, proctored through our secure testing platform. You can take it from home or office. You'll need a webcam, government ID, and a quiet space." },
      { q: "What happens if I fail?", a: "Two retakes are included in your enrollment fee. If you fail a third time, additional retakes are $99 each. Detailed score reports guide your preparation." },
      { q: "How long is the exam?", a: "CAIP, CAIM, and CAIDA: 90 minutes, 75 questions. CAIE: 75 minutes, 60 questions. All are multiple-choice." },
      { q: "When can I take the exam?", a: "You can schedule your exam at any time after completing all required modules. No cohort deadlines — take it when you're ready." },
    ],
  },
  {
    category: "Credentials & Recognition",
    items: [
      { q: "How long is the certification valid?", a: "CAIP, CAIM, and CAIDA are valid for 2 years. CAIE is valid for 3 years. Renewal involves a shorter recertification exam or continuing education credits." },
      { q: "How do employers verify my credential?", a: "Each certificate includes a unique ID and QR code. Employers can verify instantly at paii.ca/verify. You can also add your credential directly to LinkedIn." },
      { q: "Are PAI credentials recognized internationally?", a: "Yes. PAI credentials are recognized by employers across 48 countries. Our ISO 17024-aligned framework aligns with international standards for professional certifications." },
    ],
  },
  {
    category: "Payments & Refunds",
    items: [
      { q: "What payment methods are accepted?", a: "All major credit cards (Visa, Mastercard, Amex), debit cards, and bank transfers for corporate orders. Payments are processed via Stripe." },
      { q: "Is there a refund policy?", a: "Full refund within 30 days of enrollment if you haven't passed the exam. No refunds after exam attempt. Corporate orders: contact corporate@paii.ca." },
      { q: "Is there financing available?", a: "Yes. We partner with third-party financing providers. Contact info@paii.ca for details on installment payment options." },
    ],
  },
];

export default async function FAQPage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — always hardcoded */}
        <section className="pt-[148px] pb-20 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">FAQ</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">Frequently Asked Questions</h1>
            <p className="text-lg text-white max-w-xl mx-auto">
              Everything you need to know about PAI certifications, exams, and credentials.
            </p>
          </div>
        </section>

        {/* Content — CMS if available, otherwise hardcoded */}
        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <section className="section-padding bg-white">
            <div className="container-md">
              <div className="space-y-12">
                {FAQS.map((section) => (
                  <div key={section.category}>
                    <h2 className="text-lg font-display font-black text-ink-900 mb-5 pb-3 border-b border-sand-200">
                      {section.category}
                    </h2>
                    <div className="space-y-4">
                      {section.items.map((item) => (
                        <div key={item.q} className="bg-sand-100 rounded-2xl p-5 border border-sand-200">
                          <h3 className="font-display font-bold text-ink-900 text-base mb-2">{item.q}</h3>
                          <p className="text-ink-900 text-sm leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-14 bg-ink-800 rounded-2xl p-7 text-center text-white">
                <h3 className="font-display font-bold text-xl mb-2">Still have questions?</h3>
                <p className="text-white text-sm mb-5">Our team responds within 24 hours on business days.</p>
                <a href="mailto:info@paii.ca" className="btn-primary !py-3 !px-7 !text-sm">
                  Contact Us <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

