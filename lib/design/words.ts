/**
 * おまかせデザインの 4 問と、答えから選ぶ「イメージの言葉」(2026-10-08 本人決定)。
 * - 質問は 4 問: 飾る場所(まだ決めていない を含む)/ どんな思い出の写真か / 明るさ / 色の澄み方。贈り物の質問は入れない
 * - 言葉は自前で選んだ 16 語(『カラーイメージスケール』の 180 語や配置・配色は写さない。NCD のデータは組み込みに契約が要る)
 * - 答えで 3 つの軸の上の点を動かし、いちばん近い言葉を 2 つ選ぶ。
 *   x = 温かい(+)↔ 涼しい(−) / y = かたい・深い(+)↔ やわらかい・明るい(−) / z = 澄んだ(+)↔ 渋い(−)
 * 言葉の位置と答えの動かし幅は Claude の仮置き。本人の評価(評価画面)で直していく
 */

export const QUESTIONS = {
  place: {
    washitsu: ["和室・床の間", { y: 0.5, z: -0.2 }, "a Japanese tatami room with a tokonoma alcove"],
    living: ["洋室・リビング", { y: -0.3, z: 0.2 }, "a modern western-style living room"],
    entrance: ["玄関・お店", { x: 0.2, y: 0.2, z: 0.2 }, "an entrance hall or a shop, seen by visitors"],
    undecided: ["まだ決めていない", {}, ""],
  },
  memory: {
    celebration: ["お祝い・記念日", { x: 0.6, z: 0.4 }, "a celebration or an anniversary"],
    nostalgia: ["懐かしい思い出", { x: 0.4, z: -0.4 }, "a nostalgic memory"],
    daily: ["日々の暮らし", { x: 0.2, y: -0.3 }, "an everyday moment"],
    quiet: ["静かな景色・作品", { x: -0.4, y: 0.1, z: -0.2 }, "a quiet scene or an artwork"],
    none: ["どれでもない", {}, ""],
  },
  light: {
    light: ["明るく軽やかに", { y: -0.6 }, ""],
    deep: ["落ち着いた深みで", { y: 0.6 }, ""],
    any: ["どちらでも", {}, ""],
  },
  clarity: {
    clear: ["すっきり澄んだ色", { z: 0.7 }, ""],
    muted: ["渋く味わいのある色", { z: -0.7 }, ""],
    any: ["どちらでも", {}, ""],
  },
} as const satisfies Record<string, Record<string, readonly [string, Partial<Look>, string]>>;

export type Look = { x: number; y: number; z: number };
export type Answers = { place?: string; memory?: string; light?: string; clarity?: string };

// [日本語, 画像 AI に渡す雰囲気の英語, 位置]
export const WORDS: [string, string, Look][] = [
  ["晴れやかな", "bright, cheerful and fresh", { x: 0.6, y: -0.6, z: 0.6 }],
  ["華やかな", "festive and gorgeous, yet refined", { x: 0.6, y: 0, z: 0.5 }],
  ["豊かな", "rich, abundant and warm", { x: 0.6, y: 0.6, z: 0.4 }],
  ["やわらかな", "soft, gentle and warm", { x: 0.5, y: -0.6, z: -0.5 }],
  ["素朴な", "simple, rustic and heartwarming", { x: 0.5, y: 0, z: -0.5 }],
  ["味わい深い", "deep, mellow and tasteful", { x: 0.5, y: 0.6, z: -0.5 }],
  ["伝統的な", "traditional and classic Japanese", { x: 0.4, y: 0.7, z: -0.3 }],
  ["清らかな", "pure, clean and clear", { x: -0.6, y: -0.7, z: 0.6 }],
  ["さわやかな", "refreshing and airy", { x: -0.5, y: -0.4, z: 0.7 }],
  ["上品な", "refined and elegant", { x: -0.3, y: 0, z: 0.3 }],
  ["凛とした", "dignified, crisp and noble", { x: -0.5, y: 0.6, z: 0.5 }],
  ["穏やかな", "calm, peaceful and gentle", { x: -0.4, y: -0.5, z: -0.5 }],
  ["静かな", "quiet and still", { x: -0.5, y: 0, z: -0.5 }],
  ["優雅な", "graceful and elegant", { x: -0.3, y: 0.2, z: -0.4 }],
  ["格調のある", "stately and formal", { x: -0.3, y: 0.8, z: -0.4 }],
  ["渋い", "subdued, sober and sophisticated", { x: -0.4, y: 0.6, z: -0.7 }],
];

type Q = keyof typeof QUESTIONS;
const opt = (q: Q, v?: string) => (v ? (QUESTIONS[q] as Record<string, readonly [string, Partial<Look>, string]>)[v] : undefined);

/** 受け取った答えのうち、決まった値だけを残す */
export function cleanAnswers(w: Record<string, unknown>): Answers {
  const pick = (q: Q) => { const v = w[q]; return typeof v === "string" && v in QUESTIONS[q] ? v : undefined; };
  return { place: pick("place"), memory: pick("memory"), light: pick("light"), clarity: pick("clarity") };
}

/** 答えから点を決める。どの答えも軸を動かさなければ null(写真だけで決める) */
export function lookFrom(a: Answers): Look | null {
  const p = { x: 0, y: 0, z: 0 };
  let moved = false;
  (Object.keys(QUESTIONS) as Q[]).forEach((q) => {
    const o = opt(q, a[q]);
    if (!o) return;
    const d = o[1] as Partial<Look>;
    (["x", "y", "z"] as const).forEach((k) => { if (d[k]) { p[k] += d[k]!; moved = true; } });
  });
  if (!moved) return null;
  const c = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: c(p.x), y: c(p.y), z: c(p.z) };
}

/** 点にいちばん近い言葉を 2 つ(日本語と英語) */
export function wordsFor(look: Look | null) {
  if (!look) return [];
  const d = (w: Look) => (w.x - look.x) ** 2 + (w.y - look.y) ** 2 + (w.z - look.z) ** 2;
  return WORDS.slice().sort((a, b) => d(a[2]) - d(b[2])).slice(0, 2).map(([ja, en]) => ({ ja, en }));
}

/** 指示文に足す場面の説明(飾る場所・思い出)。まだ決めていない / どれでもない は足さない */
export function sceneLines(a: Answers) {
  const place = opt("place", a.place)?.[2];
  const memory = opt("memory", a.memory)?.[2];
  return [place && `- It will hang in ${place}.`, memory && `- The photo is ${memory}.`].filter(Boolean) as string[];
}

/** 評価画面・通知で見せる答えの日本語 */
export function answerLabels(a: Answers) {
  return (Object.keys(QUESTIONS) as Q[]).map((q) => opt(q, a[q])?.[0]).filter(Boolean) as string[];
}
