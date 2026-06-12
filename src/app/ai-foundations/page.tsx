import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  CheckCircle2, Clock, BookOpen, Play, FileText,
  ArrowRight, Star, ChevronRight, Sparkles, GraduationCap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Foundations — Free Pre-Certification Course | PAI",
  description:
    "Build a solid baseline of AI literacy for free. Understand what AI is, how it works, and where it's being applied — the perfect starting point before formal certification.",
};

const MODULES = [
  {
    num: "01",
    title: "What is Artificial Intelligence?",
    description: "A jargon-free introduction to AI, machine learning, and generative AI",
    duration: "2h 30min",
    lessons: [
      { title: "AI, ML, and Generative AI Explained Simply", type: "video", duration: "40 min" },
      { title: "A Brief History of AI: From Rules to Neural Networks", type: "video", duration: "30 min" },
      { title: "The AI Technology Landscape Today", type: "reading", duration: "25 min" },
      { title: "Module Check-In", type: "quiz", duration: "15 min" },
    ],
  },
  {
    num: "02",
    title: "Key AI Terminology for Professionals",
    description: "Master the vocabulary you need to speak confidently about AI at work",
    duration: "2h",
    lessons: [
      { title: "The 30 AI Terms Every Professional Must Know", type: "reading", duration: "30 min" },
      { title: "Large Language Models Demystified", type: "video", duration: "35 min" },
      { title: "Prompting, Fine-tuning, and RAG — What Do They Mean?", type: "video", duration: "30 min" },
      { title: "Terminology Assessment", type: "quiz", duration: "15 min" },
    ],
  },
  {
    num: "03",
    title: "AI Use Cases Across Industries",
    description: "How AI is transforming every sector — with real examples you can apply",
    duration: "2h 30min",
    lessons: [
      { title: "AI in Finance, Healthcare, and Legal", type: "video", duration: "40 min" },
      { title: "AI in Marketing, Sales, and Customer Service", type: "video", duration: "35 min" },
      { title: "AI in Education, HR, and Operations", type: "reading", duration: "30 min" },
      { title: "Case Study Reflection", type: "quiz", duration: "15 min" },
    ],
  },
  {
    num: "04",
    title: "How to Evaluate AI Tools",
    description: "A practical framework for assessing any AI tool before you adopt it",
    duration: "2h",
    lessons: [
      { title: "The AI Tool Evaluation Framework", type: "video", duration: "35 min" },
      { title: "Comparing Leading AI Tools: ChatGPT, Claude, Gemini, Copilot", type: "video", duration: "40 min" },
      { title: "Red Flags: When AI Tools Overpromise", type: "reading", duration: "20 min" },
      { title: "Your Personal AI Toolkit Worksheet", type: "quiz", duration: "25 min" },
    ],
  },
];

const OUTCOMES = [
  "Explain what AI is — and isn't — to colleagues and stakeholders",
  "Understand the difference between AI, machine learning, and generative AI",
  "Recognize the key AI use cases relevant to your industry and role",
  "Use the right terminology to discuss AI confidently in professional settings",
  "Evaluate AI tools using a practical, structured framework",
  "Understand how large language models (LLMs) generate responses",
  "Identify which business problems AI can realistically solve",
  "Know exactly what to study next to earn your CAIP certification",
];

const FAQS = [
  {
    q: "Is this really free?",
    a: "Yes — completely free, no credit card required. AI Foundations is PAI's way of giving every professional a solid AI baseline before pursuing formal certification.",
  },
  {
    q: "How long does it take?",
    a: "Most learners complete AI Foundations in 2–3 weeks studying 3–4 hours per week. You have unlimited time to finish at your own pace.",
  },
  {
    q: "Do I get a certificate for completing this?",
    a: "You receive a free digital completion badge for AI Foundations. For a formal, employer-recognized credential, the next step is the Certified AI Professional (CAIP) — PAI's flagship paid certification.",
  },
  {
    q: "Do I need any prior knowledge?",
    a: "None at all. AI Foundations is designed from scratch for complete beginners. No technical background, no prior AI experience required.",
  },
  {
    q: "What comes after AI Foundations?",
    a: "The natural next step is the Certified AI Professional (CAIP), PAI's professional-level certification. CAIP goes deeper into AI strategy, tools mastery, ethics, governance, and workplace leadership.",
  },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Play size={11} />,
  reading: <BookOpen size={11} />,
  quiz: <FileText size={11} />,
};

export default function AIFoundationsPage() {
  const totalLessons = MODULES.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-32 bg-hero-pattern relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="container-lg relative">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-gold-300/80 text-xs font-semibold mb-6">
              <Link href="/" className="hover:text-gold-300">Home</Link>
              <ChevronRight size={12} />
              <Link href="/learning-path" className="hover:text-gold-300">Learning Path</Link>
              <ChevronRight size={12} />
              <span className="text-gold-300">AI Foundations</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left: Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    <Sparkles size={11} /> Level 1 · Free
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={12} className="text-gold-400 fill-gold-400" />
                    ))}
                    <span className="text-gold-300 text-xs ml-1">4.8 (2,400+ learners)</span>
                  </div>
                </div>

                <div className="flex items-start gap-5 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg">
                    🌱
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight">
                      AI Foundations
                    </h1>
                    <p className="text-white/70 text-xl mt-2">Pre-Certification Preparation</p>
                  </div>
                </div>

                <p className="text-lg text-white/75 leading-relaxed max-w-2xl mb-6">
                  Build a solid baseline of AI literacy before pursuing formal certification.
                  Understand what AI is, how it works conceptually, and where it is being applied
                  across industries — completely free.
                </p>

                <div className="flex flex-wrap gap-5 text-sm text-white/60">
                  <div className="flex items-center gap-1.5"><Clock size={14} className="text-gold-400" />2–3 weeks</div>
                  <div className="flex items-center gap-1.5"><BookOpen size={14} className="text-gold-400" />{totalLessons} lessons</div>
                  <div className="flex items-center gap-1.5"><GraduationCap size={14} className="text-gold-400" />Self-paced</div>
                </div>
              </div>

              {/* Right: Enroll card */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
                <div className="text-center mb-5">
                  <div className="text-5xl font-display font-black text-emerald-600 mb-1">FREE</div>
                  <div className="text-slate-400 text-sm">No credit card required. Always free.</div>
                </div>

                <div className="space-y-2.5 mb-6">
                  {[
                    `${totalLessons} lessons across ${MODULES.length} modules`,
                    "8–12 hours of content",
                    "Self-paced — learn on your schedule",
                    "Free completion badge",
                    "Prepares you for the CAIP certification",
                    "Access on any device",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  href="/register?next=/ai-foundations/learn"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 mb-3"
                >
                  <Sparkles size={18} />
                  Start Free
                </Link>
                <Link
                  href="/certifications/certified-ai-professional"
                  className="w-full flex items-center justify-center gap-2 border-2 border-navy-800 text-navy-800 font-semibold py-3 rounded-xl text-sm transition-all hover:bg-navy-800 hover:text-white"
                >
                  Skip to CAIP Certification →
                </Link>

                <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                  🔒 Free forever · No hidden fees
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-12">

                {/* Learning Outcomes */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">
                    What You Will Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {OUTCOMES.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 leading-relaxed">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curriculum */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">Curriculum</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    {MODULES.length} modules · {totalLessons} lessons · 8–12 hours total
                  </p>
                  <div className="space-y-3">
                    {MODULES.map((module) => (
                      <div key={module.num} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-start justify-between p-5 bg-slate-50">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {module.num}
                            </div>
                            <div>
                              <h3 className="font-display font-bold text-navy-900 text-base">{module.title}</h3>
                              <p className="text-slate-500 text-xs mt-1">{module.description}</p>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 flex-shrink-0 ml-4">
                            {module.duration} · {module.lessons.length} lessons
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {module.lessons.map((lesson, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                  {TYPE_ICONS[lesson.type]}
                                </span>
                                {lesson.title}
                              </div>
                              <span className="text-xs text-slate-400">{lesson.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-4">
                    {FAQS.map((faq, i) => (
                      <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <h3 className="font-display font-bold text-navy-900 text-base mb-2">{faq.q}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* What's included */}
                <div className="card-base p-6 border border-slate-100">
                  <h3 className="font-display font-bold text-navy-900 text-base mb-4">What&apos;s Included</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Modules", value: `${MODULES.length} modules` },
                      { label: "Lessons", value: `${totalLessons} lessons` },
                      { label: "Total Duration", value: "8–12 hours" },
                      { label: "Format", value: "Video + Reading + Quizzes" },
                      { label: "Pace", value: "Self-paced" },
                      { label: "Access", value: "Lifetime, free" },
                      { label: "Completion Badge", value: "Yes, digital" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{item.label}</span>
                        <span className="font-semibold text-navy-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Who it's for */}
                <div className="card-base p-6 border border-slate-100">
                  <h3 className="font-display font-bold text-navy-900 text-base mb-4">Who This Is For</h3>
                  <div className="space-y-2">
                    {[
                      "Complete AI beginners",
                      "Professionals upskilling in AI",
                      "Students exploring AI careers",
                      "Managers preparing for CAIP",
                      "Anyone curious about AI",
                    ].map((role) => (
                      <div key={role} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {role}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next step CTA */}
                <div className="bg-navy-800 rounded-2xl p-6 text-white text-center">
                  <div className="text-3xl mb-3">🏆</div>
                  <h3 className="font-display font-bold text-lg mb-2">Ready for the Full Certification?</h3>
                  <p className="text-white/60 text-sm mb-4">
                    After AI Foundations, earn the industry-recognized CAIP credential.
                  </p>
                  <Link
                    href="/certifications/certified-ai-professional"
                    className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Learn About CAIP
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
