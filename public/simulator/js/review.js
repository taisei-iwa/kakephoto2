// デザインの評価(職人用)。/api/design/admin を合言葉つきで呼び、一覧・画像の取り出し・評価の保存をする。
// 評価(良い/イマイチ・理由・ひとこと)はサーバーの lessons.json にも入り、次の案づくりの見本になる。

(function () {
  "use strict";

  const TOKEN_KEY = "kp_admin_token";
  const VARIANT = { blend: "写真になじませる案", lift: "写真を引き立てる案" };
  const SEASON = { spring: "春", summer: "夏", autumn: "秋", winter: "冬", none: "季節なし" };
  const WISH = {
    mood: { calm: "落ち着いた", gorgeous: "華やか", lovely: "かわいらしい", dignified: "凛とした" },
    tone: { photo: "写真の色に合わせる", pale: "淡く", deep: "深く" },
    density: { airy: "余白を多く", balanced: "ほどよく", rich: "にぎやかに" },
  };
  const FAIL = {
    motifs_too_few: "柄が少なすぎ", motifs_too_many: "柄が多すぎ", louder_than_photo: "写真より鮮やか",
    paper_color_off: "紙の色が大きくずれ", small_after_trim: "台紙の余白が大きい",
  };

  let token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { /* 記憶できない端末では毎回入れる */ }
  let filter = "unreviewed", next = null, tags = [], shown = 0;

  const $ = (id) => document.getElementById(id);
  const api = (q, opt) => fetch("/api/design/admin" + q, Object.assign({ headers: { "x-admin-token": token, "Content-Type": "application/json" } }, opt || {}));

  function login() {
    $("rv-login").hidden = false;
    $("rv-token").focus();
  }
  $("rv-login-btn").addEventListener("click", () => {
    token = $("rv-token").value.trim();
    load(true).then((ok) => {
      $("rv-login-error").hidden = ok;
      if (ok) { $("rv-login").hidden = true; try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* 記憶しない */ } }
    });
  });
  $("rv-token").addEventListener("keydown", (e) => { if (e.key === "Enter") $("rv-login-btn").click(); });

  document.querySelectorAll(".rv-filter button").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document.querySelectorAll(".rv-filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    load(true);
  }));
  $("rv-more").addEventListener("click", () => load(false));

  // 一覧を読む。reset なら最初から。合言葉が違えば false
  function load(reset) {
    if (reset) { next = null; shown = 0; $("rv-list").innerHTML = ""; }
    const q = "?list=1&limit=12&filter=" + filter + (next ? "&before=" + encodeURIComponent(next) : "");
    return api(q).then((r) => {
      if (r.status === 403) { login(); return false; }
      return r.json().then((j) => {
        tags = j.tags || tags;
        next = j.next;
        j.items.forEach((it) => $("rv-list").appendChild(card(it)));
        shown += j.items.length;
        $("rv-more").hidden = !next;
        $("rv-empty").hidden = shown > 0;
        $("rv-summary").textContent = (filter === "unreviewed" ? "未評価 " : "") + shown + " 件を表示" + (next ? "(続きあり)" : "");
        return true;
      });
    }).catch(() => false);
  }

  // 合言葉が要る画像は、取り出してから貼る
  function img(id, file, alt) {
    const el = document.createElement("img");
    el.alt = alt;
    el.loading = "lazy";
    api("?id=" + id + "&file=" + file).then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) el.src = URL.createObjectURL(b); else el.remove(); });
    return el;
  }

  function card(it) {
    const li = document.createElement("li");
    li.className = "rv-card" + (it.review ? " rated-" + it.review.rating : "");

    const pics = document.createElement("div");
    pics.className = "rv-images";
    if (it.hasPreview) pics.appendChild(img(it.id, "preview.jpg", "写真を入れた掛軸の見本"));
    if (it.rendered) {
      const tc = document.createElement("div");
      tc.className = "rv-tenchi";
      tc.appendChild(img(it.id, "ten.jpg", "天"));
      tc.appendChild(img(it.id, "chi.jpg", "地"));
      pics.appendChild(tc);
    }
    li.appendChild(pics);

    const concept = document.createElement("p");
    concept.className = "rv-concept";
    concept.textContent = it.concept || "";
    li.appendChild(concept);

    const w = it.wishes || {};
    const wishText = [WISH.mood[w.mood], WISH.tone[w.tone], WISH.density[w.density], w.note ? "「" + w.note + "」" : ""].filter(Boolean).join("・") || "おまかせ";
    const m = it.metrics || {};
    const meta = document.createElement("p");
    meta.className = "rv-meta";
    meta.innerHTML = "";
    const lines = [
      ["案", (VARIANT[it.variant] || "") + (it.pair ? (it.picked ? "(お客様が選んだ)" : "(選ばれなかった)") : "") + (it.ordered ? "・注文済み" : "")],
      ["写真", (it.scene || "") + (it.season ? "(" + (SEASON[it.season] || it.season) + ")" : "")],
      ["見立て", it.mitate || "―"],
      ["要望", wishText],
      ["測った値", m.coverage != null ? "柄の面積 " + Math.round(m.coverage * 100) + "%・鮮やかさ " + m.colorfulness + "(写真 " + ((it.photo || {}).colorfulness ?? "?") + ")・紙の色のずれ " + m.bgDelta : "未描画"],
      ["基準外", ((it.failed || []).map((f) => FAIL[f] || f).join("・") || "なし") + (it.tries > 1 ? "(描き直し " + (it.tries - 1) + " 回)" : "")],
      ["番号", it.id + "・" + new Date(it.createdAt).toLocaleString("ja-JP")],
    ];
    lines.forEach(([k, v]) => { const b = document.createElement("b"); b.textContent = k + " "; meta.appendChild(b); meta.appendChild(document.createTextNode(v)); meta.appendChild(document.createElement("br")); });
    li.appendChild(meta);

    if (it.palette) {
      const sw = document.createElement("div");
      sw.className = "rv-swatches";
      [["紙", it.palette.base], ["中廻し", it.palette.naka], ["小さな色", it.palette.accent]].forEach(([k, hex]) => {
        if (!hex) return;
        const s = document.createElement("span"); s.style.background = hex; s.title = k + " " + hex;
        sw.appendChild(s); sw.appendChild(document.createTextNode(k));
      });
      li.appendChild(sw);
    }

    // 評価
    let rating = it.review ? it.review.rating : null;
    const picked = new Set(it.review ? it.review.tags : []);
    const rate = document.createElement("div");
    rate.className = "rv-rate";
    const save = document.createElement("button");
    [["good", "良い"], ["bad", "イマイチ"]].forEach(([r, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.r = r; b.textContent = label;
      b.setAttribute("aria-pressed", String(rating === r));
      b.addEventListener("click", () => {
        rating = r;
        rate.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.r === r)));
        save.disabled = false;
      });
      rate.appendChild(b);
    });
    li.appendChild(rate);

    const tg = document.createElement("div");
    tg.className = "rv-tags";
    tags.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = t;
      b.setAttribute("aria-pressed", String(picked.has(t)));
      b.addEventListener("click", () => {
        if (picked.has(t)) picked.delete(t); else picked.add(t);
        b.setAttribute("aria-pressed", String(picked.has(t)));
        if (rating) save.disabled = false;
      });
      tg.appendChild(b);
    });
    li.appendChild(tg);

    const cm = document.createElement("textarea");
    cm.className = "rv-comment";
    cm.maxLength = 300;
    cm.placeholder = "ひとこと(どこが良い/気になるか)";
    cm.value = it.review ? it.review.comment || "" : "";
    cm.addEventListener("input", () => { if (rating) save.disabled = false; });
    li.appendChild(cm);

    save.type = "button";
    save.className = "rv-save";
    save.textContent = it.review ? "評価を更新する" : "評価を保存する";
    save.disabled = true;
    const done = document.createElement("p");
    done.className = "rv-saved";
    done.textContent = it.review ? "評価済み(" + new Date(it.review.at).toLocaleString("ja-JP") + ")" : "";
    save.addEventListener("click", () => {
      if (!rating) return;
      save.disabled = true;
      api("", { method: "POST", body: JSON.stringify({ id: it.id, action: "review", rating, tags: Array.from(picked), comment: cm.value }) })
        .then((r) => r.json())
        .then((j) => {
          if (!j.ok) throw new Error("save");
          li.className = "rv-card rated-" + rating;
          done.textContent = "保存しました。次のデザインづくりに反映されます。";
          save.textContent = "評価を更新する";
        })
        .catch(() => { done.textContent = "保存に失敗しました。もう一度お試しください。"; save.disabled = false; });
    });
    li.appendChild(save);
    li.appendChild(done);
    return li;
  }

  if (token) load(true); else login();
})();
