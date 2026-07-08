import Link from "next/link";

const steps = [
  {
    title: "Create an API key",
    body: "Generate a key to authenticate requests to the API.",
    href: "/dashboard/api-keys",
    cta: "Create key",
  },
  {
    title: "Test in the playground",
    body: "Send a message and verify the response before integrating.",
    href: "/dashboard/playground",
    cta: "Open playground",
  },
  {
    title: "Integrate in your app",
    body: "Call POST /api/v1/chat from your backend with your key.",
    href: "/docs/endpoints",
    cta: "View API reference",
  },
];

export function OnboardingChecklist() {
  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-900 dark:bg-brand-900/20">
      <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-100">
        Get started in 3 steps
      </h2>
      <p className="mt-1 text-sm text-brand-800 dark:text-brand-200">
        New here? Follow these steps to make your first API call.
      </p>
      <ol className="mt-6 space-y-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col gap-3 rounded-lg border border-brand-200/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand-900/60"
          >
            <div className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-0.5 text-sm text-[color:var(--muted)]">{step.body}</p>
              </div>
            </div>
            <Link
              href={step.href}
              className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700 sm:ml-4"
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
