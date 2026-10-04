// fabricmap.js — 裂地の地図(職人用。URL に #admin を付けたときだけ表示)。2026-10-03。
//
// 裂地を「暖かさ・重さ・活動感」の3つの軸に並べ、足りない印象を一覧にする。
// 根拠: 資料/2026-10-03_カラーイメージスケール世界調査_…
//   - 色の印象の式は Ou, Luo, Woodcock & Wright (2004) A study of colour emotion and colour preference
//     (Part I の式。Part III に引用)。暖かさ ≒ 小林のイメージスケールの WARM–COOL、重さ ≒ SOFT–HARD、
//     活動感 ≒ CLEAR–GRAYISH に当たる(同じ「形容詞の対で評価して因子分析」から出た軸)。
//   - 柄のある裂地は、色の面積で重みをつけた平均で印象を出す(2色の印象は各色の平均で予測できる = Ou ほか Part II、
//     面積の偏りは重みをつけると当たる = Schloss らのグループ 2026)。
// 小林の本(NCD)のデータは使っていない。軸の上の言葉の範囲は、本人が本を見ながら校正する(段階 2)。
// 2026-10-04 本の冒頭(p.2〜22)を確認して 2 点を直した:
//   - 清濁: 本では暗いトーン(Dp・Dk・Dgr)は工学的には清色でも「心理的濁色」。Ou の活動感は暗いほど高く出て
//     濃紺・焦茶が「澄んだ」に入っていたので、暗い有彩色を濁色側へ寄せる(clarity)。黒・白は本でも清色なのでそのまま。
//   - 領域の名前を、本の配色イメージの大分類(はなやか/おだやか/さわやか)の考え方に合わせた(位置はこちらの計算)。
// 未解決: 本では S トーン(鮮やかさを少し灰で落とした色)は濁色だが、Ou の式は鮮やかさしか見ないため「澄んだ」に出る
//   (本の見本色 R/S・G/S で確認)。灰の混ざり具合を測るにはマンセルのトーン判定が要る。
// 地図の向きは本と見比べやすいよう、左=暖かい・右=涼しい、上=軽い(ソフト)・下=重い(ハード)。
(function () {
  "use strict";

  // ---- 色の変換(sRGB D65 → CIELAB)----
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function f(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
  function rgbToLab(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b);
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
    const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function labToHex(L, a, b) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const inv = (t) => (t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27));
    const X = 0.95047 * inv(fx), Y = inv(fy), Z = 1.08883 * inv(fz);
    const gam = (c) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
    const r = gam(3.2406 * X - 1.5372 * Y - 0.4986 * Z), g = gam(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), bl = gam(0.0557 * X - 0.204 * Y + 1.057 * Z);
    return "#" + [r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  // ---- 色の印象(Ou ほか 2004)----
  const rad = (d) => d * Math.PI / 180;
  function emotion(L, a, b) {
    const C = Math.hypot(a, b), h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
    return {
      activity: -2.1 + 0.06 * Math.sqrt((L - 50) ** 2 + (a - 3) ** 2 + ((b - 17) / 1.4) ** 2),
      weight: -1.8 + 0.04 * (100 - L) + 0.45 * Math.cos(rad(h - 100)),
      heat: -0.5 + 0.02 * Math.pow(C, 1.07) * Math.cos(rad(h - 50)),
    };
  }
  // 中立(中くらいの灰色 L*50)の位置。地図の十字線と、領域の境目の基準にする
  const MID = emotion(50, 0, 0);

  // ---- 清濁(澄み具合)。Ou の活動感に、小林の「心理的濁色」を足す ----
  // 色相ごとの鮮やかな色の明るさ(L*)。マンセルで彩度が最も高くなる明度のおおよそ(赤は暗め、黄は明るい)。
  // [CIELAB の色相角, L*]。この明るさより 3 以上暗い有彩色は、暗くなるほど濁色側へ寄せる(15 暗いところで完全に濁色)。
  const VIVID_L = [[30, 41], [60, 61], [90, 81], [115, 71], [160, 51], [195, 51], [230, 41], [270, 36], [310, 36], [350, 41]];
  function vividL(h) {
    const pts = VIVID_L.concat([[VIVID_L[0][0] + 360, VIVID_L[0][1]]]);
    if (h < pts[0][0]) h += 360;
    for (let i = 0; i < pts.length - 1; i++) {
      const [h0, l0] = pts[i], [h1, l1] = pts[i + 1];
      if (h >= h0 && h <= h1) return l0 + (l1 - l0) * (h - h0) / (h1 - h0);
    }
    return 45;
  }
  const DARK_CLARITY = -1.1; // 「くすんだ」の領域(-0.9 より下)に入る値
  function clarity(L, a, b, act) {
    const C = Math.hypot(a, b), h = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
    const dark = Math.min(1, Math.max(0, (vividL(h) - L - 3) / 12));
    const chromatic = Math.min(1, Math.max(0, (C - 4) / 8)); // 無彩色(黒・灰)には効かせない
    const t = dark * chromatic;
    return act * (1 - t) + DARK_CLARITY * t;
  }

  // ---- 裂地の色を取り出す(k-means で 3 色。柄の地の色と柄の色を分ける)----
  function sampleLabs(img) {
    const size = 40;
    const cv = document.createElement("canvas");
    cv.width = size; cv.height = size;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    let d;
    try { d = ctx.getImageData(0, 0, size, size).data; } catch (e) { return null; }
    const out = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 200) out.push(rgbToLab(d[i], d[i + 1], d[i + 2]));
    return out.length ? out : null;
  }
  function kmeans(px, k) {
    const sorted = px.slice().sort((p, q) => p[0] - q[0]);
    let cs = [];
    for (let j = 0; j < k; j++) cs.push(sorted[Math.floor((j + 0.5) / k * sorted.length)].slice());
    let asg = new Array(px.length).fill(0);
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < px.length; i++) {
        let best = 0, bd = Infinity;
        for (let j = 0; j < cs.length; j++) {
          const dd = (px[i][0] - cs[j][0]) ** 2 + (px[i][1] - cs[j][1]) ** 2 + (px[i][2] - cs[j][2]) ** 2;
          if (dd < bd) { bd = dd; best = j; }
        }
        asg[i] = best;
      }
      cs = cs.map((c, j) => {
        let n = 0, s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < px.length; i++) if (asg[i] === j) { n++; s0 += px[i][0]; s1 += px[i][1]; s2 += px[i][2]; }
        return n ? [s0 / n, s1 / n, s2 / n] : c;
      });
    }
    const w = cs.map((_, j) => asg.filter((x) => x === j).length / px.length);
    return cs.map((c, j) => ({ lab: c, w: w[j] })).filter((c) => c.w > 0.02).sort((p, q) => q.w - p.w);
  }
  function measure(img) {
    const px = sampleLabs(img);
    if (!px) return null;
    const clusters = kmeans(px, 3);
    let heat = 0, weight = 0, activity = 0, clar = 0, wsum = 0;
    clusters.forEach((c) => {
      const e = emotion(c.lab[0], c.lab[1], c.lab[2]);
      heat += e.heat * c.w; weight += e.weight * c.w; activity += e.activity * c.w; wsum += c.w;
      clar += clarity(c.lab[0], c.lab[1], c.lab[2], e.activity) * c.w;
    });
    let meanL = 0;
    px.forEach((p) => { meanL += p[0]; });
    meanL /= px.length;
    let v = 0;
    px.forEach((p) => { v += (p[0] - meanL) ** 2; });
    return {
      heat: heat / wsum, weight: weight / wsum, activity: activity / wsum, clarity: clar / wsum,
      pattern: Math.sqrt(v / px.length), // 明るさのばらつき = 柄の強さ
      colors: clusters.map((c) => ({ hex: labToHex(c.lab[0], c.lab[1], c.lab[2]), w: c.w })),
    };
  }
  function measureAll(fabrics) {
    return Promise.all(fabrics.map((fab) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { const m = measure(img); resolve(m ? Object.assign({ fab: fab }, m) : null); };
      img.onerror = () => resolve(null);
      img.src = fab.dataUrl;
    }))).then((list) => list.filter(Boolean));
  }

  // ---- 領域(仮の名前。段階 2 で本人が本を見ながら言葉を校正する)----
  // 暖かさは中立から ±0.25、重さは中立から ±0.4 を境に 3×3 に分ける(25 点の試算で、ほどよく散る幅)
  const HEAT_EDGE = 0.25, WEIGHT_EDGE = 0.4, ACT_EDGE = 0.45;
  function heatSide(m) { const d = m.heat - MID.heat; return d > HEAT_EDGE ? 0 : d < -HEAT_EDGE ? 2 : 1; } // 0=暖 1=中 2=涼
  function weightSide(m) { const d = m.weight - MID.weight; return d < -WEIGHT_EDGE ? 0 : d > WEIGHT_EDGE ? 2 : 1; } // 0=軽 1=中 2=重
  // 澄み具合の基準は灰色ではなく、式の目盛りの中ほど(-0.45)。Ou の式では灰色は極端に「受動的」に出るため、
  // 灰色を基準にするとほとんどの裂地が「澄んだ」側に入ってしまう(2026-10-03 試算で確認)。
  // 結果: 澄んだ = 活動感 0 より上(赤・橙の鮮やかな裂地)、くすんだ = -0.9 より下
  const ACT_MID = -0.45;
  function actSide(m) { const d = m.clarity - ACT_MID; return d > ACT_EDGE ? 0 : d < -ACT_EDGE ? 2 : 1; } // 0=澄んだ 1=中 2=くすんだ
  // 名前は本の配色イメージの大分類に合わせた(左の列=はなやか、中=おだやか、右=さわやか。上=ソフト、下=ハード)。
  // 仮の当てはめ。本人が本の地図と見比べて直す
  const REGION = [
    ["軽く暖かい(プリティ・カジュアル: かわいらしい・楽しい)", "軽く穏やか(ロマンチック・ナチュラル: やさしい・淡い)", "軽く涼しい(クリア: 清潔・さわやか)"],
    ["暖かい(カジュアル: にぎやか・親しみ)", "中くらい(エレガント・シック: 上品・落ち着いた)", "涼しい(クール・カジュアル: すっきり・若々しい)"],
    ["深く暖かい(ゴージャス・ダイナミック: 豪華・力強い)", "深く穏やか(クラシック・ダンディ: 伝統的・渋い)", "深く涼しい(モダン・フォーマル: 凛とした・格式)"],
  ];
  const ACT_NAME = ["澄んだ(清色)", "中くらい", "くすんだ(濁色)"];
  const USE = { tenchi: "天地", nakamawashi: "中廻し・柱", ichimonji: "一文字" };

  // ---- 描く ----
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  // x は暖かさ(左=暖)、y は weight(上=軽)または clarity(上=澄んだ)
  function plot(list, yKey, yLabelTop, yLabelBottom, yMid, yRange, xRange) {
    const W = 520, H = 420, pad = 40;
    const sx = (heat) => pad + (1 - (heat - xRange[0]) / (xRange[1] - xRange[0])) * (W - 2 * pad);
    const sy = (v) => {
      const t = (v - yRange[0]) / (yRange[1] - yRange[0]);
      return yKey === "clarity" ? pad + (1 - t) * (H - 2 * pad) : pad + t * (H - 2 * pad);
    };
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="fmap-svg" role="img" aria-label="裂地の地図">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#f6f3ee"/>';
    // 中立の十字線と、領域の境目(点線)
    const x0 = sx(MID.heat), y0 = sy(yMid);
    const yEdge = yKey === "clarity" ? ACT_EDGE : WEIGHT_EDGE;
    s += '<line x1="' + x0 + '" y1="' + pad / 2 + '" x2="' + x0 + '" y2="' + (H - pad / 2) + '" stroke="#bbb"/>';
    s += '<line x1="' + pad / 2 + '" y1="' + y0 + '" x2="' + (W - pad / 2) + '" y2="' + y0 + '" stroke="#bbb"/>';
    [MID.heat - HEAT_EDGE, MID.heat + HEAT_EDGE].forEach((v) => { s += '<line x1="' + sx(v) + '" y1="' + pad / 2 + '" x2="' + sx(v) + '" y2="' + (H - pad / 2) + '" stroke="#ddd" stroke-dasharray="3 4"/>'; });
    [yMid - yEdge, yMid + yEdge].forEach((v) => { s += '<line x1="' + pad / 2 + '" y1="' + sy(v) + '" x2="' + (W - pad / 2) + '" y2="' + sy(v) + '" stroke="#ddd" stroke-dasharray="3 4"/>'; });
    const t = (x, y, txt, anchor) => '<text x="' + x + '" y="' + y + '" font-size="12" fill="#6b6258" text-anchor="' + (anchor || "middle") + '">' + txt + "</text>";
    s += t(pad - 6, y0 - 6, "暖かい", "start") + t(W - pad + 6, y0 - 6, "涼しい", "end");
    s += t(x0, 16, yLabelTop) + t(x0, H - 6, yLabelBottom);
    // 裂地(小さな円に裂地の画像)
    list.forEach((m, i) => {
      const x = sx(Math.max(xRange[0], Math.min(xRange[1], m.heat)));
      const y = sy(Math.max(yRange[0], Math.min(yRange[1], m[yKey])));
      const id = "fmc" + yKey + i;
      s += '<clipPath id="' + id + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11"/></clipPath>';
      s += '<image href="' + esc(m.fab.dataUrl) + '" x="' + (x - 11).toFixed(1) + '" y="' + (y - 11).toFixed(1) + '" width="22" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"><title>' + esc(m.fab.name) + "</title></image>";
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="11" fill="none" stroke="#fff" stroke-width="1.5"/>';
    });
    return s + "</svg>";
  }

  function render(container, fabrics) {
    if (!container) return;
    container.innerHTML = '<p class="fmap-note">測っています…</p>';
    const list = fabrics.filter((f) => !f.generated && f.dataUrl);
    measureAll(list).then((ms) => {
      // 軸の幅: 裂地の範囲より少し広く(外れ値は端に寄せて描く)
      const xRange = [-1.6, 1.4], wRange = [-1.2, 2.2], aRange = [-2.4, 1.0];
      let h = '<p class="fmap-note">裂地の色を測り、色の印象の式(Ou ほか 2004)で3つの軸に並べています。左=暖かい・右=涼しい。小林『カラーイメージスケール』と同じ向きなので、本と見比べられます。言葉は本の大分類(はなやか・おだやか・さわやか)に合わせた仮の名前です。澄み具合は、本と同じく暗いトーンを濁色として扱います(黒・白は清色)。柄の裂地は、色の面積で重みをつけた平均です。</p>';
      h += '<div class="fmap-plots"><figure>' + plot(ms, "weight", "軽い(ソフト)", "重い(ハード)", MID.weight, wRange, xRange) + "<figcaption>暖かさ × 重さ(本の主な地図と同じ組み合わせ)</figcaption></figure>";
      h += "<figure>" + plot(ms, "clarity", "澄んだ(清色)", "くすんだ(濁色)", ACT_MID, aRange, xRange) + "<figcaption>暖かさ × 澄み具合(暗い色は濁色側へ寄せています)</figcaption></figure></div>";
      // 足りない印象(用途ごとに数える)
      h += "<h4>足りない印象(用途ごとの裂地の数)</h4><table class=\"fmap-gap\"><thead><tr><th>印象(仮の名前)</th>";
      Object.keys(USE).forEach((u) => { h += "<th>" + USE[u] + "</th>"; });
      h += "</tr></thead><tbody>";
      for (let wy = 0; wy < 3; wy++) for (let hx = 0; hx < 3; hx++) {
        h += "<tr><td>" + REGION[wy][hx] + "</td>";
        Object.keys(USE).forEach((u) => {
          const n = ms.filter((m) => weightSide(m) === wy && heatSide(m) === hx && (m.fab.uses || []).indexOf(u) >= 0).length;
          h += '<td class="' + (n === 0 ? "fmap-zero" : n === 1 ? "fmap-few" : "") + '">' + n + "</td>";
        });
        h += "</tr>";
      }
      for (let ay = 0; ay < 3; ay++) {
        h += "<tr><td>" + ACT_NAME[ay] + "</td>";
        Object.keys(USE).forEach((u) => {
          const n = ms.filter((m) => actSide(m) === ay && (m.fab.uses || []).indexOf(u) >= 0).length;
          h += '<td class="' + (n === 0 ? "fmap-zero" : n === 1 ? "fmap-few" : "") + '">' + n + "</td>";
        });
        h += "</tr>";
      }
      h += "</tbody></table><p class=\"fmap-note\">0 は赤、1 は黄色。裂地を足すなら 0 のところから。</p>";
      // 一覧
      h += "<h4>裂地ごとの位置</h4><table class=\"fmap-list\"><thead><tr><th>裂地</th><th>主な色</th><th>用途</th><th>印象(仮)</th><th>澄み具合</th><th>暖かさ</th><th>重さ</th><th>活動感</th><th>柄の強さ</th></tr></thead><tbody>";
      ms.slice().sort((p, q) => (weightSide(p) * 3 + heatSide(p)) - (weightSide(q) * 3 + heatSide(q))).forEach((m) => {
        h += "<tr><td>" + esc(m.fab.name) + "</td><td>" + m.colors.map((c) => '<span class="fmap-sw" style="background:' + c.hex + ";width:" + Math.max(6, Math.round(c.w * 48)) + 'px" title="' + c.hex + " " + Math.round(c.w * 100) + '%"></span>').join("") + "</td>";
        h += "<td>" + (m.fab.uses || []).map((u) => USE[u] || u).join("・") + "</td><td>" + REGION[weightSide(m)][heatSide(m)] + "</td><td>" + ACT_NAME[actSide(m)] + "</td>";
        h += "<td>" + m.heat.toFixed(2) + "</td><td>" + m.weight.toFixed(2) + "</td><td>" + m.activity.toFixed(2) + "</td><td>" + m.pattern.toFixed(0) + "</td></tr>";
      });
      h += "</tbody></table>";
      container.innerHTML = h;
    });
  }

  window.KakeFabricMap = { render: render, measure: measure, emotion: emotion };
})();
