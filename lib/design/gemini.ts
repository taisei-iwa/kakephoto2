/**
 * Gemini API の呼び出し(サーバー側だけで使う。API キーはブラウザに出さない)。
 * キーは環境変数 GEMINI_API_KEY(Netlify の管理画面 / ローカルは .env.local)。
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

async function call(model: string, body: unknown, timeoutMs: number) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY が設定されていません", 500);
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new GeminiError(`Gemini ${model} ${res.status}: ${text}`, res.status === 429 ? 429 : 502);
  }
  return res.json();
}

/** 写真(JPEG の base64)と指示文から、決めた形の JSON を返させる */
export async function analyzeImage(model: string, prompt: string, schema: unknown, jpegB64: string) {
  const res = await call(
    model,
    {
      contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: jpegB64 } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema },
    },
    40_000
  );
  const text = res?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("読み取り結果を解釈できませんでした", 502);
  }
}

/** 指示文から画像を 1 枚作る。返り値は画像のバイト列 */
export async function generateImage(model: string, prompt: string, aspect: string): Promise<Buffer> {
  const res = await call(
    model,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    },
    55_000
  );
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p: { inlineData?: { data: string } }) => p.inlineData);
  if (!img) throw new GeminiError("画像が返ってきませんでした", 502);
  return Buffer.from(img.inlineData.data, "base64");
}
