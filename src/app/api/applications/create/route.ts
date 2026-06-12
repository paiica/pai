import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createApplicationCheckoutSession } from "@/lib/stripe";
import { getCertificationBySlug } from "@/lib/certifications-data";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { certificationSlug, formData } = await request.json();

    const cert = getCertificationBySlug(certificationSlug);
    if (!cert || cert.status !== "active") {
      return NextResponse.json({ error: "Invalid certification" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Determine user (logged in or new signup)
    const serverClient = await createServerClient();
    const { data: { user: sessionUser } } = await serverClient.auth.getUser();

    let userId: string;
    let userEmail: string;
    let userName: string;

    if (sessionUser) {
      userId = sessionUser.id;
      userEmail = sessionUser.email!;
      userName = (sessionUser.user_metadata?.full_name as string) || formData.full_name || "";
    } else {
      // Create account
      const { data, error } = await admin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: { full_name: formData.full_name },
      });

      if (error) {
        const msg = error.message.toLowerCase().includes("already")
          ? "An account with this email already exists. Please sign in first."
          : error.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      userId = data.user.id;
      userEmail = data.user.email!;
      userName = formData.full_name || "";
    }

    // Check for existing active application
    const { data: existing } = await admin
      .from("applications")
      .select("id, status")
      .eq("user_id", userId)
      .eq("certification_id", cert.id)
      .neq("status", "rejected")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active application for this certification." },
        { status: 400 }
      );
    }

    // Also check existing enrollment
    const { data: enrolled } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("certification_id", cert.id)
      .maybeSingle();

    if (enrolled) {
      return NextResponse.json(
        { error: "You are already enrolled in this certification." },
        { status: 400 }
      );
    }

    // Create application record
    const { data: app, error: appErr } = await admin
      .from("applications")
      .insert({
        user_id: userId,
        certification_id: cert.id,
        full_name: userName,
        email: userEmail,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        country: formData.country || null,
        career_status: formData.career_status || "professional",
        job_title: formData.job_title || null,
        company: formData.company || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        linkedin_url: formData.linkedin_url || null,
        university: formData.university || null,
        degree: formData.degree || null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        other_background: formData.other_background || null,
        motivation: formData.motivation || null,
        how_heard: formData.how_heard || null,
        status: "pending_payment",
        amount_paid: cert.price * 100,
        currency: "usd",
      })
      .select("id")
      .single();

    if (appErr || !app) {
      console.error("Application insert error:", appErr);
      return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
    }

    // Create Stripe checkout session
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL!;

    const session = await createApplicationCheckoutSession({
      applicationId: app.id,
      userId,
      userEmail,
      certificationTitle: cert.title,
      priceId: cert.stripe_price_id,
      amount: cert.price,
      successUrl: `${origin}/apply/success`,
      cancelUrl: `${origin}/certifications/${certificationSlug}?cancelled=true`,
    });

    // Store Stripe session ID
    await admin
      .from("applications")
      .update({ stripe_session_id: session.id })
      .eq("id", app.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Application create error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
