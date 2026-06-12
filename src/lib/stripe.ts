import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia", typescript: true });
}

export async function createApplicationCheckoutSession({
  applicationId,
  userId,
  userEmail,
  certificationTitle,
  priceId,
  amount,
  successUrl,
  cancelUrl,
}: {
  applicationId: string;
  userId: string;
  userEmail: string;
  certificationTitle: string;
  priceId: string | null;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount * 100,
            product_data: { name: certificationTitle },
          },
        },
      ];

  return getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: lineItems,
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      application_id: applicationId,
      user_id: userId,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}

export async function createCheckoutSession({
  userId,
  userEmail,
  certificationId,
  certificationTitle,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  certificationId: string;
  certificationTitle: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      certificationId,
      certificationTitle,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });

  return session;
}
