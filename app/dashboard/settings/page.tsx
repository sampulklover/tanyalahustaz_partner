import { DashboardPage as DashboardShell } from "@/components/dashboard/page";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmailForm, PasswordForm } from "@/components/dashboard/account-forms";
import { DeleteAccountButton } from "@/components/dashboard/delete-account-button";
import { SettingsProfileForm } from "@/components/dashboard/settings-form";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("settings.title") };
}

export default async function SettingsPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", user!.id)
    .maybeSingle();

  const fullName =
    (user!.user_metadata?.full_name as string | undefined) ??
    (user!.user_metadata?.name as string | undefined) ??
    "";

  const hasPassword = (user!.identities ?? []).some(
    (identity) => identity.provider === "email",
  );

  return (
    <DashboardShell>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("settings.profileTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("settings.profileDescription")}
          </p>
        </div>
        <SettingsProfileForm
          fullName={fullName}
          companyName={profile?.company_name ?? ""}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("settings.passwordTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("settings.passwordDescription")}
          </p>
        </div>
        <PasswordForm hasPassword={hasPassword} />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{t("settings.emailTitle")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("settings.emailDescription")}
          </p>
        </div>
        <EmailForm email={user!.email ?? ""} />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-red-200 bg-card shadow-sm dark:border-red-900/60">
        <div className="px-5 py-5">
          <h2 className="font-semibold text-red-700 dark:text-red-300">
            {t("settings.dangerTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
            {t("settings.dangerDescription")}
          </p>
          <div className="mt-4">
            <DeleteAccountButton />
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
