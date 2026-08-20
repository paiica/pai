import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Building2, Users2, BarChart3, Award, CheckCircle2, ArrowRight, Mail, ClipboardList, MessageSquareText, UserPlus, LineChart } from "lucide-react";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";
import InquiryForm from "@/components/InquiryForm";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = PageHeroProps & { title: string; content: string; meta_description: string; hero_enabled: boolean };

async function getCmsPage(locale: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/corporate?lang=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CmsPage;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const cms = await getCmsPage(locale);
  return {
    title: cms?.title ?? "Corporate Training & Group Enrollment",
    description: cms?.meta_description ?? "Upskill your entire organization with PAII's group certification programs. Volume pricing, dedicated support, and custom learning paths.",
  };
}

// Genuinely a sequence — a buyer evaluating this page wants to know what
// happens after they reach out, in order. Numbering earns its place here
// the way it wouldn't on a plain feature list.
const STEPS = [
  { n: "01", icon: MessageSquareText, title: "Talk to us", desc: "Tell us your team's size, goals, and where AI skills are missing today." },
  { n: "02", icon: ClipboardList,     title: "Get a custom plan", desc: "We match seat tiers, programs, and rollout timeline to your budget." },
  { n: "03", icon: UserPlus,          title: "Your team enrolls", desc: "Bulk-enroll every department instantly from a single admin panel." },
  { n: "04", icon: LineChart,         title: "Track results", desc: "Watch completion, exam scores, and skill growth in real time." },
];

const INCLUDED = [
  "Dedicated account manager",
  "Volume pricing on every tier",
  "Admin analytics dashboard",
  "All certification programs",
];

const FEATURES = [
  { icon: BarChart3, title: "Admin Analytics Dashboard", desc: "Track completion rates, exam scores, and progress across your entire team. Export reports for executive stakeholders." },
  { icon: Users2, title: "Bulk Enrollment", desc: "Enroll entire departments instantly. Manage seats, assign programs, and monitor progress from a single admin panel." },
  { icon: Award, title: "Custom Learning Paths", desc: "For Enterprise clients, we build role-specific learning tracks aligned to your organization's AI adoption roadmap." },
  { icon: Building2, title: "Dedicated Account Manager", desc: "For Organization and Enterprise tiers, your dedicated manager handles everything from onboarding to completion." },
  { icon: BarChart3, title: "Executive Reporting", desc: "Quarterly certification progress reports, ROI analysis, and skills gap assessments for HR and executive teams." },
  { icon: CheckCircle2, title: "30-Day Pilot Available", desc: "Not sure? We offer a 30-day pilot enrollment for up to 5 seats at full features so you can evaluate before committing." },
];

const TIERS = [
  {
    name: "Team",
    seats: "3–9 seats",
    discount: "15% off",
    price: "From $1,201/seat",
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
  const locale = await getLocale();
  const cms = await getCmsPage(locale);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — CMS-controlled if enabled (replaces the whole block below,
            including the "what's included" glass box — the CMS hero is
            deliberately simpler), otherwise the original hardcoded hero */}
        {cms?.hero_enabled ? (
          <PageHero {...cms} />
        ) : (
          <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 56px)" }}>
            <div className="container-lg relative text-center">
              <span className="badge-dark mb-5">For Organizations</span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white mb-5 leading-[1.08]">
                AI-Ready Teams<br /><span className="text-gradient">Start Here</span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
                Certify your entire organization with PAII&apos;s group programs. Volume pricing,
                a dedicated account manager, and admin analytics included.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <a href="mailto:corporate@paii.ca" className="btn-primary !py-4 !px-8">
                  <Mail size={16} /> Get a Custom Quote
                </a>
                <Link href="#pricing" className="inline-flex items-center gap-2 text-white hover:text-white font-semibold text-sm transition-colors">
                  View pricing tiers →
                </Link>
              </div>

              {/* What's included — reuses the homepage hero's glass-stat-box
                  container, filled with concrete inclusions rather than
                  invented usage numbers. A buyer scanning this page wants to
                  know what they get, not an unverifiable stat. */}
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden max-w-4xl mx-auto text-left">
                {INCLUDED.map((item) => (
                  <div key={item} className="flex items-center gap-2.5 py-5 px-5">
                    <CheckCircle2 size={16} className="text-teal-400 flex-shrink-0" />
                    <span className="text-sm text-white/90 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content — CMS if available, otherwise hardcoded */}
        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <>
            {/* How it works */}
            <section className="section-padding bg-white">
              <div className="container-lg">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                  <span className="badge-teal mb-4">How It Works</span>
                  <h2 className="section-title mb-4">From First Call to Certified Team</h2>
                  <p className="section-subtitle">
                    No lengthy procurement cycle — most teams are enrolled within a week of their first conversation with us.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
                  {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
                    <div key={n} className="relative lg:px-6 first:lg:pl-0 last:lg:pr-0">
                      {/* Connecting line between steps on desktop only */}
                      {i < STEPS.length - 1 && (
                        <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-sand-300" />
                      )}
                      <div className="relative flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-ink-900 flex items-center justify-center flex-shrink-0 relative z-10">
                          <Icon size={20} className="text-white" />
                        </div>
                        <span className="font-mono text-xs font-semibold text-teal-600 tracking-[0.15em]">STEP {n}</span>
                      </div>
                      <h3 className="font-display font-bold text-ink-900 text-lg mb-2">{title}</h3>
                      <p className="text-sm text-ink-900/70 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Feature grid */}
            <section className="section-padding bg-sand-100">
              <div className="container-lg">
                <div className="text-center mb-14 max-w-2xl mx-auto">
                  <span className="badge-teal mb-4">What&apos;s Included</span>
                  <h2 className="section-title mb-4">Built for How Teams Actually Learn</h2>
                  <p className="section-subtitle">
                    Every tier includes the tools your admins and executives need to see real progress, not just seat counts.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FEATURES.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="card-hover p-6 group">
                      <div className="w-11 h-11 bg-sand-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon size={20} className="text-ink-900" />
                      </div>
                      <h3 className="font-display font-bold text-ink-900 text-base mb-2">{title}</h3>
                      <p className="text-sm text-ink-900/70 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="section-padding bg-white">
              <div className="container-lg">
                <div className="text-center mb-14">
                  <span className="badge-teal mb-4">Group Pricing</span>
                  <h2 className="section-title mb-4">Volume Pricing Tiers</h2>
                  <p className="section-subtitle max-w-xl mx-auto">
                    All programs available. Mix and match certifications across your team.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {TIERS.map((tier) => (
                    <div
                      key={tier.name}
                      className={`bg-white rounded-2xl border p-7 flex flex-col transition-all duration-300 ${
                        tier.popular
                          ? "border-teal-300 ring-2 ring-teal-200/60 shadow-teal md:-translate-y-2"
                          : "border-sand-300 shadow-card hover:shadow-card-hover hover:-translate-y-1"
                      }`}
                    >
                      {tier.popular && (
                        <div className="text-xs font-bold bg-teal-500 text-white px-3 py-1 rounded-full w-fit mb-4">Most Popular</div>
                      )}
                      <div className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-ink-900/50 mb-2">{tier.seats}</div>
                      <div className="text-2xl font-display font-black text-ink-900 mb-1">{tier.name}</div>
                      <div className="text-teal-600 font-bold text-sm mb-4">{tier.discount}</div>
                      <div className="text-3xl font-display font-black text-ink-900 mb-6">{tier.price}</div>
                      <ul className="space-y-2.5 mb-7 flex-1">
                        {tier.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-ink-900/80">
                            <CheckCircle2 size={15} className="text-teal-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        href="mailto:corporate@paii.ca"
                        className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all no-underline ${
                          tier.popular
                            ? "bg-teal-500 hover:bg-teal-400 text-white shadow-teal"
                            : "bg-ink-900 hover:bg-ink-800 text-white"
                        }`}
                      >
                        {tier.cta} <ArrowRight size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Closing CTA */}
            <section className="section-padding bg-ink-900 relative overflow-hidden">
              <div className="container-md text-center relative">
                <span className="badge-dark mb-5">Let&apos;s Talk</span>
                <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-4">Ready to Certify Your Team?</h2>
                <p className="text-white/70 max-w-lg mx-auto mb-8">
                  Contact our corporate team for a custom proposal, pilot access, or to discuss your
                  organization&apos;s specific requirements.
                </p>
                <a href="mailto:corporate@paii.ca" className="btn-primary !py-4 !px-8">
                  <Mail size={16} /> corporate@paii.ca
                </a>
              </div>
            </section>

            {/* Direct inquiry — supplements the CTAs above, doesn't replace them */}
            <section className="section-padding bg-white">
              <div className="container-md">
                <InquiryForm
                  source="corporate"
                  heading="Request a proposal"
                  subheading="Tell us about your team size and goals and we'll put together a custom quote."
                  interestOptions={["Team plan", "Organization plan", "Enterprise plan", "Pilot / trial", "Something else"]}
                />
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
