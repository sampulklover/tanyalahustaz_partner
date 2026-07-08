import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  CONSUMER_APP_NAME,
  CONSUMER_APP_URL,
  DEVELOPER_PORTAL_SHORT,
  GET_STARTED_LABEL,
} from "@/lib/brand";

export const metadata = {
  title: "Islamic AI API for developers",
  description:
    "Embed the same knowledge-backed Islamic AI behind TanyaLah Ustaz into your product. B2B API for platforms, apps, and websites.",
};

const features = [
  {
    title: "Grounded in the same knowledge base",
    body: "Answers draw from the curated library that powers TanyaLah Ustaz — articles on fiqh, ibadah, aqidah, and akhlak. Scholarship-backed responses, not generic model guesses.",
    icon: (
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
    ),
  },
  {
    title: "Cited sources on every reply",
    body: "Responses come with references to the source articles used. Build trust with your users by showing exactly where each answer comes from.",
    icon: (
      <>
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      </>
    ),
  },
  {
    title: "One simple endpoint",
    body: "Send a user message to POST /api/v1/chat and get a reply back. No prompt engineering, no vector databases to run, no LLM provider to manage.",
    icon: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
  },
  {
    title: "Conversation memory",
    body: "Pass a session_id and the API remembers the thread, so follow-up questions stay in context across multiple turns — just like a real conversation.",
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
    ),
  },
  {
    title: "Category filtering",
    body: "Scope answers to fiqh, ibadah, aqidah, akhlak, or general so responses match the context of the page your users are on.",
    icon: (
      <>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </>
    ),
  },
  {
    title: "Developer dashboard",
    body: "API keys, a live playground, chat logs, and usage analytics — everything your engineering team needs. You integrate one endpoint; we run the knowledge base and AI pipeline.",
    icon: (
      <>
        <path d="M20 7h-9" />
        <path d="M14 17H5" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </>
    ),
  },
];

const steps = [
  {
    title: "Create your API key",
    body: "Sign up and generate an API key from the dashboard in seconds.",
  },
  {
    title: "Send a question",
    body: "POST the user's message to /api/v1/chat with your key. Optionally pass a category and session_id.",
  },
  {
    title: "We retrieve & ground",
    body: "We embed the question, run semantic search over the knowledge base, and build a grounded prompt.",
  },
  {
    title: "Return a cited answer",
    body: "Your users get a clear, knowledge-backed reply — complete with the source articles behind it.",
  },
];

const useCases = [
  {
    title: "Islamic education platforms",
    body: "Give students an always-available assistant that answers questions with references to real material.",
  },
  {
    title: "Mosque & community apps",
    body: "Add a Q&A helper for prayer, fasting, and daily practice — grounded in vetted content.",
  },
  {
    title: "Fintech & halal commerce",
    body: "Answer shariah-compliance questions inline, with sources your compliance team can verify.",
  },
  {
    title: "Content & media sites",
    body: "Turn your articles into an interactive assistant that keeps readers engaged and informed.",
  },
];

const faqs = [
  {
    q: "How is this different from tanyalahustaz.com?",
    a: `This is the developer platform for businesses. ${CONSUMER_APP_NAME} (${CONSUMER_APP_URL.replace("https://", "")}) is the consumer app where individuals ask questions directly. This API lets you embed the same knowledge-backed AI into your own product via POST /api/v1/chat.`,
  },
  {
    q: "Is this login the same as tanyalahustaz.com?",
    a: `No. Sign in on this site is for the developer dashboard — API keys, playground, and usage logs. The ${CONSUMER_APP_NAME} app has its own login for individuals. The two accounts are not interchangeable.`,
  },
  {
    q: "Where do the answers come from?",
    a: "Answers are generated from the same curated TanyaLah Ustaz knowledge base used in the consumer app, using retrieval-augmented generation (RAG). We embed each question, find the most relevant passages, and pass them to the language model as grounding context.",
  },
  {
    q: "Do I need to run my own AI infrastructure?",
    a: "No. We handle embeddings, semantic search, prompt construction, and the language model. You make a single authenticated API call and receive a finished reply with sources.",
  },
  {
    q: "How is the API authenticated?",
    a: "Each request uses an API key (prefixed tlh_live_) sent as a Bearer token or X-API-Key header. Keys are stored as SHA-256 hashes and can be revoked any time from the dashboard.",
  },
  {
    q: "Can I test before integrating?",
    a: "Yes. The dashboard includes a live playground that uses the exact same pipeline as production, so you can try prompts and categories before writing any code.",
  },
  {
    q: "Are the answers a substitute for a scholar?",
    a: "No. Responses are AI-generated for guidance and convenience. For rulings on sensitive or personal matters, users should consult a qualified scholar. We recommend surfacing this clearly in your product.",
  },
];

export default function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-brand-glow" />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-900/30 dark:text-brand-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {DEVELOPER_PORTAL_SHORT}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
                Build with TanyaLah Ustaz Islamic AI
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]">
                The same knowledge-backed Islamic AI behind{" "}
                <a
                  href={CONSUMER_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                >
                  {CONSUMER_APP_NAME}
                </a>
                — now available as an API for your platform, app, or website. One call,
                cited answers, no AI infrastructure to run.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  {GET_STARTED_LABEL}
                </Link>
                <Link
                  href="/docs"
                  className="rounded-lg border border-border bg-card px-6 py-3 font-semibold transition hover:bg-background-subtle"
                >
                  View documentation
                </Link>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[color:var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> Free to start
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> No AI setup required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon /> Sources on every answer
                </span>
              </p>
            </div>

            {/* Code / response preview */}
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
  -d '{ "message": "Can a traveler combine
        Dhuhr and Asr?", "category": "fiqh" }'`}
                  </code>
                </pre>
                <div className="border-t border-border px-4 py-4">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                    200 OK
                  </p>
                  <p className="text-sm leading-relaxed">
                    Yes. A traveler may combine Dhuhr and Asr (jama&apos;) during a journey,
                    either advancing Asr into Dhuhr&apos;s time or delaying Dhuhr into
                    Asr&apos;s time…
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

        {/* Consumer brand trust */}
        <section className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-500">
                Powered by TanyaLah Ustaz
              </p>
              <p className="mt-2 max-w-xl text-[color:var(--muted)]">
                Your integration uses the same curated knowledge base and answer quality as
                our consumer app — built for developers who want to offer trusted Islamic
                guidance inside their own products.
              </p>
            </div>
            <a
              href={CONSUMER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:bg-background-subtle"
            >
              Visit {CONSUMER_APP_NAME} ↗
            </a>
          </div>
        </section>

        {/* Stats / trust */}
        <section className="border-b border-border bg-background-subtle">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
            {[
              { value: "1", label: "Endpoint to integrate" },
              { value: "5", label: "Knowledge categories" },
              { value: "RAG", label: "Grounded retrieval" },
              { value: "100%", label: "Answers with sources" },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-3xl font-bold tracking-tight text-brand-600 dark:text-brand-500">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow="Developer platform"
              title="Everything you need to integrate"
              subtitle="A complete B2B pipeline behind a single endpoint — so your engineers ship faster, without building AI infrastructure."
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
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
                      {f.icon}
                    </svg>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-background-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow="How it works"
              title="From question to cited answer in one call"
              subtitle="You send a message. We do the retrieval, grounding, and generation. Your users get an answer they can trust."
            />
            <div className="mt-14 grid gap-6 md:grid-cols-4">
              {steps.map((step, i) => (
                <div key={step.title} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                    {i + 1}
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

        {/* Use cases */}
        <section id="use-cases" className="scroll-mt-20 border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow="Use cases"
              title="Built for products that serve Muslims"
              subtitle="Wherever your users have questions about their faith, give them grounded answers in context."
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {useCases.map((u) => (
                <div
                  key={u.title}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-6"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-semibold">{u.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">
                      {u.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-b border-border bg-background-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeading
              eyebrow="Pricing"
              title="Start free, scale when you're ready"
              subtitle="Create an account and get an API key today. Talk to us when you need higher volume or a custom knowledge base."
            />
            <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="text-lg font-semibold">Developer</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  For building, testing, and early integrations.
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">Free</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "API key + live playground",
                    "Full knowledge-backed chat API",
                    "Usage analytics & chat logs",
                    "Complete documentation",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckIcon /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-brand-600 px-5 py-2.5 text-center font-semibold text-white transition hover:bg-brand-700"
                >
                  Get started free
                </Link>
              </div>

              <div className="rounded-2xl border border-brand-200 bg-card p-8 ring-1 ring-brand-200 dark:border-brand-900 dark:ring-brand-900">
                <h3 className="text-lg font-semibold">Partner</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  For production apps and growing teams.
                </p>
                <p className="mt-6 text-4xl font-bold tracking-tight">Let&apos;s talk</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "Everything in Developer",
                    "Higher rate limits & volume",
                    "Custom knowledge base content",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <CheckIcon /> {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg border border-border px-5 py-2.5 text-center font-semibold transition hover:bg-background-subtle"
                >
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions, answered"
              subtitle="Everything you need to know before you integrate."
            />
            <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
              {faqs.map((faq) => (
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
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-brand-600 px-8 py-16 text-center dark:border-brand-900">
              <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-20" />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Bring TanyaLah Ustaz to your users
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-brand-50">
                  Create a free account, get your API key, and make your first
                  grounded chat call in minutes.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/signup"
                    className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    {GET_STARTED_LABEL}
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Explore the docs
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
