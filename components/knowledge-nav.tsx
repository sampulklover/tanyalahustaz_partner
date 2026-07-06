import Link from "next/link";
import type { KnowledgePermissions } from "@/lib/roles";

type KnowledgeNavProps = {
  knowledge: KnowledgePermissions;
  active: "articles" | "team";
};

export function KnowledgeNav({ knowledge, active }: KnowledgeNavProps) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      <Link
        href="/dashboard/knowledge"
        className={`rounded-lg px-4 py-2 text-sm font-medium ${
          active === "articles"
            ? "bg-emerald-600 text-white"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        Articles
      </Link>
      {knowledge.canManageTeam && (
        <Link
          href="/dashboard/knowledge/team"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            active === "team"
              ? "bg-emerald-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          Team & roles
        </Link>
      )}
      {knowledge.role && (
        <span className="ml-auto self-center text-xs text-zinc-500">
          Your role: <span className="font-medium capitalize">{knowledge.role}</span>
        </span>
      )}
    </nav>
  );
}
