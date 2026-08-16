/**
 * Seeds "Hugging Face Diffusion Models Class" — forked at
 * github.com/paiica/diffusion-models-class (upstream
 * huggingface/diffusion-models-class, Apache 2.0). Each unit has a
 * README.md overview plus one or more Jupyter notebooks that ARE the
 * real lesson content (markdown cells interspersed with code), same
 * shape as introtodeeplearning earlier this session — narrative comes
 * from buildLessonBlocksFromNotebook, code cells become the lesson's
 * lab. The "hackathon" folder (a one-off community event writeup, not
 * curriculum) is skipped.
 *
 * Run with: npx ts-node prisma/seed-hf-diffusion-models.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { PrismaClient, CourseStatus, CourseLevel } from "@prisma/client";

const prisma = new PrismaClient();

// kind "readme": path is a folder, fetched as `${path}/README.md`.
// kind "notebook": path is the full file path (no extension needed, .ipynb assumed).
export const MODULES = [
  {
    title: "Course Introduction",
    lessons: [
      { title: "Introduction", kind: "readme" as const, path: "unit0" },
    ],
  },
  {
    title: "Unit 1: Introduction to Diffusion Models",
    lessons: [
      { title: "Unit 1 Overview", kind: "readme" as const, path: "unit1" },
      { title: "Introduction to 🤗 Diffusers", kind: "notebook" as const, path: "unit1/01_introduction_to_diffusers" },
      { title: "Diffusion Models from Scratch", kind: "notebook" as const, path: "unit1/02_diffusion_models_from_scratch" },
    ],
  },
  {
    title: "Unit 2: Fine-Tuning, Guidance and Conditioning",
    lessons: [
      { title: "Unit 2 Overview", kind: "readme" as const, path: "unit2" },
      { title: "Fine-Tuning and Guidance", kind: "notebook" as const, path: "unit2/01_finetuning_and_guidance" },
      { title: "Making a Class-Conditioned Diffusion Model", kind: "notebook" as const, path: "unit2/02_class_conditioned_diffusion_model_example" },
    ],
  },
  {
    title: "Unit 3: Stable Diffusion",
    lessons: [
      { title: "Unit 3 Overview", kind: "readme" as const, path: "unit3" },
      { title: "Stable Diffusion Introduction", kind: "notebook" as const, path: "unit3/01_stable_diffusion_introduction" },
    ],
  },
  {
    title: "Unit 4: Going Further with Diffusion Models",
    lessons: [
      { title: "Unit 4 Overview", kind: "readme" as const, path: "unit4" },
      { title: "DDIM Inversion", kind: "notebook" as const, path: "unit4/01_ddim_inversion" },
      { title: "Diffusion for Audio", kind: "notebook" as const, path: "unit4/02_diffusion_for_audio" },
    ],
  },
];

async function main() {
  console.log("🌱  Seeding Hugging Face Diffusion Models Class…\n");
  const course = await prisma.course.upsert({
    where: { slug: "hf-diffusion-models-class" },
    update: {},
    create: {
      slug: "hf-diffusion-models-class",
      title: "Hugging Face Diffusion Models Class",
      subtitle: "Build and fine-tune diffusion models, from first principles to Stable Diffusion",
      description: "From the theory behind diffusion models through building one from scratch, fine-tuning and guidance, class-conditioned generation, Stable Diffusion, DDIM inversion, and diffusion for audio.",
      price: 199.0,
      status: CourseStatus.draft,
      level: CourseLevel.intermediate,
      duration_hours: 8,
      pdu_value: 6,
      passing_score: 70,
      is_featured: false,
      is_listed: false,
      sort_order: 0,
      content: {
        subtitle: "Build and fine-tune diffusion models, from first principles to Stable Diffusion",
        description: "From the theory behind diffusion models through building one from scratch, fine-tuning and guidance, class-conditioned generation, Stable Diffusion, DDIM inversion, and diffusion for audio.",
        overview_headline: "What You'll Learn",
        overview_body: "The Hugging Face Diffusion Models Class covers how diffusion models work and how to build one from scratch, fine-tuning and guidance techniques, class-conditioned diffusion models, an introduction to Stable Diffusion, DDIM inversion, and applying diffusion to audio generation.",
        learning_outcomes: [
          "Understand how diffusion models work and build one from scratch",
          "Use the 🤗 Diffusers library",
          "Fine-tune diffusion models and apply guidance techniques",
          "Build a class-conditioned diffusion model",
          "Understand Stable Diffusion and DDIM inversion",
          "Apply diffusion models to audio generation",
        ],
        training_exam_prep_headline: "Official Hugging Face Curriculum",
        training_exam_prep_body: "Hugging Face's own official Diffusion Models Class, extending generative AI coverage into image and audio generation.",
        training_exam_prep_items: ["Official Hugging Face curriculum", "Apache 2.0 licensed", "Hands-on notebooks throughout"],
      },
    },
  });
  console.log(`✓ Course: ${course.title} (${course.slug})`);

  const existingModules = await prisma.module.count({ where: { course_id: course.id } });
  if (existingModules > 0) { console.log(`✓ Modules already exist (skipped)\n✅  Done.\n`); return; }

  let moduleSortOrder = 1, totalLessons = 0;
  for (const modDef of MODULES) {
    const mod = await prisma.module.create({
      data: { course_id: course.id, title: modDef.title, description: "", sort_order: moduleSortOrder++, is_published: true },
    });
    let lessonSortOrder = 1;
    for (const lessonDef of modDef.lessons) {
      await prisma.lesson.create({
        data: {
          module_id: mod.id, title: lessonDef.title, type: "reading", sort_order: lessonSortOrder++,
          duration_minutes: 30, is_published: true, is_free_preview: mod.sort_order === 1 && lessonSortOrder === 2,
        },
      });
      totalLessons++;
      console.log(`  ✓ ${modDef.title} / ${lessonDef.title}`);
    }
  }
  await prisma.course.update({ where: { id: course.id }, data: { total_lessons: totalLessons } });
  console.log(`\n✅  Seeded ${MODULES.length} modules, ${totalLessons} lessons.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
