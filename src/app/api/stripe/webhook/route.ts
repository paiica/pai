import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { generateCertificateId, calculateExpiryDate } from "@/lib/utils";
import { getCertificationBySlug } from "@/lib/certifications-data";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, certificationId, certificationTitle } = session.metadata || {};

    if (!userId || !certificationId) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Create enrollment
    await supabase.from("enrollments").insert({
      user_id: userId,
      certification_id: certificationId,
      status: "enrolled",
      progress_percentage: 0,
      enrolled_at: new Date().toISOString(),
      payment_id: session.payment_intent as string,
    });

    // Record payment
    await supabase.from("payments").insert({
      user_id: userId,
      certification_id: certificationId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      status: "succeeded",
    });
  }

  if (event.type === "payment_intent.succeeded") {
    // Additional payment tracking if needed
  }

  return NextResponse.json({ received: true });
}
