import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function recordSession(session: Stripe.Checkout.Session, status: string) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!userId) return;

  const stripe = getStripe();
  let receiptUrl: string | null = null;

  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent.latest_charge"],
    });
    const intent = full.payment_intent;
    if (intent && typeof intent !== "string") {
      const charge = intent.latest_charge;
      if (charge && typeof charge !== "string") {
        receiptUrl = charge.receipt_url ?? null;
      }
    }
  } catch {
    // Receipt URL is best-effort.
  }

  const admin = createAdminClient();

  await admin.from("billing_transactions").upsert(
    {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "myr",
      status,
      payment_method: session.payment_method_types?.[0] ?? null,
      receipt_url: receiptUrl,
    },
    { onConflict: "stripe_session_id" },
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const stripe = getStripe();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await recordSession(session, session.payment_status === "paid" ? "paid" : "pending");
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await recordSession(event.data.object as Stripe.Checkout.Session, "paid");
      break;
    case "checkout.session.async_payment_failed":
      await recordSession(event.data.object as Stripe.Checkout.Session, "failed");
      break;
    default:
      break;
  }

  return Response.json({ received: true });
}
