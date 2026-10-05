import * as Sentry from "@sentry/nextjs";

type LogContext = Record<string, unknown>;

export function captureError(error: unknown, context?: LogContext) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext("details", context);
      Sentry.captureException(error);
    });
    return;
  }

  Sentry.captureException(error);
}

export function captureMessage(message: string, context?: LogContext) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext("details", context);
      Sentry.captureMessage(message);
    });
    return;
  }

  Sentry.captureMessage(message);
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  console.error(message, error, context);
  if (error) {
    captureError(error, { message, ...context });
  } else {
    captureMessage(message, context);
  }
}

export function logWarning(message: string, context?: LogContext) {
  console.warn(message, context);
  captureMessage(message, { level: "warning", ...context });
}

/**
 * Wall-clock timer for chat requests. Records how long each stage took so the
 * slowest part of a response is visible in the server logs. Enable with
 * CHAT_TIMING=true (off by default to keep production logs quiet).
 */
export function createTimer(label: string) {
  const enabled = process.env.CHAT_TIMING === "true";
  const started = Date.now();
  const marks: Record<string, number> = {};

  return {
    mark(stage: string) {
      marks[stage] = Date.now() - started;
    },
    done(context?: LogContext) {
      if (!enabled) return;
      const total = Date.now() - started;
      console.log(`[chat-timing] ${label} total=${total}ms`, marks, context ?? {});
    },
  };
}
