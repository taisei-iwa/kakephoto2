/**
 * 画像 AI が「白い台紙に置いた紙」として描いたときの白い余白を切り落とし、指定の縦横比に詰める。
 * 紙表具デザイン/trim_card.py と同じ考え方(2026-10-02 の試作で確かめた判定):
 * - 余白は「縁から続く行(列)のほぼ全部が、明るく色味のない白」のときだけ。鳥の子・生成りや白い波は残す
 * - 縦横比に詰めるときは、柄(平均色との差)がいちばん多く入る位置を残す
 */
import sharp from "sharp";

const MINC = 232, SPREAD = 14, FULL = 0.97, INSET = 0.012;

export async function trimAndFit(input: Buffer, ratio: number, opt: { trim?: boolean } = {}) {
  const img = sharp(input).removeAlpha();
  const { width: W = 0, height: H = 0 } = await img.metadata();
  // 判定は半分の大きさで
  const w = Math.max(1, Math.floor(W / 2)), h = Math.max(1, Math.floor(H / 2));
  const { data } = await img.clone().resize(w, h, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const blank = (x: number, y: number) => {
    const i = (y * w + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn >= MINC && mx - mn <= SPREAD;
  };
  const row = (y: number) => { let n = 0; for (let x = 0; x < w; x++) if (blank(x, y)) n++; return n >= FULL * w; };
  const col = (x: number) => { let n = 0; for (let y = 0; y < h; y++) if (blank(x, y)) n++; return n >= FULL * h; };
  let t = 0; while (t < h / 2 && row(t)) t++;
  let b = h; while (b > h / 2 && row(b - 1)) b--;
  let l = 0; while (l < w / 2 && col(l)) l++;
  let r = w; while (r > w / 2 && col(r - 1)) r--;

  let box = { left: 0, top: 0, width: W, height: H };
  // trim: false のときは余白を切らず、縦横比に詰めるだけ(切り分けたあとの天・地。淡い無彩色の紙を余白と取り違えない)
  if (opt.trim !== false && (t || l || b < h || r < w)) {
    const x0 = l * 2, y0 = t * 2, x1 = Math.min(W, r * 2), y1 = Math.min(H, b * 2);
    const dx = Math.round((x1 - x0) * INSET), dy = Math.round((y1 - y0) * INSET);
    const L = x0 + (l ? dx : 0), T = y0 + (t ? dy : 0), R = x1 - (r < w ? dx : 0), B = y1 - (b < h ? dy : 0);
    box = { left: L, top: T, width: R - L, height: B - T };
  }
  const cutArea = (box.width * box.height) / (W * H);

  // 縦横比に詰める
  const cur = box.width / box.height;
  if (Math.abs(cur - ratio) > 0.01) {
    const cut = await sharp(input).removeAlpha().extract(box).toBuffer();
    const sw = Math.max(1, Math.floor(box.width / 4)), sh = Math.max(1, Math.floor(box.height / 4));
    const { data: s } = await sharp(cut).resize(sw, sh, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let ar = 0, ag = 0, ab = 0;
    for (let i = 0; i < s.length; i += 3) { ar += s[i]; ag += s[i + 1]; ab += s[i + 2]; }
    const n = s.length / 3; ar /= n; ag /= n; ab /= n;
    const diff = (x: number, y: number) => { const i = (y * sw + x) * 3; return Math.abs(s[i] - ar) + Math.abs(s[i + 1] - ag) + Math.abs(s[i + 2] - ab); };
    const best = (prof: number[], size: number) => {
      let run = prof.slice(0, size).reduce((a, v) => a + v, 0), bestV = run, at = 0;
      for (let i = 1; i + size <= prof.length; i++) { run += prof[i + size - 1] - prof[i - 1]; if (run > bestV) { bestV = run; at = i; } }
      return at;
    };
    if (cur > ratio) {
      const nw = Math.round(box.height * ratio);
      const prof = Array.from({ length: sw }, (_, x) => { let v = 0; for (let y = 0; y < sh; y++) v += diff(x, y); return v; });
      const x0 = Math.min(box.width - nw, best(prof, Math.max(1, Math.floor(nw / 4))) * 4);
      box = { left: box.left + x0, top: box.top, width: nw, height: box.height };
    } else {
      const nh = Math.round(box.width / ratio);
      const prof = Array.from({ length: sh }, (_, y) => { let v = 0; for (let x = 0; x < sw; x++) v += diff(x, y); return v; });
      const y0 = Math.min(box.height - nh, best(prof, Math.max(1, Math.floor(nh / 4))) * 4);
      box = { left: box.left, top: box.top + y0, width: box.width, height: nh };
    }
  }
  const out = await sharp(input).removeAlpha().extract(box).jpeg({ quality: 92 }).toBuffer();
  return { jpeg: out, px: [box.width, box.height] as [number, number], cutArea, box };
}

/**
 * 天地をつなげた 1 枚の、どこで上下に切るかを決める(2026-10-02)。
 * 画像 AI は柄を置く位置の指定を細かくは守らないので、決めた位置(target、0〜1)の近く(from〜to)で
 * 柄がいちばん少ない行(平均色との差の合計が小さい行)を選ぶ。離れすぎないよう、target からの距離に少し罰点を足す。
 * 返り値は切る行(px)。
 */
export async function quietCut(input: Buffer, target: number, from = 0.5, to = 0.8) {
  const { width: W = 0, height: H = 0 } = await sharp(input).metadata();
  const sw = Math.max(1, Math.round(W / 4)), sh = Math.max(1, Math.round(H / 4));
  const { data: s } = await sharp(input).removeAlpha().resize(sw, sh, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let ar = 0, ag = 0, ab = 0;
  for (let i = 0; i < s.length; i += 3) { ar += s[i]; ag += s[i + 1]; ab += s[i + 2]; }
  const n = s.length / 3; ar /= n; ag /= n; ab /= n;
  const row = Array.from({ length: sh }, (_, y) => {
    let v = 0;
    for (let x = 0; x < sw; x++) { const i = (y * sw + x) * 3; v += Math.abs(s[i] - ar) + Math.abs(s[i + 1] - ag) + Math.abs(s[i + 2] - ab); }
    return v / sw;
  });
  const half = Math.max(1, Math.round(sh * 0.015)); // 前後 1.5% の行もまとめて見る(柄の端をまたがない)
  const peak = Math.max(1, ...row);
  let best = Math.round(target * sh), bestScore = Infinity;
  for (let y = Math.round(from * sh); y <= Math.round(to * sh); y++) {
    let e = 0;
    for (let k = -half; k <= half; k++) e = Math.max(e, row[Math.min(sh - 1, Math.max(0, y + k))]);
    const score = e / peak + Math.abs(y / sh - target) * 0.6;
    if (score < bestScore) { bestScore = score; best = y; }
  }
  return Math.round((best / sh) * H);
}
