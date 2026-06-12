import { redirect } from "next/navigation";

export default async function LessonRedirect({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson } = await params;
  redirect(`/lms/${course}/${lesson}`);
}
