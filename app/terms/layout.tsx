import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | KAKEPHOTO（かけフォト）",
  alternates: {
    canonical: "/terms",
    languages: {
      ja: "/terms",
      en: "/en/terms",
      "x-default": "/terms",
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
