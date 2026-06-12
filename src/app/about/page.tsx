import { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Award, Target, Eye, Shield, Users, BookOpen, Globe2, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "About PAI — Our Mission, Standards & Vision",
  description:
    "Learn about the Professional AI Institute — our mission to establish professional standards for AI certification, our advisory board, and why professional AI credentials matter.",
};

const ADVISORY_BOARD = [
  { name: "Dr. Alexandra Reid", role: "Former Chief AI Officer, Global Bank", expertise: "AI Strategy & Governance", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "James Mitchell", role: "Professor of Business AI, MIT Sloan", expertise: "AI for Business Education", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Priya Sharma", role: "VP of AI Transformation, Consulting Firm", expertise: "Organizational AI Adoption", photo: "https://randomuser.me/api/portraits/women/47.jpg" },
  { name: "Dr. Carlos Mendoza", role: "AI Ethics Researcher, Stanford", expertise: "AI Ethics & Fairness", photo: "https://randomuser.me/api/portraits/men/75.jpg" },
  { name: "Linda Thompson", role: "Chief People Officer, Fortune 100", expertise: "AI Talent & Workforce", photo: "https://randomuser.me/api/portraits/women/52.jpg" },
  { name: "Robert Chen", role: "Partner, Global Management Consulting", expertise: "AI ROI & Strategy", photo: "https://randomuser.me/api/portraits/men/83.jpg" },
];

const STANDARDS = [
  { title: "Exam Development Standards", desc: "All CAIP exam items are developed by certified subject-matter experts and reviewed by a psychometrician before publication." },
  { title: "Content Currency Reviews", desc: "Certification content is reviewed and updated at minimum every 12 months to reflect the pace of AI development." },
  { title: "Anti-Fraud Measures", desc: "Every certificate includes a blockchain-verifiable unique ID. Fraudulent certificates can be reported and revoked." },
  { title: "Continuing Education Requirements", desc: "Certified professionals must earn PDUs every 3 years to maintain their credential — keeping knowledge current." },
  { title: "Independence & Objectivity", desc: "PAI operates independently of any specific AI vendor or tool. Our content is tool-agnostic and vendor-neutral." },
  { title: "Accessibility Commitment", desc: "Examinations include accommodations for candidates with disabilities. We are committed to inclusive professional development." },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-32 bg-hero-pattern relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)", backgroundSize: "40px 40px" }}
          />
          <div className="container-lg relative text-center">
            <div className="inline-flex items-center gap-2 bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-6">
              <Award size={12} />
              About PAI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white leading-tight mb-6">
              Setting the Professional Standard for
              <span className="shimmer-text"> AI Certification</span>
            </h1>
            <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              We are an independent professional certification body — not a course marketplace,
              not a bootcamp, not a vendor. We set and maintain industry standards for AI competency.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
              <div className="card-base p-8 border-t-4 border-navy-800">
                <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center mb-5">
                  <Target size={24} className="text-navy-700" />
                </div>
                <h2 className="text-2xl font-display font-bold text-navy-900 mb-4">Our Mission</h2>
                <p className="text-slate-600 leading-relaxed">
                  To establish, maintain, and advance the professional standards for AI competency
                  certification globally — ensuring that AI credentials are rigorous, vendor-neutral,
                  practically focused, and meaningful to employers in every industry.
                </p>
              </div>
              <div className="card-base p-8 border-t-4 border-gold-500">
                <div className="w-12 h-12 bg-gold-50 rounded-xl flex items-center justify-center mb-5">
                  <Eye size={24} className="text-gold-600" />
                </div>
                <h2 className="text-2xl font-display font-bold text-navy-900 mb-4">Our Vision</h2>
                <p className="text-slate-600 leading-relaxed">
                  A world where professional AI competency is universally validated, where every
                  organization has access to credentialed AI-literate professionals, and where
                  AI adoption is guided by qualified, ethical, and capable people at every level.
                </p>
              </div>
            </div>

            {/* Why Certifications Matter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
              <div>
                <p className="section-label">Why It Matters</p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-900 mb-6">
                  Why Professional AI Certifications Matter
                </h2>
                <div className="space-y-4">
                  {[
                    "AI is being deployed in organizations faster than the workforce can keep pace",
                    "There is no standardized benchmark for what &quot;AI literate&quot; means in a professional context",
                    "Bad AI decisions cost organizations millions — competent professionals reduce risk",
                    "Employers need a reliable signal to distinguish genuine AI competency from course certificates",
                    "Workers need a credible way to demonstrate AI skills that goes beyond self-declaration",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-gold-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: point }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <p className="text-gold-600 font-semibold text-sm uppercase tracking-widest mb-4">PAI Approach</p>
                <blockquote className="text-navy-900 text-xl font-display font-bold leading-relaxed mb-4">
                  &ldquo;Certification is not the same as course completion. Certification means you
                  have been independently assessed and found competent by a professional standards body.&rdquo;
                </blockquote>
                <p className="text-slate-500 text-sm">— PAI Founding Principles</p>
              </div>
            </div>

            {/* Professional Standards */}
            <div id="standards" className="mb-20">
              <div className="text-center mb-12">
                <p className="section-label">Our Standards</p>
                <h2 className="section-title mb-4">
                  Our Professional <span className="gold-text">Standards</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {STANDARDS.map((standard, i) => (
                  <div key={i} className="card-base p-6 border border-slate-100">
                    <div className="flex items-start gap-3">
                      <Shield size={18} className="text-gold-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-display font-bold text-navy-900 text-base mb-2">{standard.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{standard.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisory Board */}
            <div id="advisory-board">
              <div className="text-center mb-12">
                <p className="section-label">Expert Guidance</p>
                <h2 className="section-title mb-4">
                  Advisory <span className="gold-text">Board</span>
                </h2>
                <p className="section-subtitle mx-auto">
                  PAI&apos;s certification standards are guided by an advisory board of senior practitioners
                  across AI, business, education, and ethics.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ADVISORY_BOARD.map((member) => (
                  <div key={member.name} className="card-base p-6 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-navy-100">
                      <Image
                        src={member.photo}
                        alt={member.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-display font-bold text-navy-900 text-base mb-1">{member.name}</h3>
                    <p className="text-slate-600 text-xs mb-3">{member.role}</p>
                    <span className="badge-gold">{member.expertise}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
