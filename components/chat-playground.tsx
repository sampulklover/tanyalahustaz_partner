"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPlaygroundHistory } from "@/app/actions/playground";
import { ChatMarkdown } from "@/components/chat-markdown";
import { CopyButton } from "@/components/copy-button";
import { buildChatLogsPath } from "@/lib/chat-logs";
import { useI18n } from "@/lib/i18n/client";
import {
  clearStoredPlaygroundSessionId,
  readStoredPlaygroundApiKey,
  readStoredPlaygroundSessionId,
  writeStoredPlaygroundApiKey,
  writeStoredPlaygroundSessionId,
} from "@/lib/playground-storage";
import { parseChatStreamChunk, type ChatStreamEvent } from "@/lib/chat-stream";
import type { KnowledgeSource } from "@/lib/types";

type MessageStatus = "complete" | "streaming" | "cancelled" | "error";

const CATEGORY_ORDER = ["all", "fiqh", "ibadah", "aqidah", "akhlak", "general"] as const;

type PlaygroundMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  status?: MessageStatus;
  createdAt: number;
};

function createId() {
  return crypto.randomUUID();
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * A scraped summary is often just leftover site navigation ("BANK SOALAN"),
 * which is not worth showing above the article. Hide very short, shouty or
 * menu-like summaries.
 */
function looksLikeJunkSummary(summary: string): boolean {
  const text = summary.trim();
  if (text.length < 40) return true;
  const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  const isMenuLike = text.split(/\s+/).length <= 4;
  return isAllCaps || isMenuLike;
}

function StreamingCursor() {
  return (
    <span
      className="chat-stream-cursor ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-brand-500 align-middle"
      aria-hidden
    />
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
      <span className="inline-flex gap-1">
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-brand-500" />
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-brand-500 [animation-delay:0.15s]" />
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-brand-500 [animation-delay:0.3s]" />
      </span>
      {label}
    </div>
  );
}

export function ChatPlayground({ userId = "" }: { userId?: string }) {
  const { t, messages: i18nMessages } = useI18n();
  const starterPrompts = i18nMessages.playground.starterPrompts;
  const categoryLabels = i18nMessages.playground.categories as Record<string, string>;

  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("all");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [keyReady, setKeyReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourceView, setSourceView] = useState<{
    title: string;
    loading: boolean;
    error?: string;
    content?: string;
    summary?: string;
    category?: string;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const sessionIdRef = useRef("");

  const persistSessionId = useCallback((nextSessionId: string) => {
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);
    writeStoredPlaygroundSessionId(nextSessionId, userId);
  }, [userId]);

  const updateMessage = useCallback((id: string, updater: Partial<PlaygroundMessage> | ((msg: PlaygroundMessage) => Partial<PlaygroundMessage>)) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== id) return message;
        const patch = typeof updater === "function" ? updater(message) : updater;
        return { ...message, ...patch };
      }),
    );
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!shouldAutoScrollRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  // Close the settings modal on Escape.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  // Close the source viewer on Escape.
  useEffect(() => {
    if (!sourceView) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSourceView(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sourceView]);

  const openSource = useCallback(
    async (slug: string, title: string) => {
      setSourceView({ title, loading: true });
      try {
        const response = await fetch(
          `/api/playground/article?slug=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        const payload = (await response.json()) as {
          article?: { title: string; category: string; summary: string; content: string };
          error?: string;
        };
        if (!response.ok || !payload.article) {
          setSourceView({ title, loading: false, error: payload.error ?? "Not found." });
          return;
        }
        setSourceView({
          title: payload.article.title,
          loading: false,
          content: payload.article.content,
          summary: payload.article.summary,
          category: payload.article.category,
        });
      } catch (err) {
        setSourceView({
          title,
          loading: false,
          error: err instanceof Error ? err.message : "Could not load the source.",
        });
      }
    },
    [apiKey],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedKey = readStoredPlaygroundApiKey();
      if (!cancelled) {
        if (storedKey) setApiKey(storedKey);
        setKeyReady(true);
      }

      const storedSessionId = readStoredPlaygroundSessionId(userId);
      if (!storedSessionId) {
        if (!cancelled) setIsRestoring(false);
        return;
      }

      const result = await loadPlaygroundHistory(storedSessionId);
      if (cancelled) return;

      if (!result.ok) {
        clearStoredPlaygroundSessionId(userId);
        setError(result.error);
        setIsRestoring(false);
        return;
      }

      if (!result.data.sessionId || result.data.messages.length === 0) {
        clearStoredPlaygroundSessionId(userId);
        setIsRestoring(false);
        return;
      }

      persistSessionId(result.data.sessionId);
      setMessages(
        result.data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          sources: message.sources,
          status: "complete" as const,
          createdAt: new Date(message.createdAt).getTime(),
        })),
      );
      shouldAutoScrollRef.current = true;
      setIsRestoring(false);
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [persistSessionId, userId]);

  useEffect(() => {
    if (!keyReady) return;
    writeStoredPlaygroundApiKey(rememberKey ? apiKey : "");
  }, [keyReady, apiKey, rememberKey]);

  useEffect(() => {
    if (isRestoring) return;
    scrollToBottom(isStreaming ? "auto" : "smooth");
  }, [messages, isStreaming, isRestoring, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming || isRestoring) return;

      // Mirror the server rules so we never show a sent bubble the API will
      // reject. Short greetings like "hi" are fine — the server treats them as
      // small talk.
      if (text.length === 0) {
        setError(t("playground.messageEmpty"));
        return;
      }
      if (text.length > 4000) {
        setError(t("playground.messageTooLong"));
        return;
      }

      const key = apiKey.trim();
      if (!key) {
        setError(t("playground.keyMissing"));
        return;
      }

      setError(null);
      setRetryMessage(null);
      setInput("");
      shouldAutoScrollRef.current = true;

      const userMessage: PlaygroundMessage = {
        id: createId(),
        role: "user",
        content: text,
        status: "complete",
        createdAt: Date.now(),
      };

      const assistantId = createId();
      const assistantMessage: PlaygroundMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let receivedText = false;

      try {
        const response = await fetch("/api/playground/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            message: text,
            session_id: sessionIdRef.current || undefined,
            category: category === "all" ? undefined : category,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = t("playground.streamError");
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) errorMessage = payload.error;
          } catch {
            // Use default error message.
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error(t("playground.streamError"));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleEvent = (event: ChatStreamEvent) => {
          if (event.type === "meta") {
            persistSessionId(event.session_id);
            updateMessage(assistantId, { sources: event.sources });
            return;
          }

          if (event.type === "text") {
            receivedText = true;
            updateMessage(assistantId, (message) => ({
              content: message.content + event.content,
            }));
            scrollToBottom("auto");
            return;
          }

          if (event.type === "done") {
            updateMessage(assistantId, { status: "complete" });
            return;
          }

          if (event.type === "error") {
            throw new Error(event.message);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = parseChatStreamChunk(buffer, handleEvent);
        }

        updateMessage(assistantId, (message) => ({
          status: message.status === "streaming" ? "complete" : message.status,
        }));
      } catch (streamError) {
        if (streamError instanceof DOMException && streamError.name === "AbortError") {
          updateMessage(assistantId, (message) => ({
            status: "cancelled",
            content: message.content || t("playground.cancelled"),
          }));
          return;
        }

        const errorMessage =
          streamError instanceof Error ? streamError.message : t("playground.streamError");

        setError(errorMessage);
        setRetryMessage(text);

        if (receivedText) {
          updateMessage(assistantId, { status: "error" });
        } else {
          setMessages((prev) => prev.filter((message) => message.id !== assistantId));
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [apiKey, category, input, isRestoring, isStreaming, persistSessionId, scrollToBottom, t, updateMessage],
  );

  function handleClear() {
    if (isStreaming) stopStreaming();
    setMessages([]);
    persistSessionId("");
    clearStoredPlaygroundSessionId(userId);
    setError(null);
    setRetryMessage(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  const charCount = input.length;
  const maxChars = 4000;
  const hasKey = apiKey.trim().length > 0;
  const canSend = input.trim().length >= 3 && !isStreaming && !isRestoring && hasKey;
  const showEmptyState = !isRestoring && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{t("playground.title")}</p>
              <p className="text-sm text-[color:var(--muted)]">{t("playground.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                  </span>
                  {t("playground.live")}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-background-subtle"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                {t("playground.settings")}
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6"
        >
          {isRestoring ? (
            <div className="flex min-h-full flex-col items-center justify-center text-center">
              <ThinkingIndicator label={t("playground.loadingHistory")} />
            </div>
          ) : showEmptyState ? (
            <div className="flex min-h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-brand-600 dark:text-brand-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold">
                {hasKey ? t("playground.emptyTitle") : t("playground.unlockTitle")}
              </p>
              <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
                {hasKey
                  ? t("playground.emptyDescription")
                  : t("playground.unlockDescription")}
              </p>
              {hasKey ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      disabled={isStreaming || isRestoring}
                      className="rounded-full border border-border bg-background-subtle px-4 py-2 text-sm transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-900/20"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                <Link
                  href="/dashboard/api-keys"
                  className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  {t("playground.createKey")}
                </Link>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-5xl space-y-5">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const isStreamingMessage = message.status === "streaming";
                const showSources =
                  !isUser &&
                  message.status === "complete" &&
                  message.sources &&
                  message.sources.length > 0;

                return (
                  <div
                    key={message.id}
                    className={`chat-message-enter flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <article className={`max-w-[92%] space-y-1.5 sm:max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                          {isUser ? t("common.you") : t("playground.assistant")}
                        </p>
                        <span className="text-[10px] text-[color:var(--muted)]">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {message.content && <CopyButton value={message.content} />}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isUser
                            ? "rounded-br-md bg-brand-600 text-white"
                            : "rounded-bl-md border border-border bg-background-subtle"
                        } ${message.status === "error" ? "border-red-300 dark:border-red-800" : ""}`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        ) : (
                          <>
                            {isStreamingMessage && !message.content ? (
                              <ThinkingIndicator label={t("playground.thinking")} />
                            ) : (
                              <div className="relative">
                                <ChatMarkdown content={message.content} />
                                {isStreamingMessage && <StreamingCursor />}
                              </div>
                            )}
                            {message.status === "cancelled" && (
                              <p className="mt-2 text-xs text-[color:var(--muted)]">{t("playground.stopped")}</p>
                            )}
                            {showSources && (
                              <div className="mt-3 space-y-2 border-t border-border pt-3">
                                <p className="text-xs font-medium text-[color:var(--muted)]">
                                  {t("playground.sources")}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {message.sources!.map((source) => (
                                    <button
                                      key={source.slug}
                                      type="button"
                                      onClick={() => void openSource(source.slug, source.title)}
                                      className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-900/60"
                                    >
                                      {source.title}
                                    </button>
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

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
          {error && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40">
              <div className="min-w-0">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                {retryMessage && !isStreaming && (
                  <button
                    type="button"
                    onClick={() => void handleSend(retryMessage)}
                    className="mt-1 text-xs font-medium text-red-700 underline dark:text-red-300"
                  >
                    {t("playground.retry")}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="shrink-0 text-xs font-medium text-red-700 underline dark:text-red-300"
              >
                {t("playground.dismiss")}
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-5xl gap-3">
            <div className="min-w-0 flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isStreaming || isRestoring}
                rows={2}
                maxLength={maxChars}
                placeholder={t("playground.placeholder")}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
              />
              <p className="mt-1 text-right text-xs text-[color:var(--muted)]">
                {charCount}/{maxChars}
              </p>
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="self-start rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-background-subtle"
              >
                {t("playground.stop")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="self-start rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {t("playground.send")}
              </button>
            )}
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSettingsOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("playground.settings")}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{t("playground.keyHelp")}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1.5 text-[color:var(--muted)] transition hover:bg-background-subtle"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                {t("playground.keyTitle")}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={t("playground.keyPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isStreaming}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="h-10 shrink-0 rounded-lg border border-border px-3 text-xs font-medium transition hover:bg-background-subtle"
                >
                  {showKey ? t("playground.hideKey") : t("playground.showKey")}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(event) => setRememberKey(event.target.checked)}
                    className="h-3.5 w-3.5 accent-brand-600"
                  />
                  {t("playground.rememberKey")}
                </label>
                <Link
                  href="/dashboard/api-keys"
                  className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
                >
                  {t("playground.createKey")} →
                </Link>
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="playground-category"
                className="block text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]"
              >
                {t("playground.category")}
              </label>
              <select
                id="playground-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isStreaming || isRestoring}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
              >
                {CATEGORY_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {categoryLabels[value] ?? value}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-[color:var(--muted)]">
                {t("playground.categoryHelp")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleClear();
                  setSettingsOpen(false);
                }}
                disabled={isStreaming || isRestoring || messages.length === 0}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-background-subtle disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t("playground.clearConversation")}
              </button>
              {sessionId && (
                <Link
                  href={buildChatLogsPath("/dashboard/chat", { session: sessionId })}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-background-subtle"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {t("playground.viewLogs")}
                </Link>
              )}
              <Link
                href="/docs/endpoints"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-900/20"
              >
                {t("playground.apiReference")}
                <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {sourceView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSourceView(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{sourceView.title}</h2>
                {sourceView.category && (
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-[color:var(--muted)]">
                    {sourceView.category}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSourceView(null)}
                className="shrink-0 rounded-lg p-1.5 text-[color:var(--muted)] transition hover:bg-background-subtle"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {sourceView.loading && (
                <p className="text-sm text-[color:var(--muted)]">
                  {t("playground.thinking")}
                </p>
              )}
              {sourceView.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{sourceView.error}</p>
              )}
              {sourceView.summary && !looksLikeJunkSummary(sourceView.summary) && (
                <p className="mb-4 rounded-lg border border-border bg-background-subtle p-3 text-sm leading-relaxed">
                  {sourceView.summary}
                </p>
              )}
              {sourceView.content && (
                <div className="mx-auto max-w-prose">
                  <ChatMarkdown content={sourceView.content} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
