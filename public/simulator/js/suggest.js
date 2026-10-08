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
// 2026-10-08: 4 問の答え(飾る場所・思い出・明るさ・色の澄み方)があれば、その印象に近い裂地を選び、
// 答えに近い案から並べる。裂地の印象は fabricmap.js(色の印象の式)で測る。
// おまかせデザインの中廻しを、登録済みの裂地から選ぶ(matchNaka)のもここ。
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

  // ---- 4 問の答え → 印象の点(-1〜1 の 3 軸)----
  // サーバーの lib/design/words.ts の QUESTIONS と同じ値。片方を直したら、もう片方も直す
  const LOOK_DELTAS = {
    place: { washitsu: { y: 0.5, z: -0.2 }, living: { y: -0.3, z: 0.2 }, entrance: { x: 0.2, y: 0.2, z: 0.2 } },
    memory: { celebration: { x: 0.6, z: 0.4 }, nostalgia: { x: 0.4, z: -0.4 }, daily: { x: 0.2, y: -0.3 }, quiet: { x: -0.4, y: 0.1, z: -0.2 } },
    light: { light: { y: -0.6 }, deep: { y: 0.6 } },
    clarity: { clear: { z: 0.7 }, muted: { z: -0.7 } },
  };
  function lookFrom(answers) {
    const p = { x: 0, y: 0, z: 0 };
    let moved = false;
    Object.keys(LOOK_DELTAS).forEach((q) => {
      const d = answers && LOOK_DELTAS[q][answers[q]];
      if (!d) return;
      ["x", "y", "z"].forEach((k) => { if (d[k]) { p[k] += d[k]; moved = true; } });
    });
    if (!moved) return null;
    const c = (v) => Math.max(-1, Math.min(1, v));
    return { x: c(p.x), y: c(p.y), z: c(p.z) };
  }
  // 裂地の印象と答えの点の離れ具合(0〜約 3.5)。印象が測れなかった裂地は中くらいの離れとみなす
  function lookDist(m, look) {
    if (!look) return 0;
    if (!m.imp) return 1.2;
    return Math.sqrt((m.imp.x - look.x) ** 2 + (m.imp.y - look.y) ** 2 + (m.imp.z - look.z) ** 2);
  }

  // ---- 裂地を測る ----
  // 色の印象(fabricmap.js)も一緒に測る。同じ裂地を何度も測らないよう、画像ごとに覚えておく
  const impCache = new Map();
  function measureFabrics(fabrics) {
    const FM = window.KakeFabricMap;
    return Promise.all(fabrics.map((f) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const m = measure(img);
        if (m && FM && FM.measure) {
          let e = impCache.get(f.dataUrl);
          if (!e) { const fm = FM.measure(img); e = fm ? { imp: FM.impression(fm), lab: FM.hexLab(fm.colors[0].hex) } : {}; impCache.set(f.dataUrl, e); }
          m.imp = e.imp; m.lab = e.lab;
        }
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

  function buildPlans(photo, fabrics, look) {
    const tenchi = usable(fabrics, "tenchi");
    const naka = usable(fabrics, "nakamawashi");
    const ichi = usable(fabrics, "ichimonji");
    const plans = [];
    // 答えがあれば、どの案でも答えの印象に近い裂地を選ぶ(色の合わせ方・静め方・格の上げ方はそのまま)
    const L = (fn) => (look ? (m) => fn(m) - lookDist(m, look) * 0.8 : fn);

    // A 合わせる: 写真の主色に色みが近いもの。
    // 写真全体の彩度とは比べない(白い壁や背景が入ると平均が下がり、色のある裂地が不当に負けるため)。
    // 色みの無い裂地は色相がただの雑音なので、候補から外す。
    if (photo.mainHasColor && tenchi.length) {
      const hasColor = (list) => { const c = list.filter((m) => m.s >= 0.15); return c.length ? c : list; };
      const near = (m) => -hueDist(m.h, photo.mainHue) / 180 * 1.4
        + Math.min(m.s, 0.5) * 0.5          // 色みがあるほうが「合わせた」と分かる
        - Math.max(0, m.s - 0.65) * 1.0;    // ただし派手すぎるものは避ける
      const t = pickBest(hasColor(tenchi), L(near));
      const n = pickBest(hasColor(naka.length ? naka : tenchi), L((m) => near(m) - m.patternStrength * 0.5), t ? [t.fab.id] : null);
      const i = ichi.length ? pickBest(ichi, L((m) => near(m))) : null;
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
      const t = pickBest(tenchi, L(calm));
      const n = pickBest(naka.length ? naka : tenchi, L(calm), t ? [t.fab.id] : null);
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
      const i = ichi.length ? pickBest(ichi, L(kinran)) : null;
      const n = pickBest(naka.length ? naka : tenchi, L((m) => (isFormal(m) ? 0.8 : 0) + m.patternStrength * 1.2), i ? [i.fab.id] : null);
      const t = pickBest(tenchi, L((m) => -m.s * 0.8 - m.patternStrength * 0.8 - Math.abs(m.l - 0.45)), [i && i.fab.id, n && n.fab.id].filter(Boolean));
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

    // 答えがあれば、選んだ裂地の印象が答えに近い案から並べる。いちばん近い案には印を付ける
    if (look && plans.length) {
      const byFab = new Map(fabrics.map((m) => [m.fab.id, m]));
      plans.forEach((p) => {
        const ms = [p.picks.tenchi, p.picks.nakamawashi, p.picks.ichimonji].filter(Boolean).map((f) => byFab.get(f.id)).filter(Boolean);
        p.fit = ms.reduce((a, m) => a + lookDist(m, look), 0) / Math.max(1, ms.length);
      });
      plans.sort((a, b) => a.fit - b.fit);
      plans[0].closest = true;
    }
    return plans;
  }

  /**
   * おまかせデザインの中廻しを、登録済みの裂地から選ぶ(2026-10-08 本人決定「B」)。
   * 計算で決めた中廻しの紙の色(nakaHex)に近く、柄が控えめで、答えの印象から離れすぎない裂地。
   * 十分に近いものがなければ null(紙のまま)。目安の幅は仮置き
   */
  function matchNaka(fabrics, nakaHex, look) {
    const FM = window.KakeFabricMap;
    if (!FM || !FM.hexLab) return null;
    const t = FM.hexLab(nakaHex);
    let best = null, bestScore = Infinity;
    usable(fabrics, "nakamawashi").forEach((m) => {
      if (!m.lab) return;
      const dE = Math.sqrt((m.lab[0] - t[0]) ** 2 + (m.lab[1] - t[1]) ** 2 + (m.lab[2] - t[2]) ** 2);
      const ld = lookDist(m, look);
      if (dE > 14 || (look && ld > 1.1) || m.patternStrength > 0.07) return; // 天地に絵があるので、中廻しは無地か地紋ていどの裂地だけ
      const score = dE / 14 + ld * 0.6 + m.patternStrength * 3;
      if (score < bestScore) { bestScore = score; best = m; }
    });
    return best ? best.fab : null;
  }

  window.KakeSuggest = {
    lookFrom: lookFrom,
    matchNaka: matchNaka,
    measurePhoto: measurePhoto,
    measureFabrics: measureFabrics,
    buildPlans: buildPlans,
  };
})();
