import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  GraduationCap,
  DollarSign,
  Share2,
  Users2,
  Award,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Globe2,
  BadgeCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Educator Partner Program",
  description:
    "Refer your students to globally recognized AI certifications and earn commission on every enrollment. Join the PAII Educator Partner Program.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: GraduationCap,
    title: "Apply as an Educator Partner",
    desc: "Register at our affiliate portal in under 5 minutes. Get approved and receive your unique referral link right away.",
  },
  {
    step: "02",
    icon: Share2,
    title: "Share with Your Students",
    desc: "Send your referral link via email, your course platform, or your syllabus. We provide ready-made marketing materials.",
  },
  {
    step: "03",
    icon: DollarSign,
    title: "Earn on Every Enrollment",
    desc: "You earn a commission every time a student you referred completes their enrollment. Tracked automatically, paid reliably.",
  },
];

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Competitive Commission",
    desc: "Earn a meaningful commission on every certification your students purchase through your referral link.",
  },
  {
    icon: Globe2,
    title: "Globally Recognized Credentials",
    desc: "PAII certifications are recognized by employers across North America and internationally — real career value for your students.",
  },
  {
    icon: BookOpen,
    title: "Ready-Made Resources",
    desc: "Access presentation slides, email templates, and course-ready materials to introduce PAII certifications to your class.",
  },
  {
    icon: Users2,
    title: "Dashboard & Tracking",
    desc: "Monitor your referrals, track enrollments, and view your earnings in real time from your affiliate dashboard.",
  },
  {
    icon: BadgeCheck,
    title: "Credibility for Your Program",
    desc: "Offering PAII-certified pathways signals to students and employers that your program is aligned with industry standards.",
  },
  {
    icon: Award,
    title: "Dedicated Affiliate Support",
    desc: "Our affiliate team is here to help you onboard, answer questions, and maximize your impact for students.",
  },
];

const CERTS = [
  {
    acronym: "CAIP",
    name: "Certified AI Professional",
    level: "Professional",
    desc: "For practitioners applying AI in real-world roles. The most in-demand credential in our catalog.",
    color: "bg-teal-500",
    href: "/certifications/certified-ai-professional",
  },
  {
    acronym: "CAIM",
    name: "Certified AI Manager",
    level: "Management",
    desc: "For leaders responsible for AI strategy, governance, and team execution.",
    color: "bg-blue-500",
    href: "/certifications/certified-ai-manager",
  },
  {
    acronym: "CAIE",
    name: "Certified AI Educator",
    level: "Education",
    desc: "Designed specifically for educators and trainers teaching AI concepts and applications.",
    color: "bg-purple-500",
    href: "/certifications/certified-ai-educator",
  },
  {
    acronym: "CAIDA",
    name: "Certified AI Data Analyst",
    level: "Analytics",
    desc: "For data professionals integrating AI into analytical workflows and decision-making.",
    color: "bg-emerald-500",
    href: "/certifications/certified-ai-data-analyst",
  },
];

export default function EducatorPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-[148px] pb-24 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">For Educators</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              Refer Your Students.<br className="hidden sm:block" /> Earn While They Grow.
            </h1>
            <p className="text-lg text-white max-w-2xl mx-auto mb-8">
              Join the PAII Educator Partner Program. Share globally recognized AI certifications
              with your students and earn a commission on every enrollment — with full tracking
              and no caps.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://sales.paii.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !py-4 !px-8 !text-base"
              >
                Apply to Become a Partner <ArrowRight size={16} />
              </a>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white hover:text-white font-semibold text-sm transition-colors"
              >
                See how it works →
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="section-padding bg-white">
          <div className="container-lg">
            <div className="text-center mb-12">
              <span className="badge-teal mb-4">Simple Process</span>
              <h2 className="section-title mb-4">How It Works</h2>
              <p className="section-subtitle max-w-xl mx-auto">
                From application to earning, the whole process takes minutes to set up.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative">
                  <div className="card-base p-7 h-full">
                    <div className="text-5xl font-display font-black text-sand-200 mb-4 leading-none">{step}</div>
                    <div className="w-11 h-11 bg-ink-900 rounded-xl flex items-center justify-center mb-4">
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-display font-bold text-ink-900 text-base mb-2">{title}</h3>
                    <p className="text-sm text-ink-900 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <a
                href="https://sales.paii.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !py-4 !px-8 inline-flex items-center gap-2"
              >
                Apply Now at sales.paii.ca <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="section-padding bg-sand-100">
          <div className="container-lg">
            <div className="text-center mb-12">
              <span className="badge-teal mb-4">Why Partner With PAII</span>
              <h2 className="section-title mb-4">Built for Educators</h2>
              <p className="section-subtitle max-w-xl mx-auto">
                We've designed the educator affiliate program to be low-effort and high-value
                for you and your students.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
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

        {/* Certifications */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="text-center mb-12">
              <span className="badge-teal mb-4">What You Can Refer</span>
              <h2 className="section-title mb-4">PAII Certification Programs</h2>
              <p className="section-subtitle max-w-xl mx-auto">
                Four rigorous credentials covering every professional level — from practitioners
                to executives to educators.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CERTS.map((cert) => (
                <div key={cert.acronym} className="card-base p-6 flex gap-5">
                  <div className={`w-14 h-14 ${cert.color} rounded-2xl flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                    {cert.acronym}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink-900 mb-0.5">{cert.level}</div>
                    <h3 className="font-display font-bold text-ink-900 text-sm mb-1">{cert.name}</h3>
                    <p className="text-xs text-ink-900 leading-relaxed mb-3">{cert.desc}</p>
                    <Link
                      href={cert.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-900 hover:text-teal-600 transition-colors"
                    >
                      View certification <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who is this for */}
        <section className="section-padding bg-sand-100">
          <div className="container-md">
            <div className="text-center mb-10">
              <span className="badge-teal mb-4">Ideal Partners</span>
              <h2 className="section-title mb-4">Who Is This For?</h2>
              <p className="section-subtitle max-w-xl mx-auto">
                The PAII Educator Partner Program is designed for professionals who teach,
                train, or advise others in AI and technology.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {[
                "University & college professors teaching AI or data science",
                "Bootcamp instructors and online course creators",
                "Corporate trainers delivering AI upskilling programs",
                "Career coaches advising tech and analytics professionals",
                "Community college instructors in technology programs",
                "Independent consultants running workshops or seminars",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-sand-200">
                  <CheckCircle2 size={16} className="text-ink-900 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-ink-900">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-ink-900">
          <div className="container-md text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-white mb-4">
              Ready to Partner?
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-4">
              Apply in Minutes. Earn from Day One.
            </h2>
            <p className="text-white max-w-lg mx-auto mb-8 leading-relaxed">
              Join hundreds of educators already referring their students to PAII certifications.
              No upfront cost, no minimums — just your unique link and a dashboard to track results.
            </p>
            <a
              href="https://sales.paii.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !py-4 !px-10 !text-base inline-flex items-center gap-2"
            >
              Apply at sales.paii.ca <ArrowRight size={16} />
            </a>
            <p className="text-white text-xs mt-4">
              Questions? Email us at{" "}
              <a href="mailto:affiliates@paii.ca" className="underline hover:text-white transition-colors">
                affiliates@paii.ca
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
