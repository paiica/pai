import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripeClient = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = getAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { application_id, user_id, userId, certificationId } = session.metadata || {};

    if (application_id) {
      // New flow: application-based enrollment
      await admin
        .from("applications")
        .update({
          status: "pending_review",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", application_id);

      // Record payment
      if (user_id) {
        await admin.from("payments").upsert({
          user_id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "usd",
          status: "succeeded",
          application_id,
        }, { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true });
      }
    } else if (userId && certificationId) {
      // Legacy direct-enrollment flow (kept for backwards compatibility)
      await admin.from("enrollments").upsert({
        user_id: userId,
        certification_id: certificationId,
        status: "enrolled",
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
        payment_id: session.payment_intent as string,
      }, { onConflict: "user_id,certification_id", ignoreDuplicates: true });

      await admin.from("payments").upsert({
        user_id: userId,
        certification_id: certificationId,
        stripe_payment_intent_id: session.payment_intent as string,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || "usd",
        status: "succeeded",
      }, { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true });
    }
  }

  return NextResponse.json({ received: true });
}
