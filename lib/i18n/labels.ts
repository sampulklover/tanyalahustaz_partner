import type { KnowledgeTeamRole } from "@/lib/roles";
import type { ServiceStatusLevel } from "@/lib/status-page";
import type { Translator } from "@/lib/i18n/translator";

export function translateKnowledgeRole(t: Translator, role: KnowledgeTeamRole): string {
  return t(`roles.${role}.label`);
}

export function translateKnowledgeRoleDescription(
  t: Translator,
  role: KnowledgeTeamRole,
): string {
  return t(`roles.${role}.description`);
}

export function translateStatusLevel(t: Translator, level: ServiceStatusLevel): string {
  return t(`status.levels.${level}`);
}

export function translateChatLogOrigin(t: Translator, origin: string): string {
  if (origin === "Live test") return t("chatLogs.origin.liveTest");
  if (origin === "API") return t("chatLogs.origin.api");
  return origin;
}
