"use client";

import { useActionState, type ReactNode } from "react";
import { useToast } from "@/components/toast";

export type ActionResult = { error?: string; success?: string } | void;

/**
 * A <form> wired to a server action that shows a toast when it finishes.
 * Use <SubmitButton> inside for the automatic pending spinner.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  errorMessage,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const { success, error } = useToast();

  const [, formAction] = useActionState<ActionResult, FormData>(
    async (_previous, formData) => {
      const result = await action(formData);

      if (result && result.error) {
        error(errorMessage ?? result.error);
      } else if (result && result.success) {
        success(result.success);
      } else if (successMessage) {
        success(successMessage);
      }

      return result ?? {};
    },
    undefined,
  );

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
