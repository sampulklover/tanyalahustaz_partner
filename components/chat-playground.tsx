"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendPlaygroundMessage } from "@/app/actions/playground";
import { ChatMarkdown } from "@/components/chat-markdown";
import { CopyButton } from "@/components/copy-button";
import { buildChatLogsPath } from "@/lib/chat-logs";
import type { KnowledgeSource } from "@/lib/types";

type PlaygroundMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  sources?: KnowledgeSource[];
};

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "fiqh", label: "Fiqh" },
  { value: "ibadah", label: "Ibadah" },
  { value: "general", label: "General" },
];

const STARTER_PROMPTS = [
  "Can a traveler combine Dhuhr and Asr?",
  "What is the intention (niat) in prayer?",
  "What is sedekah and when is it encouraged?",
];

function createId() {
  return crypto.randomUUID();
}

const selectClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function ChatPlayground() {
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSend(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text || isPending) return;

    setError(null);
    setInput("");

    const userMessage: PlaygroundMessage = {
      id: createId(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("message", text);
      formData.set("category", category);
      if (sessionId) formData.set("session_id", sessionId);

      const result = await sendPlaygroundMessage(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSessionId(result.data.session_id);

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: result.data.reply,
          model: result.data.model,
          sources: result.data.sources,
        },
      ]);
    });
  }

  function handleClear() {
    setMessages([]);
    setSessionId("");
    setError(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const charCount = input.length;
  const maxChars = 4000;

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Settings
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isPending}
              className={selectClass}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {sessionId && (
            <div>
              <span className="mb-1.5 block text-sm font-medium">Session</span>
              <code className="block break-all rounded-lg border border-border bg-background-subtle px-3 py-2 font-mono text-xs">
                {sessionId}
              </code>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={sessionId} label="Copy ID" />
                <Link
                  href={buildChatLogsPath("/dashboard/chat", { session: sessionId })}
                  className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-background-subtle"
                >
                  View logs
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending || messages.length === 0}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-subtle disabled:opacity-50"
            >
              Clear conversation
            </button>
            <Link
              href="/docs/endpoints"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-900/20"
            >
              API reference
              <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
              </svg>
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:min-h-[calc(100vh-12rem)]">
        <div className="border-b border-border px-5 py-4">
          <p className="font-semibold">Playground</p>
          <p className="text-sm text-[color:var(--muted)]">
            Live preview of <code className="text-xs">POST /api/v1/chat</code>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-600 dark:text-brand-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold">Test your integration</p>
              <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
                Ask a question to preview knowledge-backed answers before shipping to production.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={isPending}
                    className="rounded-full border border-border bg-background-subtle px-4 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-900/20"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <article className={`max-w-[88%] space-y-1.5 sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                          {isUser ? "You" : "Assistant"}
                        </p>
                        <CopyButton value={message.content} label="Copy" />
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isUser
                            ? "rounded-br-md bg-brand-600 text-white"
                            : "rounded-bl-md border border-border bg-background-subtle"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        ) : (
                          <>
                            <ChatMarkdown content={message.content} />
                            <div className="mt-3 space-y-2 border-t border-border pt-3">
                              {message.model && (
                                <p className="font-mono text-xs text-[color:var(--muted)]">{message.model}</p>
                              )}
                              {message.sources && message.sources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {message.sources.map((source) => (
                                    <span
                                      key={source.slug}
                                      className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                                    >
                                      {source.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })}

              {isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] space-y-1.5 sm:max-w-[80%]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                      Assistant
                    </p>
                    <div className="rounded-2xl rounded-bl-md border border-border bg-background-subtle px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                        <span className="inline-flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" />
                        </span>
                        Generating answer…
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card px-5 py-4">
          {error && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 text-xs font-medium text-red-700 underline dark:text-red-300"
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-3xl gap-3">
            <div className="min-w-0 flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPending}
                rows={2}
                maxLength={maxChars}
                placeholder="Ask an Islamic question…"
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
              />
              <p className="mt-1 text-right text-xs text-[color:var(--muted)]">
                {charCount}/{maxChars}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isPending || input.trim().length < 3}
              className="self-start rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
