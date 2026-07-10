import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getTranslations } from "@/lib/i18n/server";
import { isInviteRequired } from "@/lib/signup-invite";

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("auth.createAccount") };
}

export default async function SignupPage() {
  const t = await getTranslations();
  const inviteRequired = isInviteRequired();

  return (
    <AuthShell
      title={t("auth.createYourAccount")}
      subtitle={
        inviteRequired
          ? t("auth.signupInviteSubtitle")
          : t("auth.signupOpenSubtitle")
      }
    >
      <SignupForm inviteRequired={inviteRequired} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          {t("auth.backToDevelopers")}
        </Link>
      </p>
    </AuthShell>
  );
}
