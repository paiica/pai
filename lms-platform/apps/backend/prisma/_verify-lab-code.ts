import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdtempSync } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

const prisma = new PrismaClient();
const SLUG = process.argv[2] || "sql-zero-to-hero";

(async () => {
  const course = await prisma.course.findUniqueOrThrow({ where: { slug: SLUG } });
  const modules = await prisma.module.findMany({
    where: { course_id: course.id },
    orderBy: { sort_order: "asc" },
    include: { lessons: { orderBy: { sort_order: "asc" } } },
  });

  const dir = mkdtempSync(join(tmpdir(), "lab-verify-"));
  let checked = 0, failed = 0;
  for (const mod of modules) {
    for (const l of mod.lessons) {
      const cells = l.lab_cells_json as any[] | null;
      if (!Array.isArray(cells)) continue;
      for (const c of cells) {
        if (c.type !== "code" || c.runnable === false) continue;
        checked++;
        const file = join(dir, `cell_${checked}.py`);
        writeFileSync(file, c.content);
        try {
          execSync(`python "${file}"`, { stdio: "pipe", timeout: 20000 });
        } catch (e: any) {
          failed++;
          console.log(`❌ [${mod.title}] ${l.title}:`);
          console.log(e.stderr?.toString().split("\n").slice(-8).join("\n"));
        }
      }
    }
  }
  console.log(`\nChecked ${checked} runnable cells, ${failed} failed.`);
})().finally(() => prisma.$disconnect());
