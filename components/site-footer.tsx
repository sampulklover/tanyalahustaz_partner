import Link from "next/link";
import { LogoMark } from "@/components/brand";

const footerNav = [
  {
    heading: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#use-cases", label: "Use cases" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/docs/endpoints", label: "API reference" },
      { href: "/dashboard/playground", label: "Playground" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/signup", label: "Get API access" },
      { href: "/login", label: "Sign in" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <span className="font-semibold tracking-tight">TanyaLah Ustaz</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              The Islamic AI API for developers. Add trustworthy, knowledge-backed
              guidance to your product — grounded in curated scholarship, with source
              citations on every answer.
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[color:var(--muted)] transition hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} TanyaLah Ustaz. All rights reserved.</p>
          <p className="text-xs">
            Answers are AI-generated for guidance and may require review by a qualified scholar.
          </p>
        </div>
      </div>
    </footer>
  );
}
