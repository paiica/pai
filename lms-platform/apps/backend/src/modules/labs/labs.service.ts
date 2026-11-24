import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Sandbox } from "@e2b/code-interpreter";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { AiService } from "../ai/ai.service";
import { PrepCoursesService } from "../prep-courses/prep-courses.service";

// A sandbox is killed if idle this long (no cell executed)...
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
// ...or unconditionally once it's been alive this long, whichever comes first.
const HARD_CAP_MS = 60 * 60 * 1000;
const CELL_TIMEOUT_MS = 60 * 1000;

type LabCell = {
  type: "markdown" | "code" | "exercise";
  content: string;
  runnable?: boolean;
  skip_reason?: string;
  // Exercise-only fields — `content` doubles as the starter code students
  // see and edit; `test_code` is never sent to the frontend.
  prompt?: string;
  test_code?: string;
};

// Wraps a student's code + the professor's hidden test_code into one script,
// using a tiny `__check__(name, condition)` helper both the hand-authored
// and AI-generated test_code are taught to call. Works identically whether
// it ends up running in E2B or (mirrored in lab-runtime.ts) in Pyodide —
// same marker line, same JSON shape, so the frontend parses one way either
// runtime it came from.
const TEST_RESULTS_MARKER = "###LAB_TEST_RESULTS###";

function buildExerciseHarness(studentCode: string, testCode: string): string {
  return [
    "__test_results__ = []",
    "def __check__(name, condition):",
    "    __test_results__.append({\"name\": name, \"passed\": bool(condition)})",
    "",
    studentCode,
    "",
    testCode,
    "",
    "import json as __paii_json__",
    `print(${JSON.stringify(TEST_RESULTS_MARKER)})`,
    "print(__paii_json__.dumps(__test_results__))",
  ].join("\n");
}

type ExerciseTestResult = { name: string; passed: boolean };

function parseExerciseResults(stdout: string[]): ExerciseTestResult[] | null {
  const joined = stdout.join("\n");
  const idx = joined.indexOf(TEST_RESULTS_MARKER);
  if (idx === -1) return null;
  const after = joined.slice(idx + TEST_RESULTS_MARKER.length).trim();
  const jsonLine = after.split("\n")[0];
  try {
    const parsed = JSON.parse(jsonLine);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SiteSettingsService,
    private readonly aiService: AiService,
    private readonly prepCourses: PrepCoursesService,
  ) {}

  // Site settings (admin-editable, takes effect immediately) take priority
  // over the env var, same resolution order as AiService.getClientAndModel.
  private async getApiKey(): Promise<string> {
    const all = await this.settings.getAll();
    const apiKey = all.e2b_api_key || this.config.get<string>("e2b.apiKey") || "";
    if (!apiKey) {
      throw new BadRequestException(
        "In-browser labs aren't configured yet — add an E2B API key in Settings → API Integrations → Labs.",
      );
    }
    return apiKey;
  }

  // Empty string = let the SDK use its own built-in default template (has
  // the Jupyter/code-interpreter server preinstalled) — see configuration.ts.
  private async getTemplate(): Promise<string> {
    const all = await this.settings.getAll();
    return all.e2b_template || this.config.get<string>("e2b.template") || "";
  }

  async startSession(enrollmentId: string, lessonId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
    });
    if (!enrollment) throw new ForbiddenException("Enrollment not found");

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { course_id: true } } },
    });
    if (!lesson || lesson.module.course_id !== enrollment.course_id) {
      throw new NotFoundException("Lesson not found");
    }

    const rawCells = (lesson.lab_cells_json as unknown as LabCell[] | null) ?? null;
    if (!rawCells || !rawCells.length) {
      throw new BadRequestException("This lesson doesn't have an interactive lab yet");
    }
    // test_code is the exercise's answer key — never shipped to the browser,
    // regardless of lesson type or which endpoint served it. Exercises are
    // always graded via checkExercise() below, which reads test_code
    // straight from the DB, not from anything the client sent back.
    const cells = rawCells.map((c) => (c.type === "exercise" ? { ...c, test_code: undefined } : c));

    const apiKey = await this.getApiKey();

    // Enforce one concurrent sandbox per student — reuse it if it's for this
    // same lesson, otherwise tear down the old one first (abandoned tabs are
    // the main cost-abuse vector for pay-as-you-go sandbox compute).
    const existing = await this.prisma.labSession.findFirst({
      where: { user_id: userId, status: { in: ["starting", "running", "idle"] } },
    });

    if (existing && existing.lesson_id === lessonId && existing.external_sandbox_id) {
      try {
        const sandbox = await Sandbox.connect(existing.external_sandbox_id, { apiKey });
        await sandbox.setTimeout(IDLE_TIMEOUT_MS);
        await this.prisma.labSession.update({
          where: { id: existing.id },
          data: { status: "running", last_active_at: new Date() },
        });
        return { sessionId: existing.id, cells, resumed: true };
      } catch {
        // Sandbox died/expired on E2B's side since we last saw it — fall
        // through and start a fresh one below.
        await this.prisma.labSession.update({ where: { id: existing.id }, data: { status: "expired", ended_at: new Date() } });
      }
    } else if (existing) {
      await this.killExternal(existing.external_sandbox_id, apiKey);
      await this.prisma.labSession.update({ where: { id: existing.id }, data: { status: "terminated", ended_at: new Date() } });
    }

    const template = await this.getTemplate();
    const sandbox = template
      ? await Sandbox.create(template, { apiKey, timeoutMs: IDLE_TIMEOUT_MS })
      : await Sandbox.create({ apiKey, timeoutMs: IDLE_TIMEOUT_MS });
    const session = await this.prisma.labSession.create({
      data: {
        user_id: userId,
        lesson_id: lessonId,
        provider: "e2b",
        external_sandbox_id: sandbox.sandboxId,
        status: "running",
        expires_at: new Date(Date.now() + HARD_CAP_MS),
      },
    });

    return { sessionId: session.id, cells, resumed: false };
  }

  // The Playground's cloud sandbox is a paid add-on (course-lesson labs that
  // require E2B stay unrestricted — those are already covered by course
  // enrollment). The in-browser Pyodide option never calls the backend at
  // all, so it's naturally unaffected by this check.
  async getSandboxAccess(userId: string) {
    const access = await this.prisma.labSandboxAccess.findUnique({ where: { user_id: userId } });
    const hasAccess = !!access && access.status === "active" && access.expires_at > new Date();
    return {
      hasAccess,
      expiresAt: access?.expires_at ?? null,
      cancelAtPeriodEnd: access?.cancel_at_period_end ?? false,
    };
  }

  // A blank E2B sandbox with no lesson, no course, no exercises — just a
  // place for a student to try things. Same concurrency/cost-control rules
  // as a lesson lab (one active sandbox per student, same idle/hard-cap
  // lifecycle, same cleanup cron), just with lesson_id left null so it
  // doesn't get attributed to any course. Gated behind LabSandboxAccess
  // (see getSandboxAccess) — the in-browser Pyodide option never calls the
  // backend at all, so it's unaffected by this check.
  async startPlaygroundSession(userId: string) {
    const { hasAccess } = await this.getSandboxAccess(userId);
    if (!hasAccess) {
      throw new ForbiddenException("Cloud sandbox access required — unlock it from the Playground to run this.");
    }

    const apiKey = await this.getApiKey();

    const existing = await this.prisma.labSession.findFirst({
      where: { user_id: userId, status: { in: ["starting", "running", "idle"] } },
    });

    if (existing && existing.lesson_id === null && existing.external_sandbox_id) {
      try {
        const sandbox = await Sandbox.connect(existing.external_sandbox_id, { apiKey });
        await sandbox.setTimeout(IDLE_TIMEOUT_MS);
        await this.prisma.labSession.update({ where: { id: existing.id }, data: { status: "running", last_active_at: new Date() } });
        return { sessionId: existing.id, resumed: true };
      } catch {
        await this.prisma.labSession.update({ where: { id: existing.id }, data: { status: "expired", ended_at: new Date() } });
      }
    } else if (existing) {
      await this.killExternal(existing.external_sandbox_id, apiKey);
      await this.prisma.labSession.update({ where: { id: existing.id }, data: { status: "terminated", ended_at: new Date() } });
    }

    const template = await this.getTemplate();
    const sandbox = template
      ? await Sandbox.create(template, { apiKey, timeoutMs: IDLE_TIMEOUT_MS })
      : await Sandbox.create({ apiKey, timeoutMs: IDLE_TIMEOUT_MS });
    const session = await this.prisma.labSession.create({
      data: {
        user_id: userId,
        lesson_id: null,
        provider: "e2b",
        external_sandbox_id: sandbox.sandboxId,
        status: "running",
        expires_at: new Date(Date.now() + HARD_CAP_MS),
      },
    });

    return { sessionId: session.id, resumed: false };
  }

  async executeCell(sessionId: string, userId: string, code: string) {
    const session = await this.prisma.labSession.findFirst({ where: { id: sessionId, user_id: userId } });
    if (!session) throw new NotFoundException("Lab session not found");
    if (!["starting", "running", "idle"].includes(session.status) || !session.external_sandbox_id) {
      throw new BadRequestException("This lab session has ended — start a new one");
    }
    if (session.expires_at && session.expires_at < new Date()) {
      await this.prisma.labSession.update({ where: { id: session.id }, data: { status: "expired", ended_at: new Date() } });
      throw new BadRequestException("This lab session's maximum duration was reached — start a new one");
    }

    const apiKey = await this.getApiKey();
    let sandbox;
    try {
      sandbox = await Sandbox.connect(session.external_sandbox_id, { apiKey });
    } catch {
      await this.prisma.labSession.update({ where: { id: session.id }, data: { status: "expired", ended_at: new Date() } });
      throw new BadRequestException("This lab session's sandbox is no longer running — start a new one");
    }

    await sandbox.setTimeout(IDLE_TIMEOUT_MS);
    const execution = await sandbox.runCode(code, { timeoutMs: CELL_TIMEOUT_MS });
    await this.prisma.labSession.update({ where: { id: session.id }, data: { status: "running", last_active_at: new Date() } });

    return {
      stdout: execution.logs.stdout,
      stderr: execution.logs.stderr,
      error: execution.error ? { name: execution.error.name, value: execution.error.value, traceback: execution.error.traceback } : null,
      results: execution.results.map((r) => ({ text: r.text, html: r.html, png: r.png, jpeg: r.jpeg })),
    };
  }

  async stopSession(sessionId: string, userId: string) {
    const session = await this.prisma.labSession.findFirst({ where: { id: sessionId, user_id: userId } });
    if (!session) throw new NotFoundException("Lab session not found");

    if (session.external_sandbox_id) await this.killExternal(session.external_sandbox_id, await this.getApiKey());
    await this.prisma.labSession.update({ where: { id: session.id }, data: { status: "terminated", ended_at: new Date() } });
    return { stopped: true };
  }

  private async killExternal(sandboxId: string | null, apiKey: string) {
    if (!sandboxId) return;
    try {
      await Sandbox.kill(sandboxId, { apiKey });
    } catch (err) {
      this.logger.warn(`Failed to kill E2B sandbox ${sandboxId}: ${(err as Error).message}`);
    }
  }

  // Cost/abandonment safety net — catches tabs closed without calling
  // stopSession, and sessions that outlived HARD_CAP_MS.
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupStaleSessions() {
    const all = await this.settings.getAll();
    const apiKey = all.e2b_api_key || this.config.get<string>("e2b.apiKey") || "";
    if (!apiKey) return; // labs feature not configured — nothing to clean up

    const stale = await this.prisma.labSession.findMany({
      where: {
        status: { in: ["starting", "running", "idle"] },
        OR: [{ last_active_at: { lt: new Date(Date.now() - IDLE_TIMEOUT_MS) } }, { expires_at: { lt: new Date() } }],
      },
    });
    if (!stale.length) return;

    this.logger.log(`Cleaning up ${stale.length} stale lab session(s)`);
    for (const session of stale) {
      await this.killExternal(session.external_sandbox_id, apiKey);
      await this.prisma.labSession.update({ where: { id: session.id }, data: { status: "expired", ended_at: new Date() } });
    }
  }

  // ─── Persistence & exercises ───────────────────────────────────────────

  private async assertEnrollmentForLesson(enrollmentId: string, lessonId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, user_id: userId } });
    if (!enrollment) throw new ForbiddenException("Enrollment not found");
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { select: { course_id: true } } } });
    if (!lesson || lesson.module.course_id !== enrollment.course_id) throw new NotFoundException("Lesson not found");
    return { enrollment, lesson };
  }

  private countExerciseCells(cells: LabCell[] | null): number {
    return (cells ?? []).filter((c) => c.type === "exercise").length;
  }

  // Called on the lab page mounting, regardless of runtime — Pyodide labs
  // never hit the backend to start a sandbox at all, so this is the only
  // place either runtime learns "what did this student already do here".
  async getProgress(enrollmentId: string, lessonId: string, userId: string) {
    await this.assertEnrollmentForLesson(enrollmentId, lessonId, userId);
    const progress = await this.prisma.labProgress.findUnique({ where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } } });
    return {
      cell_code: (progress?.cell_code as Record<string, string>) ?? {},
      exercise_state: (progress?.exercise_state as Record<string, { passed: boolean; attempts: number }>) ?? {},
      completed: progress?.completed ?? false,
    };
  }

  // Autosave — fired on a debounce from the editor, or whenever a cell runs.
  // Never touches exercise_state or completion; that only ever changes via
  // checkExercise, which actually verifies the code rather than trusting
  // whatever the client last saved.
  async saveCode(enrollmentId: string, lessonId: string, userId: string, cellIndex: number, code: string) {
    await this.assertEnrollmentForLesson(enrollmentId, lessonId, userId);
    const existing = await this.prisma.labProgress.findUnique({ where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } } });
    const cellCode = { ...((existing?.cell_code as Record<string, string>) ?? {}), [cellIndex]: code };
    await this.prisma.labProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: { user_id: userId, lesson_id: lessonId, cell_code: cellCode },
      update: { cell_code: cellCode },
    });
    return { saved: true };
  }

  // The one place test_code is ever read or executed — always server-side,
  // in a short-lived sandbox scoped just to this check, independent of
  // whichever runtime (Pyodide or E2B) the lesson's plain code cells use.
  // Keeping this separate from the interactive session/idle-cleanup system
  // is deliberate: a "Check my work" click is a few seconds of compute, not
  // an interactive session worth tracking lifecycle state for.
  async checkExercise(enrollmentId: string, lessonId: string, userId: string, cellIndex: number, code: string) {
    const { lesson } = await this.assertEnrollmentForLesson(enrollmentId, lessonId, userId);
    const cells = (lesson.lab_cells_json as unknown as LabCell[] | null) ?? [];
    const cell = cells[cellIndex];
    if (!cell || cell.type !== "exercise" || !cell.test_code) {
      throw new BadRequestException("This isn't a gradable exercise cell");
    }

    const apiKey = await this.getApiKey();
    const template = await this.getTemplate();
    const harness = buildExerciseHarness(code, cell.test_code);

    let stdout: string[] = [];
    let stderr: string[] = [];
    let runtimeError: { name: string; value: string } | null = null;
    let sandbox: Sandbox | null = null;
    try {
      sandbox = template ? await Sandbox.create(template, { apiKey, timeoutMs: 30_000 }) : await Sandbox.create({ apiKey, timeoutMs: 30_000 });
      const execution = await sandbox.runCode(harness, { timeoutMs: CELL_TIMEOUT_MS });
      stdout = execution.logs.stdout;
      stderr = execution.logs.stderr;
      if (execution.error) runtimeError = { name: execution.error.name, value: execution.error.value };
    } finally {
      if (sandbox) await this.killExternal(sandbox.sandboxId, apiKey);
    }

    const parsed = parseExerciseResults(stdout);
    // Student code raised before __check__ calls ran, or printed something
    // that broke the marker parse — every test counts as failed, and the
    // raw error is surfaced so they can see why instead of a silent zero.
    const results: ExerciseTestResult[] = parsed ?? [{ name: "Your code ran without errors", passed: false }];
    const passed = results.length > 0 && results.every((r) => r.passed);

    const existing = await this.prisma.labProgress.findUnique({ where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } } });
    const cellCode = { ...((existing?.cell_code as Record<string, string>) ?? {}), [cellIndex]: code };
    const priorState = (existing?.exercise_state as Record<string, { passed: boolean; attempts: number }>) ?? {};
    const exerciseState = {
      ...priorState,
      [cellIndex]: { passed, attempts: (priorState[cellIndex]?.attempts ?? 0) + 1 },
    };

    const totalExercises = this.countExerciseCells(cells);
    const allPassed = totalExercises > 0 && Object.values(exerciseState).filter((s: any) => s.passed).length >= totalExercises;

    const progress = await this.prisma.labProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId, lesson_id: lessonId, cell_code: cellCode, exercise_state: exerciseState,
        completed: allPassed, completed_at: allPassed ? new Date() : null,
      },
      update: {
        cell_code: cellCode, exercise_state: exerciseState,
        ...(allPassed && !existing?.completed ? { completed: true, completed_at: new Date() } : {}),
      },
    });

    // Feeds the lesson into the same course-progress pipeline every other
    // lesson type uses (assignment submission, quiz pass, video watch) —
    // best-effort so a hiccup here can't undo the fact the student actually
    // passed the exercise, which is already durably saved above.
    if (allPassed && !existing?.completed) {
      try {
        await this.prepCourses.completeCourseLesson(enrollmentId, lessonId, userId, {});
      } catch (e: any) {
        this.logger.warn(`Exercise passed but failed to mark lesson ${lessonId} complete for user ${userId}: ${e.message}`);
      }
    }

    return {
      passed,
      results,
      stderr: runtimeError ? [`${runtimeError.name}: ${runtimeError.value}`] : stderr,
      labCompleted: progress.completed,
    };
  }

  // A nudge, not the answer — same "AI Professor" framing already used for
  // lesson tutoring elsewhere, pointed at whichever tests are still failing
  // instead of the lesson content.
  async getHint(enrollmentId: string, lessonId: string, userId: string, cellIndex: number, code: string) {
    const { lesson } = await this.assertEnrollmentForLesson(enrollmentId, lessonId, userId);
    const cells = (lesson.lab_cells_json as unknown as LabCell[] | null) ?? [];
    const cell = cells[cellIndex];
    if (!cell || cell.type !== "exercise") throw new BadRequestException("This isn't an exercise cell");

    const existing = await this.prisma.labProgress.findUnique({ where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } } });
    const state = (existing?.exercise_state as Record<string, { passed: boolean; attempts: number }>) ?? {};

    return this.aiService.getLabHint({
      lessonTitle: lesson.title,
      exercisePrompt: cell.prompt ?? "",
      studentCode: code,
      attempts: state[cellIndex]?.attempts ?? 0,
    });
  }

  // Every lab lesson (any lesson with non-empty lab_cells_json) across every
  // course the student is enrolled in, with their progress — the backing
  // query for the student portal's Labs hub.
  async getMyLabs(userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT l.id AS lesson_id, l.title, l.lab_cells_json,
             c.id AS course_id, c.title AS course_title, c.slug AS course_slug,
             ce.id AS enrollment_id,
             lp.completed, lp.exercise_state
      FROM lms.lessons l
      JOIN lms.modules m ON m.id = l.module_id
      JOIN lms.courses c ON c.id = m.course_id
      JOIN lms.course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
      LEFT JOIN lms.lab_progress lp ON lp.lesson_id = l.id AND lp.user_id = $1
      WHERE l.is_published = true AND l.lab_cells_json IS NOT NULL
      ORDER BY c.title ASC, l.title ASC
    `, userId);

    return rows
      .filter((r) => Array.isArray(r.lab_cells_json) && r.lab_cells_json.length > 0)
      .map((r) => {
        const cells = r.lab_cells_json as LabCell[];
        const totalExercises = this.countExerciseCells(cells);
        const state = (r.exercise_state as Record<string, { passed: boolean }>) ?? {};
        const passedExercises = Object.values(state).filter((s) => s.passed).length;
        return {
          lesson_id: r.lesson_id,
          lesson_title: r.title,
          course_id: r.course_id,
          course_title: r.course_title,
          course_slug: r.course_slug,
          enrollment_id: r.enrollment_id,
          has_exercises: totalExercises > 0,
          total_exercises: totalExercises,
          passed_exercises: Math.min(passedExercises, totalExercises),
          completed: r.completed ?? false,
        };
      });
  }
}
