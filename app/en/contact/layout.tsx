import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | KAKEPHOTO",
  alternates: {
    canonical: "/en/contact",
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
