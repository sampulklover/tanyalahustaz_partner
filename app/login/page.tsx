import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { DASHBOARD_NAME, SIGN_IN_LABEL } from "@/lib/brand";

export const metadata = { title: SIGN_IN_LABEL };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  return (
    <AuthShell
      title={SIGN_IN_LABEL}
      subtitle={`to continue to ${DASHBOARD_NAME}`}
    >
      <LoginForm redirectTo={redirectTo ?? "/dashboard"} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          ← Back to Developers
        </Link>
      </p>
    </AuthShell>
  );
}
