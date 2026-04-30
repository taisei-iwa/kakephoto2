import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Guide | KAKEPHOTO",
  alternates: {
    canonical: "/en/cancel-policy",
    languages: {
      ja: "/cancel-policy",
      en: "/en/cancel-policy",
      "x-default": "/cancel-policy",
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
