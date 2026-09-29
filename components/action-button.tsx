"use client";

import { useTransition, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/spinner";
import type { ActionResult } from "@/components/action-form";

/**
 * A button that runs a server action and shows a pending spinner plus a toast
 * with the result. Use for actions triggered outside a <form> (e.g. "reset").
 */
export function ActionButton({
  action,
  children,
  pendingLabel,
  className = "",
  successMessage,
  errorMessage,
  showSpinner = true,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
  successMessage?: string;
  errorMessage?: string;
  showSpinner?: boolean;
}) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const result = await action();

        if (result && result.error) {
          error(errorMessage ?? result.error);
        } else if (result && result.success) {
          success(result.success);
        } else if (successMessage) {
          success(successMessage);
        }
      } catch (actionError) {
        error(
          errorMessage ??
            (actionError instanceof Error ? actionError.message : undefined) ??
            "",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      aria-busy={isPending}
      className={className}
    >
      {isPending && showSpinner && <Spinner className="h-4 w-4" />}
      {isPending ? pendingLabel ?? children : children}
    </button>
  );
}
