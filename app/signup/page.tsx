import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { isInviteRequired } from "@/lib/signup-invite";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  const inviteRequired = isInviteRequired();

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        inviteRequired
          ? "Enter your invite code to join the TanyaLah Ustaz partner program."
          : "Start building with the TanyaLah Ustaz API — free to get started."
      }
    >
      <SignupForm inviteRequired={inviteRequired} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
        <Link href="/" className="hover:text-foreground hover:underline">
          ← Back to Developers
        </Link>
      </p>
    </AuthShell>
  );
}
