import { Certification } from "@/types";

export const CERTIFICATIONS: Certification[] = [
  {
    id: "caip-001",
    slug: "certified-ai-professional",
    title: "Certified AI Professional",
    acronym: "CAIP",
    description:
      "The foundational professional credential for business professionals, managers, and leaders who want to harness AI effectively in their organizations.",
    long_description:
      "The Certified AI Professional (CAIP) designation is PAI's flagship credential. It equips business professionals with the knowledge, frameworks, and practical skills needed to understand, evaluate, and implement AI solutions in their professional context. Unlike technical AI certifications, CAIP focuses on applied AI literacy, strategic thinking, ethical AI governance, and practical tool mastery for non-technical professionals.",
    level: "professional",
    status: "active",
    price: 495,
    duration_weeks: 8,
    exam_duration_minutes: 90,
    passing_score: 70,
    validity_years: 3,
    stripe_price_id: process.env.STRIPE_CAIP_PRICE_ID || null,
    badge_icon: "🏆",
    color_scheme: "navy-gold",
    learning_outcomes: [
      "Understand core AI concepts, terminology, and capabilities without needing to code",
      "Evaluate AI tools and solutions for real business applications",
      "Develop an AI strategy for your team or organization",
      "Apply ethical AI principles and governance frameworks",
      "Lead AI transformation initiatives and manage change",
      "Measure ROI and business impact of AI investments",
      "Navigate AI risks, bias, privacy, and compliance issues",
      "Communicate AI concepts effectively to stakeholders",
    ],
    curriculum: [
      {
        id: "mod-1",
        title: "AI Foundations for Business Professionals",
        description: "Core concepts, history, and the AI landscape today",
        duration_hours: 6,
        lessons: [
          { id: "l1", title: "What is Artificial Intelligence?", type: "video", duration_minutes: 45 },
          { id: "l2", title: "Machine Learning vs. Deep Learning vs. Generative AI", type: "video", duration_minutes: 50 },
          { id: "l3", title: "The AI Technology Landscape", type: "reading", duration_minutes: 30 },
          { id: "l4", title: "Module 1 Assessment", type: "quiz", duration_minutes: 20 },
        ],
      },
      {
        id: "mod-2",
        title: "AI Tools for Professionals",
        description: "Hands-on with leading AI productivity and business tools",
        duration_hours: 8,
        lessons: [
          { id: "l5", title: "Mastering Generative AI Tools (ChatGPT, Claude, Gemini)", type: "video", duration_minutes: 60 },
          { id: "l6", title: "AI for Data Analysis and Reporting", type: "video", duration_minutes: 55 },
          { id: "l7", title: "AI for Marketing, Sales, and Customer Service", type: "video", duration_minutes: 50 },
          { id: "l8", title: "Practical Tool Assessment", type: "assignment", duration_minutes: 45 },
        ],
      },
      {
        id: "mod-3",
        title: "AI Strategy and Business Value",
        description: "Building an AI roadmap and measuring ROI",
        duration_hours: 7,
        lessons: [
          { id: "l9", title: "Identifying AI Opportunities in Your Organization", type: "video", duration_minutes: 55 },
          { id: "l10", title: "Building an AI Business Case", type: "video", duration_minutes: 60 },
          { id: "l11", title: "AI ROI Measurement Frameworks", type: "reading", duration_minutes: 35 },
          { id: "l12", title: "Module 3 Assessment", type: "quiz", duration_minutes: 25 },
        ],
      },
      {
        id: "mod-4",
        title: "Ethical AI and Governance",
        description: "Responsible AI principles, bias, privacy, and compliance",
        duration_hours: 6,
        lessons: [
          { id: "l13", title: "AI Ethics Principles and Frameworks", type: "video", duration_minutes: 50 },
          { id: "l14", title: "Bias, Fairness, and Accountability in AI", type: "video", duration_minutes: 55 },
          { id: "l15", title: "AI Privacy, Data Protection, and Compliance", type: "reading", duration_minutes: 40 },
          { id: "l16", title: "Module 4 Assessment", type: "quiz", duration_minutes: 20 },
        ],
      },
      {
        id: "mod-5",
        title: "AI Change Management and Leadership",
        description: "Leading AI adoption and managing organizational change",
        duration_hours: 5,
        lessons: [
          { id: "l17", title: "Leading AI Transformation", type: "video", duration_minutes: 50 },
          { id: "l18", title: "Managing AI Resistance and Building Culture", type: "video", duration_minutes: 45 },
          { id: "l19", title: "AI Communication for Non-Technical Leaders", type: "reading", duration_minutes: 30 },
          { id: "l20", title: "Capstone Project", type: "assignment", duration_minutes: 90 },
        ],
      },
    ],
    faqs: [
      {
        question: "Do I need a technical background to earn the CAIP?",
        answer:
          "No. The CAIP is specifically designed for business professionals without a technical background. All content is taught in plain language with a focus on practical application.",
      },
      {
        question: "How long does it take to complete the CAIP program?",
        answer:
          "Most learners complete the CAIP program in 6–8 weeks, studying 3–5 hours per week. You have 12 months from enrollment to complete the program at your own pace.",
      },
      {
        question: "What is the exam format?",
        answer:
          "The CAIP exam consists of 75 multiple-choice questions administered online. You have 90 minutes to complete the exam and must score 70% or higher to pass. You can take the exam from anywhere with a reliable internet connection.",
      },
      {
        question: "How long is the CAIP credential valid?",
        answer:
          "The CAIP credential is valid for 3 years. To maintain your credential, you must earn 30 Professional Development Units (PDUs) within the 3-year cycle.",
      },
      {
        question: "Can my employer pay for the certification?",
        answer:
          "Yes. Many employers cover the cost of the CAIP as part of professional development. We provide official invoices and enrollment letters for reimbursement purposes. Contact us about corporate group pricing.",
      },
      {
        question: "What happens if I fail the exam?",
        answer:
          "If you don't pass on your first attempt, you may retake the exam after a 14-day waiting period. Two retakes are included with your enrollment. Additional retake attempts are available for a fee.",
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "caim-001",
    slug: "certified-ai-manager",
    title: "Certified AI Manager",
    acronym: "CAIM",
    description:
      "Advanced credential for managers and team leads responsible for deploying and overseeing AI initiatives across teams and departments.",
    long_description: "",
    level: "specialist",
    status: "coming_soon",
    price: 695,
    duration_weeks: 10,
    exam_duration_minutes: 120,
    passing_score: 70,
    validity_years: 3,
    stripe_price_id: null,
    badge_icon: "🎯",
    color_scheme: "navy-blue",
    learning_outcomes: [],
    curriculum: [],
    faqs: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "caie-001",
    slug: "certified-ai-educator",
    title: "Certified AI Educator",
    acronym: "CAIE",
    description:
      "Specialized credential for educators, trainers, and instructional designers who want to integrate AI into learning and development programs.",
    long_description: "",
    level: "specialist",
    status: "coming_soon",
    price: 595,
    duration_weeks: 8,
    exam_duration_minutes: 90,
    passing_score: 70,
    validity_years: 3,
    stripe_price_id: null,
    badge_icon: "📚",
    color_scheme: "teal",
    learning_outcomes: [],
    curriculum: [],
    faqs: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "caida-001",
    slug: "certified-ai-data-analyst",
    title: "Certified AI Data Analyst",
    acronym: "CAIDA",
    description:
      "Professional credential for data analysts and business intelligence professionals who want to leverage AI for advanced data analysis and insights.",
    long_description: "",
    level: "specialist",
    status: "coming_soon",
    price: 695,
    duration_weeks: 10,
    exam_duration_minutes: 120,
    passing_score: 70,
    validity_years: 3,
    stripe_price_id: null,
    badge_icon: "📊",
    color_scheme: "purple",
    learning_outcomes: [],
    curriculum: [],
    faqs: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getCertificationBySlug(slug: string): Certification | undefined {
  return CERTIFICATIONS.find((c) => c.slug === slug);
}

export function getActiveCertifications(): Certification[] {
  return CERTIFICATIONS.filter((c) => c.status === "active");
}
