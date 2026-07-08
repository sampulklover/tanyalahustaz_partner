import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEVELOPER_PORTAL_NAME } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${DEVELOPER_PORTAL_NAME} — Islamic AI API`,
    template: `%s · ${DEVELOPER_PORTAL_NAME}`,
  },
  description:
    "Developer platform and API for embedding TanyaLah Ustaz Islamic AI in your product. Knowledge-backed answers with source citations. Documentation, API keys, and playground.",
  keywords: [
    "Islamic AI API",
    "TanyaLah Ustaz",
    "fiqh API",
    "Muslim developer API",
    "RAG chatbot",
    "Islamic knowledge base",
  ],
  authors: [{ name: "TanyaLah Ustaz" }],
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: DEVELOPER_PORTAL_NAME,
    title: `${DEVELOPER_PORTAL_NAME} — Islamic AI API`,
    description:
      "Add trustworthy, knowledge-backed Islamic AI to your product with a single API call. Grounded answers with source citations.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${DEVELOPER_PORTAL_NAME} — Islamic AI API`,
    description:
      "Add trustworthy, knowledge-backed Islamic AI to your product with a single API call.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
