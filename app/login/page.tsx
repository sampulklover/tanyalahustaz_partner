import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your API keys, test the playground, and monitor usage."
    >
      <LoginForm redirectTo={redirectTo ?? "/dashboard"} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
