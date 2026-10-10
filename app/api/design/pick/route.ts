/**
 * POST /api/design/pick — お客様が 2 案(なじませる / 引き立てる)のどちらを選んだかを記録する。
 * 受け取る: { id }(選んだ方)。もう一方(meta.pair)は「選ばれなかった」として残る。
 * どちらの考え方が選ばれやすいかを、評価画面と次の調整の材料にする。
 */
import { NextResponse } from "next/server";
import { DesignMeta, getJSON, putFile } from "@/lib/design/store";
import { checkOrigin } from "@/lib/design/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = checkOrigin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!/^KP-[0-9A-Z]{6}$/.test(body.id || "")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const meta = await getJSON<DesignMeta>(`${body.id}/meta.json`);
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!meta.picked) {
    meta.picked = true;
    await putFile(`${meta.id}/meta.json`, JSON.stringify(meta, null, 1));
  }
  return NextResponse.json({ ok: true });
}
