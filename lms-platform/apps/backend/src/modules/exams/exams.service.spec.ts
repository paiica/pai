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
    const prisma = {
      examAttempt: {
        findFirst: jest.fn().mockResolvedValue(attempt),
        update: updateMock,
      },
      examBank: {
        findMany: jest.fn().mockResolvedValue([{ id: "q1", correct_index: 0 }]),
      },
    } as any;

    const certificates = { issue: jest.fn().mockResolvedValue({}) } as any;
    const mail = {} as any;

    const service = new ExamsService(prisma, mail, certificates);
    return { service, prisma, certificates, updateMock, attempt };
  }

  it("fails a submission that arrives after the time limit even with a perfect score", async () => {
    const { service, updateMock, certificates } = buildService();

    const result = await service.submitExam("user-1", "attempt-1", { q1: 0 });

    expect(result.passed).toBe(false);
    expect(result.timed_out).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passed: false, status: ExamAttemptStatus.failed }) }),
    );
    // A failed/timed-out attempt must never trigger certificate issuance.
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
