import Link from "next/link";
import { LogoMark } from "@/components/brand";
import {
  CONSUMER_APP_NAME,
  CONSUMER_APP_URL,
  DEVELOPER_PORTAL_SHORT,
  GET_STARTED_LABEL,
  SIGN_IN_LABEL,
} from "@/lib/brand";

type FooterLink = { href: string; label: string; external?: boolean };

const footerNav: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Developers",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/endpoints", label: "API reference" },
      { href: "/status", label: "System status" },
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Dashboard",
    links: [
      { href: "/signup", label: GET_STARTED_LABEL },
      { href: "/login", label: SIGN_IN_LABEL },
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/playground", label: "Playground" },
    ],
  },
  {
    heading: CONSUMER_APP_NAME,
    links: [
      { href: CONSUMER_APP_URL, label: "Consumer app", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background-subtle">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <span className="flex flex-col leading-none">
                <span className="font-semibold tracking-tight">TanyaLah Ustaz</span>
                <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-500">
                  {DEVELOPER_PORTAL_SHORT}
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              Developer platform and API for embedding knowledge-backed Islamic AI in
              your product. Powered by the same content as{" "}
              <a
                href={CONSUMER_APP_URL}
                className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                {CONSUMER_APP_NAME}
              </a>
              .
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground">{col.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-[color:var(--muted)] transition hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[color:var(--muted)] transition hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-[color:var(--muted)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} TanyaLah Ustaz. All rights reserved.</p>
          <p className="text-xs">
            AI-generated answers are for guidance only. Consult a qualified scholar for personal rulings.
          </p>
        </div>
      </div>
    </footer>
  );
}
