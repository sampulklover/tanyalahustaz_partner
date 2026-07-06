import { redirect } from "next/navigation";
import { requireKnowledgeEditor } from "@/lib/dashboard";

export default async function NewKnowledgeArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const editor = await requireKnowledgeEditor();
  if (!editor) {
    redirect("/dashboard/knowledge");
  }

  return children;
}
