"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DEVELOPER_PORTAL_NAME } from "@/lib/brand";
import { readStoredDemoKey, writeStoredDemoKey } from "@/lib/demo-storage";
import { useI18n } from "@/lib/i18n/client";
import type { ChatResponse, KnowledgeSource } from "@/lib/types";

// Only needed once an answer arrives, so keep it out of the demo page's first paint.
const ChatMarkdown = dynamic(
  () => import("@/components/chat-markdown").then((mod) => mod.ChatMarkdown),
  { ssr: false },
);

const CATEGORY_ORDER = ["all", "fiqh", "ibadah", "aqidah", "akhlak", "general"] as const;
const MAX_CHARS = 4000;

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  createdAt: number;
  error?: boolean;
};

type DemoExchange = {
  requestBody: string;
  status: number | null;
  statusText: string;
  requestId: string | null;
  durationMs: number;
  responseBody: string;
};

function createId() {
  return crypto.randomUUID();
}

function createSessionId() {
  return `demo_${crypto.randomUUID()}`;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isChatResponse(value: unknown): value is ChatResponse {
  return Boolean(value && typeof value === "object" && "reply" in value);
}

function statusPillClass(status: number | null) {
  if (status !== null && status >= 200 && status < 300) {
    return "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200";
  }
  if (status !== null && status >= 400 && status < 500) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
  }
  return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
}

export function PartnerDemoSite() {
  const { t, messages: i18nMessages } = useI18n();
  const starterPrompts = i18nMessages.demo.starterPrompts;
  const categoryLabels = i18nMessages.playground.categories as Record<string, string>;

  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [ready, setReady] = useState(false);

  const [category, setCategory] = useState("all");
  const [sessionId, setSessionId] = useState("");
  const [chat, setChat] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [exchange, setExchange] = useState<DemoExchange | null>(null);

  const sessionIdRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = readStoredDemoKey();
      const session = createSessionId();

      if (cancelled) return;

      if (stored) setApiKey(stored);
      sessionIdRef.current = session;
      setSessionId(session);
      setReady(true);
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStoredDemoKey(remember ? apiKey : "");
  }, [ready, apiKey, remember]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chat, sending]);

  const startNewSession = useCallback(() => {
    const session = createSessionId();
    sessionIdRef.current = session;
    setSessionId(session);
    setChat([]);
    setExchange(null);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(
    async (preset?: string) => {
      const message = (preset ?? input).trim();
      if (!message || sending) return;

      const key = apiKey.trim();
      if (!key) {
        setChat((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: t("demo.keyMissing"),
            createdAt: Date.now(),
            error: true,
          },
        ]);
        return;
      }

      setInput("");
      setChat((prev) => [
        ...prev,
        { id: createId(), role: "user", content: message, createdAt: Date.now() },
      ]);
      setSending(true);

      const session = sessionIdRef.current || createSessionId();
      sessionIdRef.current = session;

      const body: { message: string; session_id: string; category?: string } = {
        message,
        session_id: session,
      };
      if (category !== "all") body.category = category;

      const started = performance.now();
      let status: number | null = null;
      let statusText = "";
      let requestId: string | null = null;
      let responseBody = "";

      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });

        status = response.status;
        statusText = response.statusText;
        requestId = response.headers.get("x-request-id");
        responseBody = await response.text();

        const parsed = safeJson(responseBody);

        if (!response.ok) {
          const apiError = (parsed as { error?: { message?: string; code?: string } } | null)?.error;
          const text = apiError?.message ?? t("demo.errorGeneric");
          setChat((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: apiError?.code ? `${text} (${apiError.code})` : text,
              createdAt: Date.now(),
              error: true,
            },
          ]);
        } else if (isChatResponse(parsed)) {
          if (typeof parsed.session_id === "string" && parsed.session_id) {
            sessionIdRef.current = parsed.session_id;
            setSessionId(parsed.session_id);
          }
          setChat((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: parsed.reply,
              sources: parsed.sources,
              createdAt: Date.now(),
            },
          ]);
        } else {
          setChat((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: t("demo.errorGeneric"),
              createdAt: Date.now(),
              error: true,
            },
          ]);
        }
      } catch (error) {
        responseBody = error instanceof Error ? error.message : String(error);
        setChat((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: t("demo.errorGeneric"),
            createdAt: Date.now(),
            error: true,
          },
        ]);
      } finally {
        setExchange({
          requestBody: pretty(body),
          status,
          statusText,
          requestId,
          durationMs: Math.round(performance.now() - started),
          responseBody: responseBody || "(empty)",
        });
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [apiKey, category, input, sending, t],
  );

  const hasKey = apiKey.trim().length > 0;
  const canSend = input.trim().length >= 3 && !sending;
  const showEmpty = chat.length === 0;

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            {t("demo.keyTitle")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--muted)]">
            {t("demo.keyHelp")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={t("demo.keyPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-xs font-medium transition hover:bg-background-subtle"
            >
              {showKey ? t("demo.hideKey") : t("demo.showKey")}
            </button>
          </div>
          <label className="mt-2.5 flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            {t("demo.rememberKey")}
          </label>
          <Link
            href="/dashboard/api-keys"
            className="mt-3 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
          >
            {t("demo.createKey")} →
          </Link>
        </div>

        <div className="border-t border-border pt-4">
          <label
            htmlFor="demo-category"
            className="block text-xs font-medium text-[color:var(--muted)]"
          >
            {t("demo.category")}
          </label>
          <select
            id="demo-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={sending}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
          >
            {CATEGORY_ORDER.map((value) => (
              <option key={value} value={value}>
                {categoryLabels[value] ?? value}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-[color:var(--muted)]">{t("demo.session")}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-background-subtle px-2.5 py-2 text-xs">
              {sessionId || "…"}
            </code>
            {sessionId && <CopyButton value={sessionId} />}
          </div>
          <button
            type="button"
            onClick={startNewSession}
            disabled={sending}
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-subtle disabled:opacity-50"
          >
            {t("demo.newSession")}
          </button>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-background-subtle px-4 py-3">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400/70" />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 font-mono text-[11px] text-[color:var(--muted)]">
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <span className="truncate">https://demo-partner.example/ask</span>
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                hasKey
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${hasKey ? "bg-brand-500" : "bg-amber-500"}`} />
              {hasKey ? t("demo.statusConnected") : t("demo.statusMissing")}
            </span>
          </div>

          <div className="flex items-center gap-3 border-b border-border bg-sky-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
              TU
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t("demo.siteName")}</p>
              <p className="truncate text-xs text-white/80">{t("demo.siteTagline")}</p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="h-[24rem] overflow-y-auto overscroll-contain px-4 py-5"
          >
            {showEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-sky-600 dark:text-sky-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-semibold">
                  {hasKey ? t("demo.emptyTitle") : t("demo.unlockTitle")}
                </p>
                <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
                  {hasKey ? t("demo.emptyDescription") : t("demo.unlockDescription")}
                </p>
                {hasKey ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleSend(prompt)}
                        disabled={sending}
                        className="rounded-full border border-border bg-background-subtle px-4 py-2 text-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50 dark:hover:bg-sky-900/20"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Link
                    href="/dashboard/api-keys"
                    className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    {t("demo.createKey")}
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {chat.map((message) => {
                  const isUser = message.role === "user";
                  const showSources =
                    !isUser && !message.error && message.sources && message.sources.length > 0;

                  return (
                    <div
                      key={message.id}
                      className={`chat-message-enter flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <article className={`max-w-[88%] space-y-1.5 sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                            {isUser ? t("common.you") : t("demo.assistant")}
                          </p>
                          <span className="text-[10px] text-[color:var(--muted)]">
                            {formatTime(message.createdAt)}
                          </span>
                          {message.content && <CopyButton value={message.content} />}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isUser
                              ? "rounded-br-md bg-sky-600 text-white"
                              : message.error
                                ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                                : "rounded-bl-md border border-border bg-background-subtle"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          ) : (
                            <>
                              <ChatMarkdown content={message.content} />
                              {showSources && (
                                <div className="mt-3 space-y-2 border-t border-border pt-3">
                                  <p className="text-xs font-medium text-[color:var(--muted)]">
                                    {t("demo.sources")}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.sources!.map((source) => (
                                      <span
                                        key={source.slug}
                                        className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                                      >
                                        {source.title}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </article>
                    </div>
                  );
                })}

                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-background-subtle px-4 py-3 text-sm text-[color:var(--muted)]">
                      <span className="inline-flex gap-1">
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-sky-500" />
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-sky-500 [animation-delay:0.15s]" />
                        <span className="chat-typing-dot h-2 w-2 rounded-full bg-sky-500 [animation-delay:0.3s]" />
                      </span>
                      {t("demo.sending")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={sending}
                rows={2}
                maxLength={MAX_CHARS}
                placeholder={t("demo.placeholder")}
                className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="shrink-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {t("demo.send")}
              </button>
            </div>
            <p className="mt-2 text-right text-[11px] text-[color:var(--muted)]">
              {t("demo.poweredBy", { portal: DEVELOPER_PORTAL_NAME })}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{t("demo.inspector")}</p>
            {exchange && (
              <button
                type="button"
                onClick={() => setExchange(null)}
                className="text-xs font-medium text-[color:var(--muted)] transition hover:text-foreground"
              >
                {t("demo.clearInspector")}
              </button>
            )}
          </div>

          {!exchange ? (
            <p className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">
              {t("demo.inspectorEmpty")}
            </p>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <span className="font-mono text-[color:var(--muted)]">POST /api/v1/chat</span>
                <span className={`rounded px-1.5 py-0.5 font-mono font-semibold ${statusPillClass(exchange.status)}`}>
                  {exchange.status ?? "ERR"} {exchange.statusText}
                </span>
                <span className="text-[color:var(--muted)]">
                  {t("demo.latency")}: <span className="font-mono text-foreground">{exchange.durationMs} ms</span>
                </span>
                {exchange.requestId && (
                  <span className="text-[color:var(--muted)]">
                    {t("demo.requestId")}: <span className="font-mono text-foreground">{exchange.requestId}</span>
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[color:var(--muted)]">{t("demo.request")}</p>
                  <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background-subtle p-3 text-xs leading-relaxed">
                    {exchange.requestBody}
                  </pre>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-[color:var(--muted)]">{t("demo.response")}</p>
                  <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background-subtle p-3 text-xs leading-relaxed">
                    {exchange.responseBody}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
