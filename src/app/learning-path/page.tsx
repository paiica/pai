import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Award, ArrowRight, Lock, CheckCircle2, Clock, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Learning Path — From Foundations to Executive Leadership",
  description:
    "Follow a structured AI certification journey from AI Foundations through CAIP and specialized credentials to Executive AI Leadership.",
};

const LEVELS = [
  {
    level: "Level 1",
    title: "AI Foundations",
    subtitle: "Pre-Certification Preparation",
    description: "Build a solid baseline of AI literacy before pursuing formal certification. Understand what AI is, how it works conceptually, and where it is being applied across industries.",
    duration: "2–3 weeks",
    studyHours: "8–12 hours total",
    format: "Self-paced free modules",
    badge: "🌱",
    color: "from-emerald-600 to-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
    available: true,
    free: true,
    topics: [
      "What is AI, ML, and Generative AI",
      "AI use cases by industry",
      "Key AI terminology for professionals",
      "How to evaluate AI tools",
    ],
    href: "/ai-foundations",
    cta: "Start Free",
  },
  {
    level: "Level 2",
    title: "Certified AI Professional (CAIP)",
    subtitle: "Core Professional Credential",
    description: "The flagship PAI credential for all business professionals. Master applied AI strategy, tools, ethics, and leadership. This is the foundation of your professional AI credentialing journey.",
    duration: "6–8 weeks",
    studyHours: "30–40 hours total",
    format: "Structured program + online exam",
    badge: "🏆",
    color: "from-gold-500 to-gold-600",
    bgColor: "bg-gold-50",
    borderColor: "border-gold-300",
    textColor: "text-gold-700",
    available: true,
    free: false,
    price: "$495",
    topics: [
      "AI tools mastery for business",
      "AI strategy and ROI frameworks",
      "Ethical AI and governance",
      "AI change leadership",
      "Certification exam (75 questions)",
    ],
    href: "/certifications/certified-ai-professional",
    cta: "Enroll in CAIP",
    featured: true,
  },
  {
    level: "Level 3",
    title: "Specialization Certifications",
    subtitle: "Domain-Specific Expertise",
    description: "After earning your CAIP, deepen expertise in your specific professional domain. Choose from the Certified AI Manager, Certified AI Educator, or Certified AI Data Analyst.",
    duration: "8–10 weeks each",
    studyHours: "40–50 hours total",
    format: "Specialized program + domain exam",
    badge: "🎯",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    available: false,
    free: false,
    price: "$595–$695",
    topics: [
      "Certified AI Manager (CAIM)",
      "Certified AI Educator (CAIE)",
      "Certified AI Data Analyst (CAIDA)",
      "Domain-specific AI applications",
    ],
    href: "/certifications",
    cta: "Coming Soon",
  },
  {
    level: "Level 4",
    title: "Executive AI Leadership",
    subtitle: "C-Suite & Board Level",
    description: "The highest-level PAI credential for senior executives, C-suite leaders, and board members responsible for organizational AI strategy, governance, and transformation.",
    duration: "10–12 weeks",
    studyHours: "50–60 hours total",
    format: "Executive program + practicum",
    badge: "👑",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    available: false,
    free: false,
    price: "$1,495",
    topics: [
      "Enterprise AI governance",
      "Board-level AI strategy",
      "AI risk and compliance",
      "Digital transformation leadership",
    ],
    href: "/certifications",
    cta: "Coming Soon",
  },
];

export default function LearningPathPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 bg-slate-50 border-b border-slate-100">
          <div className="container-lg text-center max-w-3xl mx-auto">
            <div className="badge-gold mb-6 mx-auto w-fit">
              <Award size={12} />
              Structured Progression
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-navy-900 mb-4">
              Your AI Certification Learning Path
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              A clear, structured progression from AI literacy foundations through professional
              certification to executive leadership — designed for professionals at every stage.
            </p>
          </div>
        </section>

        {/* Path */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="max-w-4xl mx-auto">
              {LEVELS.map((level, i) => (
                <div key={level.level}>
                  {/* Level card */}
                  <div className={`relative border-2 rounded-3xl p-8 transition-all ${level.bgColor} ${level.borderColor} ${
                    level.featured ? "ring-2 ring-gold-400 ring-offset-4 shadow-gold" : ""
                  }`}>
                    {level.featured && (
                      <div className="absolute -top-4 left-8 bg-gold-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wide shadow-sm">
                        ⭐ Most Popular — Start Here
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left */}
                      <div className="flex flex-col items-center text-center md:items-start md:text-left">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} text-white flex items-center justify-center text-3xl mb-3 shadow-md`}>
                          {level.badge}
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${level.textColor}`}>
                          {level.level}
                        </div>
                        <h2 className="text-xl font-display font-black text-navy-900 mb-1">{level.title}</h2>
                        <div className="text-sm text-slate-500 mb-3">{level.subtitle}</div>
                        {level.free ? (
                          <span className="badge-gold">Free Access</span>
                        ) : level.available ? (
                          <div className="text-2xl font-display font-black text-navy-900">{level.price}</div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-sm font-semibold">
                            <Lock size={12} />
                            Coming Soon
                          </div>
                        )}
                      </div>

                      {/* Middle */}
                      <div className="md:col-span-2">
                        <p className="text-slate-700 text-sm leading-relaxed mb-5">{level.description}</p>

                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {level.topics.map((topic) => (
                            <div key={topic} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle2 size={13} className="text-gold-500 flex-shrink-0 mt-0.5" />
                              {topic}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gold-500" />
                            {level.duration}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={12} className="text-gold-500" />
                            {level.studyHours}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Award size={12} className="text-gold-500" />
                            {level.format}
                          </div>
                        </div>

                        {level.available ? (
                          <Link
                            href={level.href}
                            className={`inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200 ${
                              level.featured
                                ? "bg-gold-500 hover:bg-gold-400 text-white shadow-gold hover:-translate-y-0.5"
                                : "bg-white hover:bg-slate-50 text-navy-900 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            {level.cta}
                            <ArrowRight size={14} />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-white/60 text-slate-400 cursor-not-allowed border border-slate-200">
                            <Lock size={13} />
                            {level.cta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connector */}
                  {i < LEVELS.length - 1 && (
                    <div className="flex flex-col items-center my-3">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-slate-200 to-slate-100" />
                      <div className="text-xs text-slate-400 font-semibold">then</div>
                      <div className="w-0.5 h-8 bg-gradient-to-b from-slate-100 to-slate-200" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <p className="text-slate-500 text-sm mb-4">
                Ready to start your AI certification journey?
              </p>
              <Link
                href="/certifications/certified-ai-professional"
                className="btn-gold text-base px-8 py-4 rounded-2xl"
              >
                <Award size={18} />
                Begin with CAIP
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

