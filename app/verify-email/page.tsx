import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      title="Check your email"
      subtitle="We sent a confirmation link to finish setting up your account."
    >
      <div className="space-y-4 text-sm text-[color:var(--muted)]">
        {email ? (
          <p>
            A verification link was sent to{" "}
            <span className="font-medium text-foreground">{email}</span>. Click the link in
            that email to access your dashboard.
          </p>
        ) : (
          <p>
            A verification link was sent to your email address. Click the link to access your
            dashboard.
          </p>
        )}
        <p>
          Didn&apos;t receive it? Check your spam folder, or sign up again with the same email
          to resend the confirmation.
        </p>
        <p className="pt-2">
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-500">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
