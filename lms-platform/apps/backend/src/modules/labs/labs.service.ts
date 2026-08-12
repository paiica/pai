import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Sandbox } from "@e2b/code-interpreter";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";

// A sandbox is killed if idle this long (no cell executed)...
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
// ...or unconditionally once it's been alive this long, whichever comes first.
const HARD_CAP_MS = 60 * 60 * 1000;
const CELL_TIMEOUT_MS = 60 * 1000;

type LabCell = { type: "markdown" | "code"; content: string; runnable?: boolean; skip_reason?: string };

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: SiteSettingsService,
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

    const cells = (lesson.lab_cells_json as unknown as LabCell[] | null) ?? null;
    if (!cells || !cells.length) {
      throw new BadRequestException("This lesson doesn't have an interactive lab yet");
    }

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
}
