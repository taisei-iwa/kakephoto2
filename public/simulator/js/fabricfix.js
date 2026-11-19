// fabricfix.js — 裏方で裂地を取り込むときの下ごしらえ(2026-11-19)。
// スマホで撮った裂地は片側が暗くなりやすく、敷き詰めると区切りごとに明暗が並んで市松模様に見える。
//   影をならす  : 明るさのゆるやかな変化だけを推定して割り戻す(色みは保つ)。
//   継ぎ目をならす: 端の帯を反対側の端となじませ、敷いたときの継ぎ目を消す。画像は縦横とも約 12% 小さくなる。
//                  無地・不規則な柄向け。縞や規則的な柄では柄が二重になるので使わない。
// 既存の裂地は同じ考え方の Python で一括処理済み(原本は assets/fabrics_original/、公開しない)。

(function (root) {
  "use strict";

  const BAND = 0.12;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 明るさのゆるやかな変化 = 画像をごく小さく縮めてから元の大きさへ戻したもの(強いぼかしの代わり)
  function lowLuminance(img, w, h) {
    const k = 6 / Math.max(w, h);
    const sw = Math.max(2, Math.round(w * k)), sh = Math.max(2, Math.round(h * k));
    const small = document.createElement("canvas");
    small.width = sw; small.height = sh;
    const sg = small.getContext("2d");
    sg.imageSmoothingQuality = "high";
    sg.drawImage(img, 0, 0, sw, sh);
    const big = document.createElement("canvas");
    big.width = w; big.height = h;
    const bg = big.getContext("2d");
    bg.imageSmoothingQuality = "high";
    bg.drawImage(small, 0, 0, w, h);
    const d = bg.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    for (let i = 0; i < lum.length; i++) lum[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    return lum;
  }

  function flatten(px, lum) {
    let mean = 0;
    for (let i = 0; i < lum.length; i++) mean += lum[i];
    mean /= lum.length;
    for (let i = 0; i < lum.length; i++) {
      const k = mean / Math.max(1, lum[i]);
      for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, px[i * 4 + c] * k);
    }
  }

  // 横方向: 先頭 b 列を「右端の b 列 → 左端の b 列」へ徐々に移し、右端の b 列を捨てる。
  // 新しい左端は元の右端の手前とつながるので、敷くと継ぎ目が出ない。
  function blendX(px, w, h) {
    const b = Math.max(4, Math.floor(w * BAND)), nw = w - b;
    const out = new Uint8ClampedArray(nw * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < nw; x++) {
        const o = (y * nw + x) * 4;
        if (x < b) {
          const t = b > 1 ? x / (b - 1) : 1;
          const a = (y * w + (w - b + x)) * 4, s = (y * w + x) * 4;
          for (let c = 0; c < 4; c++) out[o + c] = px[a + c] * (1 - t) + px[s + c] * t;
        } else {
          const s = (y * w + x) * 4;
          for (let c = 0; c < 4; c++) out[o + c] = px[s + c];
        }
      }
    }
    return { px: out, w: nw, h: h };
  }
  function transpose(px, w, h) {
    const out = new Uint8ClampedArray(px.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, o = (x * h + y) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = px[s + c];
    }
    return out;
  }

  // dataUrl → Promise<dataUrl(PNG)>。opts = { shade: true, seam: false }
  function process(src, opts) {
    opts = opts || {};
    return loadImage(src).then((img) => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, w, h);
      let px = data.data, W = w, H = h;
      if (opts.shade !== false) flatten(px, lowLuminance(img, w, h));
      if (opts.seam) {
        let r = blendX(px, W, H); px = r.px; W = r.w;
        r = blendX(transpose(px, W, H), H, W); // 縦方向は転置して同じ処理
        px = transpose(r.px, r.w, r.h); H = r.w;
      }
      const out = document.createElement("canvas");
      out.width = W; out.height = H;
      out.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(px), W, H), 0, 0);
      return out.toDataURL("image/png");
    });
  }

  root.KakeFabricFix = { process };
})(window);
