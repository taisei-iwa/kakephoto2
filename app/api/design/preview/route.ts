/**
 * POST /api/design/preview — 評価用の小さな見本(写真を入れた掛軸全体の縮小画像)を受け取って保存する。
 * 受け取る: { id, image: "data:image/jpeg;base64,…"(長い辺 400px 程度) }
 * 2026-10-02 本人決定「小さい見本だけ保存する。評価に使うため」。同意画面とプライバシーポリシー第 7 条に明記。
 * 1 つのデザインにつき 1 回だけ(上書きさせない)。大きすぎるものは受け付けない。
 */
import { NextResponse } from "next/server";
import { getFile, putFile } from "@/lib/design/store";
import { checkOrigin } from "@/lib/design/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.image || "");
  if (!/^KP-[0-9A-Z]{6}$/.test(body.id || "") || !m || m[1].length > 400_000) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await getFile(`${body.id}/meta.json`))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (await getFile(`${body.id}/preview.jpg`)) return NextResponse.json({ ok: true });
  await putFile(`${body.id}/preview.jpg`, Buffer.from(m[1], "base64"));
  return NextResponse.json({ ok: true });
}
