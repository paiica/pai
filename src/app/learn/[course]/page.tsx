import { redirect } from "next/navigation";

export default async function CourseRedirect({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  redirect(`/lms/${course}`);
}
