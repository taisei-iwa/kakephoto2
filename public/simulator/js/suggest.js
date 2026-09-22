// suggest.js — お客様の写真から裂地の取り合わせを3案つくる。
//
// 外部 API は使わない。写真と裂地の画像をブラウザ上で読み、色と柄の強さを測って選ぶ。
// 裂地を追加しても、その場で画像から測るので登録作業は増えない。
//
// 3案の考え方(2026-09-22 本人決定):
//   A 合わせる … 写真で面積の大きい色に、天地と中廻しの色みを寄せる。全体がひとつながりに見える。
//   B 静める   … 彩度と柄を抑えた裂地でまわりを静め、色を持つのは写真だけにする。
//   C 格を上げる … 一文字に金襴、中廻しに柄、天地は落ち着いた色。掛軸として正式な組み方。
//
// 添える理由文は、実際に測った関係だけから組み立てる(もっともらしい職人風の文を作らない)。
(function () {
  "use strict";

  // ---- 色の道具 ----
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  // 色相の距離(0〜180)。色相環は一周するので近い方を取る。
  function hueDist(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  // 色みの名前。理由文に使うので、一般に通じる範囲の粗さにとどめる。
  function colorName(h, s, l) {
    if (s < 0.12) return l > 0.7 ? "白っぽい色" : (l < 0.3 ? "黒に近い色" : "灰色");
    if (h < 15 || h >= 345) return "赤";
    if (h < 40) return "朱色";
    if (h < 55) return l < 0.45 ? "茶色" : "山吹色";
    if (h < 70) return "黄色";
    if (h < 160) return "緑";
    if (h < 200) return "青緑";
    if (h < 250) return "青";
    if (h < 290) return "紫";
    if (h < 330) return "赤紫";
    return "桃色";
  }

  // ---- 画像を測る ----
  // 小さく描き直してから読む。1枚あたり数千画素で十分で、処理も一瞬で終わる。
  function sample(img, size) {
    const cv = document.createElement("canvas");
    const w = Math.max(1, Math.round(size * Math.min(1, img.naturalWidth / img.naturalHeight || 1)));
    const h = Math.max(1, Math.round(size * Math.min(1, img.naturalHeight / img.naturalWidth || 1)));
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    try { return ctx.getImageData(0, 0, w, h); } catch (e) { return null; }
  }

  // 平均の明るさ・彩度と、明るさのばらつき(= 柄の強さ)を測る。
  // 無地に近いほど patternStrength が小さくなる。
  function measure(img) {
    const data = sample(img, 48);
    if (!data) return null;
    const px = data.data;
    let sumL = 0, sumS = 0, n = 0;
    const ls = [];
    // 色相は平均すると濁るので、彩度のある画素だけを角度の平均(円平均)で出す。
    let sx = 0, sy = 0, hw = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 200) continue; // 透明は飛ばす
      const c = rgbToHsl(px[i], px[i + 1], px[i + 2]);
      sumL += c.l; sumS += c.s; ls.push(c.l); n++;
      if (c.s > 0.12) {
        const rad = c.h * Math.PI / 180;
        sx += Math.cos(rad) * c.s; sy += Math.sin(rad) * c.s; hw += c.s;
      }
    }
    if (!n) return null;
    const l = sumL / n, s = sumS / n;
    let variance = 0;
    for (let i = 0; i < ls.length; i++) variance += (ls[i] - l) * (ls[i] - l);
    const hue = hw > 0 ? (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360 : 0;
    return { h: hue, s: s, l: l, patternStrength: Math.sqrt(variance / ls.length), hasHue: hw > 0 };
  }

  // 写真は「面積の大きい色」を知りたいので、色相を12分割して最も多い帯を主色とする。
  function measurePhoto(img) {
    const base = measure(img);
    if (!base) return null;
    const data = sample(img, 64);
    const px = data.data;
    const bins = new Array(12).fill(0);
    const binL = new Array(12).fill(0);
    let colored = 0, total = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 200) continue;
      total++;
      const c = rgbToHsl(px[i], px[i + 1], px[i + 2]);
      if (c.s < 0.18) continue; // 無彩色は主色の候補にしない
      const b = Math.floor(c.h / 30) % 12;
      bins[b] += c.s; binL[b] += c.l; colored++;
    }
    let best = -1, bestV = 0;
    for (let i = 0; i < 12; i++) if (bins[i] > bestV) { bestV = bins[i]; best = i; }
    base.mainHue = best >= 0 ? best * 30 + 15 : base.h;
    base.mainHasColor = best >= 0 && colored / Math.max(1, total) > 0.06;
    base.mainName = base.mainHasColor ? colorName(base.mainHue, 0.5, binL[best] / Math.max(1, bins[best] ? bins[best] : 1)) : null;
    return base;
  }

  // ---- 裂地を測る ----
  function measureFabrics(fabrics) {
    return Promise.all(fabrics.map((f) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const m = measure(img);
        resolve(m ? Object.assign({ fab: f }, m) : null);
      };
      img.onerror = () => resolve(null);
      img.src = f.dataUrl;
    }))).then((list) => list.filter(Boolean));
  }

  // ---- 3案を組む ----
  function usable(list, use) {
    return list.filter((m) => (m.fab.uses || []).indexOf(use) >= 0);
  }
  function pickBest(list, scoreFn, exclude) {
    let best = null, bestScore = -Infinity;
    list.forEach((m) => {
      if (exclude && exclude.indexOf(m.fab.id) >= 0) return;
      const sc = scoreFn(m);
      if (sc > bestScore) { bestScore = sc; best = m; }
    });
    return best;
  }
  const isFormal = (m) => m.fab.grade === "joh" || m.fab.grade === "tokujou";

  function buildPlans(photo, fabrics) {
    const tenchi = usable(fabrics, "tenchi");
    const naka = usable(fabrics, "nakamawashi");
    const ichi = usable(fabrics, "ichimonji");
    const plans = [];

    // A 合わせる: 写真の主色に色みが近いもの。
    // 写真全体の彩度とは比べない(白い壁や背景が入ると平均が下がり、色のある裂地が不当に負けるため)。
    // 色みの無い裂地は色相がただの雑音なので、候補から外す。
    if (photo.mainHasColor && tenchi.length) {
      const hasColor = (list) => { const c = list.filter((m) => m.s >= 0.15); return c.length ? c : list; };
      const near = (m) => -hueDist(m.h, photo.mainHue) / 180 * 1.4
        + Math.min(m.s, 0.5) * 0.5          // 色みがあるほうが「合わせた」と分かる
        - Math.max(0, m.s - 0.65) * 1.0;    // ただし派手すぎるものは避ける
      const t = pickBest(hasColor(tenchi), near);
      const n = pickBest(hasColor(naka.length ? naka : tenchi), (m) => near(m) - m.patternStrength * 0.5, t ? [t.fab.id] : null);
      const i = ichi.length ? pickBest(ichi, (m) => near(m)) : null;
      if (t) plans.push({
        id: "A",
        label: "パターンA",
        summary: "写真の色みに合わせる",
        reason: "お写真で面積の大きい" + photo.mainName + "に、天地の色みを合わせました。全体がひとつながりに見えます。",
        picks: { tenchi: t.fab, nakamawashi: (n || t).fab, ichimonji: i ? i.fab : null },
      });
    }

    // B 静める: 彩度が低く、柄の弱いもの。写真だけが色を持つ。
    if (tenchi.length) {
      const calm = (m) => -m.s * 1.6 - m.patternStrength * 2.2;
      const t = pickBest(tenchi, calm);
      const n = pickBest(naka.length ? naka : tenchi, calm, t ? [t.fab.id] : null);
      if (t) plans.push({
        id: "B",
        label: "パターンB",
        summary: "写真を主役にする",
        reason: "まわりを無地に近い裂地で静めて、お写真だけが目に入るようにしました。",
        picks: { tenchi: t.fab, nakamawashi: (n || t).fab, ichimonji: null },
      });
    }

    // C 格を上げる: 一文字に金襴(明るく柄の強い上物)、中廻しに柄、天地は落ち着いた色。
    if (tenchi.length && (ichi.length || naka.length)) {
      const kinran = (m) => (isFormal(m) ? 1.2 : 0) + m.patternStrength * 1.6 + m.l * 0.6;
      const i = ichi.length ? pickBest(ichi, kinran) : null;
      const n = pickBest(naka.length ? naka : tenchi, (m) => (isFormal(m) ? 0.8 : 0) + m.patternStrength * 1.2, i ? [i.fab.id] : null);
      const t = pickBest(tenchi, (m) => -m.s * 0.8 - m.patternStrength * 0.8 - Math.abs(m.l - 0.45), [i && i.fab.id, n && n.fab.id].filter(Boolean));
      if (t && (i || n)) plans.push({
        id: "C",
        label: "パターンC",
        summary: "掛軸として格の高い組み方",
        reason: i
          ? "一文字に「" + i.fab.name + "」を用い、掛軸として格の高い組み方にしました。"
          : "中廻しに柄のある裂地を置き、掛軸として格の高い組み方にしました。",
        picks: { tenchi: t.fab, nakamawashi: (n || t).fab, ichimonji: i ? i.fab : null },
      });
    }

    return plans;
  }

  window.KakeSuggest = {
    measurePhoto: measurePhoto,
    measureFabrics: measureFabrics,
    buildPlans: buildPlans,
  };
})();
