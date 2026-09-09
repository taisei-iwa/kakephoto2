"use client";

import { useEffect } from "react";

// 外部導線のクリックを GA4 と Meta ピクセルの両方に送る(ダッシュボードのファネルと広告計測用)。
// GA4: line_click / simulator_click / instagram_click
// Meta: Contact / ViewContent / InstagramClick
export default function TrackClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";

      if (href.includes("line.me")) {
        window.gtag?.("event", "line_click");
        window.fbq?.("track", "Contact");
      } else if (href.includes("/simulator")) {
        window.gtag?.("event", "simulator_click");
        window.fbq?.("track", "ViewContent");
      } else if (href.includes("instagram.com")) {
        window.gtag?.("event", "instagram_click");
        window.fbq?.("trackCustom", "InstagramClick");
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
