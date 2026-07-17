/**
 * Brand & product boundaries
 *
 * Production layout (industry standard):
 *   B2C  → tanyalahustaz.com          (consumer app)
 *   B2B  → developers.tanyalahustaz.com (this app — developer portal + API)
 *
 * Same pattern as Stripe (stripe.com / dashboard.stripe.com),
 * Twilio (twilio.com / console.twilio.com), Discord (discord.com / discord.com/developers).
 */

/** Consumer app (B2C) — individuals ask Islamic questions. */
export const CONSUMER_APP_URL =
  process.env.NEXT_PUBLIC_CONSUMER_APP_URL ?? "https://tanyalahustaz.com/home";

export const CONSUMER_APP_NAME = "Tanyalah Ustaz";

/** Developer portal (B2B): API keys, docs, dashboard. */
export const DEVELOPER_PORTAL_NAME = "Tanyalah Ustaz Developers";

/** Short label shown in logo subtitle and nav. */
export const DEVELOPER_PORTAL_SHORT = "Developers";

export const DASHBOARD_NAME = "Dashboard";

/** Standard auth CTAs — context comes from being on the developer portal. */
export const SIGN_IN_LABEL = "Sign in";
export const GET_STARTED_LABEL = "Get started";

/** @deprecated Use DEVELOPER_PORTAL_NAME */
export const PARTNER_API_NAME = DEVELOPER_PORTAL_NAME;
