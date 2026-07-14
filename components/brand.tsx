import Link from "next/link";
import { DEVELOPER_PORTAL_SHORT } from "@/lib/brand";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-[60%] w-[60%]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16.5 3.5a8.5 8.5 0 1 0 4 12.2 6.6 6.6 0 0 1-4-12.2Z"
          fill="currentColor"
        />
        <path
          d="M18.8 6.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7.7-1.7Z"
          fill="currentColor"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}

export function Logo({
  href = "/",
  subtitle = false,
}: {
  href?: string;
  subtitle?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5"
      aria-label={`TanyaLah Ustaz ${DEVELOPER_PORTAL_SHORT} home`}
    >
      <LogoMark className="h-9 w-9" />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight">TanyaLah Ustaz</span>
        {subtitle && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-500">
            {DEVELOPER_PORTAL_SHORT}
          </span>
        )}
      </span>
    </Link>
  );
}
