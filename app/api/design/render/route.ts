/**
 * POST /api/design/render — 決めた案から、天と地をつなげた 1 枚の絵を描き、上下に切り分けて返す。
 * 受け取る: { id }
 * 返す:     { ten: "data:image/jpeg;base64,…", chi: "data:image/jpeg;base64,…" }(白い余白を切り、部位の縦横比どおり)
 * 2026-10-02 本人「天地で統一感がない」→ 別々に 2 枚描くのをやめ、1 枚から切り出す(画風・色・紙の色が必ず揃う)。
 * 2026-10-02 美しさの研究の段階 3: できた絵を測り(柄の割合・鮮やかさ・紙の色とのずれ)、基準外なら 1 回だけ描き直す。
 * 地の色は計算で決めた紙の色に補正して合わせる(lib/design/metrics.ts)。測った値は記録に残し、評価と突き合わせて基準を直す。
 * 指示文はサーバーに保存した案から作る(画面から任意の指示文を送らせない)。
 */
import { NextResponse } from "next/server";
import sharp from "sharp";
import { IMAGE_MODEL, combinedPrompt, nearestAspect, partPrompt, retryNote } from "@/lib/design/config";
import { generateImage, GeminiError } from "@/lib/design/gemini";
import { DesignMeta, getFile, getJSON, putFile } from "@/lib/design/store";
import { correctToBase, judge, measureDesign } from "@/lib/design/metrics";
import { quietCut, trimAndFit, trimEdgeLines } from "@/lib/design/trim";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!/^KP-[0-9A-Z]{6}$/.test(body.id || "")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const meta = await getJSON<DesignMeta>(`${body.id}/meta.json`);
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (await getFile(`${meta.id}/ten.jpg`)) return NextResponse.json({ error: "already_rendered" }, { status: 409 });

  const { ten, chi } = meta.parts;
  const wishes = meta.wishes || {};
  const totalH = ten.hMm + chi.hMm;
  const ratio = ten.wMm / totalH; // 天と地は同じ幅
  const aspect = nearestAspect(ratio);
  const pal = { base: meta.palette?.base || "#e9e2d4", accent: meta.palette?.accent ?? null };
  const prompt = combinedPrompt(meta.brief, ten.hMm / totalH, aspect, wishes, pal);
  try {
    // 描いて測る。台紙付きで余白を切ると小さすぎる、または基準外(柄が多すぎ・少なすぎ、写真より鮮やか、
    // 紙の色が大きくずれる)なら 1 回だけ描き直す。2 回目も外れたら、基準に近い方を使う
    type Try = { raw: Buffer; fit: Awaited<ReturnType<typeof trimAndFit>>; m: Awaited<ReturnType<typeof measureDesign>>; why: string[] };
    const tried: Try[] = [];
    while (tried.length < 2) {
      // 2 回目は、1 回目の外れた理由を指示に足す(同じ失敗を繰り返さないように)
      const p = tried.length ? retryNote(tried[tried.length - 1].why) + " " + prompt : prompt;
      const raw = await generateImage(IMAGE_MODEL, p, aspect);
      const fit = await trimAndFit(raw, ratio);
      const m = await measureDesign(fit.jpeg, pal.base);
      const why = judge(m.metrics, meta.photo?.colorfulness ?? 40);
      if (fit.cutArea < 0.6) why.push("small_after_trim");
      tried.push({ raw, fit, m, why });
      if (!why.length) break;
    }
    const best = tried.slice().sort((x, y) => x.why.length - y.why.length)[0]; // 外れた理由が少ない方
    const raw = best.raw, fit = best.fit, tries = tried.length;
    // 地の色を紙の色に合わせる(ずれが目に見えるとき)
    let combined = fit.jpeg;
    if (best.m.metrics.bgDelta > 6 && best.m.metrics.bgDelta <= 30) combined = await correctToBase(fit.jpeg, best.m.bgLab, pal.base);
    // 天の高さの割合の近くで、柄がいちばん少ない行で上下に切る。ずれた分は、それぞれの部位の縦横比に
    // 詰め直す(地は空いた上側、天は必要なら左右を、柄の多い位置を残して詰める)
    const [W, H] = fit.px;
    const cut = await quietCut(combined, ten.hMm / totalH);
    const tenRaw = await sharp(combined).extract({ left: 0, top: 0, width: W, height: cut }).toBuffer();
    const chiRaw = await sharp(combined).extract({ left: 0, top: cut, width: W, height: H - cut }).toBuffer();
    // 端に描かれた細い筋を、天・地それぞれで切る(補正後の地の色を基準に)
    const bgNow = best.m.metrics.bgDelta > 6 && best.m.metrics.bgDelta <= 30 ? (await measureDesign(combined, pal.base)).bgLab : best.m.bgLab;
    const tenEdge = await trimEdgeLines(tenRaw, bgNow);
    const chiEdge = await trimEdgeLines(chiRaw, bgNow);
    const tenFit = await trimAndFit(tenEdge.jpeg, ten.wMm / ten.hMm, { trim: false });
    const chiFit = await trimAndFit(chiEdge.jpeg, chi.wMm / chi.hMm, { trim: false });
    const tenJpg = tenFit.jpeg, chiJpg = chiFit.jpeg;

    const isPng = raw[0] === 0x89;
    await putFile(`${meta.id}/both_raw.${isPng ? "png" : "jpg"}`, raw);
    await putFile(`${meta.id}/both.jpg`, combined);
    await putFile(`${meta.id}/ten.jpg`, tenJpg);
    await putFile(`${meta.id}/chi.jpg`, chiJpg);
    // 部位ごとの記録。prompt は 4K の清書(部位ごと)で使う指示文、combinedPrompt は実際に描かせた指示文
    const rec = (part: "ten" | "chi", px: [number, number]) =>
      JSON.stringify(
        {
          prompt: partPrompt(part, meta.brief, meta.parts[part].aspect, wishes, pal),
          combinedPrompt: prompt,
          model: IMAGE_MODEL,
          aspect,
          px,
          tries,
          box: fit.box,
          cut,
          edgeCut: part === "ten" ? tenEdge.cut : chiEdge.cut, // 端の筋を切った幅 [上, 右, 下, 左] px
          cutTarget: Math.round((H * ten.hMm) / totalH),
          metrics: best.m.metrics,
          failed: best.why,
          attempts: tried.map((t) => ({ metrics: t.m.metrics, why: t.why })),
        },
        null,
        1
      );
    await putFile(`${meta.id}/ten.json`, rec("ten", tenFit.px));
    await putFile(`${meta.id}/chi.json`, rec("chi", chiFit.px));
    return NextResponse.json({
      ten: "data:image/jpeg;base64," + tenJpg.toString("base64"),
      chi: "data:image/jpeg;base64," + chiJpg.toString("base64"),
    });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    console.error("design/render", e);
    return NextResponse.json({ error: status === 429 ? "busy" : "failed" }, { status });
  }
}
