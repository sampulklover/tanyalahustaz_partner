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
