import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Custom Japanese Hanging Scroll from Your Photo | KAKEPHOTO — kakejiku for weddings, pets & family",
  description:
    "Turn your photograph into a one-of-a-kind Japanese hanging scroll (kakejiku) — also known as a Japanese wall scroll. Hand-crafted by cultural-heritage artisans. Personalized Japanese wall art for wedding gifts, pet memorials, family keepsakes, and grandparent gifts. Worldwide shipping by quote.",
  keywords: [
    // Core English search terms
    "Japanese hanging scroll",
    "custom Japanese hanging scroll",
    "personalized Japanese hanging scroll",
    "Japanese hanging scroll from photo",
    "photo Japanese hanging scroll",
    "custom Japanese wall scroll",
    "Japanese wall scroll",
    "photo kakejiku",
    "custom kakejiku",
    "kakejiku",
    "Japanese wall art",
    "Japanese wall art gift",
    "Japanese photo art",
    "Japanese scroll painting custom",
    "washi photo print",
    // Gift use-cases
    "wedding photo wall scroll",
    "Japanese wedding gift",
    "wedding welcome scroll",
    "wedding welcome sign Japanese",
    "anniversary gift Japanese",
    "grandparents gift Japanese",
    "family photo wall art",
    "custom family portrait",
    // Pet
    "pet memorial wall art",
    "custom pet portrait scroll",
    "dog memorial Japanese",
    "cat memorial wall art",
    // Photographer / artist
    "Japanese scroll for photography artists",
    "fine art photo display",
    "custom photo display Japanese",
    // Brand variations
    "KAKEPHOTO",
    "kakephoto",
    "Kake Photo",
  ],
  alternates: {
    canonical: "/en",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    title:
      "Custom Japanese Hanging Scroll from Your Photo | KAKEPHOTO",
    description:
      "Wrap your photograph in Japanese beauty. A custom Japanese hanging scroll (kakejiku) hand-crafted by cultural-heritage artisans — for weddings, pets, and family keepsakes.",
    siteName: "KAKEPHOTO",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Custom Japanese Hanging Scroll from Your Photo | KAKEPHOTO",
    description:
      "Wrap your photograph in Japanese beauty. A custom Japanese hanging scroll (kakejiku) hand-crafted by cultural-heritage artisans — for weddings, pets, and family keepsakes.",
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
