import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DEVELOPER_PORTAL_NAME } from "@/lib/brand";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getMessages, getTranslations } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: t("meta.layoutTitle"),
      template: `%s · ${DEVELOPER_PORTAL_NAME}`,
    },
    description: t("meta.layoutDescription"),
    keywords: [
      "Islamic AI API",
      "TanyaLah Ustaz",
      "fiqh API",
      "Islamic knowledge API",
      "Muslim app integration",
      "Islamic knowledge base",
    ],
    authors: [{ name: "TanyaLah Ustaz" }],
    openGraph: {
      type: "website",
      url: appUrl,
      siteName: DEVELOPER_PORTAL_NAME,
      title: t("meta.layoutTitle"),
      description: t("meta.ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.layoutTitle"),
      description: t("meta.ogDescription"),
    },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
