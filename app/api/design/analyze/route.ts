/**
 * POST /api/design/analyze — 写真を読み取り、天地の案(物語・モチーフ)を決めて、2 案ぶんのデザイン番号を返す。
 * 受け取る: { consent: true, photo: "data:image/jpeg;base64,…"(長い辺 768px 程度), ten: {wMm,hMm}, chi: {wMm,hMm},
 *           wishes?: { mood, tone, density, note }(要望の画面。決まった値と 100 字までの自由記入だけを受け付ける) }
 * 返す:     { concept, designs: [{ id, variant, nakaHex, baseHex }, …] }
 * 2026-10-02 美しさの研究(資料/2026-10-02_掛軸の美しさ研究_…)を取り込み:
 * - 色は画像 AI に任せず写真を測って決める(color.ts)。2 案 = blend(写真になじませる)/ lift(写真を引き立てる)
 * - 職人の評価(lessons.json)を、次の案づくりの見本として指示に入れる
 * 写真は読み取りと色の計測に使うだけで保存しない(評価用の小さな見本は、画面から別に送られる)。
 */
import { NextResponse } from "next/server";
import { ANALYZE_MODEL, ANALYZE_PROMPT, ANALYZE_SCHEMA, Lesson, cleanWishes, lessonsSection, nearestAspect, wishSection } from "@/lib/design/config";
import { chooseColors, measurePhoto, Variant } from "@/lib/design/color";
import { analyzeImage, GeminiError } from "@/lib/design/gemini";
import { DesignMeta, getJSON, newDesignId, putFile } from "@/lib/design/store";

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
    const lessons = (await getJSON<Lesson[]>("lessons.json")) || [];
    const [brief, photo] = await Promise.all([
      analyzeImage(ANALYZE_MODEL, ANALYZE_PROMPT + wishSection(wishes) + lessonsSection(lessons), ANALYZE_SCHEMA, m[1]),
      measurePhoto(Buffer.from(m[1], "base64")),
    ]);
    if (!brief.ok) return NextResponse.json({ error: "unsuitable" }, { status: 422 });
    brief.colors = (brief.colors || []).filter((c: { hex: string }) => HEX.test(c.hex)).slice(0, 5);

    const createdAt = new Date().toISOString();
    const parts = {
      ten: { wMm: body.ten!.wMm, hMm: body.ten!.hMm, aspect: nearestAspect(body.ten!.wMm / body.ten!.hMm) },
      chi: { wMm: body.chi!.wMm, hMm: body.chi!.hMm, aspect: nearestAspect(body.chi!.wMm / body.chi!.hMm) },
    };
    const photoNums = {
      dominant: photo.dominant.hex,
      accent: photo.accent ? photo.accent.hex : null,
      edgeL: Math.round(photo.edgeL * 10) / 10,
      meanC: Math.round(photo.meanC * 10) / 10,
      colorfulness: Math.round(photo.colorfulness * 10) / 10,
    };
    // 2 案(なじませる / 引き立てる)。物語とモチーフは共通で、紙・中廻し・小さな色を変える
    const variants: Variant[] = ["blend", "lift"];
    const ids = variants.map(() => newDesignId());
    const designs = [];
    for (let i = 0; i < variants.length; i++) {
      const c = chooseColors(photo, variants[i], wishes.tone);
      const meta: DesignMeta = {
        id: ids[i],
        createdAt,
        brief,
        wishes,
        parts,
        variant: variants[i],
        pair: ids[1 - i],
        palette: { base: c.base, naka: c.naka, accent: c.accent },
        photo: photoNums,
      };
      await putFile(`${ids[i]}/meta.json`, JSON.stringify(meta, null, 1));
      await putFile(`idx/${createdAt.replace(/[:.]/g, "-")}_${ids[i]}`, ids[i]); // 評価画面の作成順の一覧のため
      designs.push({ id: ids[i], variant: variants[i], nakaHex: c.naka, baseHex: c.base });
    }
    return NextResponse.json({ concept: brief.concept_ja, designs });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    console.error("design/analyze", e);
    return NextResponse.json({ error: status === 429 ? "busy" : "failed" }, { status });
  }
}
