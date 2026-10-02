/**
 * POST /api/design/render — 決めた案から、天と地をつなげた 1 枚の絵を描き、上下に切り分けて返す。
 * 受け取る: { id }
 * 返す:     { ten: "data:image/jpeg;base64,…", chi: "data:image/jpeg;base64,…" }(白い余白を切り、部位の縦横比どおり)
 * 2026-10-02 本人「天地で統一感がない」→ 別々に 2 枚描くのをやめ、1 枚から切り出す(画風・色・紙の色が必ず揃う)。
 * 指示文はサーバーに保存した案から作る(画面から任意の指示文を送らせない)。
 */
import { NextResponse } from "next/server";
import sharp from "sharp";
import { IMAGE_MODEL, combinedPrompt, nearestAspect, partPrompt } from "@/lib/design/config";
import { generateImage, GeminiError } from "@/lib/design/gemini";
import { DesignMeta, getFile, getJSON, putFile } from "@/lib/design/store";
import { quietCut, trimAndFit } from "@/lib/design/trim";

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
  const prompt = combinedPrompt(meta.brief, ten.hMm / totalH, aspect, wishes);
  try {
    // 台紙付きで描かれて、余白を切ると絵が小さくなりすぎたときは 1 回だけ作り直す
    let raw: Buffer | null = null, fit: Awaited<ReturnType<typeof trimAndFit>> | null = null, tries = 0;
    while (tries < 2) {
      tries++;
      raw = await generateImage(IMAGE_MODEL, prompt, aspect);
      fit = await trimAndFit(raw, ratio);
      if (fit.cutArea >= 0.6) break;
    }
    // 天の高さの割合の近くで、柄がいちばん少ない行で上下に切る。ずれた分は、それぞれの部位の縦横比に
    // 詰め直す(地は空いた上側、天は必要なら左右を、柄の多い位置を残して詰める)
    const [W, H] = fit!.px;
    const cut = await quietCut(fit!.jpeg, ten.hMm / totalH);
    const tenRaw = await sharp(fit!.jpeg).extract({ left: 0, top: 0, width: W, height: cut }).toBuffer();
    const chiRaw = await sharp(fit!.jpeg).extract({ left: 0, top: cut, width: W, height: H - cut }).toBuffer();
    const tenFit = await trimAndFit(tenRaw, ten.wMm / ten.hMm, { trim: false });
    const chiFit = await trimAndFit(chiRaw, chi.wMm / chi.hMm, { trim: false });
    const tenJpg = tenFit.jpeg, chiJpg = chiFit.jpeg;

    const isPng = raw![0] === 0x89;
    await putFile(`${meta.id}/both_raw.${isPng ? "png" : "jpg"}`, raw!);
    await putFile(`${meta.id}/both.jpg`, fit!.jpeg);
    await putFile(`${meta.id}/ten.jpg`, tenJpg);
    await putFile(`${meta.id}/chi.jpg`, chiJpg);
    // 部位ごとの記録。prompt は 4K の清書(部位ごと)で使う指示文、combinedPrompt は実際に描かせた指示文
    const rec = (part: "ten" | "chi", px: [number, number]) =>
      JSON.stringify(
        { prompt: partPrompt(part, meta.brief, meta.parts[part].aspect, wishes), combinedPrompt: prompt, model: IMAGE_MODEL, aspect, px, tries, box: fit!.box, cut, cutTarget: Math.round((H * ten.hMm) / totalH) },
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
