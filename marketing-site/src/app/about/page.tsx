import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, Globe2, Users2, Award, CheckCircle2, ArrowRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/about`, { cache: "no-store" });
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
    title: cms?.title ?? "About PAII",
    description: cms?.meta_description ?? "Learn about the Professional Artificial Intelligence Institute — our mission, values, advisory board, and commitment to rigorous AI certification.",
  };
}

const BOARD = [
  { name: "Dr. Lisa Chen", title: "Chief AI Officer, Magna International", avatar: "LC", bg: "bg-purple-500" },
  { name: "James Osei", title: "Former VP Engineering, Google DeepMind", avatar: "JO", bg: "bg-blue-500" },
  { name: "Priya Sharma", title: "AI Policy Lead, Government of Canada", avatar: "PS", bg: "bg-emerald-500" },
  { name: "Marcus Rivera", title: "Partner, McKinsey Digital", avatar: "MR", bg: "bg-teal-500" },
  { name: "Dr. Fatima Al-Hassan", title: "Professor of AI Ethics, University of Toronto", avatar: "FA", bg: "bg-rose-500" },
  { name: "Tom Whitfield", title: "CTO, Shopify", avatar: "TW", bg: "bg-ink-600" },
];

const VALUES = [
  { icon: Shield, title: "Credential Integrity", desc: "Our certifications mean something. Every exam question, every curriculum module, and every assessment criterion undergoes independent review. We never compromise on rigor." },
  { icon: Globe2, title: "Global Accessibility", desc: "World-class AI credentials should be accessible to professionals everywhere. We offer flexible payment, translated materials, and region-adjusted pricing." },
  { icon: Users2, title: "Community-Driven", desc: "PAII is built by practitioners, for practitioners. Our curriculum is shaped by the 3,200+ professionals in our community and updated quarterly." },
  { icon: Award, title: "Career Impact", desc: "Every program decision is measured against one question: does this help our learners advance their careers? If not, we don't include it." },
];

export default async function AboutPage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — always hardcoded */}
        <section className="pt-[148px] pb-24 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">About PAII</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              The AI Credential Standard
            </h1>
            <p className="text-lg text-white max-w-2xl mx-auto">
              Founded to close the credibility gap in AI professional development.
              We build rigorous, globally recognized certifications for the AI era.
            </p>
          </div>
        </section>

        {/* Content — CMS if available, otherwise hardcoded */}
        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <>
            <section id="mission" className="section-padding bg-white">
              <div className="container-md">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
                  <div>
                    <span className="badge-teal mb-4">Our Mission</span>
                    <h2 className="section-title mb-5">Closing the AI Credibility Gap</h2>
                    <p className="text-ink-900 leading-relaxed mb-5">
                      In 2023, we noticed a growing problem: organizations were scrambling to implement AI,
                      professionals were scrambling to learn AI, but there was no trusted credential standard
                      to bridge the gap. LinkedIn courses and YouTube tutorials don't signal professional
                      competence to employers. MBAs don't cover AI adequately. Engineering degrees are
                      inaccessible to most professionals.
                    </p>
                    <p className="text-ink-900 leading-relaxed mb-5">
                      PAII was founded to solve that problem — to create the professional certification
                      infrastructure for AI, modeled after institutions like the CPA, PMI, and CSI that
                      define credentialing in other professions.
                    </p>
                    <p className="text-ink-900 leading-relaxed">
                      We build programs that are rigorous enough to mean something, accessible enough for
                      working professionals, and practical enough to create immediate impact.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Founded by AI practitioners and credential design experts",
                      "Curriculum reviewed quarterly to stay current",
                      "Independent psychometric exam development",
                      "ISO 17024-aligned credentialing framework",
                      "No sponsorship from AI vendors — 100% independent",
                      "Advisory board includes practitioners from 12 industries",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 bg-sand-100 rounded-xl p-4 border border-sand-200">
                        <CheckCircle2 size={16} className="text-ink-900 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-ink-900">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="section-padding bg-sand-100">
              <div className="container-lg">
                <div className="text-center mb-12">
                  <span className="badge-teal mb-4">Our Values</span>
                  <h2 className="section-title">What We Stand For</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {VALUES.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="card-base p-6">
                      <div className="w-12 h-12 bg-sand-100 rounded-2xl flex items-center justify-center mb-4">
                        <Icon size={22} className="text-ink-900" />
                      </div>
                      <h3 className="font-display font-bold text-ink-900 text-base mb-2">{title}</h3>
                      <p className="text-sm text-ink-900 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="board" className="section-padding bg-white">
              <div className="container-lg">
                <div className="text-center mb-12">
                  <span className="badge-teal mb-4">Advisory Board</span>
                  <h2 className="section-title mb-4">Guided by Industry Leaders</h2>
                  <p className="section-subtitle max-w-xl mx-auto">
                    Our programs are shaped by active practitioners and thought leaders from the world's leading organizations.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {BOARD.map((member) => (
                    <div key={member.name} className="card-base p-6 flex items-center gap-4">
                      <div className={`w-14 h-14 ${member.bg} rounded-2xl flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>
                        {member.avatar}
                      </div>
                      <div>
                        <div className="font-display font-bold text-ink-900 text-sm">{member.name}</div>
                        <div className="text-xs text-ink-900 leading-snug mt-0.5">{member.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="accreditation" className="section-padding bg-sand-100">
              <div className="container-md text-center">
                <span className="badge-teal mb-4">Accreditation</span>
                <h2 className="section-title mb-5">Standards-Aligned Credentialing</h2>
                <p className="text-ink-900 max-w-2xl mx-auto mb-10 leading-relaxed">
                  PAII's certification framework aligns with ISO 17024 — the international standard for
                  personnel certification bodies. Our exam development follows best practices from the
                  National Commission for Certifying Agencies (NCCA).
                </p>
                <Link href="/certifications" className="btn-primary !py-4 !px-8 !text-base">
                  Explore Certifications <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

