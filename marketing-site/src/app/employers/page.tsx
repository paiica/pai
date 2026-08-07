import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ShieldCheck, Search, GraduationCap, Briefcase, QrCode, TrendingUp,
  Building2, Users2, ArrowRight, CheckCircle2, ClipboardList, Award,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CmsPage = { title: string; content: string; meta_description: string };

async function getCmsPage(): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/employers`, { cache: "no-store" });
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
    title: cms?.title ?? "For Employers & Job Seekers",
    description: cms?.meta_description ?? "Why PAII certification matters for hiring and career growth — how it helps employers evaluate AI talent and helps students and job seekers stand out.",
  };
}

const FOR_CANDIDATES = [
  { icon: ShieldCheck, title: "A credential employers can verify", desc: "Every certificate carries a unique ID and QR code employers can check instantly at paii.ca/verify — no phone calls, no guesswork." },
  { icon: Briefcase, title: "Built around real job requirements", desc: "The curriculum is shaped by input from hiring organizations, not written in a vacuum — you learn what employers are actually asking for." },
  { icon: TrendingUp, title: "A structured path, not a scattered one", desc: "Instead of piecing together YouTube tutorials, you follow a defined track from foundational AI literacy to a role-specific credential." },
  { icon: Award, title: "Something to put on your profile today", desc: "Add your credential to LinkedIn the moment you pass — a specific, verifiable line, not just \"AI enthusiast.\"" },
];

const FOR_EMPLOYERS = [
  { icon: Search, title: "A faster way to screen for AI competence", desc: "Resumes claim skills; a PAII credential verifies them. Filter candidates by certification level instead of guessing from a project list." },
  { icon: QrCode, title: "Instant, independent verification", desc: "Check any candidate's certificate status in seconds at paii.ca/verify — authenticity and validity, without contacting us directly." },
  { icon: Users2, title: "A way to upskill your existing team", desc: "Corporate and group enrollment lets you certify your own staff at volume, with an admin dashboard tracking who's completed what." },
  { icon: Building2, title: "A voice in what \"AI-competent\" means", desc: "Our advisory board — leaders from organizations like Shopify, McKinsey Digital, and Magna International — helps shape what the curriculum actually covers." },
];

const JOURNEY = [
  { step: "1", title: "Apply", desc: "A short application so we understand your background and goals — reviewed within 3–5 business days." },
  { step: "2", title: "Learn", desc: "Self-paced prep courses in your student portal, built around real scenarios rather than abstract theory." },
  { step: "3", title: "Certify", desc: "A proctored exam that actually tests competence — with one retake included if you don't pass the first time." },
  { step: "4", title: "Get Hired", desc: "A verifiable, shareable credential employers can check in seconds, plus continuing access to your student portal." },
];

export default async function EmployersPage() {
  const cms = await getCmsPage();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero — always hardcoded */}
        <section className="pb-16 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5 justify-center">Employers & Job Seekers</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-[1.1]">
              The Credential That Connects<br />Talent and Employers
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              For job seekers, a PAII certification is proof of real AI skill. For employers,
              it's a faster, more reliable way to find people who actually have it.
            </p>
          </div>
        </section>

        {cms?.content ? (
          <div dangerouslySetInnerHTML={{ __html: cms.content }} />
        ) : (
          <>
            {/* Why it matters */}
            <section className="section-padding bg-white">
              <div className="container-md text-center max-w-2xl mx-auto">
                <span className="badge-teal mb-4 justify-center">Why It Matters</span>
                <h2 className="section-title mb-5">AI Skills Are Hard to Verify</h2>
                <p className="text-ink-900 leading-relaxed">
                  Job postings ask for "AI experience," but there's rarely a consistent way to check
                  whether a candidate has it. A LinkedIn course or a self-taught project doesn't tell
                  a hiring manager much, and most degrees haven't caught up to how fast AI tools move.
                  PAII certification exists to close that gap — a rigorous, independently verifiable
                  standard that means the same thing everywhere it's checked.
                </p>
              </div>
            </section>

            {/* For candidates */}
            <section className="section-padding bg-sand-100">
              <div className="container-md">
                <div className="text-center max-w-xl mx-auto mb-12">
                  <span className="badge-teal mb-4 justify-center">For Students & Job Seekers</span>
                  <h2 className="section-title mb-4">Stand Out With Proof, Not Just a Claim</h2>
                  <p className="section-subtitle">
                    A credential built to actually move your career forward — not just another certificate of completion.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {FOR_CANDIDATES.map((f) => (
                    <div key={f.title} className="card-hover p-6">
                      <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                        <f.icon size={19} />
                      </div>
                      <p className="font-display font-bold text-ink-900 text-base mb-2">{f.title}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-9">
                  <Link href="/certifications" className="btn-primary !py-3.5 !px-8">
                    Explore Certifications <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </section>

            {/* For employers */}
            <section className="section-padding bg-white">
              <div className="container-md">
                <div className="text-center max-w-xl mx-auto mb-12">
                  <span className="badge-teal mb-4 justify-center">For Employers</span>
                  <h2 className="section-title mb-4">Hire and Develop AI Talent With Confidence</h2>
                  <p className="section-subtitle">
                    A reliable signal when you're screening candidates, and a way to build AI skills across a team you already have.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {FOR_EMPLOYERS.map((f) => (
                    <div key={f.title} className="card-hover p-6">
                      <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                        <f.icon size={19} />
                      </div>
                      <p className="font-display font-bold text-ink-900 text-base mb-2">{f.title}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
                  <Link href="/verify" className="btn-primary !py-3.5 !px-8">
                    Verify a Candidate <ArrowRight size={15} />
                  </Link>
                  <Link href="/corporate" className="btn-outline !py-3.5 !px-8">
                    Corporate Training Programs
                  </Link>
                </div>
              </div>
            </section>

            {/* The relationship we're building with employers */}
            <section className="section-padding bg-ink-900 text-white">
              <div className="container-md">
                <div className="grid lg:grid-cols-2 gap-14 items-start">
                  <div>
                    <span className="badge-dark mb-4">Built With Employers, Not Just For Them</span>
                    <h2 className="text-3xl sm:text-4xl font-display font-black mb-5">
                      Our Employer Relationship
                    </h2>
                    <p className="text-white/80 leading-relaxed mb-4">
                      PAII's curriculum isn't written in isolation. Our advisory board is made up of
                      senior leaders from organizations actually hiring for AI roles — people who tell
                      us directly what "AI-competent" needs to mean for it to matter in a real hiring
                      decision.
                    </p>
                    <p className="text-white/80 leading-relaxed mb-6">
                      That input shapes what gets tested, how rigorous the exam is, and how often the
                      curriculum gets revised as the field moves. It's also why our corporate programs
                      exist — organizations that trust the credential enough to certify their own teams
                      on it, at volume.
                    </p>
                    <Link href="/about#board" className="inline-flex items-center gap-1.5 text-teal-300 font-semibold text-sm hover:text-teal-200 transition-colors">
                      Meet the Advisory Board <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
                    <p className="text-xs font-mono uppercase tracking-widest text-teal-300 mb-4">What that looks like in practice</p>
                    <ul className="space-y-3.5">
                      {[
                        "Curriculum reviewed quarterly against how AI tools and roles are actually changing",
                        "Exam content weighted toward what hiring managers say they screen for",
                        "Corporate enrollment programs for organizations certifying their own teams",
                        "A public verification tool so any employer can check a credential in seconds",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                          <CheckCircle2 size={15} className="text-teal-400 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* How we prepare students & job seekers */}
            <section className="section-padding bg-white">
              <div className="container-md">
                <div className="text-center max-w-xl mx-auto mb-12">
                  <span className="badge-teal mb-4 justify-center">How We Prepare You</span>
                  <h2 className="section-title mb-4">From Application to Job-Ready</h2>
                  <p className="section-subtitle">
                    A defined path — not a pile of unrelated tutorials.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {JOURNEY.map((j) => (
                    <div key={j.step} className="relative p-6 rounded-2xl bg-sand-100 border border-sand-200">
                      <span className="text-3xl font-display font-black text-teal-600/30 mb-2 block">{j.step}</span>
                      <p className="font-display font-bold text-ink-900 text-base mb-1.5">{j.title}</p>
                      <p className="text-sm text-slate-500 leading-relaxed">{j.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-9">
                  <Link href="/presentations/student-guide" className="inline-flex items-center gap-1.5 text-teal-700 font-semibold text-sm hover:underline">
                    <GraduationCap size={15} /> Walk through the full Student Certification Guide <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="section-padding bg-sand-100">
              <div className="container-md">
                <div className="bg-ink-900 rounded-3xl p-10 sm:p-14 text-center text-white">
                  <ClipboardList size={26} className="text-teal-400 mx-auto mb-4" />
                  <h3 className="text-2xl sm:text-3xl font-display font-black mb-3">
                    Ready to get started?
                  </h3>
                  <p className="text-white/75 max-w-lg mx-auto mb-8">
                    Whether you're building your own AI career or hiring for one, there's a place to start.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/certifications" className="btn-primary !py-3.5 !px-8">
                      Get Certified <ArrowRight size={15} />
                    </Link>
                    <Link href="/corporate" className="btn-outline-white !py-3.5 !px-8">
                      Partner With Us
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
