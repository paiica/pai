export interface CertificationSummary {
  id: string;
  slug: string;
  acronym: string;
  title: string;
  level: "Foundation" | "Advanced" | "Executive" | "Specialist";
  tier: 1 | 2 | 3;
  icon: string;
  price: number;
  duration_weeks: number;
  total_lessons: number;
  total_hours: number;
  exam_minutes: number;
  passing_score: number;
  validity_years: number;
  short_description: string;
  long_description: string;
  target_audience: string[];
  learning_outcomes: string[];
  curriculum_overview: { title: string; description: string; lessons: number }[];
  faqs: { question: string; answer: string }[];
  status: "active" | "coming_soon";
}

export const CERTIFICATIONS: CertificationSummary[] = [
  {
    id: "caip-001",
    slug: "certified-ai-professional",
    acronym: "CAIP",
    title: "Certified AI Professional",
    level: "Foundation",
    tier: 1,
    icon: "🤖",
    price: 495,
    duration_weeks: 8,
    total_lessons: 42,
    total_hours: 40,
    exam_minutes: 90,
    passing_score: 70,
    validity_years: 2,
    status: "active",
    short_description:
      "The essential AI credential for professionals in any industry. Master AI tools, workflows, ethics, and practical applications.",
    long_description:
      "The CAIP certification is the professional standard for individuals who work with AI tools, manage AI-driven processes, or advise organizations on AI strategy. Through 42 lessons across 8 comprehensive modules, you'll build practical competency in AI tools, prompt engineering, automation, ethics, governance, and business application. No technical background required — built for professionals, not engineers.",
    target_audience: [
      "Business professionals",
      "Managers and team leads",
      "Educators and trainers",
      "Marketing and communications professionals",
      "Operations managers",
      "HR and talent professionals",
      "Entrepreneurs",
      "Consultants",
    ],
    learning_outcomes: [
      "Apply generative AI tools across business workflows",
      "Write effective prompts for complex professional tasks",
      "Evaluate AI tools and platforms for organizational fit",
      "Design AI governance frameworks for your team or organization",
      "Identify and mitigate AI risks (bias, hallucination, privacy)",
      "Build AI-powered automation for repetitive business processes",
      "Communicate AI strategy and ROI to stakeholders",
      "Stay current with rapidly evolving AI capabilities",
    ],
    curriculum_overview: [
      { title: "AI Foundations", description: "How AI works, current landscape, key models and architectures", lessons: 6 },
      { title: "Generative AI Tools & Platforms", description: "ChatGPT, Claude, Gemini, Copilot — practical mastery", lessons: 5 },
      { title: "Prompt Engineering", description: "Advanced prompting techniques for professional applications", lessons: 6 },
      { title: "AI in Business Operations", description: "Automating workflows, productivity, team AI integration", lessons: 5 },
      { title: "AI Ethics & Responsible Use", description: "Bias, hallucination, privacy, governance, regulation", lessons: 6 },
      { title: "Industry Applications", description: "AI in finance, HR, marketing, legal, healthcare, education", lessons: 5 },
      { title: "AI Strategy & ROI", description: "Business cases, stakeholder communication, change management", lessons: 5 },
      { title: "Capstone & Exam Prep", description: "Applied project, practice exam, certification readiness", lessons: 4 },
    ],
    faqs: [
      {
        question: "Do I need a technical background?",
        answer: "No. CAIP is designed for business professionals, not engineers or data scientists. You'll learn how to use AI tools and think strategically about AI — not how to build models.",
      },
      {
        question: "How long does it take to complete?",
        answer: "Most professionals complete CAIP in 6–8 weeks studying 5–7 hours per week. You have unlimited time — no expiration.",
      },
      {
        question: "Is there a prerequisite for the exam?",
        answer: "You must complete all 42 lessons and pass all module quizzes before accessing the final exam.",
      },
      {
        question: "What if I fail the exam?",
        answer: "Two retakes are included with your enrollment. Additional retakes are $99 each. Detailed score reports help you prepare for retakes.",
      },
      {
        question: "How is the credential verified?",
        answer: "Each certificate includes a unique ID and QR code. Employers can verify instantly at paii.ca/verify. Credentials are also integrated with LinkedIn.",
      },
    ],
  },
  {
    id: "caim-001",
    slug: "certified-ai-manager",
    acronym: "CAIM",
    title: "Certified AI Manager",
    level: "Advanced",
    tier: 2,
    icon: "📊",
    price: 1695,
    duration_weeks: 10,
    total_lessons: 55,
    total_hours: 52,
    exam_minutes: 90,
    passing_score: 72,
    validity_years: 2,
    status: "active",
    short_description: "Lead AI transformation. Manage AI teams. Build data-driven cultures. For managers driving AI adoption.",
    long_description:
      "The CAIM certification prepares managers and team leads to successfully plan, implement, and govern AI initiatives. You'll learn to manage AI-enabled teams, measure ROI, navigate change management challenges, and build the organizational culture needed for AI transformation. CAIP recommended but not required.",
    target_audience: ["Managers", "Team leads", "Project managers", "Product managers", "Operations leads", "Department heads", "AI program leads"],
    learning_outcomes: [
      "Develop and execute an organizational AI adoption roadmap",
      "Manage cross-functional AI projects from inception to delivery",
      "Build and lead high-performing AI-enabled teams",
      "Measure, track, and communicate AI project ROI",
      "Navigate change management for AI transformation",
      "Establish AI governance frameworks at the team level",
      "Evaluate AI vendors and platforms for organizational needs",
      "Create AI training programs for non-technical staff",
    ],
    curriculum_overview: [
      { title: "AI Management Fundamentals", description: "The manager's role in AI transformation", lessons: 5 },
      { title: "AI Roadmap & Strategy", description: "Planning, prioritization, and business case development", lessons: 6 },
      { title: "Building AI-Ready Teams", description: "Talent, skills assessment, hiring AI roles", lessons: 5 },
      { title: "AI Project Management", description: "Agile AI delivery, sprints, governance", lessons: 7 },
      { title: "Change Management for AI", description: "Adoption psychology, resistance, training programs", lessons: 6 },
      { title: "Measuring AI ROI", description: "KPIs, metrics frameworks, dashboard design", lessons: 5 },
      { title: "AI Vendor Management", description: "RFP process, evaluation criteria, contract terms", lessons: 5 },
      { title: "AI Risk & Compliance", description: "Manager's guide to AI risk, liability, regulation", lessons: 6 },
      { title: "Scaling AI Initiatives", description: "From pilot to enterprise-wide deployment", lessons: 5 },
      { title: "Capstone Project & Exam Prep", description: "Integrated management case study", lessons: 5 },
    ],
    faqs: [
      {
        question: "Is CAIP required before CAIM?",
        answer: "Recommended but not required. If you have substantial AI experience, you can apply directly for CAIM.",
      },
      {
        question: "What kind of managers benefit most?",
        answer: "Any manager who has AI tools or initiatives in their team's scope — from product managers to operations leads to department heads.",
      },
      {
        question: "Is there a group pricing option?",
        answer: "Yes. Organizations enrolling 3+ employees receive volume discounts. Contact corporate@paii.ca.",
      },
    ],
  },
  {
    id: "caie-001",
    slug: "certified-ai-educator",
    acronym: "CAIE",
    title: "Certified AI Educator",
    level: "Specialist",
    tier: 2,
    icon: "📚",
    price: 1295,
    duration_weeks: 8,
    total_lessons: 44,
    total_hours: 42,
    exam_minutes: 90,
    passing_score: 70,
    validity_years: 2,
    status: "active",
    short_description: "Design and deliver AI-powered learning. For educators, trainers, and L&D professionals shaping how AI is taught.",
    long_description:
      "The CAIE certification is built for educators, instructional designers, corporate trainers, and L&D professionals who want to integrate AI into their teaching practice and curriculum design. You'll learn how to use AI tools to create engaging learning experiences, evaluate AI-powered ed-tech platforms, and prepare learners for an AI-driven workplace — responsibly and effectively.",
    target_audience: [
      "K-12 and post-secondary educators",
      "Corporate trainers and facilitators",
      "Instructional designers",
      "L&D managers and specialists",
      "Curriculum developers",
      "Online course creators",
      "Coaching and tutoring professionals",
    ],
    learning_outcomes: [
      "Design AI-enhanced curriculum for professional and academic contexts",
      "Use generative AI to create learning content, assessments, and resources",
      "Evaluate and implement AI-powered ed-tech platforms",
      "Teach AI literacy concepts to diverse learner groups",
      "Apply ethical frameworks for AI use in education",
      "Personalize learning at scale using AI tools",
      "Measure learning effectiveness of AI-assisted instruction",
      "Prepare learners for AI-driven workplace requirements",
    ],
    curriculum_overview: [
      { title: "AI in Education Landscape", description: "Current tools, trends, and opportunities in AI-powered learning", lessons: 5 },
      { title: "AI for Content Creation", description: "Generating lessons, slides, assessments, and multimedia with AI", lessons: 6 },
      { title: "Curriculum Design with AI", description: "Learning objectives, scaffolding, and adaptive pathways", lessons: 5 },
      { title: "AI-Powered Ed-Tech Platforms", description: "Evaluating and integrating LMS, tutoring, and assessment tools", lessons: 5 },
      { title: "Teaching AI Literacy", description: "How to teach AI concepts to learners at any level", lessons: 6 },
      { title: "Ethics & Responsible AI in Education", description: "Academic integrity, bias, privacy, and appropriate AI use", lessons: 6 },
      { title: "Personalized & Adaptive Learning", description: "Using AI to differentiate instruction and scale impact", lessons: 5 },
      { title: "Capstone & Exam Prep", description: "Curriculum project, peer review, and certification readiness", lessons: 6 },
    ],
    faqs: [
      {
        question: "Is this for classroom teachers or corporate trainers?",
        answer: "Both. The CAIE curriculum covers academic, corporate, and online learning contexts. Examples and case studies span K-12, higher education, and professional development.",
      },
      {
        question: "Do I need CAIP first?",
        answer: "CAIP is recommended as it establishes your AI foundations. However, experienced educators with solid AI familiarity can apply directly.",
      },
      {
        question: "What tools does the curriculum cover?",
        answer: "ChatGPT, Claude, Canva AI, Synthesia, Coursera AI tools, Khanmigo, MagicSchool AI, and major LMS platforms with AI integrations.",
      },
    ],
  },
  {
    id: "caida-001",
    slug: "certified-ai-data-analyst",
    acronym: "CAIDA",
    title: "Certified AI Data Analyst",
    level: "Specialist",
    tier: 2,
    icon: "🔬",
    price: 1495,
    duration_weeks: 10,
    total_lessons: 60,
    total_hours: 58,
    exam_minutes: 90,
    passing_score: 72,
    validity_years: 2,
    status: "active",
    short_description: "Advanced AI-powered data analysis and ML interpretation for data professionals.",
    long_description:
      "CAIDA bridges the gap between traditional data analytics and modern AI-powered analysis methods. For analysts, data professionals, and BI developers who want to leverage AI models, automate analysis pipelines, and communicate AI-driven insights to business stakeholders.",
    target_audience: ["Data analysts", "BI developers", "Data scientists (early career)", "Reporting analysts", "Financial analysts", "Marketing analysts"],
    learning_outcomes: [
      "Use AI tools to accelerate data analysis workflows",
      "Interpret machine learning model outputs for business decisions",
      "Build AI-assisted data pipelines and automation",
      "Apply statistical AI methods to business problems",
      "Communicate AI-driven insights to non-technical stakeholders",
      "Evaluate data quality and bias in AI systems",
      "Use natural language interfaces for data querying",
      "Design dashboards powered by AI analytics",
    ],
    curriculum_overview: [
      { title: "AI for Data Professionals", description: "Landscape, tools, practical orientation", lessons: 5 },
      { title: "AI-Powered Data Wrangling", description: "Automated cleaning, transformation, enrichment", lessons: 6 },
      { title: "Machine Learning for Analysts", description: "Supervised/unsupervised methods, model selection", lessons: 7 },
      { title: "Natural Language Data Interfaces", description: "Text-to-SQL, AI assistants, voice analytics", lessons: 5 },
      { title: "AI Statistical Methods", description: "Forecasting, anomaly detection, clustering", lessons: 7 },
      { title: "AI Dashboard & Visualization", description: "Power BI Copilot, Tableau AI, custom AI viz", lessons: 6 },
      { title: "Data Ethics & Quality", description: "Bias detection, data governance, quality frameworks", lessons: 5 },
      { title: "Communicating AI Insights", description: "Storytelling, executive reporting, uncertainty", lessons: 5 },
      { title: "AI Analysis Automation", description: "Python + AI libraries, workflow automation", lessons: 6 },
      { title: "Capstone Project & Exam Prep", description: "End-to-end AI analytics project", lessons: 8 },
    ],
    faqs: [
      {
        question: "Do I need programming experience?",
        answer: "Basic familiarity with Excel or SQL is helpful but not required. The CAIDA curriculum focuses on AI tools and interpretation — not writing production code.",
      },
      {
        question: "What tools does the curriculum cover?",
        answer: "ChatGPT Advanced Data Analysis, Power BI Copilot, Tableau AI, Julius AI, and Python with AI libraries (pandas-ai, scikit-learn).",
      },
    ],
  },
  {
    id: "exec-001",
    slug: "executive-ai-leadership",
    acronym: "EAL",
    title: "Executive AI Leadership",
    level: "Executive",
    tier: 3,
    icon: "🏛️",
    price: 3495,
    duration_weeks: 6,
    total_lessons: 28,
    total_hours: 25,
    exam_minutes: 75,
    passing_score: 70,
    validity_years: 3,
    status: "coming_soon",
    short_description: "The highest-level PAII credential for C-suite leaders and board members responsible for enterprise AI strategy.",
    long_description:
      "The highest-level PAII credential for senior executives, C-suite leaders, and board members responsible for organizational AI strategy, governance, and transformation.",
    target_audience: ["CEOs", "CTOs", "CDOs", "CFOs", "Board members", "VPs", "Senior directors"],
    learning_outcomes: [
      "Enterprise AI governance and board-level oversight",
      "Board-level AI strategy and competitive positioning",
      "AI risk, compliance, and regulatory management",
      "Digital transformation leadership and culture",
    ],
    curriculum_overview: [],
    faqs: [],
  },
];

export function getCertBySlug(slug: string): CertificationSummary | undefined {
  return CERTIFICATIONS.find((c) => c.slug === slug && c.status === "active");
}
