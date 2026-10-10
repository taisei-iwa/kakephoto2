import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | KAKEPHOTO",
  alternates: {
    canonical: "/en/terms",
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
