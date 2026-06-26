import { NextResponse, type NextRequest } from "next/server";

// First-visit auto language: if the visitor has no `lang` cookie and their
// Accept-Language doesn't include Japanese, send them to the /en counterpart.
// Once the user picks a language explicitly (LangSwitcher sets the cookie),
// the cookie is respected forever and the middleware stops redirecting.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieLang = req.cookies.get("lang")?.value;

  // If user already picked, respect it.
  if (cookieLang === "ja" || cookieLang === "en") {
    return NextResponse.next();
  }

  const isOnEn = pathname === "/en" || pathname.startsWith("/en/");

  // No cookie: detect browser preference once.
  const acceptLang = req.headers.get("accept-language") ?? "";

  // クローラー(Googlebot 等)は Accept-Language を送らない。
  // ヘッダが空のリクエストはリダイレクトせず、その URL の内容をそのまま返す。
  // これをしないと日本語ページが検索インデックスから隠れる。
  if (acceptLang === "") {
    return NextResponse.next();
  }

  const prefersJa = acceptLang
    .toLowerCase()
    .split(",")
    .some((tag) => tag.trim().startsWith("ja"));

  if (isOnEn) {
    // User is on /en/* explicitly — remember en.
    const res = NextResponse.next();
    res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  if (prefersJa) {
    const res = NextResponse.next();
    res.cookies.set("lang", "ja", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Non-Japanese visitor on a JP path → redirect to /en counterpart.
  const url = req.nextUrl.clone();
  url.pathname = "/en" + (pathname === "/" ? "" : pathname);
  const res = NextResponse.redirect(url);
  res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export const config = {
  matcher: [
    // Run on all paths except Next internals, static assets, and ACME challenge.
    "/((?!_next|api|simulator|favicon\\.ico|\\.well-known|.*\\.(?:png|jpg|jpeg|svg|ico|webp|avif|gif|woff|woff2|ttf|otf|map)$).*)",
  ],
};
