"use client";

import { useActionState } from "react";
import {
  assignKnowledgeTeamMember,
  removeKnowledgeTeamMember,
  updateKnowledgeTeamMemberRole,
} from "@/app/actions/knowledge-team";
import { KNOWLEDGE_TEAM_ROLES, type KnowledgeTeamRole } from "@/lib/roles";
import {
  translateKnowledgeRole,
  translateKnowledgeRoleDescription,
} from "@/lib/i18n/labels";
import type { KnowledgeTeamMemberWithProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";

type FormState = { error?: string; success?: string };

type KnowledgeTeamManagerProps = {
  members: KnowledgeTeamMemberWithProfile[];
  currentUserId: string;
};

const inputClass =
  "rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function KnowledgeTeamManager({ members, currentUserId }: KnowledgeTeamManagerProps) {
  const { t } = useI18n();
  const [assignState, assignAction, isAssigning] = useActionState(
    async (_prev: FormState, formData: FormData) => assignKnowledgeTeamMember(formData),
    {},
  );

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("knowledge.teamManager.inviteTitle")}</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {t("knowledge.teamManager.inviteDescription")}
        </p>

        <form action={assignAction} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <input
            name="email"
            type="email"
            required
            placeholder={t("knowledge.teamManager.emailPlaceholder")}
            className={inputClass}
          />
          <select name="role" defaultValue="editor" className={inputClass}>
            {KNOWLEDGE_TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {translateKnowledgeRole(t, role)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAssigning}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isAssigning ? t("knowledge.teamManager.assigning") : t("knowledge.teamManager.assignRole")}
          </button>
        </form>

        {assignState.error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {assignState.error}
          </p>
        )}
        {assignState.success && (
          <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-900/20 dark:text-brand-200">
            {assignState.success}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {KNOWLEDGE_TEAM_ROLES.map((role) => (
            <div
              key={role}
              className="rounded-xl border border-border bg-background-subtle p-4 text-sm"
            >
              <p className="font-medium">{translateKnowledgeRole(t, role)}</p>
              <p className="mt-1 text-[color:var(--muted)]">
                {translateKnowledgeRoleDescription(t, role)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{t("knowledge.teamManager.currentTeamTitle")}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("knowledge.teamManager.memberCount", { count: members.length })}
          </p>
        </div>

        {members.length === 0 ? (
          <p className="p-8 text-sm text-[color:var(--muted)]">{t("knowledge.teamManager.noMembers")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background-subtle text-xs uppercase tracking-wide text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("knowledge.teamManager.member")}</th>
                <th className="px-4 py-3 font-medium">{t("common.role")}</th>
                <th className="px-4 py-3 font-medium">{t("knowledge.teamManager.added")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => (
                <TeamMemberRow
                  key={member.user_id}
                  member={member}
                  isSelf={member.user_id === currentUserId}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function TeamMemberRow({
  member,
  isSelf,
}: {
  member: KnowledgeTeamMemberWithProfile;
  isSelf: boolean;
}) {
  const { t } = useI18n();

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium">{member.email}</div>
        {member.company_name && (
          <div className="text-xs text-[color:var(--muted)]">{member.company_name}</div>
        )}
        {isSelf && <div className="text-xs text-brand-600 dark:text-brand-500">{t("common.you")}</div>}
      </td>
      <td className="px-4 py-3">
        <RoleSelect memberId={member.user_id} currentRole={member.role} />
      </td>
      <td className="px-4 py-3 text-[color:var(--muted)]">
        {new Date(member.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && <RemoveMemberButton userId={member.user_id} />}
      </td>
    </tr>
  );
}

function RoleSelect({
  memberId,
  currentRole,
}: {
  memberId: string;
  currentRole: KnowledgeTeamRole;
}) {
  const { t } = useI18n();
  const [state, action, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const role = String(formData.get("role") ?? "") as KnowledgeTeamRole;
      return updateKnowledgeTeamMemberRole(memberId, role);
    },
    {},
  );

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <select
          name="role"
          defaultValue={currentRole}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          disabled={isPending}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-500"
        >
          {KNOWLEDGE_TEAM_ROLES.map((role) => (
            <option key={role} value={role}>
              {translateKnowledgeRole(t, role)}
            </option>
          ))}
        </select>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-brand-600 dark:text-brand-500">{state.success}</p>}
    </div>
  );
}

function RemoveMemberButton({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [state, action, isPending] = useActionState(async () => removeKnowledgeTeamMember(userId), {});

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={isPending}
          className="text-sm text-red-600 hover:underline disabled:opacity-60"
        >
          {isPending ? t("knowledge.teamManager.removing") : t("knowledge.teamManager.remove")}
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
