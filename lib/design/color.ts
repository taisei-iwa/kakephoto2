/**
 * 写真から天地・中廻し・アクセントの色を計算で決める(画像 AI に色を任せない)。2026-10-02。
 * 根拠は 仕事/かけフォト/資料/2026-10-02_掛軸の美しさ研究_….md の ④⑤⑥:
 * - 彩度の順序: 写真 > 中廻し > 天地(主役がいちばん鮮やか)
 * - 色相は写真の主色にそろえる(色相が近いほど調和する)。中差(約 70〜110 度)を避ける
 * - 差は「はっきり同じ」か「はっきり違う」に寄せる(ΔE00 の 3〜6・15〜25 は避ける。仮の目安)
 * - 呼応: 写真の中の「小さな色」(面積は小さいが鮮やかな色)を拾い、絵の小さなアクセントにする
 * 2 案: blend = 写真になじませる(紙の明るさを写真のまわりに寄せる)、echo = 写真の差し色を拾う(紙の色相を写真の小さな色にし、
 * 明るさは blend と同じ側)。2026-10-08 本人の観察「近い色の案ばかり選ばれる」で、明るさを反対側に振る lift から echo に替えた。
 * lift は過去に作った案の表示のために残す
 */
import sharp from "sharp";
import type { Look } from "@/lib/design/words";

export type Lab = { L: number; a: number; b: number };
export type Swatch = Lab & { C: number; h: number; hex: string; weight: number };
export type PhotoColors = {
  dominant: Swatch; // 色みのある部分でいちばん面積の大きい色(無彩色の写真では面積最大の色)
  accent: Swatch | null;
  edgeL: number; // 写真の外周の明るさ(天地・中廻しと接するところ)
  meanC: number;
  colorfulness: number; // Hasler & Süsstrunk の鮮やかさ
};
export type Variant = "blend" | "lift" | "echo";

// ---- 色の変換(sRGB D65 ⇔ CIELAB)----
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c: number) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
const WX = 0.95047, WY = 1, WZ = 1.08883;

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / WX;
  const Y = (0.2126 * R + 0.7152 * G + 0.0722 * B) / WY;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / WZ;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToRgb({ L, a, b }: Lab): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = fi(fx) * WX, Y = fi(fy) * WY, Z = fi(fz) * WZ;
  const R = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const G = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const B = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  return [gam(R), gam(G), gam(B)];
}

export const toHex = (lab: Lab) => "#" + labToRgb(lab).map((v) => v.toString(16).padStart(2, "0")).join("");
export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16);
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
const lch = (L: number, C: number, h: number): Lab => ({ L, a: C * Math.cos((h * Math.PI) / 180), b: C * Math.sin((h * Math.PI) / 180) });
const chroma = (x: Lab) => Math.hypot(x.a, x.b);
const hue = (x: Lab) => ((Math.atan2(x.b, x.a) * 180) / Math.PI + 360) % 360;
export const hueDiff = (h1: number, h2: number) => { const d = Math.abs(h1 - h2) % 360; return d > 180 ? 360 - d : d; };
const swatch = (x: Lab, weight = 0): Swatch => ({ ...x, C: chroma(x), h: hue(x), hex: toHex(x), weight });

/** CIEDE2000 の色差 */
export function deltaE00(x: Lab, y: Lab) {
  const rad = Math.PI / 180;
  const C1 = chroma(x), C2 = chroma(y), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * x.a, a2 = (1 + G) * y.a;
  const c1 = Math.hypot(a1, x.b), c2 = Math.hypot(a2, y.b);
  const h1 = c1 === 0 ? 0 : (Math.atan2(x.b, a1) / rad + 360) % 360;
  const h2 = c2 === 0 ? 0 : (Math.atan2(y.b, a2) / rad + 360) % 360;
  const dL = y.L - x.L, dC = c2 - c1;
  let dh = c1 * c2 === 0 ? 0 : h2 - h1;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh / 2) * rad);
  const Lm = (x.L + y.L) / 2, cm = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * cm, Sh = 1 + 0.015 * cm * T;
  const Rt = -2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

/** 画像の鮮やかさ(Hasler & Süsstrunk 2003。0=無彩、33=ほどよく、59=かなり鮮やか) */
export function colorfulness(px: Buffer) {
  let n = 0, mrg = 0, myb = 0, srg = 0, syb = 0;
  for (let i = 0; i < px.length; i += 3) { const rg = px[i] - px[i + 1], yb = (px[i] + px[i + 1]) / 2 - px[i + 2]; mrg += rg; myb += yb; srg += rg * rg; syb += yb * yb; n++; }
  mrg /= n; myb /= n;
  const sd = Math.sqrt(Math.max(0, srg / n - mrg * mrg) + Math.max(0, syb / n - myb * myb));
  return sd + 0.3 * Math.hypot(mrg, myb);
}

/** 写真の色を測る: 主色・小さな色(アクセント)・外周の明るさ・鮮やかさ */
export async function measurePhoto(jpeg: Buffer): Promise<PhotoColors> {
  const S = 64;
  const { data } = await sharp(jpeg).removeAlpha().resize(S, S, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const labs: Lab[] = [];
  for (let i = 0; i < data.length; i += 3) labs.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
  // 外周 3px の明るさ
  let eL = 0, en = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (x < 3 || y < 3 || x >= S - 3 || y >= S - 3) { eL += labs[y * S + x].L; en++; }
  // k-means(k=8)で色の塊に分ける。初期値は明るさの順に等間隔
  const k = 8;
  const sorted = labs.slice().sort((p, q) => p.L - q.L);
  let cents = Array.from({ length: k }, (_, i) => ({ ...sorted[Math.floor(((i + 0.5) * sorted.length) / k)] }));
  let assign = new Array(labs.length).fill(0);
  for (let it = 0; it < 12; it++) {
    assign = labs.map((p) => { let bi = 0, bd = Infinity; cents.forEach((c, i) => { const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; });
    cents = cents.map((c, i) => { const m = labs.filter((_, j) => assign[j] === i); if (!m.length) return c; return { L: m.reduce((s, p) => s + p.L, 0) / m.length, a: m.reduce((s, p) => s + p.a, 0) / m.length, b: m.reduce((s, p) => s + p.b, 0) / m.length }; });
  }
  const sw = cents.map((c, i) => swatch(c, assign.filter((a) => a === i).length / labs.length)).filter((s) => s.weight > 0);
  // 主色: 色みのある塊(C≥8)のうち面積最大。夜空の黒やベールの灰色のような無彩色の背景を主色にしない
  //(2026-10-02 試験: 面積最大で選ぶと紙の色が灰色ばかりになった)
  const chromatic = sw.filter((s) => s.C >= 8).sort((p, q) => q.weight - p.weight);
  const dominant = chromatic[0] || sw.slice().sort((p, q) => q.weight - p.weight)[0];
  // 小さな色(呼応のアクセント): 鮮やかな画素(C≥16)だけを色相 30 度ごとに集め、写真の 0.3〜15% を占める束のうち
  // いちばん鮮やかなものを選ぶ。塊の平均を使うと、小さく鮮やかな色(花飾りの赤・ブーケのピンク・火花)が周りと混ざって薄まる。
  // 細い火花などが縮小でぼやけないよう、ここだけ 160px で見る
  const A = 160;
  const { data: big } = await sharp(jpeg).removeAlpha().resize(A, A, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const bigLabs: Lab[] = [];
  for (let i = 0; i < big.length; i += 3) bigLabs.push(rgbToLab(big[i], big[i + 1], big[i + 2]));
  const bins: Lab[][] = Array.from({ length: 12 }, () => []);
  bigLabs.forEach((q) => { if (chroma(q) >= 16) bins[Math.floor(hue(q) / 30) % 12].push(q); });
  let accent: Swatch | null = null, bestScore = 0;
  bins.forEach((b) => {
    const share = b.length / bigLabs.length;
    if (share < 0.003 || share > 0.15) return;
    // 束のうち鮮やかな方の半分から色を取る(暗い縁の画素で沈まないように)
    const top = b.slice().sort((x, y) => chroma(y) - chroma(x)).slice(0, Math.max(1, Math.ceil(b.length / 2)));
    const med = (key: keyof Lab) => top.map((q) => q[key]).sort((x, y) => x - y)[Math.floor(top.length / 2)];
    const m = swatch({ L: med("L"), a: med("a"), b: med("b") }, share);
    // 主色と同じ色相なら、主色よりはっきり鮮やかなときだけ(ただの主色の濃い部分を拾わない)
    if (dominant.C >= 8 && hueDiff(m.h, dominant.h) < 30 && m.C < dominant.C + 12) return;
    const score = m.C * share ** 0.25;
    if (score > bestScore) { bestScore = score; accent = m; }
  });
  return {
    dominant,
    accent,
    edgeL: eL / en,
    meanC: labs.reduce((s, p) => s + chroma(p), 0) / labs.length,
    colorfulness: colorfulness(data),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 天地の紙の色・中廻しの色・アクセントを決める。
 * tone: 要望の色味(pale=淡く / deep=深く / photo・未指定=写真に合わせる)
 */
// 雰囲気(要望の画面)ごとの地色の寄せ方。2026-10-03 研究(資料/2026-10-03_欲しくなる掛軸の研究_… の F)。
// 色彩 KB(kb-color)の目安からの推測で、本人の評価で直す前提:
//   落ち着いた = 明るい側を少し落とし(ltg 寄り)彩度を控える / 華やか = 明るく、彩度を一段上げる(p)
//   かわいらしい = 暗い地を使わず明るい側(暖色の p)/ 凛とした = 明暗をはっきり、彩度はごく低く(墨・白寄り)
const MOOD: Record<string, { light: number; deepL?: number; cMul: number; cMax?: number; noDeep?: boolean }> = {
  calm: { light: 78, cMul: 0.85 },
  gorgeous: { light: 86, cMul: 1.2, cMax: 18 },
  lovely: { light: 88, cMul: 1.0, noDeep: true },
  dignified: { light: 90, deepL: 20, cMul: 0.5, cMax: 8 },
};

export function chooseColors(p: PhotoColors, variant: Variant, tone?: string, mood?: string, look?: Look | null) {
  // 色相: 写真の主色にそろえる(主色が無彩色に近ければ、和紙らしい暖かい無彩色寄り)。
  // echo は写真の小さな色(呼応のアクセント)の色相にする。小さな色が見つからない写真では、主色のまま明るさだけ一段ずらす
  const echoSrc = variant === "echo" ? p.accent : null;
  const tinted = echoSrc ? true : p.dominant.C >= 8;
  let h = echoSrc ? echoSrc.h : tinted ? p.dominant.h : 75;
  // 彩度: 写真の主色より控える(天地は最も低彩度)。ただし灰色に落とさない(鳥の子・藍染めくらいの色みは残す)
  let C = echoSrc ? clamp(echoSrc.C * 0.45, 6, 16) : tinted ? clamp(p.dominant.C * 0.45, 6, 16) : 5;
  // 差し色が主色と中差(約 70〜110 度)にあるときは、紙の彩度を控えて写真の主色とぶつからないようにする(仮の目安)
  if (echoSrc && p.dominant.C >= 8) { const d = hueDiff(echoSrc.h, p.dominant.h); if (d >= 70 && d <= 110) C *= 0.7; }
  // 明るさ: 中くらい(40〜65)は濁って見えるので避け、明るい側か深い側に振る。
  // blend と echo は写真の外周の明るさに寄せる、lift は反対側へ
  const light = 84, deep = 24;
  const edgeSide = p.edgeL < 40 ? "deep" : p.edgeL > 65 ? "light" : p.edgeL >= 52 ? "light" : "deep";
  const blendL = p.edgeL < 40 ? clamp(p.edgeL + 8, 12, 40) : p.edgeL > 65 ? clamp(p.edgeL - 4, 70, 90) : edgeSide === "light" ? 80 : 30;
  let L = variant === "lift" ? (edgeSide === "deep" ? light : deep + 8) : blendL;
  // 差し色のない echo: 同じ側のまま、明るい側はより淡く・深い側はより深くして blend と見分けがつくようにする
  if (variant === "echo" && !echoSrc) L = blendL >= 50 ? clamp(blendL + 9, 70, 93) : clamp(blendL - 10, 10, 40);
  if (variant === "lift") C = clamp(C * 0.7, 3, 11);
  // 雰囲気を地色にも効かせる(これまでは指示文にだけ入っていた)
  const m = mood ? MOOD[mood] : undefined;
  if (m) {
    if (L >= 50) L = variant === "lift" ? m.light : (L + m.light) / 2; // 明るい側: なじませる案・差し色の案は写真のまわりの明るさとの中間
    else if (m.noDeep) L = m.light - 4; // かわいらしい: 暗い地は使わない
    else if (m.deepL != null) L = m.deepL; // 凛とした: 暗い側はより深く
    C = clamp(C * m.cMul, 2, m.cMax ?? 16);
  }
  // 4 問の答え(イメージの点)を地色に効かせる。2026-10-08。幅は仮置きで、本人の評価で直す。
  // 明るい側・深い側は写真のまわりに合わせたまま(近い色が選ばれる)、その中で明るさ・鮮やかさ・色みを少し動かす
  if (look) {
    // かたい・深い(y+)ほど暗く、やわらかい・明るい(y−)ほど明るく
    L = L >= 50 ? clamp(L - 6 * look.y, 68, 93) : clamp(L - 8 * look.y, 10, 42);
    // 澄んだ(z+)ほど鮮やかに、渋い(z−)ほど控えめに
    C = clamp(C * (1 + 0.35 * look.z), 2, 18);
    // 温かい(x+)は黄赤、涼しい(x−)は青の側へ、最大 12 度だけ寄せる(色みのある写真のときだけ)
    if (tinted && Math.abs(look.x) > 0.1) {
      const target = look.x > 0 ? 60 : 250, step = 12 * Math.abs(look.x);
      const d = ((target - h + 540) % 360) - 180;
      h = (h + Math.sign(d) * Math.min(Math.abs(d), step) + 360) % 360;
    }
  }
  if (tone === "pale") { L = clamp(L + 8, 12, 93); C *= 0.8; }
  if (tone === "deep") { L = clamp(L - 12, 10, 90); C = clamp(C * 1.25, 2, 18); }
  // 暗い黄〜オリーブ茶(h 85〜115°、暗い側)は避ける。好まれにくい色域(生態学的誘意性理論。Palmer & Schloss 2010)。
  // 色相は写真に合わせたまま、彩度を下げて墨寄りの鼠色に逃がす。日本では鶯茶・利休茶の文化もあるので、本人の評価で確かめる
  const olive = L < 50 && h >= 85 && h <= 115;
  if (olive) C = Math.min(C, 6);
  const base = lch(L, C, h);
  // 中廻し: 同じ色相で一段だけ差をつける(ΔE00 が 6〜15 の「類似」に入るまで明るさを動かす)
  const dir = L < 50 ? 1 : -1;
  let naka = base, step = 4;
  for (let i = 0; i < 12; i++) {
    const nL = clamp(L + dir * step, 6, 95);
    // 中廻しも暗い側でオリーブ茶にならないように(地色と同じ規則)
    const nC = nL < 50 && h >= 85 && h <= 115 ? Math.min(6, C * 1.3) : clamp(C * 1.3, 2, Math.max(4, p.meanC * 0.6));
    naka = lch(nL, nC, h);
    const d = deltaE00(base, naka);
    if (d >= 6 && d <= 15) break;
    step += d < 6 ? 2 : -1;
    if (step <= 1) break;
  }
  // アクセント: 写真の小さな色(なければ金だけ)。天地の上で沈まないよう、紙との明るさの差を確かめて少し動かす。
  // echo は紙がすでに小さな色の色相なので、絵の小さな要素には写真の主色を置いて写真に呼応させる
  const acSrc = echoSrc ? (p.dominant.C >= 8 ? p.dominant : null) : p.accent;
  let accent: Lab | null = acSrc ? { L: acSrc.L, a: acSrc.a, b: acSrc.b } : null;
  if (accent && Math.abs(accent.L - L) < 20) accent = { ...accent, L: clamp(L < 50 ? L + 28 : L - 28, 10, 92) };
  return { base: toHex(base), naka: toHex(naka), accent: accent ? toHex(accent) : null, baseLab: base, nakaLab: naka };
}
