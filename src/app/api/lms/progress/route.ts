import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CERTIFICATIONS } from "@/lib/certifications-data";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, certificationId, enrollmentId } = await request.json();
  if (!lessonId || !certificationId || !enrollmentId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = await createAdminClient();

  // Upsert lesson progress
  await admin.from("lesson_progress").upsert({
    user_id: user.id,
    lesson_id: lessonId,
    enrollment_id: enrollmentId,
    completed: true,
    completed_at: new Date().toISOString(),
  }, { onConflict: "user_id,lesson_id" });

  // Recalculate overall progress
  const cert = CERTIFICATIONS.find(c => c.id === certificationId);
  if (cert) {
    const allLessonIds = cert.curriculum.flatMap(m => m.lessons.map(l => l.id));
    const { data: completed } = await admin
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", user.id)
      .eq("enrollment_id", enrollmentId)
      .eq("completed", true);

    const completedIds = new Set((completed || []).map((r: any) => r.lesson_id));
    const pct = Math.round((completedIds.size / allLessonIds.length) * 100);

    const isComplete = pct === 100;
    await admin.from("enrollments").update({
      progress_percentage: pct,
      status: isComplete ? "completed" : "in_progress",
      completed_at: isComplete ? new Date().toISOString() : null,
    }).eq("id", enrollmentId);
  }

  return NextResponse.json({ success: true });
}
