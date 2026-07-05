import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Building2, Users2, BarChart3, Award, CheckCircle2, ArrowRight, Mail } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/corporate`, { cache: "no-store" });
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
    title: cms?.title ?? "Corporate Training & Group Enrollment",
    description: cms?.meta_description ?? "Upskill your entire organization with PAII's group certification programs. Volume pricing, dedicated support, and custom learning paths.",
  };
}

const TIERS = [
  {
    name: "Team",
    seats: "3–9 seats",
    discount: "15% off",
    price: "From $1,101/seat",
    features: ["All certification programs", "Team dashboard", "Bulk enrollment", "Email support"],
    cta: "Get Quote",
    popular: false,
  },
  {
    name: "Organization",
    seats: "10–49 seats",
    discount: "25% off",
    price: "From $971/seat",
    features: ["All certification programs", "Admin analytics dashboard", "Custom onboarding", "Dedicated account manager", "Quarterly progress reports"],
    cta: "Get Quote",
    popular: true,
  },
  {
    name: "Enterprise",
    seats: "50+ seats",
    discount: "Custom pricing",
    price: "Contact us",
    features: ["All certification programs", "White-label options", "Custom curriculum modules", "On-site kickoff workshops", "Executive reporting", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default async function CorporatePage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — always hardcoded */}
        <section className="pb-24 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">For Organizations</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              AI-Ready Teams Start Here
            </h1>
            <p className="text-lg text-white max-w-2xl mx-auto mb-8">
              Certify your entire organization with PAII's group programs. Volume pricing,
              a dedicated account manager, and admin analytics included.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:corporate@paii.ca" className="btn-primary !py-4 !px-8">
                <Mail size={16} /> Get a Custom Quote
              </a>
              <Link href="#pricing" className="inline-flex items-center gap-2 text-white hover:text-white font-semibold text-sm transition-colors">
                View pricing tiers →
              </Link>
            </div>
          </div>
        </section>

        {/* Content — CMS if available, otherwise hardcoded */}
        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <>
            <section className="section-padding bg-white">
              <div className="container-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: BarChart3, title: "Admin Analytics Dashboard", desc: "Track completion rates, exam scores, and progress across your entire team. Export reports for executive stakeholders." },
                    { icon: Users2, title: "Bulk Enrollment", desc: "Enroll entire departments instantly. Manage seats, assign programs, and monitor progress from a single admin panel." },
                    { icon: Award, title: "Custom Learning Paths", desc: "For Enterprise clients, we build role-specific learning tracks aligned to your organization's AI adoption roadmap." },
                    { icon: Building2, title: "Dedicated Account Manager", desc: "For Organization and Enterprise tiers, your dedicated manager handles everything from onboarding to completion." },
                    { icon: BarChart3, title: "Executive Reporting", desc: "Quarterly certification progress reports, ROI analysis, and skills gap assessments for HR and executive teams." },
                    { icon: CheckCircle2, title: "30-Day Pilot Available", desc: "Not sure? We offer a 30-day pilot enrollment for up to 5 seats at full features so you can evaluate before committing." },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="card-base p-6">
                      <div className="w-11 h-11 bg-sand-100 rounded-xl flex items-center justify-center mb-4">
                        <Icon size={20} className="text-ink-900" />
                      </div>
                      <h3 className="font-display font-bold text-ink-900 text-base mb-2">{title}</h3>
                      <p className="text-sm text-ink-900 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="pricing" className="section-padding bg-sand-100">
              <div className="container-lg">
                <div className="text-center mb-12">
                  <span className="badge-teal mb-4">Group Pricing</span>
                  <h2 className="section-title mb-4">Volume Pricing Tiers</h2>
                  <p className="section-subtitle max-w-xl mx-auto">
                    All programs available. Mix and match certifications across your team.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {TIERS.map((tier) => (
                    <div
                      key={tier.name}
                      className={`bg-white rounded-2xl border p-7 flex flex-col ${
                        tier.popular
                          ? "border-teal-200 ring-2 ring-teal-200/60 shadow-teal"
                          : "border-sand-200 shadow-card"
                      }`}
                    >
                      {tier.popular && (
                        <div className="text-xs font-bold bg-teal-500 text-white px-3 py-1 rounded-full w-fit mb-4">Most Popular</div>
                      )}
                      <div className="text-xs font-bold uppercase tracking-widest text-ink-900 mb-1">{tier.seats}</div>
                      <div className="text-2xl font-display font-black text-ink-900 mb-0.5">{tier.name}</div>
                      <div className="text-ink-900 font-bold text-sm mb-1">{tier.discount}</div>
                      <div className="text-3xl font-display font-black text-ink-900 mt-3 mb-5">{tier.price}</div>
                      <ul className="space-y-2.5 mb-7 flex-1">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-ink-900">
                            <CheckCircle2 size={14} className="text-ink-900 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        href="mailto:corporate@paii.ca"
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all ${
                          tier.popular
                            ? "bg-teal-500 hover:bg-teal-400 text-white shadow-teal"
                            : "bg-ink-800 hover:bg-ink-700 text-white"
                        }`}
                      >
                        {tier.cta} <ArrowRight size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="section-padding bg-ink-900">
              <div className="container-md text-center">
                <h2 className="text-3xl font-display font-black text-white mb-4">Ready to Get Started?</h2>
                <p className="text-white max-w-lg mx-auto mb-8">
                  Contact our corporate team for a custom proposal, pilot access, or to discuss your
                  organization's specific requirements.
                </p>
                <a href="mailto:corporate@paii.ca" className="btn-primary !py-4 !px-8">
                  <Mail size={16} /> corporate@paii.ca
                </a>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

