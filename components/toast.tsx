"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/lib/i18n/client";
import { Spinner } from "@/components/spinner";

export type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  loading?: boolean;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
  /** Shows a persistent "working" toast. Returns a handle to update or close it. */
  loading: (message: string) => ToastHandle;
};

export type ToastHandle = {
  id: string;
  success: (message: string) => void;
  error: (message: string) => void;
  update: (message: string) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const upsert = useCallback(
    (id: string, message: string, variant: ToastVariant, loading = false) => {
      setToasts((prev) => {
        const next = prev.some((item) => item.id === id)
          ? prev.map((item) =>
              item.id === id ? { ...item, message, variant, loading } : item,
            )
          : [...prev.slice(-4), { id, message, variant, loading }];
        return next;
      });

      clearTimer(id);
      if (!loading) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
        );
      }
    },
    [clearTimer, dismiss],
  );

  const push = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = createId();
      upsert(id, message, variant);
      return id;
    },
    [upsert],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => {
    const success = (message: string) => {
      push(message, "success");
    };
    const error = (message: string) => {
      push(message, "error");
    };
    const info = (message: string) => {
      push(message, "info");
    };
    const loading = (message: string): ToastHandle => {
      const id = createId();
      upsert(id, message, "info", true);
      return {
        id,
        success: (next) => upsert(id, next, "success"),
        error: (next) => upsert(id, next, "error"),
        update: (next) => upsert(id, next, "info", true),
        dismiss: () => dismiss(id),
      };
    };

    return { toast: push, success, error, info, dismiss, loading };
  }, [push, upsert, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} label={t("toast.dismiss")} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-100",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200",
  info: "border-border bg-card text-foreground",
};

const iconStyles: Record<ToastVariant, string> = {
  success: "text-brand-600 dark:text-brand-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-[color:var(--muted)]",
};

function ToastIcon({ variant, loading }: { variant: ToastVariant; loading?: boolean }) {
  if (loading) {
    return <Spinner className="h-4 w-4" />;
  }

  if (variant === "success") {
    return (
      <svg
        className={`h-4 w-4 ${iconStyles.success}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.3 2.3 4.7-5" />
      </svg>
    );
  }

  if (variant === "error") {
    return (
      <svg
        className={`h-4 w-4 ${iconStyles.error}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <path d="M12 16.4h.01" />
      </svg>
    );
  }

  return (
    <svg
      className={`h-4 w-4 ${iconStyles.info}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" />
    </svg>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
  label,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  label: string;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-2 p-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-sm"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.variant === "error" ? "alert" : "status"}
          className={`toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${variantStyles[item.variant]}`}
        >
          <span className="mt-0.5 shrink-0">
            <ToastIcon variant={item.variant} loading={item.loading} />
          </span>
          <p className="min-w-0 flex-1 break-words leading-relaxed">{item.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label={label}
            className="-mr-1 shrink-0 rounded-md p-1 text-[color:var(--muted)] transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
