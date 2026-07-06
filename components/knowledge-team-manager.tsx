"use client";

import { useActionState } from "react";
import {
  assignKnowledgeTeamMember,
  removeKnowledgeTeamMember,
  updateKnowledgeTeamMemberRole,
} from "@/app/actions/knowledge-team";
import {
  KNOWLEDGE_TEAM_ROLES,
  knowledgeRoleDescription,
  knowledgeRoleLabel,
  type KnowledgeTeamRole,
} from "@/lib/roles";
import type { KnowledgeTeamMemberWithProfile } from "@/lib/types";

type FormState = { error?: string; success?: string };

type KnowledgeTeamManagerProps = {
  members: KnowledgeTeamMemberWithProfile[];
  currentUserId: string;
};

export function KnowledgeTeamManager({ members, currentUserId }: KnowledgeTeamManagerProps) {
  const [assignState, assignAction, isAssigning] = useActionState(
    async (_prev: FormState, formData: FormData) => assignKnowledgeTeamMember(formData),
    {},
  );

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Invite team member</h2>
        <p className="mt-1 text-sm text-zinc-500">
          They must already have a partner account (signed up). Assign a role to let them help
          manage the knowledge base.
        </p>

        <form action={assignAction} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <input
            name="email"
            type="email"
            required
            placeholder="colleague@company.com"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <select
            name="role"
            defaultValue="editor"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {KNOWLEDGE_TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {knowledgeRoleLabel(role)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAssigning}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isAssigning ? "Assigning…" : "Assign role"}
          </button>
        </form>

        {assignState.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30">
            {assignState.error}
          </p>
        )}
        {assignState.success && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30">
            {assignState.success}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {KNOWLEDGE_TEAM_ROLES.map((role) => (
            <div
              key={role}
              className="rounded-xl border border-zinc-100 p-4 text-sm dark:border-zinc-800"
            >
              <p className="font-medium">{knowledgeRoleLabel(role)}</p>
              <p className="mt-1 text-zinc-500">{knowledgeRoleDescription(role)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Current team</h2>
          <p className="mt-1 text-sm text-zinc-500">{members.length} member(s)</p>
        </div>

        {members.length === 0 ? (
          <p className="p-8 text-sm text-zinc-500">No team members yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium">{member.email}</div>
        {member.company_name && (
          <div className="text-xs text-zinc-500">{member.company_name}</div>
        )}
        {isSelf && <div className="text-xs text-emerald-600">You</div>}
      </td>
      <td className="px-4 py-3">
        <RoleSelect memberId={member.user_id} currentRole={member.role} />
      </td>
      <td className="px-4 py-3 text-zinc-500">
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
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {KNOWLEDGE_TEAM_ROLES.map((role) => (
            <option key={role} value={role}>
              {knowledgeRoleLabel(role)}
            </option>
          ))}
        </select>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-emerald-600">{state.success}</p>}
    </div>
  );
}

function RemoveMemberButton({ userId }: { userId: string }) {
  const [state, action, isPending] = useActionState(async () => removeKnowledgeTeamMember(userId), {});

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={isPending}
          className="text-sm text-red-600 hover:underline disabled:opacity-60"
        >
          {isPending ? "Removing…" : "Remove"}
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
