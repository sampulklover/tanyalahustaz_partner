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
  readStoredPlaygroundSessionId,
  writeStoredPlaygroundSessionId,
} from "@/lib/playground-storage";
import { parsePlaygroundStreamChunk, type PlaygroundStreamEvent } from "@/lib/playground-stream";
import type { KnowledgeSource } from "@/lib/types";

type MessageStatus = "complete" | "streaming" | "cancelled" | "error";

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

export function ChatPlayground() {
  const { t, messages: i18nMessages } = useI18n();
  const starterPrompts = i18nMessages.playground.starterPrompts;

  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const sessionIdRef = useRef("");

  const persistSessionId = useCallback((nextSessionId: string) => {
    sessionIdRef.current = nextSessionId;
    setSessionId(nextSessionId);
    writeStoredPlaygroundSessionId(nextSessionId);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedSessionId = readStoredPlaygroundSessionId();
      if (!storedSessionId) {
        if (!cancelled) setIsRestoring(false);
        return;
      }

      const result = await loadPlaygroundHistory(storedSessionId);
      if (cancelled) return;

      if (!result.ok) {
        clearStoredPlaygroundSessionId();
        setError(result.error);
        setIsRestoring(false);
        return;
      }

      if (!result.data.sessionId || result.data.messages.length === 0) {
        clearStoredPlaygroundSessionId();
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
  }, [persistSessionId]);

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: sessionIdRef.current || undefined,
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

        const handleEvent = (event: PlaygroundStreamEvent) => {
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
          buffer = parsePlaygroundStreamChunk(buffer, handleEvent);
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
    [input, isRestoring, isStreaming, persistSessionId, scrollToBottom, t, updateMessage],
  );

  function handleClear() {
    if (isStreaming) stopStreaming();
    setMessages([]);
    persistSessionId("");
    clearStoredPlaygroundSessionId();
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
  const canSend = input.trim().length >= 3 && !isStreaming && !isRestoring;
  const showEmptyState = !isRestoring && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-5">
      <aside className="shrink-0 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          {t("playground.settings")}
        </p>

        <div className="mt-3 space-y-2 lg:mt-4">
            <button
              type="button"
              onClick={handleClear}
              disabled={isStreaming || isRestoring || messages.length === 0}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-subtle disabled:opacity-50"
            >
              {t("playground.clearConversation")}
            </button>
            {sessionId && (
              <Link
                href={buildChatLogsPath("/dashboard/chat", { session: sessionId })}
                className="flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-subtle"
              >
                {t("playground.viewLogs")}
              </Link>
            )}
            <Link
              href="/docs/endpoints"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-900/20"
            >
              {t("playground.apiReference")}
              <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
              </svg>
            </Link>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{t("playground.title")}</p>
              <p className="text-sm text-[color:var(--muted)]">{t("playground.subtitle")}</p>
            </div>
            {isStreaming && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                </span>
                {t("playground.live")}
              </span>
            )}
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
              <p className="mt-4 text-lg font-semibold">{t("playground.emptyTitle")}</p>
              <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">
                {t("playground.emptyDescription")}
              </p>
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
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
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
                    <article className={`max-w-[88%] space-y-1.5 sm:max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
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
                                    <span
                                      key={source.slug}
                                      className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
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
          <div className="mx-auto flex max-w-3xl gap-3">
            <div className="min-w-0 flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
    </div>
  );
}
