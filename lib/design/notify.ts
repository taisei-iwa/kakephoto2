/**
 * 「写真に合わせてデザインする」が使われたら、職人にメールで知らせる(Resend)。
 * 2026-10-02 本人依頼。宛先は kakephoto.jp@gmail.com(環境変数 DESIGN_NOTIFY_TO で変えられる)。
 * - RESEND_API_KEY が無ければ何もしない(ローカルや設定前でもデザインは止めない)
 * - 送信元は Resend の試用ドメイン(アカウント本人の宛先にだけ送れる。ドメイン設定は不要)
 * - 画像は入れない(お客様の写真入りの見本がメールに残ると、1 年で消す約束から外れる)。見本は評価画面で見る
 * - 失敗しても投げない(お客様のデザインを優先)
 */
import { Answers, answerLabels } from "@/lib/design/words";

const TO = process.env.DESIGN_NOTIFY_TO || "kakephoto.jp@gmail.com";
const FROM = "KAKEPHOTO シミュレーター <onboarding@resend.dev>";
const REVIEW_URL = "https://kakephoto.com/simulator/review.html";

const MOOD: Record<string, string> = { calm: "落ち着いた", gorgeous: "華やか", lovely: "かわいらしい", dignified: "凛とした" };
const TONE: Record<string, string> = { photo: "写真の色に合わせる", pale: "淡く", deep: "深く" };
const DENSITY: Record<string, string> = { airy: "余白を多く", balanced: "ほどよく", rich: "にぎやかに" };

export async function notifyDesignStarted(d: {
  ids: string[];
  createdAt: string;
  scene: string;
  concept: string;
  wishes: { mood?: string; tone?: string; density?: string; note?: string } & Answers;
  words?: string[];
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const w = d.wishes || {};
  const wish = [...answerLabels(w), MOOD[w.mood || ""], TONE[w.tone || ""], DENSITY[w.density || ""], w.note ? "「" + w.note + "」" : ""].filter(Boolean).join("・") || "おまかせ";
  const at = new Date(d.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const text = [
    "シミュレーターで「写真に合わせてデザインする」が使われました。",
    "",
    "番号: " + d.ids.join(" / "),
    "日時: " + at,
    "写真: " + d.scene,
    "案: " + d.concept,
    "要望: " + wish,
    ...(d.words && d.words.length ? ["イメージ: " + d.words.join("・")] : []),
    "",
    "見本と評価: " + REVIEW_URL,
  ].join("\n");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], subject: "デザインが使われました(" + d.ids[0] + ")", text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.error("design/notify", r.status, await r.text().catch(() => ""));
  } catch (e) {
    console.error("design/notify", e);
  }
}
