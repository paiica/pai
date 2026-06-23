/**
 * Demo seed — creates realistic mock data for showcasing the admin/professor/student portals.
 * Run with: npx ts-node prisma/seed-demo.ts
 * Safe to re-run (uses upsert where possible).
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import {
  PrismaClient, Role, ApplicationStatus, EnrollmentStatus,
  LessonType, QuestionType, SubmissionStatus, CertificateStatus,
  PaymentStatus, CareerStatus, ExamAttemptStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PW = "Student@PAI2026!";

async function main() {
  console.log("🌱  Seeding demo data…\n");

  const hash = await bcrypt.hash(PW, 12);

  // ── 1. Professor ──────────────────────────────────────────────────────────
  const prof = await prisma.user.upsert({
    where: { email: "dr.thompson@paii.ca" },
    update: {},
    create: {
      email: "dr.thompson@paii.ca",
      password_hash: hash,
      role: Role.professor,
      email_verified: true,
      profile: { create: { first_name: "Alex", last_name: "Thompson", job_title: "AI Research Lead", company: "PAI" } },
    },
  });
  console.log(`✓ Professor: ${prof.email}`);

  // ── 2. Students ───────────────────────────────────────────────────────────
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: "sarah.johnson@example.com" },
      update: {},
      create: { email: "sarah.johnson@example.com", password_hash: hash, role: Role.student, email_verified: true,
        profile: { create: { first_name: "Sarah", last_name: "Johnson", job_title: "Marketing Manager", company: "Acme Corp" } } },
    }),
    prisma.user.upsert({
      where: { email: "michael.chen@example.com" },
      update: {},
      create: { email: "michael.chen@example.com", password_hash: hash, role: Role.student, email_verified: true,
        profile: { create: { first_name: "Michael", last_name: "Chen", job_title: "Data Analyst", company: "TechCorp" } } },
    }),
    prisma.user.upsert({
      where: { email: "emily.davis@example.com" },
      update: {},
      create: { email: "emily.davis@example.com", password_hash: hash, role: Role.student, email_verified: true,
        profile: { create: { first_name: "Emily", last_name: "Davis", job_title: "Product Manager", company: "StartupXYZ" } } },
    }),
    prisma.user.upsert({
      where: { email: "james.wilson@example.com" },
      update: {},
      create: { email: "james.wilson@example.com", password_hash: hash, role: Role.student, email_verified: true,
        profile: { create: { first_name: "James", last_name: "Wilson", job_title: "Consultant", company: "Deloitte" } } },
    }),
  ]);
  const [sarah, michael, emily, james] = students;
  console.log(`✓ Students: ${students.map(s => s.email).join(", ")}`);

  // ── 3. More certifications ────────────────────────────────────────────────
  const caip = await prisma.certification.findUnique({ where: { slug: "certified-ai-professional" } });
  if (!caip) throw new Error("Run base seed first (npx prisma db seed)");

  const caiml = await prisma.certification.upsert({
    where: { slug: "certified-ai-machine-learning" },
    update: {},
    create: {
      slug: "certified-ai-machine-learning",
      acronym: "CAIML",
      title: "Certified AI in Machine Learning",
      level: "advanced",
      status: "active",
      badge_icon: "🧠",
      price: 1895.00,
      description: "Deep expertise in ML pipelines, model evaluation, and production deployment.",
      long_description: "Master machine learning from theory to production-grade systems.",
      learning_outcomes: ["Build and train ML models", "Design ML pipelines", "Deploy models to production", "Monitor and maintain ML systems"],
      target_audience: ["Data Scientists", "ML Engineers", "Software Engineers"],
      duration_weeks: 12,
      total_lessons: 60,
      total_hours: 80,
      passing_score: 75,
      exam_duration_minutes: 120,
      exam_questions_count: 100,
      validity_years: 2,
      sort_order: 2,
    },
  });

  const caig = await prisma.certification.upsert({
    where: { slug: "certified-ai-governance" },
    update: {},
    create: {
      slug: "certified-ai-governance",
      acronym: "CAIG",
      title: "Certified AI Governance Specialist",
      level: "specialist",
      status: "active",
      badge_icon: "⚖️",
      price: 2295.00,
      description: "Lead AI policy, ethics, and compliance frameworks in your organization.",
      long_description: "Become the go-to expert on responsible AI deployment and governance.",
      learning_outcomes: ["Design AI governance frameworks", "Conduct AI audits", "Implement responsible AI policies", "Manage AI risk"],
      target_audience: ["Compliance Officers", "Legal Professionals", "Risk Managers", "Executives"],
      duration_weeks: 10,
      total_lessons: 48,
      total_hours: 55,
      passing_score: 72,
      exam_duration_minutes: 105,
      exam_questions_count: 85,
      validity_years: 3,
      sort_order: 3,
    },
  });

  const caie = await prisma.certification.upsert({
    where: { slug: "certified-ai-executive" },
    update: {},
    create: {
      slug: "certified-ai-executive",
      acronym: "CAIX",
      title: "Certified AI Executive",
      level: "executive",
      status: "coming_soon",
      badge_icon: "👔",
      price: 3495.00,
      description: "Strategic AI leadership for C-suite and senior decision-makers.",
      long_description: "Lead your organization's AI transformation with confidence.",
      learning_outcomes: ["Define AI strategy", "Build AI teams", "Evaluate AI ROI", "Navigate AI regulation"],
      target_audience: ["CEOs", "CTOs", "Board Members", "Senior VPs"],
      duration_weeks: 6,
      total_lessons: 30,
      total_hours: 25,
      passing_score: 70,
      exam_duration_minutes: 90,
      exam_questions_count: 60,
      validity_years: 3,
      sort_order: 4,
    },
  });
  console.log(`✓ Certifications: CAIML, CAIG, CAIX`);

  // ── 4. Assign instructor to CAIP ──────────────────────────────────────────
  await prisma.courseInstructor.upsert({
    where: { certification_id_user_id: { certification_id: caip.id, user_id: prof.id } },
    update: {},
    create: { certification_id: caip.id, user_id: prof.id, is_lead: true },
  });
  await prisma.courseInstructor.upsert({
    where: { certification_id_user_id: { certification_id: caiml.id, user_id: prof.id } },
    update: {},
    create: { certification_id: caiml.id, user_id: prof.id, is_lead: true },
  });
  console.log(`✓ Instructor assigned to CAIP & CAIML`);

  // ── 5. CAIP modules & lessons ─────────────────────────────────────────────
  const existingModules = await prisma.module.count({ where: { certification_id: caip.id } });
  let lessons: any[] = [];

  if (existingModules === 0) {
    const mod1 = await prisma.module.create({
      data: {
        certification_id: caip.id, title: "Foundations of AI", sort_order: 1, is_published: true,
        description: "Core concepts, history, and the AI landscape today.",
      },
    });
    const mod2 = await prisma.module.create({
      data: {
        certification_id: caip.id, title: "Prompt Engineering", sort_order: 2, is_published: true,
        description: "Craft high-quality prompts for business and creative tasks.",
      },
    });
    const mod3 = await prisma.module.create({
      data: {
        certification_id: caip.id, title: "AI Ethics & Governance", sort_order: 3, is_published: true,
        description: "Responsible AI deployment, bias, fairness, and policy.",
      },
    });

    // Module 1 lessons
    const l1 = await prisma.lesson.create({ data: { module_id: mod1.id, title: "What is Artificial Intelligence?", type: LessonType.video, sort_order: 1, is_published: true, duration_minutes: 18, video_url: "https://www.youtube.com/watch?v=ad79nYk2keg", description: "An accessible overview of AI, its history, and why it matters today." } });
    const l2 = await prisma.lesson.create({ data: { module_id: mod1.id, title: "Types of AI Systems", type: LessonType.reading, sort_order: 2, is_published: true, duration_minutes: 15, content_body: "<h2>Narrow AI vs. General AI</h2><p>Narrow AI (ANI) excels at specific tasks — from image recognition to language translation. General AI (AGI) remains theoretical. Today's landscape is dominated by narrow AI with increasingly broad capabilities.</p><h2>Machine Learning Categories</h2><ul><li><strong>Supervised learning</strong> — trained on labeled examples</li><li><strong>Unsupervised learning</strong> — finds patterns without labels</li><li><strong>Reinforcement learning</strong> — learns through reward and penalty</li></ul><h2>Generative AI</h2><p>Models like GPT-4 and Claude generate text, images, code, and more. They are transforming knowledge work across every industry.</p>" } });
    const l3 = await prisma.lesson.create({ data: { module_id: mod1.id, title: "Module 1 Knowledge Check", type: LessonType.quiz, sort_order: 3, is_published: true, duration_minutes: 20, max_attempts: 3 } });

    // Module 2 lessons
    const l4 = await prisma.lesson.create({ data: { module_id: mod2.id, title: "The Art of Prompting", type: LessonType.video, sort_order: 1, is_published: true, duration_minutes: 22, video_url: "https://www.youtube.com/watch?v=1bUy-1hGZpI", description: "Learn the core principles of effective prompt design." } });
    const l5 = await prisma.lesson.create({ data: { module_id: mod2.id, title: "Advanced Prompt Techniques", type: LessonType.reading, sort_order: 2, is_published: true, duration_minutes: 20, content_body: "<h2>Chain-of-Thought Prompting</h2><p>Ask the model to reason step-by-step before giving an answer. This dramatically improves accuracy on complex tasks.</p><h2>Few-Shot Examples</h2><p>Provide 2–5 examples of the desired input/output format. The model adapts its style to match your examples.</p><h2>Role Prompting</h2><p>Assign a persona: <em>\"You are a senior financial analyst…\"</em>. This frames the response with relevant expertise and tone.</p><h2>Structured Output</h2><p>Request JSON, tables, or specific formats to make AI output directly usable in your workflows.</p>" } });
    const l6 = await prisma.lesson.create({ data: { module_id: mod2.id, title: "Prompt Engineering Assignment", type: LessonType.assignment, sort_order: 3, is_published: true, duration_minutes: 60, max_score: 100, due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), description: "Design 5 prompts for real business scenarios. For each prompt: state the use case, write the prompt, explain your design choices, and show a sample output." } });

    // Module 3 lessons
    const l7 = await prisma.lesson.create({ data: { module_id: mod3.id, title: "Responsible AI Principles", type: LessonType.video, sort_order: 1, is_published: true, duration_minutes: 25, video_url: "https://www.youtube.com/watch?v=1bUy-1hGZpI", description: "Fairness, transparency, accountability, and safety in AI systems." } });
    const l8 = await prisma.lesson.create({ data: { module_id: mod3.id, title: "AI Governance Resources", type: LessonType.download, sort_order: 2, is_published: true, duration_minutes: 10, description: "Download the PAI AI Governance Framework template.", external_url: "https://paii.ca/resources/governance-framework" } });
    const l9 = await prisma.lesson.create({ data: { module_id: mod3.id, title: "Final Module Assessment", type: LessonType.quiz, sort_order: 3, is_published: true, duration_minutes: 30, max_attempts: 2 } });

    lessons = [l1, l2, l3, l4, l5, l6, l7, l8, l9];

    // Quiz questions for Module 1 quiz (l3)
    await prisma.quizQuestion.createMany({ data: [
      { lesson_id: l3.id, question_text: "Which of the following best describes Narrow AI?", question_type: QuestionType.multiple_choice, options: ["AI that can perform any intellectual task a human can", "AI optimized for one specific type of task", "AI that learns from human feedback only", "AI that runs on specialized hardware"], correct_index: 1, points: 2, sort_order: 1 },
      { lesson_id: l3.id, question_text: "Supervised learning requires labeled training data.", question_type: QuestionType.true_false, options: ["True", "False"], correct_index: 0, points: 1, sort_order: 2 },
      { lesson_id: l3.id, question_text: "GPT-4 and Claude are examples of which AI category?", question_type: QuestionType.multiple_choice, options: ["Narrow AI / Discriminative models", "General AI / AGI", "Generative AI / Large Language Models", "Reinforcement learning agents"], correct_index: 2, points: 2, sort_order: 3 },
      { lesson_id: l3.id, question_text: "Reinforcement learning trains models by providing labeled examples.", question_type: QuestionType.true_false, options: ["True", "False"], correct_index: 1, points: 1, sort_order: 4 },
      { lesson_id: l3.id, question_text: "Which technique asks a model to reason step-by-step before answering?", question_type: QuestionType.multiple_choice, options: ["Zero-shot prompting", "Role prompting", "Chain-of-thought prompting", "Template prompting"], correct_index: 2, points: 2, sort_order: 5 },
    ]});

    // Quiz questions for Module 3 quiz (l9)
    await prisma.quizQuestion.createMany({ data: [
      { lesson_id: l9.id, question_text: "Which principle ensures AI decisions can be explained and understood?", question_type: QuestionType.multiple_choice, options: ["Fairness", "Transparency", "Privacy", "Accountability"], correct_index: 1, points: 2, sort_order: 1 },
      { lesson_id: l9.id, question_text: "AI bias can only originate from the training data, not from the model design.", question_type: QuestionType.true_false, options: ["True", "False"], correct_index: 1, points: 1, sort_order: 2 },
      { lesson_id: l9.id, question_text: "What does AI accountability mean in practice?", question_type: QuestionType.multiple_choice, options: ["AI systems make all final decisions", "Humans remain responsible for AI-driven outcomes", "AI models are held legally liable", "Accountability only applies to open-source AI"], correct_index: 1, points: 2, sort_order: 3 },
    ]});

    console.log(`✓ CAIP: 3 modules, 9 lessons, quiz questions`);
  } else {
    lessons = await prisma.lesson.findMany({ where: { module: { certification_id: caip.id } }, orderBy: { sort_order: "asc" } });
    console.log(`✓ CAIP modules already exist (skipped)`);
  }

  // ── 6. Applications ───────────────────────────────────────────────────────
  const apps = await Promise.all([
    // Sarah — approved + enrolled
    prisma.application.upsert({
      where: { user_id_certification_id: { user_id: sarah.id, certification_id: caip.id } },
      update: {},
      create: {
        user_id: sarah.id, certification_id: caip.id,
        status: ApplicationStatus.approved,
        full_name: "Sarah Johnson", email: sarah.email,
        phone: "+1 416 555 0101", country: "Canada",
        career_status: CareerStatus.professional,
        job_title: "Marketing Manager", company: "Acme Corp",
        years_experience: 7,
        motivation: "I want to lead AI-driven marketing initiatives at my company.",
        how_heard: "LinkedIn",
        payment_status: PaymentStatus.succeeded,
        amount_paid: 1295,
        paid_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        reviewed_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
    }),
    // Michael — approved + enrolled
    prisma.application.upsert({
      where: { user_id_certification_id: { user_id: michael.id, certification_id: caip.id } },
      update: {},
      create: {
        user_id: michael.id, certification_id: caip.id,
        status: ApplicationStatus.approved,
        full_name: "Michael Chen", email: michael.email,
        country: "Canada", career_status: CareerStatus.professional,
        job_title: "Data Analyst", company: "TechCorp", years_experience: 4,
        motivation: "Looking to formalize my AI knowledge.",
        payment_status: PaymentStatus.succeeded, amount_paid: 1295,
        paid_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        reviewed_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
    }),
    // Emily — approved + enrolled (completed)
    prisma.application.upsert({
      where: { user_id_certification_id: { user_id: emily.id, certification_id: caip.id } },
      update: {},
      create: {
        user_id: emily.id, certification_id: caip.id,
        status: ApplicationStatus.approved,
        full_name: "Emily Davis", email: emily.email,
        country: "USA", career_status: CareerStatus.professional,
        job_title: "Product Manager", company: "StartupXYZ", years_experience: 5,
        motivation: "AI is reshaping product development — I need to lead that change.",
        payment_status: PaymentStatus.succeeded, amount_paid: 1295,
        paid_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        reviewed_at: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000),
      },
    }),
    // James — pending review
    prisma.application.upsert({
      where: { user_id_certification_id: { user_id: james.id, certification_id: caip.id } },
      update: {},
      create: {
        user_id: james.id, certification_id: caip.id,
        status: ApplicationStatus.pending_review,
        full_name: "James Wilson", email: james.email,
        country: "UK", career_status: CareerStatus.professional,
        job_title: "Consultant", company: "Deloitte", years_experience: 9,
        motivation: "My clients are asking about AI strategy — I need to be the expert.",
        payment_status: PaymentStatus.succeeded, amount_paid: 1295,
        paid_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    // James — pending review for CAIML
    prisma.application.upsert({
      where: { user_id_certification_id: { user_id: michael.id, certification_id: caiml.id } },
      update: {},
      create: {
        user_id: michael.id, certification_id: caiml.id,
        status: ApplicationStatus.pending_payment,
        full_name: "Michael Chen", email: michael.email,
        country: "Canada", career_status: CareerStatus.professional,
        job_title: "Data Analyst", company: "TechCorp", years_experience: 4,
        motivation: "I want to specialize in ML engineering.",
        payment_status: PaymentStatus.pending,
      },
    }),
  ]);
  const [sarahApp, michaelApp, emilyApp] = apps;
  console.log(`✓ Applications created`);

  // ── 7. Enrollments ────────────────────────────────────────────────────────
  const sarahEnrollment = await prisma.enrollment.upsert({
    where: { user_id_certification_id: { user_id: sarah.id, certification_id: caip.id } },
    update: {},
    create: {
      user_id: sarah.id, certification_id: caip.id,
      application_id: sarahApp.id,
      status: EnrollmentStatus.active,
      progress_percentage: 56,
      enrolled_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      expires_at: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    },
  });

  const michaelEnrollment = await prisma.enrollment.upsert({
    where: { user_id_certification_id: { user_id: michael.id, certification_id: caip.id } },
    update: {},
    create: {
      user_id: michael.id, certification_id: caip.id,
      application_id: michaelApp.id,
      status: EnrollmentStatus.active,
      progress_percentage: 22,
      enrolled_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      expires_at: new Date(Date.now() + 346 * 24 * 60 * 60 * 1000),
    },
  });

  const emilyEnrollment = await prisma.enrollment.upsert({
    where: { user_id_certification_id: { user_id: emily.id, certification_id: caip.id } },
    update: {},
    create: {
      user_id: emily.id, certification_id: caip.id,
      application_id: emilyApp.id,
      status: EnrollmentStatus.completed,
      progress_percentage: 100,
      enrolled_at: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      expires_at: new Date(Date.now() + 665 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Enrollments created`);

  // ── 8. Lesson progress ────────────────────────────────────────────────────
  if (lessons.length >= 9) {
    const [l1, l2, l3, l4, l5, l6, l7, l8, l9] = lessons;

    // Sarah: completed mod1 + mod2 video/reading (5/9 = 56%)
    for (const [lesson, extra] of [
      [l1, { watch_seconds: 1050 }],
      [l2, {}],
      [l3, { quiz_score: 78, quiz_passed: true, quiz_attempts: 1 }],
      [l4, { watch_seconds: 1290 }],
      [l5, {}],
    ] as [any, any][]) {
      await prisma.lessonProgress.upsert({
        where: { user_id_lesson_id: { user_id: sarah.id, lesson_id: lesson.id } },
        update: {},
        create: { user_id: sarah.id, enrollment_id: sarahEnrollment.id, lesson_id: lesson.id, completed: true, completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), ...extra },
      });
    }

    // Michael: completed mod1 video+reading (2/9 = 22%)
    for (const lesson of [l1, l2]) {
      await prisma.lessonProgress.upsert({
        where: { user_id_lesson_id: { user_id: michael.id, lesson_id: lesson.id } },
        update: {},
        create: { user_id: michael.id, enrollment_id: michaelEnrollment.id, lesson_id: lesson.id, completed: true, completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      });
    }

    // Emily: all completed (100%)
    for (const [lesson, extra] of [
      [l1, { watch_seconds: 1080 }],
      [l2, {}],
      [l3, { quiz_score: 90, quiz_passed: true, quiz_attempts: 1 }],
      [l4, { watch_seconds: 1320 }],
      [l5, {}],
      [l6, {}],
      [l7, { watch_seconds: 1500 }],
      [l8, {}],
      [l9, { quiz_score: 85, quiz_passed: true, quiz_attempts: 1 }],
    ] as [any, any][]) {
      await prisma.lessonProgress.upsert({
        where: { user_id_lesson_id: { user_id: emily.id, lesson_id: lesson.id } },
        update: {},
        create: { user_id: emily.id, enrollment_id: emilyEnrollment.id, lesson_id: lesson.id, completed: true, completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), ...extra },
      });
    }
    console.log(`✓ Lesson progress created`);

    // ── 9. Assignment submissions ──────────────────────────────────────────
    // Sarah submitted, pending grading
    await prisma.assignmentSubmission.upsert({
      where: { lesson_id_user_id: { lesson_id: l6.id, user_id: sarah.id } },
      update: {},
      create: {
        lesson_id: l6.id, user_id: sarah.id, enrollment_id: sarahEnrollment.id,
        text_content: "Prompt 1 (Email Summarization): 'Summarize the following email thread in 3 bullet points, focusing on action items and decisions made: [email]'\n\nPrompt 2 (Competitive Analysis): 'Act as a senior market analyst. Given the following product descriptions, identify 5 key differentiators and rate their competitive advantage from 1-5: [products]'\n\nPrompt 3 (Meeting Agenda): 'Create a structured 60-minute meeting agenda for a project kickoff with stakeholders from Marketing, Engineering, and Finance. Include time allocations and discussion goals.'\n\nPrompt 4 (Customer Support): 'You are a friendly customer support agent for a SaaS company. Respond to the following complaint while maintaining brand voice and offering a concrete solution: [complaint]'\n\nPrompt 5 (Data Analysis): 'Analyze the following sales data and provide: (1) key trends, (2) anomalies, (3) 3 actionable recommendations: [data]'",
        status: SubmissionStatus.submitted,
        submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });

    // Emily submitted AND graded
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@paii.ca" } });
    await prisma.assignmentSubmission.upsert({
      where: { lesson_id_user_id: { lesson_id: l6.id, user_id: emily.id } },
      update: {},
      create: {
        lesson_id: l6.id, user_id: emily.id, enrollment_id: emilyEnrollment.id,
        text_content: "Prompt 1: 'You are a product launch specialist. Create a comprehensive go-to-market prompt sequence for a new B2B SaaS tool. Include messaging for: (a) awareness, (b) consideration, (c) decision stages.' Result: Generated a 3-stage campaign that increased our CTR by 40% in testing.\n\nPrompt 2: 'Act as a UX researcher. Review the following user journey map and identify 5 friction points, ranked by impact. Suggest one AI-powered solution for each.' This helped our team prioritize Q3 roadmap.\n\nPrompt 3 (Chain-of-thought): 'Walk me through how you would evaluate whether our company should adopt AI for customer churn prediction. Consider: data requirements, model selection, implementation costs, and ROI.' Used this with stakeholders to build our AI investment case.",
        status: SubmissionStatus.graded,
        submitted_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        grade: 92,
        max_grade: 100,
        feedback: "Excellent work, Emily! Your prompts demonstrate sophisticated understanding of role prompting and chain-of-thought techniques. The business context you provided for each prompt shows real-world applicability. The go-to-market sequence in Prompt 1 is particularly impressive — publishing this would be valuable for the cohort.",
        graded_by: adminUser?.id ?? prof.id,
        graded_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✓ Assignment submissions created`);
  }

  // ── 10. Exam attempt + Certificate for Emily ───────────────────────────────
  const existingCert = await prisma.certificate.findFirst({ where: { enrollment_id: emilyEnrollment.id } });
  if (!existingCert) {
    await prisma.examAttempt.create({
      data: {
        user_id: emily.id, enrollment_id: emilyEnrollment.id,
        attempt_number: 1,
        status: ExamAttemptStatus.passed,
        started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 82 * 60 * 1000),
        total_questions: 75, correct_answers: 60,
        score_percentage: 80.0, passing_score: 70, passed: true,
        time_limit_seconds: 5400, time_used_seconds: 4920,
      },
    });

    await prisma.certificate.create({
      data: {
        user_id: emily.id, enrollment_id: emilyEnrollment.id, certification_id: caip.id,
        certificate_number: "PAI-CAIP-2026-0001",
        status: CertificateStatus.active,
        holder_name: "Emily Davis",
        certification_title: "Certified AI Professional",
        certification_acronym: "CAIP",
        exam_score: 80.0,
        issued_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() + 725 * 24 * 60 * 60 * 1000),
        verification_url: "https://verify.paii.ca/PAI-CAIP-2026-0001",
      },
    });
    console.log(`✓ Exam attempt & certificate issued for Emily`);
  } else {
    console.log(`✓ Emily's certificate already exists (skipped)`);
  }

  // ── 11. CAIML modules (minimal, just to show in builder) ──────────────────
  const caimlModules = await prisma.module.count({ where: { certification_id: caiml.id } });
  if (caimlModules === 0) {
    const m1 = await prisma.module.create({ data: { certification_id: caiml.id, title: "ML Fundamentals", sort_order: 1, is_published: true } });
    const m2 = await prisma.module.create({ data: { certification_id: caiml.id, title: "Model Training & Evaluation", sort_order: 2, is_published: false } });
    await prisma.lesson.createMany({ data: [
      { module_id: m1.id, title: "Introduction to Machine Learning", type: LessonType.video, sort_order: 1, is_published: true, duration_minutes: 30, video_url: "https://www.youtube.com/watch?v=ukzFI9rgwfU" },
      { module_id: m1.id, title: "Supervised vs Unsupervised Learning", type: LessonType.reading, sort_order: 2, is_published: true, duration_minutes: 20, content_body: "<p>Supervised learning uses labeled data. Unsupervised learning finds hidden patterns.</p>" },
      { module_id: m1.id, title: "ML Fundamentals Quiz", type: LessonType.quiz, sort_order: 3, is_published: true, duration_minutes: 25, max_attempts: 3 },
      { module_id: m2.id, title: "Training Your First Model", type: LessonType.video, sort_order: 1, is_published: false, duration_minutes: 45 },
      { module_id: m2.id, title: "Model Assignment", type: LessonType.assignment, sort_order: 2, is_published: false, duration_minutes: 90, max_score: 100 },
    ]});
    console.log(`✓ CAIML: 2 modules, 5 lessons`);
  }

  console.log("\n✅  Demo seed complete!\n");
  console.log("  Credentials (all use same password):");
  console.log(`  Password:  ${PW}`);
  console.log(`  Professor: dr.thompson@paii.ca`);
  console.log(`  Student 1: sarah.johnson@example.com  (56% progress, assignment submitted)`);
  console.log(`  Student 2: michael.chen@example.com   (22% progress)`);
  console.log(`  Student 3: emily.davis@example.com    (100% complete, certified)`);
  console.log(`  Student 4: james.wilson@example.com   (application pending review)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
