import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("verifyEmail.metaTitle") };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const t = await getTranslations();
  const { email } = await searchParams;

  return (
    <AuthShell
      title={t("verifyEmail.title")}
      subtitle={t("verifyEmail.subtitle")}
    >
      <div className="space-y-4 text-sm text-[color:var(--muted)]">
        {email ? (
          <p>
            {t("verifyEmail.sentTo", { email })}
          </p>
        ) : (
          <p>{t("verifyEmail.sentGeneric")}</p>
        )}
        <p>{t("verifyEmail.spamHelp")}</p>
        <p className="pt-2">
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
            {t("verifyEmail.backToSignIn")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
