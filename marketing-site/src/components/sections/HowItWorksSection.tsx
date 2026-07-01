import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Submit Your Application",
    description:
      "Complete a brief application with your professional background, career goals, and motivation. Takes about 5 minutes. No prerequisites required for CAIP.",
  },
  {
    number: "02",
    title: "Pay the Enrollment Fee",
    description:
      "Secure payment via Stripe. Full refund guaranteed if your application is not approved. Financing options available for qualifying applicants.",
  },
  {
    number: "03",
    title: "Application Review",
    description:
      "PAII's admissions team reviews your application within 3–5 business days. You'll receive a decision email with your LMS access credentials.",
  },
  {
    number: "04",
    title: "Complete the Program",
    description:
      "Access your personalized learning dashboard. Work through video lessons, readings, quizzes, and assignments at your own pace. Mobile-friendly.",
  },
  {
    number: "05",
    title: "Pass the Exam",
    description:
      "Take the 75-question, proctored online exam. You need 70%+ to pass. Two retakes included. Schedule anytime — no testing centre required.",
  },
  {
    number: "06",
    title: "Get Certified",
    description:
      "Receive your digital certificate, Open Badge, and LinkedIn credential. Verifiable via QR code by any employer, anywhere in the world.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="section-padding bg-sand-100">
      <div className="container-lg">
        <div className="text-center mb-14">
          <span className="badge-teal mb-4">The Process</span>
          <h2 className="section-title mb-4">How Certification Works</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            A structured, transparent process designed to uphold credential integrity while making certification accessible.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute left-[39px] top-10 bottom-10 w-px bg-gradient-to-b from-teal-200 via-teal-400 to-teal-200" />

          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-start gap-6 group">
                <div className="relative flex-shrink-0">
                  <div className="w-[78px] h-[78px] bg-white border-2 border-teal-200 group-hover:border-teal-400 rounded-2xl flex flex-col items-center justify-center shadow-sm transition-colors z-10 relative">
                    <div className="text-xs font-bold text-ink-900 uppercase tracking-widest mb-0.5">Step</div>
                    <div className="text-2xl font-display font-black text-ink-900">{step.number}</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-sand-200 p-6 flex-1 shadow-card hover:shadow-card-hover transition-all">
                  <h3 className="font-display font-bold text-ink-900 text-lg mb-2">{step.title}</h3>
                  <p className="text-ink-900 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/certifications/certified-ai-professional" className="btn-primary !py-4 !px-8 !text-base">
            Begin Your Application <ArrowRight size={16} />
          </Link>
          <p className="text-sm text-ink-900 mt-4">
            30-day money-back guarantee · No prerequisites for CAIP
          </p>
        </div>
      </div>
    </section>
  );
}
