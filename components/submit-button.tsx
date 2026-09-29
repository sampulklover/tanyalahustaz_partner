"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/spinner";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  /** Shown while the parent form is submitting. Defaults to the children. */
  pendingLabel?: ReactNode;
  /** Hide the spinner (e.g. when the label already conveys progress). */
  showSpinner?: boolean;
};

/**
 * A submit button that disables itself and shows a spinner while its parent
 * <form> is running a server action. Must be rendered inside the <form>.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = "",
  disabled,
  showSpinner = true,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      data-pending={pending ? "true" : undefined}
      className={className}
    >
      {pending && showSpinner && <Spinner className="h-4 w-4" />}
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}
