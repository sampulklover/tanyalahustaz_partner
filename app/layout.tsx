import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "TanyaLah Ustaz — Islamic AI API for developers",
    template: "%s · TanyaLah Ustaz Partner API",
  },
  description:
    "Add trustworthy, knowledge-backed Islamic AI to your product with a single API call. Grounded answers on fiqh, ibadah, and more — with source citations. Free API keys, live playground, and docs.",
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
    siteName: "TanyaLah Ustaz Partner API",
    title: "TanyaLah Ustaz — Islamic AI API for developers",
    description:
      "Add trustworthy, knowledge-backed Islamic AI to your product with a single API call. Grounded answers with source citations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TanyaLah Ustaz — Islamic AI API for developers",
    description:
      "Add trustworthy, knowledge-backed Islamic AI to your product with a single API call.",
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
