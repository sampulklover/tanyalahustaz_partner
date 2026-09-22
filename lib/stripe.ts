import Stripe from "stripe";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!client) {
    client = new Stripe(key);
  }

  return client;
}

export function getStripePaymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const raw = process.env.STRIPE_PAYMENT_METHODS?.trim();

  if (!raw) {
    return ["card"];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
}
