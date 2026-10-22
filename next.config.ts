import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // search を省略すると、クエリ文字列の有無にかかわらず pathname にマッチする
    localPatterns: [
      { pathname: "/images/**" },
    ],
  },
  async redirects() {
    // 七五三の着地ページは 2026-10-22 に廃止。広告の古いリンクはトップへ(UTM はそのまま引き継がれる)
    return [{ source: "/shichigosan", destination: "/", permanent: true }];
  },
};

export default nextConfig;
