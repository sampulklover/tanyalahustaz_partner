import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DocsNav } from "@/components/docs-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-6 py-12">
        <aside className="hidden w-52 shrink-0 md:block">
          <DocsNav />
        </aside>
        <main className="prose prose-zinc min-w-0 max-w-none flex-1 dark:prose-invert prose-headings:tracking-tight prose-pre:border prose-pre:border-border prose-pre:bg-background-subtle prose-code:before:content-none prose-code:after:content-none">
          {children}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
