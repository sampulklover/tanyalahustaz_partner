import { redirect } from "next/navigation";

/**
 * Knowledge content is managed from Sources (Google Cloud is the source of
 * truth), so the old articles index redirects there.
 */
export default function KnowledgeIndexPage() {
  redirect("/dashboard/knowledge/sources");
}
