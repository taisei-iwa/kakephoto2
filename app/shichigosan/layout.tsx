import type { Metadata } from "next";

// Instagram 広告(七五三)の着地ページ。日本語だけ(英語版は作らない)。
export const metadata: Metadata = {
  title: "七五三の記念に、掛け軸を | KAKEPHOTO（かけフォト）",
  description: "七五三の晴れ姿の写真を、一幅の掛け軸に。着物の色に合わせて裂地を選び、表具師が仕立てます。",
  alternates: { canonical: "/shichigosan" },
  openGraph: { images: ["/images/shichigosan-main.jpg"] },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
