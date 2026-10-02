/**
 * 職人用の窓口。どれもヘッダー x-admin-token が環境変数 DESIGN_ADMIN_TOKEN と一致したときだけ。
 *
 * GET  ?id=KP-XXXXXX&file=meta.json|ten.jpg|chi.jpg|both.jpg|preview.jpg|review.json|ten.json|…
 *      印刷用の清書(紙表具デザイン/gen_final.py)や評価画面が、デザインの中身を取り出す。
 * GET  ?list=1&before=<目印>&limit=24&filter=all|unreviewed
 *      評価画面の一覧(新しい順)。各デザインの要点・測った値・評価を返す。
 * POST { id, action: "ordered" }  注文に使った印(1 年の自動削除の対象外)。
 * POST { id, action: "review", rating: "good"|"bad", tags: [..], comment }
 *      職人の評価を記録し、lessons.json(次の案づくりの見本)にも反映する。2026-10-02 本人「世界中の記録を僕が良い悪いを記録して学ばせ続ける」。
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import type { Lesson } from "@/lib/design/config";
import { DesignMeta, getFile, getJSON, listKeys, putFile } from "@/lib/design/store";

export const runtime = "nodejs";
export const maxDuration = 30;

const ID = /^KP-[0-9A-Z]{6}$/;
const TAGS = ["色", "構図", "柄", "余白", "物語", "季節", "写真との相性", "天地の統一", "品・質感", "見立て"];
const LESSON_KEEP = 80;

function allowed(token: string | null) {
  const want = process.env.DESIGN_ADMIN_TOKEN || "";
  if (!want || !token || token.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(want));
}

type Review = { rating: "good" | "bad"; tags: string[]; comment: string; at: string };

export async function GET(req: Request) {
  if (!allowed(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const u = new URL(req.url);
  if (u.searchParams.get("list")) return list(u);
  const id = u.searchParams.get("id") || "";
  const file = u.searchParams.get("file") || "meta.json";
  if (!ID.test(id) || !/^(meta\.json|review\.json|preview\.jpg|(ten|chi)\.json|(ten|chi|both)(_raw)?\.(jpg|png))$/.test(file)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const data = await getFile(`${id}/${file}`);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const type = file.endsWith(".json") ? "application/json" : file.endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}

async function list(u: URL) {
  const limit = Math.min(48, Math.max(1, Number(u.searchParams.get("limit")) || 24));
  const before = u.searchParams.get("before") || "";
  const unreviewedOnly = u.searchParams.get("filter") === "unreviewed";
  const keys = (await listKeys("idx/")).reverse().filter((k) => !before || k < before);
  const items = [];
  let last = "";
  for (const k of keys) {
    if (items.length >= limit) break;
    last = k;
    const id = k.slice(k.lastIndexOf("_") + 1);
    const meta = await getJSON<DesignMeta>(`${id}/meta.json`);
    if (!meta) continue;
    const review = await getJSON<Review>(`${id}/review.json`);
    if (unreviewedOnly && review) continue;
    const rec = await getJSON<{ metrics?: unknown; failed?: string[]; tries?: number }>(`${id}/ten.json`);
    items.push({
      id,
      createdAt: meta.createdAt,
      variant: meta.variant,
      pair: meta.pair,
      picked: !!meta.picked,
      ordered: !!meta.ordered,
      concept: meta.brief.concept_ja,
      scene: meta.brief.scene_ja,
      mitate: meta.brief.mitate_ja,
      season: meta.brief.season,
      wishes: meta.wishes,
      palette: meta.palette,
      photo: meta.photo,
      rendered: !!rec,
      metrics: rec?.metrics,
      failed: rec?.failed,
      tries: rec?.tries,
      hasPreview: !!(await getFile(`${id}/preview.jpg`)),
      review,
    });
  }
  const more = keys.length > 0 && last !== keys[keys.length - 1];
  return NextResponse.json({ items, next: more ? last : null, tags: TAGS });
}

export async function POST(req: Request) {
  if (!allowed(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!ID.test(body.id || "")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const meta = await getJSON<DesignMeta>(`${body.id}/meta.json`);
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.action === "ordered") {
    if (!meta.ordered) {
      meta.ordered = true;
      meta.orderedAt = new Date().toISOString();
      await putFile(`${meta.id}/meta.json`, JSON.stringify(meta, null, 1));
    }
    return NextResponse.json({ ok: true, orderedAt: meta.orderedAt });
  }

  if (body.action === "review") {
    if (body.rating !== "good" && body.rating !== "bad") return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const review: Review = {
      rating: body.rating,
      tags: (Array.isArray(body.tags) ? body.tags : []).filter((t: unknown) => typeof t === "string" && TAGS.includes(t)),
      comment: typeof body.comment === "string" ? body.comment.trim().slice(0, 300) : "",
      at: new Date().toISOString(),
    };
    await putFile(`${meta.id}/review.json`, JSON.stringify(review, null, 1));
    // 次の案づくりの見本に反映(同じデザインの古い評価は置き換え、新しい LESSON_KEEP 件だけ残す)
    const lessons = ((await getJSON<(Lesson & { id: string })[]>("lessons.json")) || []).filter((l) => l.id !== meta.id);
    lessons.push({
      id: meta.id,
      rating: review.rating,
      tags: review.tags,
      comment: review.comment,
      concept: meta.brief.concept_ja,
      scene: meta.brief.scene_ja,
      variant: meta.variant,
    });
    await putFile("lessons.json", JSON.stringify(lessons.slice(-LESSON_KEEP), null, 1));
    return NextResponse.json({ ok: true, review });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
