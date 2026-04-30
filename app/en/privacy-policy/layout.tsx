import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | KAKEPHOTO",
  alternates: {
    canonical: "/en/privacy-policy",
    languages: {
      ja: "/privacy-policy",
      en: "/en/privacy-policy",
      "x-default": "/privacy-policy",
    },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
