import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/brand";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo subtitle />

        <nav className="hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[color:var(--muted)] transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[color:var(--muted)] transition hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Get API access
          </Link>
        </div>

        {/* Mobile menu — no-JS disclosure */}
        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-foreground [&::-webkit-details-marker]:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link
              href="/login"
              className="block rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-background-subtle hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mt-1 block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Get API access
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

const dashboardLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/playground", label: "Playground" },
  { href: "/dashboard/chat", label: "Chat logs" },
  { href: "/dashboard/api-keys", label: "API keys" },
];

export function DashboardHeader({
  email,
  knowledgeAccess = false,
}: {
  email: string;
  knowledgeAccess?: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-5 text-sm lg:flex">
            {dashboardLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[color:var(--muted)] transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            {knowledgeAccess && (
              <Link
                href="/dashboard/knowledge"
                className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-500"
              >
                Knowledge
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/docs"
            className="hidden text-[color:var(--muted)] transition hover:text-foreground sm:inline"
          >
            Docs
          </Link>
          <span className="hidden max-w-[16ch] truncate text-[color:var(--muted)] md:inline">
            {email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-background-subtle"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Secondary nav for small screens */}
      <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-6 pb-3 text-sm lg:hidden">
        {dashboardLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap text-[color:var(--muted)] transition hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        {knowledgeAccess && (
          <Link
            href="/dashboard/knowledge"
            className="whitespace-nowrap font-medium text-brand-600"
          >
            Knowledge
          </Link>
        )}
      </div>
    </header>
  );
}
