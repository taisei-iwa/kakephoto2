import type { MetadataRoute } from "next";

const baseUrl = "https://kakephoto.com";

// Each language pair is rendered as one entry whose `alternates.languages`
// points to its counterpart. Google reads this as a single canonical group.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pairs: Array<{ ja: string; en: string; priority: number }> = [
    { ja: "/", en: "/en", priority: 1 },
    { ja: "/contact", en: "/en/contact", priority: 0.7 },
    { ja: "/cancel-policy", en: "/en/cancel-policy", priority: 0.4 },
    { ja: "/privacy-policy", en: "/en/privacy-policy", priority: 0.3 },
    { ja: "/terms", en: "/en/terms", priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const { ja, en, priority } of pairs) {
    const languages = {
      ja: `${baseUrl}${ja}`,
      en: `${baseUrl}${en}`,
      "x-default": `${baseUrl}${ja}`,
    };
    entries.push({
      url: `${baseUrl}${ja}`,
      lastModified,
      changeFrequency: "monthly",
      priority,
      alternates: { languages },
    });
    entries.push({
      url: `${baseUrl}${en}`,
      lastModified,
      changeFrequency: "monthly",
      priority,
      alternates: { languages },
    });
  }
  return entries;
}
