import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
const enabled = Boolean(dsn);

Sentry.init({
  dsn,
  enabled,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  sendDefaultPii: false,
});
