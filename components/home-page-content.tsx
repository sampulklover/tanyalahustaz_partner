"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  CONSUMER_APP_NAME,
  CONSUMER_APP_URL,
} from "@/lib/brand";
import { useI18n } from "@/lib/i18n/client";

type ContentItem = { title: string; body: string };
type FaqItem = { q: string; a: string };

const featureIcons = [
  <path key="1" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20" />,
  <>
    <path key="2a" d="M9 11l3 3 8-8" />
    <path key="2b" d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
  </>,
  <>
    <polyline key="3a" points="16 18 22 12 16 6" />
    <polyline key="3b" points="8 6 2 12 8 18" />
  </>,
  <path key="4" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />,
  <>
    <line key="5a" x1="4" y1="6" x2="20" y2="6" />
    <line key="5b" x1="7" y1="12" x2="17" y2="12" />
    <line key="5c" x1="10" y1="18" x2="14" y2="18" />
  </>,
  <>
    <path key="6a" d="M20 7h-9" />
    <path key="6b" d="M14 17H5" />
    <circle key="6c" cx="17" cy="17" r="3" />
    <circle key="6d" cx="7" cy="7" r="3" />
  </>,
];

export function HomePageContent() {
  const { t, messages } = useI18n();
  const home = messages.home as {
    features: { items: ContentItem[] };
    howItWorks: { steps: ContentItem[] };
    useCases: { items: ContentItem[] };
    pricing: {
      developer: { features: string[] };
      partner: { features: string[] };
    };
    faq: { items: FaqItem[] };
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const consumerUrl = CONSUMER_APP_URL.replace(/^https?:\/\//, "");

  const stats = [
    { value: "1", label: t("home.stats.endpoint") },
    { value: "5", label: t("home.stats.categories") },
    { value: "✓", label: t("home.stats.rag") },
    { value: "100%", label: t("home.stats.sources") },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-brand-glow" />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {t("brand.developers")}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
                {t("home.hero.title")}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]">
                {t("home.hero.subtitle", { consumerApp: CONSUMER_APP_NAME })}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  {t("brand.getStarted")}
                </Link>
                <Link
                  href="/docs"
                  className="rounded-lg border border-border bg-card px-6 py-3 font-semibold transition hover:bg-background-subtle"
                >
                  {t("home.hero.viewDocs")}
                </Link>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[color:var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> {t("home.hero.freeToStart")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> {t("home.hero.noAiSetup")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> {t("home.hero.sourcesEveryAnswer")}
                </span>
              </p>
            </div>

            <div className="animate-fade-up">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5">
                <div className="flex items-center gap-2 border-b border-border bg-background-subtle px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-400/70" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                  <span className="h-3 w-3 rounded-full bg-brand-400/70" />
                  <span className="ml-2 font-mono text-xs text-[color:var(--muted)]">
                    POST /api/v1/chat
                  </span>
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-relaxed">
                  <code className="text-[color:var(--muted)]">
{`curl -X POST ${baseUrl.replace(/^https?:\/\//, "")}/api/v1/chat \\
  -H "Authorization: Bearer `}
                    <span className="text-brand-600 dark:text-brand-400">tlh_live_•••</span>
{`" \\
  -d '{ "message": "${t("homeDemo.sampleQuestion")}",
        "category": "fiqh" }'`}
                  </code>
                </pre>
                <div className="border-t border-border px-4 py-4">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                    {t("homeDemo.okStatus")}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {t("homeDemo.sampleResponse")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                      source: jamak-solat-musafir
                    </span>
                    <span className="rounded-full bg-background-subtle px-2.5 py-0.5 text-xs text-[color:var(--muted)]">
                      category: fiqh
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-500">
                {t("home.trust.eyebrow")}
              </p>
              <p className="mt-2 max-w-xl text-[color:var(--muted)]">
                {t("home.trust.body")}
              </p>
            </div>
            <a
              href={CONSUMER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-background-subtle"
            >
              {t("home.trust.visitConsumer", { consumerApp: CONSUMER_APP_NAME })}
            </a>
          </div>
        </section>

        <section className="border-b border-border bg-background-subtle">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-3xl font-bold tracking-tight text-brand-600 dark:text-brand-500">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow={t("home.features.eyebrow")}
              title={t("home.features.title")}
              subtitle={t("home.features.subtitle")}
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {home.features.items.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand-200 hover:shadow-lg hover:shadow-black/5 dark:hover:border-brand-900"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {featureIcons[index]}
                    </svg>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-background-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow={t("home.howItWorks.eyebrow")}
              title={t("home.howItWorks.title")}
              subtitle={t("home.howItWorks.subtitle")}
            />
            <div className="mt-14 grid gap-6 md:grid-cols-4">
              {home.howItWorks.steps.map((step, index) => (
                <div key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow={t("home.useCases.eyebrow")}
              title={t("home.useCases.title")}
              subtitle={t("home.useCases.subtitle")}
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {home.useCases.items.map((useCase) => (
                <div
                  key={useCase.title}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-6"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-semibold">{useCase.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">
                      {useCase.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-b border-border bg-background-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow={t("home.pricing.eyebrow")}
              title={t("home.pricing.title")}
              subtitle={t("home.pricing.subtitle")}
            />
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="text-lg font-semibold">{t("home.pricing.developer.title")}</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {t("home.pricing.developer.subtitle")}
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">
                  {t("home.pricing.developer.price")}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {home.pricing.developer.features.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckIcon /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-brand-600 px-5 py-2.5 text-center font-semibold text-white transition hover:bg-brand-700"
                >
                  {t("home.pricing.developer.cta")}
                </Link>
              </div>

              <div className="rounded-2xl border border-brand-200 bg-card p-8 ring-1 ring-brand-200 dark:border-brand-900 dark:ring-brand-900">
                <h3 className="text-lg font-semibold">{t("home.pricing.partner.title")}</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {t("home.pricing.partner.subtitle")}
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">
                  {t("home.pricing.partner.price")}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {home.pricing.partner.features.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckIcon /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg border border-border px-5 py-2.5 text-center font-semibold transition hover:bg-background-subtle"
                >
                  {t("home.pricing.partner.cta")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <SectionHeading
              eyebrow={t("home.faq.eyebrow")}
              title={t("home.faq.title")}
              subtitle={t("home.faq.subtitle")}
            />
            <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
              {home.faq.items.map((faq) => (
                <details key={faq.q} className="group px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <svg
                      className="h-5 w-5 shrink-0 text-[color:var(--muted)] transition group-open:rotate-45"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-[color:var(--muted)]">
                    {faq.a
                      .replaceAll("{consumerApp}", CONSUMER_APP_NAME)
                      .replaceAll("{consumerUrl}", consumerUrl)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-600 px-8 py-16 text-center dark:border-brand-900">
              <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-20" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {t("home.cta.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-brand-50">
                  {t("home.cta.subtitle")}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/signup"
                    className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    {t("brand.getStarted")}
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    {t("home.cta.exploreDocs")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-[color:var(--muted)]">{subtitle}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
