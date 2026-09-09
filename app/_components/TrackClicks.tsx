"use client";

import { useEffect } from "react";

// 外部導線のクリックを GA4 イベントとして送る(ダッシュボードのファネル用)。
// line_click / simulator_click / instagram_click
export default function TrackClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest("a[href]");
      if (!a || typeof window.gtag !== "function") return;
      const href = a.getAttribute("href") ?? "";
      if (href.includes("line.me")) window.gtag("event", "line_click");
      else if (href.includes("/simulator")) window.gtag("event", "simulator_click");
      else if (href.includes("instagram.com")) window.gtag("event", "instagram_click");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
