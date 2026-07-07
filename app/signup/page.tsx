import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your partner account"
      subtitle="Get an API key and start integrating knowledge-backed Islamic AI today — free."
    >
      <SignupForm />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
