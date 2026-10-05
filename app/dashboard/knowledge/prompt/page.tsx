import Link from "next/link";
import {
  resetSystemPrompt,
  updateModulePrompt,
  updateSystemPrompt,
} from "@/app/actions/knowledge-prompt";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { PromptTextarea } from "@/components/prompt-textarea";
import { ModuleEditor } from "@/components/module-editor";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  composeSystemPrompt,
  DEFAULT_SYSTEM_PROMPT,
  KNOWLEDGE_PLACEHOLDER,
  PROMPT_MAX_CHARS,
} from "@/lib/ai-prompt";
import { PROMPT_MODULES, PROMPT_MODULE_IDS } from "@/lib/prompts/modules";
import {
  getModulePromptSettings,
  getSystemPromptSettings,
  getModulePrompts,
} from "@/lib/ai-settings";
import { getDashboardContext } from "@/lib/dashboard";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("pages.knowledge.prompt.title") };
}

const SAMPLE_CONTEXT =
  "[Source 1: Combining prayers while traveling (fiqh)]\nTravelers may combine Dhuhr with Asr, and Maghrib with Isha…";

export default async function KnowledgePromptPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const t = await getTranslations();
  const params = await searchParams;
  const context = await getDashboardContext();
  const knowledge = context!.knowledge;
  const settings = await getSystemPromptSettings();
  const moduleSettings = await getModulePromptSettings();
  const modulePrompts = await getModulePrompts();
  const canEdit = knowledge.canEditKnowledge;

  const usingTemplate = params.template === "default";
  const editorValue = usingTemplate ? DEFAULT_SYSTEM_PROMPT : settings.customPrompt;
  const preview = composeSystemPrompt(
    editorValue || settings.customPrompt || DEFAULT_SYSTEM_PROMPT,
    SAMPLE_CONTEXT,
    ["fiqh"],
    modulePrompts,
  );

  const moduleRows = PROMPT_MODULE_IDS.map((id) => ({
    id,
    label: PROMPT_MODULES[id].label,
    value: moduleSettings.customPrompts[id] ?? "",
    defaultText: PROMPT_MODULES[id].text,
    isCustom: Boolean(moduleSettings.customPrompts[id]),
  }));

  return (
    <DashboardShell>
      <KnowledgeNav knowledge={knowledge} active="prompt" />

      <PageHeader
        title={t("pages.knowledge.prompt.title")}
        description={t("pages.knowledge.prompt.description")}
        actions={
          <Link
            href="/dashboard/playground"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-background-subtle"
          >
            {t("pages.knowledge.prompt.testLink")}
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-sm sm:grid-cols-3">
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.prompt.statusLabel")}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <span
              className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                settings.isCustom ? "bg-brand-500" : "bg-emerald-500"
              }`}
            />
            {settings.isCustom
              ? t("knowledge.prompt.statusCustom")
              : t("knowledge.prompt.statusDefault")}
          </p>
        </div>
        <div className="bg-card px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.prompt.updatedLabel")}
          </p>
          <p className="mt-2 text-sm">
            {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="col-span-2 bg-card px-5 py-4 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">
            {t("knowledge.prompt.placeholderLabel")}
          </p>
          <p className="mt-2 font-mono text-sm">{KNOWLEDGE_PLACEHOLDER}</p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("knowledge.prompt.editorTitle")}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              {t("knowledge.prompt.editorHint")}
            </p>
          </div>
          {settings.isCustom && !usingTemplate && (
            <ActionButton
              action={resetSystemPrompt}
              pendingLabel={t("common.saving")}
              successMessage={t("knowledge.prompt.resetDone")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium transition hover:bg-background-subtle active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("knowledge.prompt.reset")}
            </ActionButton>
          )}
        </div>

        <ActionForm
          action={updateSystemPrompt}
          className="space-y-4 p-5"
          successMessage={t("knowledge.prompt.saved")}
        >
          <PromptTextarea
            name="systemPrompt"
            defaultValue={editorValue}
            maxLength={PROMPT_MAX_CHARS}
            rows={16}
            disabled={!canEdit}
            placeholder={DEFAULT_SYSTEM_PROMPT}
            counterLabel={t("knowledge.prompt.charCounter")}
          />
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && (
              <SubmitButton
                pendingLabel={t("common.saving")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("knowledge.prompt.save")}
              </SubmitButton>
            )}
            <Link
              href="/dashboard/knowledge/prompt?template=default"
              className="text-xs font-medium text-brand-600 transition hover:underline dark:text-brand-500"
            >
              {t("knowledge.prompt.useDefault")}
            </Link>
            <span className="text-xs text-[color:var(--muted)]">
              {t("knowledge.prompt.emptyHint")}
            </span>
          </div>
        </ActionForm>
      </section>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("knowledge.prompt.modulesTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("knowledge.prompt.modulesHint")}
          </p>
        </div>
        <div className="space-y-4 p-5">
          {moduleRows.map((row) => (
            <ModuleEditor
              key={row.id}
              moduleId={row.id}
              label={row.label}
              value={row.value}
              defaultText={row.defaultText}
              isCustom={row.isCustom}
              canEdit={canEdit}
              maxLength={PROMPT_MAX_CHARS}
              action={updateModulePrompt}
              labels={{
                custom: t("knowledge.prompt.moduleCustom"),
                builtIn: t("knowledge.prompt.moduleBuiltIn"),
                edit: t("knowledge.prompt.moduleEdit"),
                collapse: t("knowledge.prompt.moduleCollapse"),
                save: t("knowledge.prompt.save"),
                reset: t("knowledge.prompt.moduleReset"),
                counter: t("knowledge.prompt.charCounter"),
              }}
            />
          ))}
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("knowledge.prompt.composedTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("knowledge.prompt.composedHint", { placeholder: KNOWLEDGE_PLACEHOLDER })}
          </p>
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-[color:var(--muted)]">
          {preview}
        </pre>
      </section>
    </DashboardShell>
  );
}
