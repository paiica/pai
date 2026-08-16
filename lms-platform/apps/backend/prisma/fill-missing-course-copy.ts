/**
 * One-time content backfill: adds a short subtitle (and description, for the
 * one course missing both) to courses that had them blank — matching the
 * existing short-tagline-subtitle / expanded-description pattern already
 * used across the other courses.
 *
 * Run with: npx ts-node prisma/fill-missing-course-copy.ts
 * Safe to re-run — only writes when the field is currently blank.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UPDATES: { title: string; subtitle: string; description?: string }[] = [
  { title: "Marketing Analytics Foundations: From Data Collection to Strategic Insights", subtitle: "Turn Data Into Marketing Strategy" },
  { title: "How to Protect Your Data", subtitle: "Data Security Essentials" },
  { title: "Python for AI: From Beginner to AI Innovator", subtitle: "Python for Real-World AI" },
  { title: "AI Fundamentals: Practical Concepts for Non-Technical Professionals", subtitle: "AI Concepts for Non-Technical Teams" },
  { title: "AI Strategy and Governance for Executive Leaders", subtitle: "Lead Your Organization's AI Strategy" },
  {
    title: "AI & Data Driven Methods In Modern Healthcare",
    subtitle: "AI Applications in Healthcare",
    description: "<p>Explore how artificial intelligence and data-driven methods are transforming patient care, diagnostics, and operations in modern healthcare. Learn the practical applications, opportunities, and challenges of applying AI responsibly in clinical and administrative settings.</p>",
  },
];

async function main() {
  for (const u of UPDATES) {
    const course = await prisma.course.findFirst({ where: { title: u.title }, select: { id: true, subtitle: true, description: true } });
    if (!course) { console.warn(`⚠ Not found: ${u.title}`); continue; }

    const data: Record<string, string> = {};
    if (!course.subtitle?.trim()) data.subtitle = u.subtitle;
    if (u.description && !course.description?.trim()) data.description = u.description;

    if (!Object.keys(data).length) { console.log(`- ${u.title}: already complete, skipped`); continue; }

    await prisma.course.update({ where: { id: course.id }, data });
    console.log(`✓ ${u.title}: set ${Object.keys(data).join(", ")}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
