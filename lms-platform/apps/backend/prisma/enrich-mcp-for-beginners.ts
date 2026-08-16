/**
 * Enriches MCP for Beginners with blocks-based content. README-based, no
 * labs — see seed-mcp-for-beginners.ts for the rationale.
 * Run with: npx ts-node prisma/enrich-mcp-for-beginners.ts
 * Safe to re-run.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { makeRepoHelpers, buildLessonBlocksFromReadme, renderAndSaveLessonBlocks, resolveLessonTitle } from "./course-import-lib";
import { MODULES } from "./seed-mcp-for-beginners";

const prisma = new PrismaClient();
const { fetchText, resolveRelativeUrls } = makeRepoHelpers("paiica", "mcp-for-beginners");

async function main() {
  console.log("🌱  Enriching MCP for Beginners…\n");
  const course = await prisma.course.findUnique({ where: { slug: "mcp-for-beginners" } });
  if (!course) throw new Error("Run seed-mcp-for-beginners.ts first");

  let updated = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.findFirst({ where: { course_id: course.id, title: modDef.title } });
    if (!mod) continue;
    for (const folder of modDef.folders) {
      const readme = await fetchText(`${folder}/README.md`);
      if (!readme) { console.warn(`⚠ No README: ${folder}`); continue; }
      const lessonTitle = resolveLessonTitle(readme, folder);
      const lesson = await prisma.lesson.findFirst({ where: { module_id: mod.id, title: lessonTitle } });
      if (!lesson) { console.warn(`⚠ Lesson not found: ${lessonTitle}`); continue; }

      const blocks = buildLessonBlocksFromReadme(readme, folder, resolveRelativeUrls);
      const { flags } = await renderAndSaveLessonBlocks(prisma, lesson.id, blocks);
      console.log(`✓ ${lessonTitle}  (${blocks.length} blocks${flags.length ? `, ${flags.join("; ")}` : ""})`);
      updated++;
    }
  }
  console.log(`\n✅  Enriched ${updated} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
