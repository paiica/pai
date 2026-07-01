"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding database...");
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@paii.ca";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin@123456";
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            password_hash: passwordHash,
            role: client_1.Role.super_admin,
            email_verified: true,
            profile: {
                create: {
                    first_name: "PAII",
                    last_name: "Admin",
                    display_name: "PAII Administrator",
                },
            },
        },
    });
    console.log(`Admin user: ${admin.email}`);
    const caip = await prisma.certification.upsert({
        where: { slug: "certified-ai-professional" },
        update: {},
        create: {
            slug: "certified-ai-professional",
            acronym: "CAIP",
            title: "Certified AI Professional",
            level: "foundation",
            status: "active",
            badge_icon: "🤖",
            price: 1295.00,
            description: "The essential AI credential for professionals in any industry.",
            long_description: "Master AI tools, workflows, ethics, and practical applications across industries.",
            learning_outcomes: [
                "Apply generative AI tools across business workflows",
                "Write effective prompts for complex professional tasks",
                "Evaluate AI tools and platforms for organizational fit",
                "Design AI governance frameworks",
            ],
            target_audience: ["Business professionals", "Managers", "Educators", "Consultants"],
            duration_weeks: 8,
            total_lessons: 42,
            total_hours: 40,
            passing_score: 70,
            exam_duration_minutes: 90,
            exam_questions_count: 75,
            validity_years: 2,
            sort_order: 1,
        },
    });
    console.log(`Certification: ${caip.acronym}`);
    console.log("Seed complete.");
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map