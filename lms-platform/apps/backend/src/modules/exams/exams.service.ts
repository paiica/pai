import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ExamAttemptStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { CertificatesService } from "../certificates/certificates.service";

// Buffer added on top of the stored time limit to absorb network/render latency
// around the moment a client submits — NOT extra thinking time. The deadline is
// derived from `started_at` (server-set, immutable), so it cannot be extended by
// tampering with the client-side countdown.
const EXAM_GRACE_SECONDS = 60;

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private certificates: CertificatesService,
  ) {}

  async startExam(userId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
      include: { certification: true },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");
    if (enrollment.progress_percentage < 100) {
      throw new BadRequestException("You must complete all lessons before taking the exam");
    }

    const existingAttempts = await this.prisma.examAttempt.count({
      where: { enrollment_id: enrollmentId },
    });

    const inProgress = await this.prisma.examAttempt.findFirst({
      where: { enrollment_id: enrollmentId, status: ExamAttemptStatus.in_progress },
    });
    if (inProgress) {
      const limitSeconds = inProgress.time_limit_seconds;
      const deadlineMs = limitSeconds != null
        ? inProgress.started_at.getTime() + limitSeconds * 1000 + EXAM_GRACE_SECONDS * 1000
        : Infinity;
      if (Date.now() <= deadlineMs) return inProgress;
      // Time ran out and it was never submitted — close it out so the student can start a fresh attempt.
      await this.prisma.examAttempt.update({
        where: { id: inProgress.id },
        data: { status: ExamAttemptStatus.abandoned, submitted_at: new Date() },
      });
    }

    const maxAttempts = enrollment.certification.max_retakes_included + 1;
    if (existingAttempts >= maxAttempts) {
      throw new BadRequestException("Maximum exam attempts reached. Purchase additional retakes.");
    }

    // Sample questions from exam bank
    const bankQuestions = await this.prisma.examBank.findMany({
      where: { certification_id: enrollment.certification_id, is_active: true },
      take: enrollment.certification.exam_questions_count,
      orderBy: { created_at: "asc" },
    });

    if (bankQuestions.length < enrollment.certification.exam_questions_count) {
      throw new BadRequestException("Exam bank not ready. Contact support.");
    }

    const questions = this.shuffleArray(bankQuestions).map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      topic_tag: q.topic_tag,
    }));

    return this.prisma.examAttempt.create({
      data: {
        user_id: userId,
        enrollment_id: enrollmentId,
        attempt_number: existingAttempts + 1,
        status: ExamAttemptStatus.in_progress,
        total_questions: questions.length,
        passing_score: enrollment.certification.passing_score,
        time_limit_seconds: enrollment.certification.exam_duration_minutes * 60,
        answers: { questions },
      },
    });
  }

  async submitExam(userId: string, attemptId: string, answers: Record<string, number>) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, user_id: userId, status: ExamAttemptStatus.in_progress },
    });
    if (!attempt) throw new NotFoundException("Active exam attempt not found");

    const attemptData = attempt.answers as any;
    const questions = attemptData.questions as any[];

    // Server-side deadline, derived from the immutable started_at + time_limit_seconds
    // stored at attempt creation — the client's own countdown is never trusted.
    const elapsedSeconds = Math.floor((Date.now() - attempt.started_at.getTime()) / 1000);
    const limitSeconds = attempt.time_limit_seconds;
    const timedOut = limitSeconds != null && elapsedSeconds > limitSeconds + EXAM_GRACE_SECONDS;
    const timeUsedSeconds = limitSeconds != null ? Math.min(elapsedSeconds, limitSeconds) : elapsedSeconds;

    // Grade
    const bankQuestions = await this.prisma.examBank.findMany({
      where: { id: { in: questions.map((q: any) => q.id) } },
    });

    const questionMap = new Map(bankQuestions.map(q => [q.id, q]));
    let correct = 0;

    for (const q of questions) {
      const bank = questionMap.get(q.id);
      if (bank && answers[q.id] === bank.correct_index) {
        correct++;
      }
    }

    const scorePercentage = Math.round((correct / questions.length) * 100);
    // A submission that arrives after the time limit (+ grace) always fails, regardless
    // of score, so a manipulated client-side timer can never buy extra attempt time.
    const passed = !timedOut && scorePercentage >= attempt.passing_score;

    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: passed ? ExamAttemptStatus.passed : ExamAttemptStatus.failed,
        correct_answers: correct,
        score_percentage: scorePercentage,
        passed,
        submitted_at: new Date(),
        time_used_seconds: timeUsedSeconds,
        answers: { questions, submitted_answers: answers, timed_out: timedOut },
      },
    });

    if (passed) {
      await this.certificates.issue(attempt.enrollment_id, scorePercentage).catch(() => {
        // Already issued (e.g. duplicate submit race) — safe to ignore, the certificate exists.
      });
    }

    // Send exam result email (fire-and-forget)
    this.sendExamResultEmail(userId, attempt.enrollment_id, scorePercentage, passed).catch(() => {});

    return { passed, score: scorePercentage, correct_answers: correct, total_questions: questions.length, timed_out: timedOut };
  }

  private async sendExamResultEmail(userId: string, enrollmentId: string, score: number, passed: boolean) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { email: true, profile: { select: { first_name: true } } } },
        certification: { select: { title: true, max_retakes_included: true } },
      },
    });
    if (!enrollment) return;
    const { user, certification } = enrollment;
    const firstName = user.profile?.first_name ?? "there";
    if (passed) {
      await this.mail.sendExamPassed({ to: user.email, firstName, certTitle: certification.title, score });
    } else {
      const totalAttempts = await this.prisma.examAttempt.count({ where: { enrollment_id: enrollmentId } });
      const maxAttempts = certification.max_retakes_included + 1;
      const attemptsLeft = Math.max(0, maxAttempts - totalAttempts);
      await this.mail.sendExamFailed({ to: user.email, firstName, certTitle: certification.title, score, attemptsLeft });
    }
  }

  async getMyAttempts(userId: string, enrollmentId: string) {
    return this.prisma.examAttempt.findMany({
      where: { user_id: userId, enrollment_id: enrollmentId },
      orderBy: { attempt_number: "asc" },
    });
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, user_id: userId },
      include: { enrollment: { include: { certification: { select: { title: true, acronym: true, passing_score: true } } } } },
    });
    if (!attempt) throw new NotFoundException("Exam attempt not found");
    return attempt;
  }

  // ── Admin: Exam Versions (Exam Bank) ──────────────────────────────────────

  async adminListExams(certificationId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT e.*, COUNT(b.id)::int AS question_count
       FROM lms.exams e
       LEFT JOIN lms.exam_bank b ON b.exam_id = e.id
       WHERE e.certification_id = $1
       GROUP BY e.id
       ORDER BY e.created_at ASC`,
      certificationId,
    );
    return rows;
  }

  async adminGetExam(examId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.exams WHERE id = $1`, examId,
    );
    if (!rows.length) throw new NotFoundException("Exam not found");
    return rows[0];
  }

  async adminCreateExam(certificationId: string, dto: { title: string; version?: string; description?: string }) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO lms.exams (certification_id, title, version, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      certificationId, dto.title, dto.version ?? null, dto.description ?? null,
    );
    return rows[0];
  }

  async adminUpdateExam(examId: string, dto: { title?: string; version?: string; description?: string; is_active?: boolean }) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE lms.exams SET
         title = COALESCE($2, title),
         version = COALESCE($3, version),
         description = COALESCE($4, description),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      examId, dto.title ?? null, dto.version ?? null, dto.description ?? null, dto.is_active ?? null,
    );
    if (!rows.length) throw new NotFoundException("Exam not found");
    return rows[0];
  }

  async adminDeleteExam(examId: string) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.exams WHERE id = $1`, examId);
    return { deleted: true };
  }

  // ── Admin: Exam Bank CRUD ──────────────────────────────────────────────────

  async adminListExamBank(certificationId: string, examId?: string) {
    if (examId) {
      return this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM lms.exam_bank WHERE certification_id = $1 AND exam_id = $2::uuid ORDER BY topic_tag ASC NULLS LAST, created_at ASC`,
        certificationId, examId,
      );
    }
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.exam_bank WHERE certification_id = $1 ORDER BY topic_tag ASC NULLS LAST, created_at ASC`,
      certificationId,
    );
  }

  private normalizeDifficulty(d: unknown): number {
    if (d === "easy"   || d === 1) return 1;
    if (d === "hard"   || d === 3) return 3;
    if (typeof d === "number") return d;
    return 2; // default: medium
  }

  async adminCreateExamBankQuestion(dto: {
    certification_id: string;
    exam_id?: string;
    question_text: string;
    options: string[];
    correct_index: number;
    explanation?: string;
    topic_tag?: string;
    difficulty?: number | string;
  }) {
    const id = uuidv4();
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO lms.exam_bank (id, certification_id, exam_id, question_text, options, correct_index, explanation, topic_tag, difficulty, updated_at)
       VALUES ($1, $2, $3::uuid, $4, $5::jsonb, $6, $7, $8, $9, NOW()) RETURNING *`,
      id,
      dto.certification_id,
      dto.exam_id ?? null,
      dto.question_text,
      JSON.stringify(dto.options),
      Number(dto.correct_index),
      dto.explanation ?? null,
      dto.topic_tag ?? null,
      this.normalizeDifficulty(dto.difficulty),
    );
    return rows[0];
  }

  async adminUpdateExamBankQuestion(id: string, dto: Partial<{
    question_text: string; options: string[]; correct_index: number;
    explanation: string; topic_tag: string; difficulty: number | string; is_active: boolean;
  }>) {
    const q = await this.prisma.examBank.findUnique({ where: { id } });
    if (!q) throw new NotFoundException("Question not found");
    const data: any = { ...dto };
    if (dto.difficulty !== undefined) data.difficulty = this.normalizeDifficulty(dto.difficulty);
    if (dto.correct_index !== undefined) data.correct_index = Number(dto.correct_index);
    return this.prisma.examBank.update({ where: { id }, data });
  }

  async adminDeleteExamBankQuestion(id: string) {
    const q = await this.prisma.examBank.findUnique({ where: { id } });
    if (!q) throw new NotFoundException("Question not found");
    return this.prisma.examBank.delete({ where: { id } });
  }

  async adminGetAttemptDetail(attemptId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
        enrollment: { include: { certification: { select: { title: true, acronym: true, passing_score: true } } } },
      },
    });
    if (!attempt) throw new NotFoundException("Attempt not found");

    const attemptData = attempt.answers as any;
    const questions = (attemptData?.questions ?? []) as any[];
    const submittedAnswers = (attemptData?.submitted_answers ?? {}) as Record<string, number>;

    if (!questions.length) return { ...attempt, sections: [] };

    const bankQuestions = await this.prisma.examBank.findMany({
      where: { id: { in: questions.map((q: any) => q.id) } },
    });
    const bankMap = new Map(bankQuestions.map((q) => [q.id, q]));

    const enriched = questions.map((q: any) => {
      const bank = bankMap.get(q.id);
      const studentAnswer = submittedAnswers[q.id] ?? null;
      const correctIndex = bank?.correct_index ?? null;
      const isCorrect = studentAnswer !== null && studentAnswer === correctIndex;
      return {
        id: q.id,
        question_text: q.question_text,
        options: q.options as string[],
        topic_tag: q.topic_tag ?? "General",
        student_answer: studentAnswer,
        correct_index: correctIndex,
        is_correct: isCorrect,
        explanation: bank?.explanation ?? null,
      };
    });

    const sectionMap = new Map<string, typeof enriched>();
    for (const q of enriched) {
      if (!sectionMap.has(q.topic_tag)) sectionMap.set(q.topic_tag, []);
      sectionMap.get(q.topic_tag)!.push(q);
    }

    const sections = Array.from(sectionMap.entries()).map(([tag, qs]) => {
      const correct = qs.filter((q) => q.is_correct).length;
      const total = qs.length;
      const sectionScore = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { tag, questions: qs, total, correct, score: sectionScore, passed: sectionScore >= 70 };
    });

    return { ...attempt, sections };
  }

  async adminOverrideScore(attemptId: string, dto: { score_percentage: number; passed: boolean }) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException("Attempt not found");
    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        score_percentage: dto.score_percentage,
        passed: dto.passed,
        status: dto.passed ? ExamAttemptStatus.passed : ExamAttemptStatus.failed,
      },
    });

    // An override to "passed" must still result in a certificate — same
    // contract as a normal passing submission in submitExam().
    if (dto.passed) {
      await this.certificates.issue(attempt.enrollment_id, dto.score_percentage).catch(() => {
        // Already issued — safe to ignore.
      });
    }

    return updated;
  }

  async adminGetAllAttempts() {
    return this.prisma.examAttempt.findMany({
      include: {
        user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
        enrollment: {
          include: { certification: { select: { title: true } } },
        },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });
  }

  async adminGetProctorEvents(attemptId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.proctor_events WHERE attempt_id = $1 ORDER BY created_at ASC`,
      attemptId,
    );
  }

  async adminGetSnapshots(attemptId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.proctor_snapshots WHERE attempt_id = $1 ORDER BY created_at ASC`,
      attemptId,
    );
  }

  // ── Student: Proctor logging ───────────────────────────────────────────────

  async logProctorEvent(userId: string, attemptId: string, dto: { event_type: string; severity?: string; detail?: any }) {
    const attempt = await this.prisma.examAttempt.findFirst({ where: { id: attemptId, user_id: userId } });
    if (!attempt) throw new NotFoundException("Exam attempt not found");
    await this.prisma.$queryRawUnsafe(
      `INSERT INTO lms.proctor_events (attempt_id, event_type, severity, detail) VALUES ($1, $2, $3, $4::jsonb)`,
      attemptId, dto.event_type, dto.severity ?? "warning", JSON.stringify(dto.detail ?? {}),
    );
    return { recorded: true };
  }

  async logSnapshot(userId: string, attemptId: string, snapshotUrl: string, faceDetected: boolean | null) {
    const attempt = await this.prisma.examAttempt.findFirst({ where: { id: attemptId, user_id: userId } });
    if (!attempt) throw new NotFoundException("Exam attempt not found");
    await this.prisma.$queryRawUnsafe(
      `INSERT INTO lms.proctor_snapshots (attempt_id, snapshot_url, face_detected) VALUES ($1, $2, $3)`,
      attemptId, snapshotUrl, faceDetected,
    );
    return { recorded: true };
  }

  // ── Admin: Structured Exams ───────────────────────────────────────────────

  async adminListStructuredExams(certificationId: string) {
    return this.prisma.structuredExam.findMany({
      where: { certification_id: certificationId },
      include: {
        sections: {
          select: { id: true, _count: { select: { questions: true } } },
        },
      },
      orderBy: { created_at: "asc" },
    });
  }

  async adminGetStructuredExam(examId: string) {
    const exam = await this.prisma.structuredExam.findUnique({
      where: { id: examId },
      include: {
        sections: {
          orderBy: { sort_order: "asc" },
          include: {
            instruction_pages: { orderBy: { sort_order: "asc" } },
            questions: {
              orderBy: { sort_order: "asc" },
              include: {
                options: { orderBy: { sort_order: "asc" } },
                images: { orderBy: { sort_order: "asc" } },
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException("Structured exam not found");
    return exam;
  }

  async adminCreateStructuredExam(adminId: string, dto: {
    certification_id: string;
    title: string;
    description?: string;
    version?: string;
    passing_score?: number;
  }) {
    return this.prisma.structuredExam.create({
      data: {
        certification_id: dto.certification_id,
        title: dto.title,
        description: dto.description,
        version: dto.version,
        passing_score: dto.passing_score ?? 70,
        created_by: adminId,
      },
    });
  }

  async adminUpdateStructuredExam(examId: string, dto: {
    title?: string;
    description?: string;
    version?: string;
    passing_score?: number;
    status?: "draft" | "published" | "archived";
  }) {
    return this.prisma.structuredExam.update({ where: { id: examId }, data: dto });
  }

  async adminDeleteStructuredExam(examId: string) {
    await this.prisma.structuredExam.delete({ where: { id: examId } });
    return { deleted: true };
  }

  // ── Admin: Sections ───────────────────────────────────────────────────────

  async adminCreateSection(examId: string, dto: {
    title: string;
    description?: string;
    time_limit_minutes?: number;
    instructions?: string;
    sort_order?: number;
  }) {
    const maxOrder = await this.prisma.examSection.aggregate({
      where: { exam_id: examId },
      _max: { sort_order: true },
    });
    return this.prisma.examSection.create({
      data: {
        exam_id: examId,
        title: dto.title,
        description: dto.description,
        time_limit_minutes: dto.time_limit_minutes,
        instructions: dto.instructions,
        sort_order: dto.sort_order ?? (maxOrder._max.sort_order ?? -1) + 1,
      },
    });
  }

  async adminUpdateSection(sectionId: string, dto: {
    title?: string;
    description?: string;
    time_limit_minutes?: number | null;
    instructions?: string;
    sort_order?: number;
    is_required?: boolean;
    passing_score?: number;
  }) {
    return this.prisma.examSection.update({ where: { id: sectionId }, data: dto });
  }

  async adminDeleteSection(sectionId: string) {
    await this.prisma.examSection.delete({ where: { id: sectionId } });
    return { deleted: true };
  }

  // ── Admin: Instruction Pages ──────────────────────────────────────────────

  async adminCreateInstructionPage(sectionId: string, dto: { title?: string; content: string; sort_order?: number }) {
    const maxOrder = await this.prisma.sectionInstructionPage.aggregate({
      where: { section_id: sectionId },
      _max: { sort_order: true },
    });
    return this.prisma.sectionInstructionPage.create({
      data: {
        section_id: sectionId,
        title: dto.title,
        content: dto.content,
        sort_order: dto.sort_order ?? (maxOrder._max.sort_order ?? -1) + 1,
      },
    });
  }

  async adminUpdateInstructionPage(pageId: string, dto: { title?: string; content?: string; sort_order?: number }) {
    return this.prisma.sectionInstructionPage.update({ where: { id: pageId }, data: dto });
  }

  async adminDeleteInstructionPage(pageId: string) {
    await this.prisma.sectionInstructionPage.delete({ where: { id: pageId } });
    return { deleted: true };
  }

  // ── Admin: Questions ──────────────────────────────────────────────────────

  private normalizeQuestionType(raw: string): string {
    const t = (raw ?? "").toLowerCase().trim().replace(/-/g, "_");
    const aliases: Record<string, string> = {
      // mcq_single
      multiple_choice: "mcq_single", single_choice: "mcq_single",
      single_answer: "mcq_single", mcq: "mcq_single", radio: "mcq_single",
      // mcq_multiple
      multiple_answer: "mcq_multiple", multiple_answers: "mcq_multiple",
      multi_choice: "mcq_multiple", checkbox: "mcq_multiple",
      // true_false
      boolean: "true_false", yes_no: "true_false", tf: "true_false",
      // open_short
      short_answer: "open_short", short: "open_short",
      brief_answer: "open_short", open: "open_short",
      // open_long
      long_answer: "open_long", long: "open_long", extended_answer: "open_long",
      // fill_blank
      fill_in_blank: "fill_blank", fill_in_the_blank: "fill_blank",
      fill_blanks: "fill_blank", cloze: "fill_blank", blank: "fill_blank",
      // matching
      match: "matching", match_pairs: "matching", pair_matching: "matching",
      // ordering
      order: "ordering", sequence: "ordering", arrangement: "ordering",
      sequencing: "ordering",
      // dropdown
      select: "dropdown", drop_down: "dropdown", select_one: "dropdown",
      // code / html
      code_question: "code", programming: "code",
      html_question: "html", interactive: "html",
    };
    const valid = new Set([
      "mcq_single","mcq_multiple","true_false","open_short","open_long",
      "essay","fill_blank","matching","ordering","dropdown","code","html",
    ]);
    return valid.has(aliases[t] ?? t) ? (aliases[t] ?? t) : "mcq_single";
  }

  async adminCreateQuestion(sectionId: string, dto: {
    type: string;
    question_text: string;
    explanation?: string;
    points?: number;
    sort_order?: number;
    metadata?: any;
    options?: Array<{ text: string; is_correct: boolean; sort_order?: number; match_text?: string }>;
  }) {
    const maxOrder = await this.prisma.examQuestion.aggregate({
      where: { section_id: sectionId },
      _max: { sort_order: true },
    });
    return this.prisma.examQuestion.create({
      data: {
        section_id: sectionId,
        type: this.normalizeQuestionType(dto.type) as any,
        question_text: dto.question_text,
        explanation: dto.explanation,
        points: dto.points ?? 1,
        sort_order: dto.sort_order ?? (maxOrder._max.sort_order ?? -1) + 1,
        metadata: dto.metadata,
        options: dto.options
          ? { create: dto.options.map((o, i) => ({ ...o, sort_order: o.sort_order ?? i })) }
          : undefined,
      },
      include: { options: { orderBy: { sort_order: "asc" } } },
    });
  }

  async adminUpdateQuestion(questionId: string, dto: {
    type?: string;
    question_text?: string;
    explanation?: string | null;
    points?: number;
    sort_order?: number;
    is_required?: boolean;
    metadata?: any;
  }) {
    const data: any = { ...dto };
    if (data.type) data.type = this.normalizeQuestionType(data.type);
    return this.prisma.examQuestion.update({
      where: { id: questionId },
      data,
      include: { options: { orderBy: { sort_order: "asc" } } },
    });
  }

  async adminDeleteQuestion(questionId: string) {
    await this.prisma.examQuestion.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  async adminReplaceOptions(questionId: string, options: Array<{
    text: string;
    is_correct: boolean;
    sort_order?: number;
    match_text?: string;
  }>) {
    await this.prisma.questionOption.deleteMany({ where: { question_id: questionId } });
    await this.prisma.questionOption.createMany({
      data: options.map((o, i) => ({
        question_id: questionId,
        text: o.text,
        is_correct: o.is_correct,
        sort_order: o.sort_order ?? i,
        match_text: o.match_text,
      })),
    });
    return this.prisma.questionOption.findMany({
      where: { question_id: questionId },
      orderBy: { sort_order: "asc" },
    });
  }

  // ── Admin: Question Images ────────────────────────────────────────────────

  async adminAddQuestionImage(questionId: string, dto: { url: string; alt_text?: string }) {
    const maxOrder = await this.prisma.questionImage.aggregate({
      where: { question_id: questionId },
      _max: { sort_order: true },
    });
    return this.prisma.questionImage.create({
      data: {
        question_id: questionId,
        url: dto.url,
        alt_text: dto.alt_text ?? null,
        sort_order: (maxOrder._max.sort_order ?? -1) + 1,
      },
    });
  }

  async adminDeleteQuestionImage(imageId: string) {
    await this.prisma.questionImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
