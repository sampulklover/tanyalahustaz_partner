"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

export type ToastableState = { error?: string; success?: string } | undefined | null;

/**
 * Fires a toast whenever a useActionState result changes. Render once per
 * state value; it renders nothing itself.
 */
export function ActionToast({
  state,
  successMessage,
  errorMessage,
  showSuccess = true,
  showError = true,
}: {
  state: ToastableState;
  successMessage?: string;
  errorMessage?: string;
  showSuccess?: boolean;
  showError?: boolean;
}) {
  const { success, error } = useToast();
  const seen = useRef<ToastableState>(undefined);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;

    if (!state) return;

    if (state.error && showError) {
      error(errorMessage ?? state.error);
    } else if (state.success && showSuccess) {
      success(successMessage ?? state.success);
    }
  }, [state, success, error, successMessage, errorMessage, showSuccess, showError]);

  return null;
}
