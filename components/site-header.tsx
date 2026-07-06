import Link from "next/link";
import { signOut } from "@/app/actions/auth";

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm text-white">
            TL
          </span>
          <span>TanyaLah Ustaz Partner API</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function DashboardHeader({
  email,
  knowledgeAccess = false,
}: {
  email: string;
  knowledgeAccess?: boolean;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Partner Dashboard
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {knowledgeAccess && (
            <Link
              href="/dashboard/knowledge"
              className="font-medium text-emerald-600 hover:text-emerald-700"
            >
              Knowledge
            </Link>
          )}
          <Link href="/dashboard/playground" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400">
            Playground
          </Link>
          <Link href="/dashboard/chat" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400">
            Chat logs
          </Link>
          <Link href="/dashboard/api-keys" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400">
            API Keys
          </Link>
          <span className="hidden text-zinc-500 sm:inline">{email}</span>
          <Link href="/docs" className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400">
            Docs
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
