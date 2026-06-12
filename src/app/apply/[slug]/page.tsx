import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCertificationBySlug } from "@/lib/certifications-data";
import ApplicationForm from "./ApplicationForm";
import type { User } from "@supabase/supabase-js";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cert = getCertificationBySlug(slug);
  if (!cert || cert.status !== "active") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("applications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .neq("status", "rejected")
      .maybeSingle();

    if (existing?.status === "approved") redirect("/lms");
    if (existing?.status === "pending_review") redirect("/dashboard");
  }

  const certJson = JSON.parse(JSON.stringify(cert));
  const userJson: User | null = user ? JSON.parse(JSON.stringify(user)) : null;

  return <ApplicationForm cert={certJson} user={userJson} />;
}
