import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ | KAKEPHOTO（かけフォト）",
  alternates: {
    canonical: "/contact",
    languages: {
      ja: "/contact",
      en: "/en/contact",
      "x-default": "/contact",
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
