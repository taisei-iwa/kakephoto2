import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAKEPHOTO（かけフォト）| 写真を掛け軸に仕立てる完全オーダーメイド",
  description:
    "KAKEPHOTO（かけフォト）は、あなたの写真を掛け軸に仕立てる完全オーダーメイドのアートサービスです。文化財修復の技術を持つ職人が、一点一点手仕事でお作りします。写真 掛け軸 オーダーメイド ギフト",
  keywords: [
    "KAKEPHOTO",
    "かけフォト",
    "KAKEPHOTO",
    "掛け軸",
    "写真 掛け軸",
    "オーダーメイド 掛け軸",
    "写真 アート",
    "掛け軸 オーダー",
    "掛け軸 ギフト",
    "写真 インテリア",
    "和 インテリア",
    "文化財修復",
  ],
  openGraph: {
    title: "KAKEPHOTO（かけフォト）| 写真を掛け軸に仕立てる完全オーダーメイド",
    description:
      "あなたの写真を、日本の美で包む。文化財修復の職人による完全オーダーメイドの掛け軸。",
    siteName: "KAKEPHOTO（かけフォト）",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KAKEPHOTO（かけフォト）| 写真を掛け軸に仕立てる完全オーダーメイド",
    description:
      "あなたの写真を、日本の美で包む。文化財修復の職人による完全オーダーメイドの掛け軸。",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
