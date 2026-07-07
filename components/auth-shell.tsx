import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand";

const highlights = [
  "One endpoint to integrate — no AI setup",
  "Grounded answers with cited sources",
  "Free API key, live playground, and docs",
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-20" />
        <div className="relative">
          <Logo href="/" />
        </div>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
            Trustworthy Islamic AI, grounded in real scholarship.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-brand-50">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-100">
          &ldquo;We integrated in an afternoon and shipped a grounded assistant our
          community actually trusts.&rdquo;
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <LogoMark className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
