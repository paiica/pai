import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting demo data...");
  const demoEmails = ["sarah.johnson@example.com","michael.chen@example.com","emily.davis@example.com","james.wilson@example.com","dr.thompson@paii.ca"];
  const demoCertSlugs = ["certified-ai-machine-learning","certified-ai-governance","certified-ai-executive"];
  const demoUsers = await prisma.user.findMany({ where: { email: { in: demoEmails } }, select: { id: true } });
  const ids = demoUsers.map(u => u.id);
  await prisma.courseInstructor.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.assignmentSubmission.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.lessonProgress.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.examAttempt.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.certificate.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.enrollment.deleteMany({ where: { user_id: { in: ids } } });
  await prisma.application.deleteMany({ where: { user_id: { in: ids } } });
  const u = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log("Deleted " + u.count + " demo users");
  const c = await prisma.certification.deleteMany({ where: { slug: { in: demoCertSlugs } } });
  console.log("Deleted " + c.count + " demo certifications");
  const caip = await prisma.certification.findUnique({ where: { slug: "certified-ai-professional" } });
  if (caip) { const m = await prisma.module.deleteMany({ where: { certification_id: caip.id } }); console.log("Deleted " + m.count + " CAIP modules"); }
  console.log("Done. Base data intact.");
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
