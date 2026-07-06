"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPlaygroundMessage } from "@/app/actions/playground";
import { ChatMarkdown } from "@/components/chat-markdown";
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

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="font-semibold">API Playground</h2>
          <p className="text-sm text-zinc-500">
            Test the same AI pipeline as <code className="text-xs">POST /api/v1/chat</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending || messages.length === 0}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Clear chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg font-medium">Try the Islamic AI assistant</p>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Ask a question below. Answers are grounded in TanyaLah Ustaz knowledge and
              generated via OpenRouter — same as your production API integration.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isPending}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-emerald-950/30"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <>
                      <ChatMarkdown content={message.content} />
                      <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        {message.model && (
                          <p className="text-xs text-zinc-500">Model: {message.model}</p>
                        )}
                        {message.sources && message.sources.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500">Knowledge sources</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {message.sources.map((source) => (
                                <span
                                  key={source.slug}
                                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                >
                                  {source.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                    </span>
                    Searching knowledge and generating answer…
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30">
            {error}
          </p>
        )}
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            rows={2}
            placeholder="Ask an Islamic question… (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-emerald-600 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isPending || input.trim().length < 3}
            className="self-end rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send"}
          </button>
        </div>
        {sessionId && (
          <p className="mx-auto mt-2 max-w-3xl font-mono text-xs text-zinc-400">
            session: {sessionId}
          </p>
        )}
      </div>
    </div>
  );
}
