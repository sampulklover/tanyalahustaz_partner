import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("brand.signIn") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const t = await getTranslations();
  const { redirect: redirectTo } = await searchParams;

  return (
    <AuthShell
      title={t("brand.signIn")}
      subtitle={t("auth.continueToDashboard", { dashboard: t("brand.dashboard") })}
    >
      <LoginForm redirectTo={redirectTo ?? "/dashboard"} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          {t("auth.backToDevelopers")}
        </Link>
      </p>
    </AuthShell>
  );
}
