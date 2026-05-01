import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kakephoto.com"),
  verification: {
    google: "bYVCwIVNKlH6m1qyjD3IcbRZIWFOEgqpZ2LrDwnNHPM",
  },
  title:
    "KAKEPHOTO（かけフォト）| 写真から作るオーダーメイド掛け軸 — 結婚式・ペット・家族写真の贈り物に",
  description:
    "KAKEPHOTO（かけフォト）は、あなたの写真を一点ずつ手仕立てで掛け軸に仕立てる完全オーダーメイドのアートサービス。文化財修復の職人が制作。結婚式の引き出物・ウェルカムスペース、愛犬／ペットのメモリアル、家族写真、祖父母や孫への贈り物、還暦・米寿・古希のお祝いにも。海外発送対応（要見積もり）。",
  keywords: [
    // ブランド表記ゆれ
    "KAKEPHOTO",
    "kakephoto",
    "かけフォト",
    "カケフォト",
    "かけふぉと",
    // コア商材
    "掛け軸",
    "掛軸",
    "写真 掛け軸",
    "写真 掛軸",
    "オーダーメイド 掛け軸",
    "カスタム 掛け軸",
    "掛け軸 オーダー",
    "掛け軸 オリジナル",
    "写真 表装",
    "写真 軸装",
    // ギフト系
    "掛け軸 ギフト",
    "結婚式 引き出物",
    "結婚式 ウェルカムスペース",
    "結婚 記念品",
    "両親 プレゼント 結婚式",
    "祖父母 プレゼント",
    "孫 写真 プレゼント",
    "還暦祝い",
    "古希祝い",
    "米寿祝い",
    // ペット
    "ペット メモリアル",
    "愛犬 写真",
    "愛猫 写真",
    "ペット 写真 アート",
    "ペット 仏壇 写真",
    // インテリア
    "写真 アート",
    "写真 インテリア",
    "和 インテリア",
    "日本 アート",
    "和モダン アート",
    // 制作背景
    "文化財修復",
    "和紙 印刷",
    "裂地",
    // 写真家・作品
    "写真家 作品 掛け軸",
    "写真展 掛け軸",
  ],
  openGraph: {
    title: "KAKEPHOTO（かけフォト）| 写真から作るオーダーメイド掛け軸",
    description:
      "あなたの写真を、日本の美で包む。文化財修復の職人による完全オーダーメイドの掛け軸。結婚式・ペット・家族写真の贈り物にも。",
    siteName: "KAKEPHOTO（かけフォト）",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KAKEPHOTO（かけフォト）| 写真から作るオーダーメイド掛け軸",
    description:
      "あなたの写真を、日本の美で包む。文化財修復の職人による完全オーダーメイドの掛け軸。結婚式・ペット・家族写真の贈り物にも。",
  },
  alternates: {
    canonical: "/",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
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
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-KRCSGD4ZWP" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-KRCSGD4ZWP');`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "KAKEPHOTO",
              alternateName: ["KAKEPHOTO", "かけフォト", "カケフォト", "Kake Photo"],
              url: "https://kakephoto.com",
              logo: "https://kakephoto.com/images/logo-horizontal.svg",
              description:
                "Custom Japanese hanging scrolls (kakejiku) made from your photograph by cultural-heritage artisans. 写真から作るオーダーメイド掛け軸。",
              founder: { "@type": "Person", name: "Iwasaki Seishodo / 岩﨑精正堂" },
              sameAs: [
                "https://www.instagram.com/kakephoto_art/",
                "https://line.me/R/ti/p/@447updgf",
              ],
              address: {
                "@type": "PostalAddress",
                streetAddress: "355 Iwaya",
                addressLocality: "Nanto",
                addressRegion: "Toyama",
                postalCode: "932-0203",
                addressCountry: "JP",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "iwasaki.seishodo@gmail.com",
                telephone: "+81-763-82-3529",
                availableLanguage: ["Japanese", "English"],
              },
            }),
          }}
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: `(function(){function uz(){var w=window.innerWidth;document.querySelectorAll('.vp-pc-root').forEach(function(el){el.style.zoom=w/1920;});document.querySelectorAll('.vp-sp-root').forEach(function(el){el.style.zoom=w/375;});}uz();window.addEventListener('resize',uz);})();`}} />
        {children}
      </body>
    </html>
  );
}
