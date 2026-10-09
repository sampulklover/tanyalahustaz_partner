"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-markdown text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-6 text-base font-bold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-6 text-[15px] font-bold text-emerald-800 first:mt-0 dark:text-emerald-300">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-sm font-semibold first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote dir="rtl" className="mb-3 rounded-r-md border-r-2 border-emerald-500/50 bg-emerald-50/40 py-2 pr-3 pl-3 text-right text-[15px] leading-loose text-zinc-800 dark:bg-emerald-950/20 dark:text-zinc-200">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
