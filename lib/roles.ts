export const KNOWLEDGE_TEAM_ROLES = ["admin", "editor", "viewer"] as const;

export type KnowledgeTeamRole = (typeof KNOWLEDGE_TEAM_ROLES)[number];

export type KnowledgePermissions = {
  role: KnowledgeTeamRole | null;
  canViewKnowledge: boolean;
  canEditKnowledge: boolean;
  canManageTeam: boolean;
};

export function permissionsForRole(role: KnowledgeTeamRole | null): KnowledgePermissions {
  return {
    role,
    canViewKnowledge: role !== null,
    canEditKnowledge: role === "admin" || role === "editor",
    canManageTeam: role === "admin",
  };
}

export function knowledgeRoleLabel(role: KnowledgeTeamRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
  }
}

export function knowledgeRoleDescription(role: KnowledgeTeamRole): string {
  switch (role) {
    case "admin":
      return "Manage team roles and full knowledge access";
    case "editor":
      return "Create, edit, publish, and delete articles";
    case "viewer":
      return "View drafts and published articles (read-only)";
  }
}

export function parseKnowledgeTeamRole(value: string): KnowledgeTeamRole | null {
  if (KNOWLEDGE_TEAM_ROLES.includes(value as KnowledgeTeamRole)) {
    return value as KnowledgeTeamRole;
  }
  return null;
}
