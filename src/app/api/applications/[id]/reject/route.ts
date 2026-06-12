import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { sendEmail, rejectionEmailHtml } from "@/lib/resend";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { reason } = await request.json().catch(() => ({ reason: "" }));

  // Auth check
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();

  // Admin role check
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get application
  const { data: app } = await admin
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (app.status !== "pending_review") {
    return NextResponse.json({ error: "Application is not pending review" }, { status: 400 });
  }

  // Update status
  await admin
    .from("applications")
    .update({
      status: "rejected",
      rejection_reason: reason || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Issue Stripe refund
  if (app.stripe_payment_intent_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-02-24.acacia",
      });
      await stripe.refunds.create({ payment_intent: app.stripe_payment_intent_id });
    } catch (err) {
      console.error("Stripe refund error:", err);
      // Don't block the rejection — log and continue
    }
  }

  // Send rejection email
  const cert = CERTIFICATIONS.find(c => c.id === app.certification_id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://professionalaiinstitute.com";

  await sendEmail({
    to: app.email,
    subject: `Your ${cert?.acronym || "PAI"} Application Status Update`,
    html: rejectionEmailHtml({
      name: app.full_name,
      certTitle: cert?.title || "PAI Certification",
      certAcronym: cert?.acronym || "PAI",
      reason: reason || undefined,
      appUrl,
    }),
  });

  return NextResponse.json({ success: true });
}
