/**
 * POST /api/design/render — 決めた案から、天か地の絵を 1 枚作る(天と地は画面から同時に呼ぶ)。
 * 受け取る: { id, part: "ten" | "chi" }
 * 返す:     { image: "data:image/jpeg;base64,…" }(白い余白を切り、部位の縦横比に詰めた版)
 * 指示文はサーバーに保存した案から作る(画面から任意の指示文を送らせない)。
 */
import { NextResponse } from "next/server";
import { IMAGE_MODEL, partPrompt } from "@/lib/design/config";
import { generateImage, GeminiError } from "@/lib/design/gemini";
import { DesignMeta, getFile, getJSON, putFile } from "@/lib/design/store";
import { trimAndFit } from "@/lib/design/trim";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { id?: string; part?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const part = body.part === "ten" || body.part === "chi" ? body.part : null;
  if (!part || !/^KP-[0-9A-Z]{6}$/.test(body.id || "")) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const meta = await getJSON<DesignMeta>(`${body.id}/meta.json`);
  if (!meta) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (await getFile(`${meta.id}/${part}.jpg`)) return NextResponse.json({ error: "already_rendered" }, { status: 409 });

  const { wMm, hMm, aspect } = meta.parts[part];
  const prompt = partPrompt(part, meta.brief, aspect, meta.wishes || {});
  try {
    // 台紙付きで描かれて、余白を切ると絵が小さくなりすぎたときは 1 回だけ作り直す
    let raw: Buffer | null = null, fit: Awaited<ReturnType<typeof trimAndFit>> | null = null, tries = 0;
    while (tries < 2) {
      tries++;
      raw = await generateImage(IMAGE_MODEL, prompt, aspect);
      fit = await trimAndFit(raw, wMm / hMm);
      if (fit.cutArea >= 0.6) break;
    }
    const isPng = raw![0] === 0x89;
    await putFile(`${meta.id}/${part}_raw.${isPng ? "png" : "jpg"}`, raw!);
    await putFile(`${meta.id}/${part}.jpg`, fit!.jpeg);
    // 天と地は同時に作るので、meta.json は書き換えず部位ごとの記録に残す
    await putFile(`${meta.id}/${part}.json`, JSON.stringify({ prompt, model: IMAGE_MODEL, px: fit!.px, tries, box: fit!.box }, null, 1));
    return NextResponse.json({ image: "data:image/jpeg;base64," + fit!.jpeg.toString("base64") });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    console.error("design/render", e);
    return NextResponse.json({ error: status === 429 ? "busy" : "failed" }, { status });
  }
}
