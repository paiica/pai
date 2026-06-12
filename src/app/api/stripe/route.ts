import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { getCertificationBySlug } from "@/lib/certifications-data";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { certificationSlug } = await request.json();
    const cert = getCertificationBySlug(certificationSlug);

    if (!cert || cert.status !== "active" || !cert.stripe_price_id) {
      return NextResponse.json({ error: "Invalid certification" }, { status: 400 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL!;

    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email!,
      certificationId: cert.id,
      certificationTitle: cert.title,
      priceId: cert.stripe_price_id,
      successUrl: `${origin}/dashboard?success=enrolled&cert=${cert.slug}`,
      cancelUrl: `${origin}/certifications/${cert.slug}?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
