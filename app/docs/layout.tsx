import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const sections = [
  { href: "/docs", label: "Overview", exact: true },
  { href: "/docs/authentication", label: "Authentication" },
  { href: "/docs/endpoints", label: "Endpoints" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex max-w-6xl flex-1 gap-10 px-6 py-10">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-10 space-y-1 text-sm">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="block rounded-lg px-3 py-2 text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 prose prose-zinc dark:prose-invert max-w-none">
          {children}
        </main>
      </div>
    </>
  );
}
