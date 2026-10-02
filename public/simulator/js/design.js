// 写真に合わせてデザインする ― サーバー(/api/design/*)とのやりとりと、画像の下ごしらえ。
// 画面への反映(裂地として割り当てる・描画)は app.js の initDesign が受け持つ。
// 写真を読み取りに送るのは、お客様が同意画面でチェックを入れたあとだけ。

(function (root) {
  "use strict";

  // お写真を、見えている範囲(位置調整の切り抜き)で長い辺 maxPx の JPEG にする
  function photoJpeg(src, crop, maxPx) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const sx = crop ? crop.sx : 0, sy = crop ? crop.sy : 0;
        const sw = crop ? crop.sw : img.naturalWidth, sh = crop ? crop.sh : img.naturalHeight;
        const k = Math.min(1, maxPx / Math.max(sw, sh));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(sw * k));
        c.height = Math.max(1, Math.round(sh * k));
        c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", 0.85)); } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json().catch(() => ({})).then((j) => {
        if (!r.ok) { const e = new Error(j.error || "failed"); e.code = j.error || "failed"; throw e; }
        return j;
      }));
  }

  // 写真の読み取りと案づくり → { id, concept, nakaHex, colors }。wishes は要望の画面の選択({ mood, tone, density, note })
  function analyze(photo, tenMm, chiMm, wishes) {
    return post("/api/design/analyze", { consent: true, photo: photo, ten: tenMm, chi: chiMm, wishes: wishes || {} });
  }

  // 天と地(1 枚に描いて上下に切り分けたもの)→ { ten, chi }(どちらも dataURL)
  function renderBoth(id) {
    return post("/api/design/render", { id: id });
  }

  // 中廻し用の「紙」の見本(無地にごく薄いむら)。裂地と同じくタイル状に敷く
  function paperSwatch(hex) {
    const n = 96;
    const c = document.createElement("canvas");
    c.width = n; c.height = n;
    const g = c.getContext("2d");
    g.fillStyle = hex;
    g.fillRect(0, 0, n, n);
    // 継ぎ目が出ないよう、ごく弱い粒だけ足す
    const d = g.getImageData(0, 0, n, n);
    let seed = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = ((seed / 2147483647) - 0.5) * 6;
      d.data[i] += v; d.data[i + 1] += v; d.data[i + 2] += v;
    }
    g.putImageData(d, 0, 0);
    return c.toDataURL("image/png");
  }

  // エラーの種類 → お客様に見せる文
  function errorMessage(e) {
    const code = (e && e.code) || "";
    if (code === "unsuitable") return "このお写真では絵柄をお作りできませんでした。別のお写真でお試しください。";
    if (code === "busy") return "ただいま混み合っています。少し時間をおいてお試しください。";
    return "デザインの作成に失敗しました。お手数ですが、もう一度お試しください。";
  }

  root.KakeDesign = { photoJpeg, analyze, renderBoth, paperSwatch, errorMessage };
})(window);
