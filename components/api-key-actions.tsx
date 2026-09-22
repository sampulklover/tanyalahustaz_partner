"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { revokeApiKey } from "@/app/actions/api-keys";
import { useI18n } from "@/lib/i18n/client";

export function ApiKeyActions({ keyId, revoked }: { keyId: string; revoked: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("apiKeys.manager.actions")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: position.top, right: position.right }}
          className="z-50 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          <Link
            href={`/dashboard/usage?key=${keyId}`}
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-background-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="5" y1="20" x2="5" y2="12" />
              <line x1="12" y1="20" x2="12" y2="6" />
              <line x1="19" y1="20" x2="19" y2="14" />
            </svg>
            {t("apiKeys.manager.actionUsage")}
          </Link>

          {!revoked && (
            <form action={revokeApiKey} onSubmit={close}>
              <input type="hidden" name="key_id" value={keyId} />
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                {t("apiKeys.manager.revoke")}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
