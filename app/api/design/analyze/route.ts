/**
 * POST /api/design/analyze — 写真を読み取り、天地の案(物語・色・指示文)を決めて、デザイン番号を返す。
 * 受け取る: { consent: true, photo: "data:image/jpeg;base64,…"(長い辺 768px 程度), ten: {wMm,hMm}, chi: {wMm,hMm},
 *           wishes?: { mood, tone, density, note }(要望の画面。決まった値と 100 字までの自由記入だけを受け付ける) }
 * 返す:     { id, concept, nakaHex, colors }
 * 写真は読み取りに使うだけで保存しない。
 */
import { NextResponse } from "next/server";
import { ANALYZE_MODEL, ANALYZE_PROMPT, ANALYZE_SCHEMA, cleanWishes, nearestAspect, wishSection } from "@/lib/design/config";
import { analyzeImage, GeminiError } from "@/lib/design/gemini";
import { DesignMeta, newDesignId, putFile } from "@/lib/design/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function POST(req: Request) {
  let body: { consent?: boolean; photo?: string; ten?: { wMm: number; hMm: number }; chi?: { wMm: number; hMm: number }; wishes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (body.consent !== true) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(body.photo || "");
  if (!m || m[1].length > 3_000_000) return NextResponse.json({ error: "bad_photo" }, { status: 400 });
  const okSize = (p?: { wMm: number; hMm: number }) => !!p && p.wMm > 10 && p.hMm > 10 && p.wMm < 2000 && p.hMm < 2000;
  if (!okSize(body.ten) || !okSize(body.chi)) return NextResponse.json({ error: "bad_parts" }, { status: 400 });

  try {
    const wishes = cleanWishes(body.wishes);
    const brief = await analyzeImage(ANALYZE_MODEL, ANALYZE_PROMPT + wishSection(wishes), ANALYZE_SCHEMA, m[1]);
    if (!brief.ok) return NextResponse.json({ error: "unsuitable" }, { status: 422 });
    if (!HEX.test(brief.naka_hex)) brief.naka_hex = "#d9d2c3";
    brief.colors = (brief.colors || []).filter((c: { hex: string }) => HEX.test(c.hex)).slice(0, 5);

    const id = newDesignId();
    const meta: DesignMeta = {
      id,
      createdAt: new Date().toISOString(),
      brief,
      wishes,
      parts: {
        ten: { wMm: body.ten!.wMm, hMm: body.ten!.hMm, aspect: nearestAspect(body.ten!.wMm / body.ten!.hMm) },
        chi: { wMm: body.chi!.wMm, hMm: body.chi!.hMm, aspect: nearestAspect(body.chi!.wMm / body.chi!.hMm) },
      },
    };
    await putFile(`${id}/meta.json`, JSON.stringify(meta, null, 1));
    return NextResponse.json({ id, concept: brief.concept_ja, nakaHex: brief.naka_hex, colors: brief.colors });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    console.error("design/analyze", e);
    return NextResponse.json({ error: status === 429 ? "busy" : "failed" }, { status });
  }
}
