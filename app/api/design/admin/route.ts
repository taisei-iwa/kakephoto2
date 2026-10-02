/**
 * GET /api/design/admin?id=KP-XXXXXX&file=meta.json|ten.jpg|chi.jpg|ten.json|ten_raw.jpg|…
 * 職人が印刷用に清書するとき、注文のデザイン番号から案と画像を取り出す(紙表具デザイン/gen_final.py が使う)。
 * POST /api/design/admin { id, action: "ordered" } — 注文に使った印を付ける(付いたものは 1 年の自動削除の対象外)。
 * どちらもヘッダー x-admin-token が環境変数 DESIGN_ADMIN_TOKEN と一致したときだけ。
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { DesignMeta, getFile, getJSON, putFile } from "@/lib/design/store";

export const runtime = "nodejs";

function allowed(token: string | null) {
  const want = process.env.DESIGN_ADMIN_TOKEN || "";
  if (!want || !token || token.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!allowed(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const u = new URL(req.url);
  const id = u.searchParams.get("id") || "";
  const file = u.searchParams.get("file") || "meta.json";
  if (!/^KP-[0-9A-Z]{6}$/.test(id) || !/^(meta\.json|(ten|chi)\.json|(ten|chi)(_raw)?\.(jpg|png))$/.test(file)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const data = await getFile(`${id}/${file}`);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const type = file.endsWith(".json") ? "application/json" : file.endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!allowed(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!/^KP-[0-9A-Z]{6}$/.test(body.id || "") || body.action !== "ordered") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const meta = await getJSON<DesignMeta>(`${body.id}/meta.json`);
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!meta.ordered) {
    meta.ordered = true;
    meta.orderedAt = new Date().toISOString();
    await putFile(`${meta.id}/meta.json`, JSON.stringify(meta, null, 1));
  }
  return NextResponse.json({ ok: true, orderedAt: meta.orderedAt });
}
