// デザインの評価(職人用)。/api/design/admin を合言葉つきで呼び、一覧・画像の取り出し・評価の保存をする。
// 同じ回に作った 2 案(なじませる / 引き立てる)は 1 枚のカードに左右に並べ、それぞれに良い/イマイチを付ける。
// 理由のタグとひとことは 2 案共通(評価を付けた案ぶん保存する)。
// 評価はサーバーの lessons.json にも入り、次の案づくりの見本になる。

(function () {
  "use strict";

  const TOKEN_KEY = "kp_admin_token";
  const VARIANT = { blend: "写真になじませる案", echo: "写真の差し色を拾う案", lift: "写真を引き立てる案" };
  const SEASON = { spring: "春", summer: "夏", autumn: "秋", winter: "冬", none: "季節なし" };
  const WISH = {
    mood: { calm: "落ち着いた", gorgeous: "華やか", lovely: "かわいらしい", dignified: "凛とした" },
    tone: { photo: "写真の色に合わせる", pale: "淡く", deep: "深く" },
    density: { airy: "余白を多く", balanced: "ほどよく", rich: "にぎやかに" },
    // 2026-10-08 からの 4 問の答え
    place: { washitsu: "和室・床の間", living: "洋室・リビング", entrance: "玄関・お店", undecided: "飾る場所は未定" },
    memory: { celebration: "お祝い・記念日", nostalgia: "懐かしい思い出", daily: "日々の暮らし", quiet: "静かな景色・作品" },
    light: { light: "明るく軽やかに", deep: "落ち着いた深みで" },
    clarity: { clear: "すっきり澄んだ色", muted: "渋く味わいのある色" },
  };
  const FAIL = {
    motifs_too_few: "柄が少なすぎ", motifs_too_many: "柄が多すぎ", louder_than_photo: "写真より鮮やか",
    paper_color_off: "紙の色が大きくずれ", small_after_trim: "台紙の余白が大きい", background_not_uniform: "地の一部が別の色",
  };

  let token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { /* 記憶できない端末では毎回入れる */ }
  let filter = "unreviewed", next = null, tags = [], shown = 0;
  // 読み込みが重なったとき(「開く」と Enter の二重押しなど)は、最後に頼んだ分だけを表示する
  //(2026-10-02 本人指摘: 同じ番号・同じ時刻のデザインが 2 枚ずつ並んだ)
  let seq = 0;

  const $ = (id) => document.getElementById(id);
  const api = (q, opt) => fetch("/api/design/admin" + q, Object.assign({ headers: { "x-admin-token": token, "Content-Type": "application/json" } }, opt || {}));

  function login() {
    $("rv-login").hidden = false;
    $("rv-token").focus();
  }
  $("rv-login-btn").addEventListener("click", () => {
    token = $("rv-token").value.trim();
    load(true).then((ok) => {
      if (ok === null) return; // 後から頼んだ読み込みに置き換わった
      $("rv-login-error").hidden = ok;
      if (ok) { $("rv-login").hidden = true; try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* 記憶しない */ } }
    });
  });
  $("rv-token").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("rv-login-btn").click(); } });

  document.querySelectorAll(".rv-filter button").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document.querySelectorAll(".rv-filter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    load(true);
  }));
  $("rv-more").addEventListener("click", () => load(false));

  // 一覧を読む。reset なら最初から。合言葉が違えば false、後の読み込みに置き換わったら null
  function load(reset) {
    const my = ++seq;
    const q = "?list=1&limit=8&filter=" + filter + (!reset && next ? "&before=" + encodeURIComponent(next) : "");
    $("rv-more").disabled = true;
    return api(q).then((r) => {
      if (my !== seq) return null;
      if (r.status === 403) { login(); return false; }
      return r.json().then((j) => {
        if (my !== seq) return null;
        if (reset) { shown = 0; $("rv-list").innerHTML = ""; } // 消すのは結果が届いてから(重なっても二重にならない)
        tags = j.tags || tags;
        next = j.next;
        (j.groups || []).forEach((g) => $("rv-list").appendChild(card(g)));
        shown += (j.groups || []).length;
        $("rv-more").hidden = !next;
        $("rv-more").disabled = false;
        $("rv-empty").hidden = shown > 0;
        $("rv-summary").textContent = (filter === "unreviewed" ? "未評価 " : "") + shown + " 回分を表示" + (next ? "(続きあり)" : "");
        return true;
      });
    }).catch(() => (my === seq ? false : null));
  }

  // 合言葉が要る画像は、取り出してから貼る
  function img(id, file, alt) {
    const el = document.createElement("img");
    el.alt = alt;
    el.loading = "lazy";
    api("?id=" + id + "&file=" + file).then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) el.src = URL.createObjectURL(b); else el.remove(); });
    return el;
  }

  const text = (cls, s) => { const p = document.createElement("p"); p.className = cls; p.textContent = s; return p; };

  // 1 回分(2 案)のカード
  function card(members) {
    const a = members[0];
    const li = document.createElement("li");
    li.className = "rv-card";

    // 共通の情報
    li.appendChild(text("rv-concept", a.concept || ""));
    const w = a.wishes || {};
    const wishText = [WISH.place[w.place], WISH.memory[w.memory], WISH.light[w.light], WISH.clarity[w.clarity],
      WISH.mood[w.mood], WISH.tone[w.tone], WISH.density[w.density], w.note ? "「" + w.note + "」" : ""].filter(Boolean).join("・") || "おまかせ";
    const meta = document.createElement("p");
    meta.className = "rv-meta";
    [
      ["写真", (a.scene || "") + (a.season ? "(" + (SEASON[a.season] || a.season) + ")" : "")],
      ["見立て", a.mitate || "―"],
      ["要望", wishText],
      ["イメージ", (a.words || []).join("・") || "―"],
      ["日時", new Date(a.createdAt).toLocaleString("ja-JP")],
    ].forEach(([k, v]) => { const b = document.createElement("b"); b.textContent = k + " "; meta.appendChild(b); meta.appendChild(document.createTextNode(v)); meta.appendChild(document.createElement("br")); });
    li.appendChild(meta);

    // 2 案を左右に
    const cols = document.createElement("div");
    cols.className = "rv-cols" + (members.length === 1 ? " one" : "");
    const ratings = {}; // id -> "good" | "bad" | null
    const save = document.createElement("button");
    members.forEach((it) => {
      ratings[it.id] = it.review ? it.review.rating : null;
      const col = document.createElement("div");
      col.className = "rv-col" + (it.review ? " rated-" + it.review.rating : "");
      const head = document.createElement("p");
      head.className = "rv-col-head";
      head.textContent = VARIANT[it.variant] || "案";
      if (it.picked) { const s = document.createElement("span"); s.className = "rv-picked"; s.textContent = "お客様が選んだ"; head.appendChild(s); }
      if (it.ordered) { const s = document.createElement("span"); s.className = "rv-picked"; s.textContent = "注文済み"; head.appendChild(s); }
      col.appendChild(head);
      const pic = document.createElement("div");
      pic.className = "rv-pic";
      if (it.hasPreview) pic.appendChild(img(it.id, "preview.jpg", "写真を入れた掛軸の見本"));
      else if (it.rendered) { pic.appendChild(img(it.id, "ten.jpg", "天")); pic.appendChild(img(it.id, "chi.jpg", "地")); }
      col.appendChild(pic);
      const m = it.metrics || {};
      const fails = (it.failed || []).map((f) => FAIL[f] || f).join("・");
      col.appendChild(text("rv-small", m.coverage != null
        ? "柄 " + Math.round(m.coverage * 100) + "%・鮮やかさ " + m.colorfulness + "(写真 " + ((it.photo || {}).colorfulness ?? "?") + ")" + (fails ? "・基準外 " + fails : "") + (it.tries > 1 ? "・描き直し " + (it.tries - 1) : "")
        : "未描画"));
      if (it.palette) {
        const sw = document.createElement("div");
        sw.className = "rv-swatches";
        [["紙", it.palette.base], ["中廻し", it.palette.naka], ["小さな色", it.palette.accent]].forEach(([k, hex]) => {
          if (!hex) return;
          const s = document.createElement("span"); s.style.background = hex; s.title = k + " " + hex;
          sw.appendChild(s);
        });
        col.appendChild(sw);
      }
      col.appendChild(text("rv-small rv-id", it.id));
      const rate = document.createElement("div");
      rate.className = "rv-rate";
      [["good", "良い"], ["bad", "イマイチ"]].forEach(([r, label]) => {
        const b = document.createElement("button");
        b.type = "button"; b.dataset.r = r; b.textContent = label;
        b.setAttribute("aria-pressed", String(ratings[it.id] === r));
        b.addEventListener("click", () => {
          ratings[it.id] = ratings[it.id] === r ? null : r; // もう一度押すと外れる
          rate.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.r === ratings[it.id])));
          save.disabled = !Object.values(ratings).some(Boolean);
        });
        rate.appendChild(b);
      });
      col.appendChild(rate);
      cols.appendChild(col);
    });
    li.appendChild(cols);

    // 理由とひとこと(2 案共通)
    const prev = members.find((it) => it.review) || null;
    const picked = new Set(prev ? prev.review.tags : []);
    const tg = document.createElement("div");
    tg.className = "rv-tags";
    tags.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = t;
      b.setAttribute("aria-pressed", String(picked.has(t)));
      b.addEventListener("click", () => {
        if (picked.has(t)) picked.delete(t); else picked.add(t);
        b.setAttribute("aria-pressed", String(picked.has(t)));
        save.disabled = !Object.values(ratings).some(Boolean);
      });
      tg.appendChild(b);
    });
    li.appendChild(tg);

    const cm = document.createElement("textarea");
    cm.className = "rv-comment";
    cm.maxLength = 300;
    cm.placeholder = "ひとこと(例: 左の方が余白がきれい / 月が大きすぎる)";
    cm.value = prev ? prev.review.comment || "" : "";
    cm.addEventListener("input", () => { save.disabled = !Object.values(ratings).some(Boolean); });
    li.appendChild(cm);

    save.type = "button";
    save.className = "rv-save";
    save.textContent = prev ? "評価を更新する" : "評価を保存する";
    save.disabled = true;
    const done = text("rv-saved", prev ? "評価済み(" + new Date(prev.review.at).toLocaleString("ja-JP") + ")" : "");
    save.addEventListener("click", () => {
      const ids = Object.keys(ratings).filter((id) => ratings[id]);
      if (!ids.length) return;
      save.disabled = true;
      Promise.all(ids.map((id) => api("", { method: "POST", body: JSON.stringify({ id, action: "review", rating: ratings[id], tags: Array.from(picked), comment: cm.value }) }).then((r) => r.json())))
        .then((res) => {
          if (!res.every((j) => j.ok)) throw new Error("save");
          cols.querySelectorAll(".rv-col").forEach((col, i) => {
            const r = ratings[members[i].id];
            col.className = "rv-col" + (r ? " rated-" + r : "");
          });
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
