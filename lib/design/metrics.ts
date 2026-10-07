/**
 * できた天地の絵を測る(採点)と、地の色の補正。2026-10-02、美しさの研究の段階 3。
 * - coverage: 柄が占める割合(地の色から ΔE76 で 14 以上離れた画素)。目安 10〜30%、受け入れ 4〜45%
 * - colorfulness: 鮮やかさ(Hasler & Süsstrunk)。写真より鮮やかなら主役を食うので描き直す
 * - bgDelta: 実際の地の色と、計算で決めた紙の色の差(ΔE00)。30 までは補正で合わせる
 * 数値の目安は仮置き。評価画面の記録(review と一緒に残す metrics)で直していく。
 */
import sharp from "sharp";
import { colorfulness, deltaE00, hexToLab, Lab, labToRgb, rgbToLab } from "@/lib/design/color";

export const LIMITS = { coverageMin: 0.04, coverageMax: 0.45, bgDeltaMax: 30, colorfulSlack: 1.1, colorfulFloor: 22, offFlatMax: 0.06 };

// offFlat: 背景の一部が別の色で平らに塗られた割合(升目のうち、中がほぼ一様で地の色と ΔE00 で 6 より違うもの。暗い色どうしは数値の差が小さく出るので 6)。
// 2026-10-08 本人「地の真ん中だけ紺色。そういう色の変え方は好きじゃない」。目安 6% は仮置き
export type DesignMetrics = { coverage: number; colorfulness: number; bgDelta: number; bg: string; offFlat: number };

/** 地の色(いちばん多い色)と、柄の割合・鮮やかさ・紙の色とのずれを測る */
export async function measureDesign(jpeg: Buffer, baseHex: string) {
  const { width: W = 1, height: H = 1 } = await sharp(jpeg).metadata();
  const sw = Math.max(1, Math.round(W / 4)), sh = Math.max(1, Math.round(H / 4));
  const { data } = await sharp(jpeg).removeAlpha().resize(sw, sh, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const labs: Lab[] = [];
  for (let i = 0; i < data.length; i += 3) labs.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
  // いちばん多い色の箱(L・a・b を 6 刻み)を地の色とみなす
  const box = new Map<string, Lab[]>();
  for (const p of labs) {
    const k = `${Math.round(p.L / 6)},${Math.round(p.a / 6)},${Math.round(p.b / 6)}`;
    const arr = box.get(k);
    if (arr) arr.push(p); else box.set(k, [p]);
  }
  let top: Lab[] = [];
  for (const arr of box.values()) if (arr.length > top.length) top = arr;
  const bg: Lab = { L: avg(top, "L"), a: avg(top, "a"), b: avg(top, "b") };
  const far = labs.filter((p) => Math.hypot(p.L - bg.L, p.a - bg.a, p.b - bg.b) >= 14).length;
  // 8 × 12 の升目ごとに平均とばらつきを見る。平らで地の色と違う升目 = 別の色で塗られた背景
  const GX = 8, GY = 12;
  let offCells = 0;
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const x0 = Math.floor((gx * sw) / GX), x1 = Math.floor(((gx + 1) * sw) / GX), y0 = Math.floor((gy * sh) / GY), y1 = Math.floor(((gy + 1) * sh) / GY);
    const cell: Lab[] = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cell.push(labs[y * sw + x]);
    if (!cell.length) continue;
    const m: Lab = { L: avg(cell, "L"), a: avg(cell, "a"), b: avg(cell, "b") };
    const spread = cell.reduce((s, p) => s + Math.hypot(p.L - m.L, p.a - m.a, p.b - m.b), 0) / cell.length;
    if (spread < 6 && deltaE00(m, bg) > 6) offCells++;
  }
  const [r, g, b] = labToRgb(bg);
  return {
    bgLab: bg,
    metrics: {
      coverage: round(far / labs.length, 3),
      colorfulness: round(colorfulness(data), 1),
      bgDelta: round(deltaE00(bg, hexToLab(baseHex)), 1),
      bg: "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""),
      offFlat: round(offCells / (GX * GY), 3),
    } as DesignMetrics,
  };
}

/** 受け入れ基準を満たすか。満たさない理由を返す(空なら合格) */
export function judge(m: DesignMetrics, photoColorfulness: number) {
  const why: string[] = [];
  if (m.coverage < LIMITS.coverageMin) why.push("motifs_too_few");
  if (m.coverage > LIMITS.coverageMax) why.push("motifs_too_many");
  if (m.colorfulness > Math.max(photoColorfulness * LIMITS.colorfulSlack, LIMITS.colorfulFloor)) why.push("louder_than_photo");
  if (m.bgDelta > LIMITS.bgDeltaMax) why.push("paper_color_off");
  if (m.offFlat > LIMITS.offFlatMax) why.push("background_not_uniform");
  return why;
}

/**
 * 絵全体の色を、地の色が紙の色に合うようにずらす(L*a*b* で足し引き。柄も同じだけ動くので関係は崩れない)。
 * 明るさは 85% だけ動かす(白い月などが灰色に沈みすぎないように)。
 */
export async function correctToBase(jpeg: Buffer, bg: Lab, baseHex: string) {
  const t = hexToLab(baseHex);
  const dL = (t.L - bg.L) * 0.85, da = t.a - bg.a, db = t.b - bg.b;
  const { data, info } = await sharp(jpeg).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const p = rgbToLab(data[i], data[i + 1], data[i + 2]);
    const [r, g, b] = labToRgb({ L: Math.min(100, Math.max(0, p.L + dL)), a: p.a + da, b: p.b + db });
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

function avg(arr: Lab[], k: keyof Lab) { return arr.reduce((s, p) => s + p[k], 0) / Math.max(1, arr.length); }
function round(v: number, d: number) { const f = 10 ** d; return Math.round(v * f) / f; }
