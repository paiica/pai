import { ExamsService } from "./exams.service";

// Prisma's generated enum object doesn't resolve reliably under ts-jest's
// isolatedModules transpilation — these mirror its known string values,
// which is what the enum is backed by at runtime regardless.
const ExamAttemptStatus = { in_progress: "in_progress", passed: "passed", failed: "failed" } as const;

describe("ExamsService — server-side exam integrity", () => {
  function buildService(attemptOverrides: Partial<any> = {}) {
    const now = Date.now();
    const attempt = {
      id: "attempt-1",
      user_id: "user-1",
      enrollment_id: "enrollment-1",
      status: ExamAttemptStatus.in_progress,
      started_at: new Date(now - 10 * 60 * 1000), // started 10 minutes ago
      time_limit_seconds: 5 * 60, // 5-minute exam — already expired
      passing_score: 70,
      answers: { questions: [{ id: "q1" }] },
      ...attemptOverrides,
    };

    const updateMock = jest.fn().mockResolvedValue(attempt);
    // submitExam does its state transition via updateMany (status: in_progress
    // guarded in the WHERE clause, so a concurrent duplicate submit gets
    // count: 0 instead of re-grading) — mock it as succeeding once, matching
    // the single-caller scenarios these tests exercise.
    const updateManyMock = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      examAttempt: {
        findFirst: jest.fn().mockResolvedValue(attempt),
        update: updateMock,
        updateMany: updateManyMock,
      },
      examBank: {
        findMany: jest.fn().mockResolvedValue([{ id: "q1", correct_index: 0 }]),
      },
    } as any;

    const certificates = { issue: jest.fn().mockResolvedValue({}) } as any;
    const mail = {} as any;
    const prepCourses = {} as any;

    const service = new ExamsService(prisma, mail, certificates, prepCourses);
    return { service, prisma, certificates, updateMock, updateManyMock, attempt };
  }

  it("fails a submission that arrives after the time limit even with a perfect score", async () => {
    const { service, updateManyMock, certificates } = buildService();

    const result = await service.submitExam("user-1", "attempt-1", { q1: 0 });

    expect(result.passed).toBe(false);
    expect(result.timed_out).toBe(true);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passed: false, status: ExamAttemptStatus.failed }) }),
    );
    // A failed/timed-out attempt must never trigger certificate issuance.
    expect(certificates.issue).not.toHaveBeenCalled();
  });

  it("rejects a duplicate concurrent submit instead of re-grading or re-issuing a certificate", async () => {
    const { service, updateManyMock, certificates } = buildService({
      started_at: new Date(Date.now() - 60 * 1000),
    });
    // Simulate losing the race: another request already flipped this attempt
    // out of in_progress, so the WHERE-guarded updateMany matches zero rows.
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(service.submitExam("user-1", "attempt-1", { q1: 0 })).rejects.toThrow(
      "This exam attempt was already submitted",
    );
    expect(certificates.issue).not.toHaveBeenCalled();
  });

  it("passes and issues a certificate when submitted within the time limit with a passing score", async () => {
    const { service, certificates } = buildService({
      started_at: new Date(Date.now() - 60 * 1000), // 1 minute ago, well inside the limit
    });

    const result = await service.submitExam("user-1", "attempt-1", { q1: 0 });

    expect(result.passed).toBe(true);
    expect(result.timed_out).toBe(false);
    expect(certificates.issue).toHaveBeenCalledWith("enrollment-1", 100);
  });
});
