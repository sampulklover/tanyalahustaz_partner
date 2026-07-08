import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/docs`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/docs/authentication`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/docs/endpoints`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/signup`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/status`, lastModified, changeFrequency: "daily", priority: 0.7 },
  ];
}
