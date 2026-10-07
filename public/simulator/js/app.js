// かけフォト 掛軸オーダーシミュレーター ― スプリント1 アプリ本体。
// 派生元 kakejiku-toriawase/js/app.js の「掛軸プレビュー描画」「本紙への写真取り込み・トリミング・クリップ」
//   「中央プレビューの部位クリック → 用途別の裂地ピッカー」を流用し、顧客向けに作り替えたもの。
// 変更点:
//   - 箱4(裂地取り込みフォーム)・箱5(裂地候補一覧グリッド)・IndexedDB 永続化・割り当てダイアログ系は削除。
//   - 顧客は中央プレビューの部位クリック → 用途別ピッカーだけで裂地を選ぶ。
//   - 本紙サイズ選択(A4/A3 定型の縦横、A3 までの自由サイズ)とサイズ価格のリアルタイム表示を追加。
//   - 表装形式は全形式を見せる。部位オプション(一文字なし/風帯なし/明朝仕立て)は形式変更でも状態を保持する。
// 価格・裂地メタは catalog.js / pricing.js のデータに基づく(ハードコードしない)。

(function () {
  "use strict";

  // ---- 状態 ----
  const state = {
    formatId: FORMAT_PRESETS[0].id,
    formatChosen: false, // 仕立てを本人が選んだか(必須。選ぶまでプレビューは formatId の既定で見せる)
    // サイズ
    sizeMode: "",              // "" (未選択) | "a4" | "a3" | "free"
    orientation: "portrait",   // "portrait" | "landscape"(定型のみ意味を持つ)
    freeW: 210,
    freeH: 297,
    // 現在有効な本紙寸法(mm)。これがプレビュー・価格の基準。直前の有効値を保持する。
    // 未選択時もプレビューを描けるよう A4 縦の比率を初期値に持つ(価格は 0)。
    honshiW: 210,
    honshiH: 297,
    // 現在有効なサイズ価格と表示ラベル(未選択は 0)
    sizePrice: 0,
    sizeTierLabel: "",
    // 裂地候補(catalog から)と割り当て
    fabrics: [],
    assignments: {},           // layoutKey -> fabricId
    // 箱オプション(スプリント2)
    boxKey: "paper",           // "paper" | "kiri"
    // 軸先(端の飾り)の色
    jikuColor: "brown",        // "black" | "brown" | "ivory"
    // 写真(本紙画像)
    honshiImage: null,         // null | { dataUrl, naturalW, naturalH, cropRect }
    // 部位オプション(形式変更でも保持する。形式に無い部位はその形式では無効化のみ)
    // 既定は「一文字なし・風帯なし」(チェックボックスは「あり」を表す)
    opt: { noIchimonji: true, noFuutai: true, mincho: false },
  };

  // ---- DOM(箱セグメント・内訳追加要素) ----
  const elBox = {
    radios: document.getElementsByName("box-option"),
    bdFabric: document.getElementById("bd-fabric"),
    bdBox: document.getElementById("bd-box"),
  };

  // UI 部位グループ → レイアウトキーのペア
  const PART_GROUPS = {
    ichimonji: { label: "一文字", keys: ["ichimonjiUe", "ichimonjiShita"] },
    nakamawashi: { label: "中廻し", keys: ["nakaUe", "nakaShita"] },
    tenchi: { label: "天地", keys: ["ten", "chi"] },
    hashira: { label: "柱", keys: ["hashiraLeft", "hashiraRight"] },
    fuutai: { label: "風帯", keys: ["fuutaiLeft", "fuutaiRight"] },
    heri: { label: "明朝縁", keys: ["heriLeft", "heriRight"] },
  };

  // ---- DOM ----
  const el = {
    formatSelect: document.getElementById("format-select"),
    formatNote: document.getElementById("format-note"),
    sizeModeRadios: document.getElementsByName("size-mode"),
    orientationRow: document.getElementById("orientation-row"),
    orientationRadios: document.getElementsByName("orientation"),
    freeSizeRow: document.getElementById("free-size-row"),
    freeW: document.getElementById("free-w"),
    freeH: document.getElementById("free-h"),
    sizeWarning: document.getElementById("size-warning"),
    optIchimonjiAri: document.getElementById("opt-ichimonji-ari"),
    optFuutaiAri: document.getElementById("opt-fuutai-ari"),
    fuutaiAriLabel: document.getElementById("fuutai-ari-label"),
    optMincho: document.getElementById("opt-mincho"),
    minchoLabel: document.getElementById("mincho-label"),
    honshiImageFile: document.getElementById("honshi-image-file"),
    honshiImageWarning: document.getElementById("honshi-image-warning"),
    removeHonshiBtn: document.getElementById("remove-honshi-btn"),
    trimHonshiBtn: document.getElementById("trim-honshi-btn"),
    previewWarning: document.getElementById("preview-warning"),
    previewFrame: document.querySelector(".preview-frame"),
    preview: document.getElementById("preview"),
    // 価格
    priceTotal: document.getElementById("price-total"),
    bdSize: document.getElementById("bd-size"),
  };

  // ---- 初期化 ----
  function init() {
    // 表装形式の選択肢(全形式。hidden は内部プリセット)
    FORMAT_PRESETS.forEach((p) => {
      if (p.hidden) return;
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label;
      el.formatSelect.appendChild(opt);
    });
    // 仕立ては必須(2026-10-05 本人)。最初は「選んでください」にしておき、選ぶまで次へ進めない。
    // プレビューは選ぶまで既定の形式(state.formatId の初期値)で見せる
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "選んでください";
    placeholder.disabled = true;
    el.formatSelect.insertBefore(placeholder, el.formatSelect.firstChild);
    el.formatSelect.value = "";

    // サイズ種別
    Array.from(el.sizeModeRadios).forEach((r) => r.addEventListener("change", onSizeModeChange));
    Array.from(el.orientationRadios).forEach((r) => r.addEventListener("change", onSizeChange));
    el.freeW.addEventListener("input", onSizeChange);
    el.freeH.addEventListener("input", onSizeChange);

    // 表装形式とオプション
    el.formatSelect.addEventListener("change", onFormatChange);
    el.optIchimonjiAri.addEventListener("change", onPartOptionChange);
    el.optFuutaiAri.addEventListener("change", onPartOptionChange);
    el.optMincho.addEventListener("change", onPartOptionChange);

    // 箱オプション(スプリント2)
    Array.from(elBox.radios).forEach((r) => r.addEventListener("change", onBoxChange));

    // 軸先の色
    Array.from(document.getElementsByName("jiku-color")).forEach((r) =>
      r.addEventListener("change", onJikuColorChange)
    );

    // 写真(本紙画像)
    el.honshiImageFile.addEventListener("change", onHonshiImageChange);
    el.removeHonshiBtn.addEventListener("click", onRemoveHonshiImage);
    el.trimHonshiBtn.addEventListener("click", () => openTrimDialog());

    // 部位クリックの裂地ピッカー
    document.getElementById("part-fabric-showall").addEventListener("change", renderPartFabricList);
    document.getElementById("part-fabric-clear-btn").addEventListener("click", () => {
      if (pickerCtx) {
        effectiveGroups()[pickerCtx.ui].keys.forEach((k) => delete state.assignments[k]);
        render();
        updatePrice();
      }
      document.getElementById("part-fabric-dialog").close();
      pickerCtx = null;
    });
    document.getElementById("part-fabric-close-btn").addEventListener("click", () => {
      document.getElementById("part-fabric-dialog").close();
      pickerCtx = null;
    });

    // 全部位の裂地を一括で無地に戻す(PC/スマホの 2 ボタン両方に同じ動作)
    document.querySelectorAll(".fabric-reset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (Object.keys(state.assignments).length === 0) return;
        state.assignments = {};
        render();
        updatePrice();
      });
    });

    // トリミング
    document.getElementById("trim-confirm-btn").addEventListener("click", onTrimConfirm);
    document.getElementById("trim-cancel-btn").addEventListener("click", onTrimCancel);
    document.getElementById("trim-change-photo-btn").addEventListener("click", () => el.honshiImageFile.click());
    document.getElementById("trim-dialog").addEventListener("close", () => {
      const f = trimOnClose;
      trimOnClose = null;
      if (f) f();
    });
    document.getElementById("trim-lock-aspect").addEventListener("change", onTrimLockToggle);
    document.querySelectorAll("#trim-orient button").forEach((b) => b.addEventListener("click", () => onTrimOrient(b.dataset.o)));
    setupTrimCanvasDrag();

    // 相談(LINE かフォームかを選ぶ画面から。LINE は内容のコピーと画像保存、フォームは内容を引き継ぐ)と画像保存
    const ctaLine = document.getElementById("cta-line");
    const ctaForm = document.getElementById("cta-form");
    const saveImageBtn = document.getElementById("save-image-btn");
    if (ctaLine) ctaLine.addEventListener("click", onLineClick);
    if (ctaForm) ctaForm.addEventListener("click", onFormClick);
    const consultOpen = document.getElementById("consult-open"); // 5 の「このデザインで相談してみる」
    if (consultOpen) consultOpen.addEventListener("click", () => openConsult("step5"));
    const ctaConsult = document.getElementById("cta-consult"); // お見積もり欄の「相談する」
    if (ctaConsult) ctaConsult.addEventListener("click", () => openConsult("bar"));
    const consultClose = document.getElementById("consult-close");
    if (consultClose) consultClose.addEventListener("click", () => document.getElementById("consult-dialog").close());
    if (saveImageBtn) saveImageBtn.addEventListener("click", onSaveImageClick);

    window.addEventListener("resize", () => render());

    // 裂地にカーソルを重ねたら、一緒に変わる部位をまとめて囲む(委譲)
    el.preview.addEventListener("mouseover", onPreviewHover);
    el.preview.addEventListener("mouseleave", clearPartHighlight);

    loadFabrics();
    // 初期の有効寸法を確定してから描画
    recomputeSize();
    onFormatChange();
    render();
    updatePrice();
    initAdmin(); // 裏方の裂地追加パネル(#admin のときだけ表示)
    initAR(); // AR 体験ボタン(スマホ・タブレットのみ表示)
    initRoom(); // 部屋に飾ったイメージ(写真合成。PC でも使える)
    initSuggest(); // 写真から裂地の取り合わせを3案出す
    initDesign(); // 写真に合わせて天地をデザインする(同意のうえで写真を読み取りに送る)
    initSteps(); // 一本道の段階と作り方の 3 択
    initGuide(); // 図解(形式・一文字・風帯)
    initJikuSpot(); // 軸先を選ぶときにプレビューの軸先を目立たせる
  }

  // ---- 裂地名のふりがな(2026-10-03 本人「裂地にはフリガナを」)。裏方で裂地を足したら、ここにも読みを足す ----
  const FABRIC_KANA = {
    "オレンジ　無地": "オレンジ むじ",
    "グレー白　市松模様": "グレーしろ いちまつもよう",
    "ドット　黒白": "ドット くろしろ",
    "ベージュ　無地": "ベージュ むじ",
    "橙色　波模様": "だいだいいろ なみもよう",
    "白地裂　鶴模様": "しろじぎれ つるもよう",
    "紅色　着物帯": "べにいろ きものおび",
    "紅色　紺縦縞": "べにいろ こんたてじま",
    "紫　ボーダー": "むらさき ボーダー",
    "紫地　菱紋": "むらさきじ ひしもん",
    "紺色　小花紋緞子": "こんいろ こばなもんどんす",
    "紺色　縞模様": "こんいろ しまもよう",
    "緑　唐草牡丹": "みどり からくさぼたん",
    "茶系　縦縞模様": "ちゃけい たてじまもよう",
    "茶系縦縞模様": "ちゃけい たてじまもよう",
    "茶色　細四角柄": "ちゃいろ ほそしかくがら",
    "菱紋（茶紺系）": "ひしもん(ちゃこんけい)",
    "薄緑　帯裂": "うすみどり おびぎれ",
    "赤　菱紋": "あか ひしもん",
    "金色　鶴紋金襴": "きんいろ つるもんきんらん",
    "銀色　ドット柄": "ぎんいろ ドットがら",
    "青　ボーダー": "あお ボーダー",
    "青地　花びら紋": "あおじ はなびらもん",
    "黄緑　無地": "きみどり むじ",
  };

  // ---- 軸先の場所を示す: 軸先の色にカーソルを合わせる(またはタップする)と、プレビューの軸先を光らせて「軸先」と出す ----
  let jikuSpot = false;
  let jikuSpotTimer = null;
  function setJikuSpot(on) {
    jikuSpot = on;
    el.preview.querySelectorAll(".jiku-end").forEach((e) => e.classList.toggle("spot", on));
  }
  function initJikuSpot() {
    const block = document.getElementById("jiku-color-block");
    if (!block) return;
    block.querySelectorAll(".seg-item").forEach((item) => {
      item.addEventListener("mouseenter", () => { clearTimeout(jikuSpotTimer); setJikuSpot(true); });
      item.addEventListener("mouseleave", () => setJikuSpot(false));
      // スマホ(カーソルなし)やキーボードでは、選んだときに少しのあいだ光らせる
      item.addEventListener("focusin", () => { clearTimeout(jikuSpotTimer); setJikuSpot(true); jikuSpotTimer = setTimeout(() => setJikuSpot(false), 1800); });
      item.addEventListener("click", () => { clearTimeout(jikuSpotTimer); setJikuSpot(true); jikuSpotTimer = setTimeout(() => setJikuSpot(false), 1800); });
    });
  }

  // ---- 図解: 各部の名前・形式の違い・一文字・風帯(2026-10-03 本人「一般の方は違いが分からない」) ----
  // 図は掛軸の寸法計算(computeLayout)から描くので、プレビューと同じ比率になる。A4 縦で描く。
  const FORMAT_GUIDE = {
    "santan-gyo": { kana: "さんだんひょうそう", text: "本紙のまわりを中廻しで囲み、その上下に天と地を付ける、いちばん一般的な形です。きちんとした印象で、和室にも洋室にも合います。" },
    chagake: { kana: "ちゃがけ", text: "茶室に掛けるために生まれた形です。本紙の左右の柱が細く、すっきりと控えめ。写真を主役にしたいときや、小さな空間に向きます。" },
    maru: { kana: "ふくろひょうぐ", text: "一文字のほかは、一種類の裂地で本紙を包む簡素な形です。中廻しがなく、すっきりとした現代的な印象になります。" },
  };
  const GUIDE_FILL = { ten: "#c9b08a", chi: "#c9b08a", nakamawashi: "#e8ddc7", hashira: "#e8ddc7", ichimonji: "#9a7440", fuutai: "#9a7440", honshi: "#dfe5ec", heri: "#7a6648" };
  const GUIDE_LABELS = [
    ["fuutaiRight", "風帯", "ふうたい"], ["ten", "天", "てん"], ["nakaUe", "中廻し", "ちゅうまわし"], ["ichimonjiUe", "一文字", "いちもんじ"],
    ["honshi", "本紙(写真)", "ほんし"], ["hashiraRight", "柱", "はしら"], ["chi", "地", "ち"], ["_jiku", "軸先", "じくさき"],
  ];
  function guideSVG(presetId, opt, o) {
    o = o || {};
    const preset = getPreset(presetId);
    const pp = preset.parts || {};
    const L = computeLayout(preset, 210, 297, { noIchimonji: !!opt.noIchimonji || pp.ichimonji === false, noFuutai: !!opt.noFuutai || pp.fuutai === false });
    const hasNaka = pp.nakamawashi !== false;
    const u = L.totalW / 30; // 線や文字の大きさの単位
    const padL = u * 3, padR = o.labels ? u * 20 : u * 3, padT = u * 2, padB = u * 3;
    const W = L.totalW + padL + padR, H = L.totalH + padT + padB;
    const X = (v) => (v + padL).toFixed(1), Y = (v) => (v + padT).toFixed(1);
    let svg = '<svg class="guide-svg" viewBox="0 0 ' + W.toFixed(0) + " " + H.toFixed(0) + '" role="img" aria-label="' + (o.aria || "") + '">';
    const order = ["ten", "nakaUe", "hashiraLeft", "hashiraRight", "nakaShita", "chi", "heriLeft", "heriRight", "ichimonjiUe", "honshi", "ichimonjiShita", "fuutaiLeft", "fuutaiRight"];
    order.forEach((k) => {
      const p = L.parts[k];
      if (!p) return;
      let fill = GUIDE_FILL[p.part] || "#ddd";
      if (p.part === "hashira" && !hasNaka) fill = GUIDE_FILL.ten; // 袋表具は柱も天地と同じ裂地
      if (o.hi) fill = o.hi.indexOf(p.part) >= 0 ? "#b4531a" : (p.part === "honshi" ? "#eef1f4" : "#ebe5da");
      svg += '<rect x="' + X(p.x) + '" y="' + Y(p.y) + '" width="' + p.w.toFixed(1) + '" height="' + p.h.toFixed(1) + '" fill="' + fill + '" stroke="rgba(80,40,20,0.3)" stroke-width="' + (u * 0.08).toFixed(2) + '"/>';
    });
    // 八双(上)・軸棒(下)・軸先
    svg += '<rect x="' + X(-u * 0.2) + '" y="' + Y(-u * 0.6) + '" width="' + (L.totalW + u * 0.4).toFixed(1) + '" height="' + (u * 0.7).toFixed(1) + '" fill="#d8cdb8"/>';
    const rodY = L.totalH - u * 0.2;
    svg += '<rect x="' + X(-u * 0.2) + '" y="' + Y(rodY) + '" width="' + (L.totalW + u * 0.4).toFixed(1) + '" height="' + (u * 0.9).toFixed(1) + '" fill="#d8cdb8"/>';
    [-u * 1.4, L.totalW + u * 0.2].forEach((x) => { svg += '<rect x="' + X(x) + '" y="' + Y(rodY) + '" width="' + (u * 1.2).toFixed(1) + '" height="' + (u * 0.9).toFixed(1) + '" fill="#6b4f30"/>'; });
    if (o.labels) {
      // 引き出し線つきの名前(重ならないよう、上から順に最小の間隔をあける)
      const fs = u * 2.4, gap = fs * 1.9, tx = L.totalW + u * 4.5; // 図を縮めて表示しても読める大きさ
      let lastY = -Infinity;
      GUIDE_LABELS.forEach(([k, name, kana]) => {
        let px, py;
        if (k === "_jiku") { px = L.totalW + u * 1.4; py = rodY + u * 0.45; }
        else {
          const p = L.parts[k];
          if (!p) return;
          // 風帯は天の上に重なるので、風帯は上寄り・天は下寄りを指して、点が重ならないようにする
          const fx = { hashiraRight: 0.5, fuutaiRight: 0.5, ten: 0.93 }[k], fy = { fuutaiRight: 0.3, ten: 0.75 }[k];
          px = p.x + p.w * (fx != null ? fx : 0.85);
          py = p.y + p.h * (fy != null ? fy : 0.5);
        }
        const ly = Math.max(py, lastY + gap);
        lastY = ly;
        svg += '<polyline points="' + X(px) + "," + Y(py) + " " + X(tx - u * 1.5) + "," + Y(ly) + " " + X(tx - u * 0.4) + "," + Y(ly) + '" fill="none" stroke="#710b26" stroke-width="' + (u * 0.1).toFixed(2) + '"/>';
        svg += '<circle cx="' + X(px) + '" cy="' + Y(py) + '" r="' + (u * 0.3).toFixed(2) + '" fill="#710b26"/>';
        svg += '<text x="' + X(tx) + '" y="' + Y(ly + fs * 0.35) + '" font-size="' + fs.toFixed(1) + '" fill="#333">' + name + '</text>';
        svg += '<text x="' + X(tx) + '" y="' + Y(ly + fs * 1.15) + '" font-size="' + (fs * 0.55).toFixed(1) + '" fill="#8a8178">' + kana + "</text>";
      });
    }
    return svg + "</svg>";
  }
  let guideBuilt = false;
  function buildGuide() {
    const body = document.getElementById("guide-body");
    const fig = (svg, cap) => '<figure class="guide-fig">' + svg + "<figcaption>" + cap + "</figcaption></figure>";
    let h = '<section id="guide-parts"><h3>各部の名前</h3><div class="guide-one">' + guideSVG("santan-gyo", { noIchimonji: false, noFuutai: false }, { labels: true, aria: "掛軸の各部の名前" }) + "</div></section>";
    h += '<section id="guide-formats"><h3>表装の形式の違い</h3><div class="guide-formats">';
    FORMAT_PRESETS.filter((p) => !p.hidden && FORMAT_GUIDE[p.id]).forEach((p) => {
      const g = FORMAT_GUIDE[p.id];
      h += '<div class="guide-format">' + guideSVG(p.id, { noIchimonji: true, noFuutai: true }, { aria: p.label }) +
        '<p class="guide-name"><ruby>' + p.label.replace(/\(.*\)/, "") + "<rt>" + g.kana + "</rt></ruby></p>" +
        '<p class="guide-text">' + g.text + "</p>" +
        '<button type="button" class="guide-pick" data-format="' + p.id + '">この形式にする</button></div>';
    });
    h += "</div></section>";
    h += '<section id="guide-ichimonji"><h3><ruby>一文字<rt>いちもんじ</rt></ruby></h3><div class="guide-pair">' +
      fig(guideSVG("santan-gyo", { noIchimonji: true, noFuutai: true }, { aria: "一文字なし" }), "一文字なし") +
      fig(guideSVG("santan-gyo", { noIchimonji: false, noFuutai: true }, { hi: ["ichimonji"], aria: "一文字あり" }), "一文字あり(色の部分)") +
      '</div><p class="guide-text">本紙のすぐ上と下に入れる、細い帯の裂地です。格の高い裂地を使うことが多く、写真のまわりが引き締まって、より改まった仕上がりになります。</p></section>';
    h += '<section id="guide-fuutai"><h3><ruby>風帯<rt>ふうたい</rt></ruby></h3><div class="guide-pair">' +
      fig(guideSVG("santan-gyo", { noIchimonji: false, noFuutai: true }, { aria: "風帯なし" }), "風帯なし") +
      fig(guideSVG("santan-gyo", { noIchimonji: false, noFuutai: false }, { hi: ["fuutai"], aria: "風帯あり" }), "風帯あり(色の部分)") +
      '</div><p class="guide-text">天から下がる、2本の細い帯です。正式な掛軸に付く飾りで、付けると格式のある印象になります。一文字と同じ裂地で仕立てます(+¥3,000)。</p></section>';
    // 明朝仕立ては袋表具の中の選択肢(形式一覧には出さず、袋表具のときのチェックで切り替える)
    h += '<section id="guide-mincho"><h3><ruby>明朝仕立て<rt>みんちょうじたて</rt></ruby></h3><div class="guide-pair">' +
      fig(guideSVG("maru", { noIchimonji: true, noFuutai: true }, { aria: "袋表具" }), "袋表具") +
      fig(guideSVG("mincho", { noIchimonji: true, noFuutai: true }, { hi: ["heri"], aria: "明朝仕立て" }), "明朝仕立て(色の部分が明朝縁)") +
      '</div><p class="guide-text">袋表具の左右の端に、細い縁(明朝縁・約1cm)を通した形です。輪郭が引き締まり、簡素ななかにも品のある印象になります。袋表具を選んだときに付けられます。</p>' +
      '<button type="button" class="guide-pick guide-pick-mincho">明朝仕立てにする</button></section>';
    body.innerHTML = h;
    body.querySelectorAll(".guide-pick").forEach((b) => b.addEventListener("click", () => {
      el.formatSelect.value = b.dataset.format;
      onFormatChange();
      document.getElementById("guide-dialog").close();
      showToast("形式を変えました。");
    }));
    const mincho = body.querySelector(".guide-pick-mincho");
    if (mincho) mincho.addEventListener("click", () => {
      el.formatSelect.value = "maru"; // 明朝仕立ては袋表具のチェック
      onFormatChange();
      el.optMincho.checked = true;
      el.optMincho.dispatchEvent(new Event("change"));
      document.getElementById("guide-dialog").close();
      showToast("袋表具の明朝仕立てにしました。");
    });
    guideBuilt = true;
  }
  function openGuide(sectionId) {
    const dlg = document.getElementById("guide-dialog");
    if (!dlg) return;
    if (!guideBuilt) buildGuide();
    if (!dlg.open) dlg.showModal();
    const sec = document.getElementById(sectionId);
    if (sec) sec.scrollIntoView({ block: "start" });
    if (typeof gtag === "function") gtag("event", "guide_open", { section: sectionId });
  }
  function initGuide() {
    document.querySelectorAll("[data-guide]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault(); // 「?」はチェックボックスのラベルの中にあるので、チェックを切り替えない
      e.stopPropagation();
      openGuide(b.dataset.guide);
    }));
    const close = document.getElementById("guide-close");
    if (close) close.addEventListener("click", () => document.getElementById("guide-dialog").close());
  }

  // ---- 一本道の段階(2026-10-02 Tesla 型)と作り方の 3 択 ----
  // 段階: 1 写真 / 2 大きさと仕立て / 3 作り方 / 4 軸先・箱 / 5 確認。今の段階の欄だけ見せる。
  // 段階の表示を押せば行き来できる。合計と相談(お見積もりの欄)は常に見せる。
  // 仕立ての形を作り方より前にするのは、デザインが天地の寸法を使うため。
  const STEP_NAMES = ["", "写真", "大きさ", "作り方", "仕上げ", "確認"];
  let currentStep = 1;

  // その段階で足りないもの(足りていれば "")。満たさないと次へ進めない(2026-10-02 本人)
  function stepMissing(n) {
    if (n === 1 && !state.honshiImage) return "写真をお選びください。";
    if (n === 2 && !state.sizeMode) return "本紙の大きさ(A4 / A3 / 自由サイズ)をお選びください。";
    if (n === 2 && el.sizeWarning && !el.sizeWarning.hidden) return "本紙の大きさを正しく入力してください。";
    if (n === 2 && !state.formatChosen) return "仕立て(表装の形式)をお選びください。";
    if (n === 3 && !state.method) return "作り方を一つお選びください。";
    return "";
  }
  // n の段階へ行けるか(手前の段階がすべて満たされているか)
  function firstMissingBefore(n) {
    for (let k = 1; k < n; k++) if (stepMissing(k)) return k;
    return 0;
  }
  function updateStepNav() {
    const next = document.getElementById("step-next");
    if (next) next.setAttribute("aria-disabled", String(!!stepMissing(currentStep)));
    document.querySelectorAll("#stepper button").forEach((b) => {
      b.classList.toggle("locked", !!firstMissingBefore(Number(b.dataset.go)));
    });
  }

  function showStep(n) {
    currentStep = Math.max(1, Math.min(5, n));
    document.querySelectorAll(".panel-controls [data-step]").forEach((f) => {
      f.hidden = Number(f.dataset.step) !== currentStep;
    });
    document.querySelectorAll("#stepper button").forEach((b) => {
      const k = Number(b.dataset.go);
      if (k === currentStep) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.classList.toggle("done", k < currentStep);
    });
    const prev = document.getElementById("step-prev");
    const next = document.getElementById("step-next");
    prev.hidden = currentStep === 1;
    next.hidden = currentStep === 5;
    next.querySelector(".step-next-name").textContent = currentStep < 5 ? ":" + STEP_NAMES[currentStep + 1] : "";
    const panel = document.querySelector(".panel-controls");
    if (panel) panel.scrollTop = 0;
    if (typeof gtag === "function") gtag("event", "step_view", { step: currentStep });
    render();
  }

  function setMethod(m) {
    state.method = m;
    document.querySelectorAll(".method-card").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.method === m)));
    updateStepNav();
  }

  function initSteps() {
    // 段階の表示から先へ跳ぶときも、手前の段階が満たされていなければ、その段階へ案内する
    document.querySelectorAll("#stepper button").forEach((b) => b.addEventListener("click", () => {
      const to = Number(b.dataset.go);
      const miss = to > currentStep ? firstMissingBefore(to) : 0;
      if (miss) { showStep(miss); showToast(stepMissing(miss)); return; }
      showStep(to);
    }));
    document.getElementById("step-prev").addEventListener("click", () => showStep(currentStep - 1));
    document.getElementById("step-next").addEventListener("click", () => {
      const miss = stepMissing(currentStep);
      if (miss) { showToast(miss); return; }
      showStep(currentStep + 1);
    });
    const self = document.getElementById("self-btn");
    if (self) self.addEventListener("click", () => {
      setMethod("self");
      if (typeof gtag === "function") gtag("event", "method_pick", { method: "self" });
      showTapHint(true);
      showToast("掛軸を" + (matchMedia("(hover: none)").matches ? "タップ" : "クリック") + "して、裂地をお選びください。");
    });
    ["design-btn", "suggest-btn"].forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.addEventListener("click", () => { if (typeof gtag === "function") gtag("event", "method_pick", { method: b.dataset.method }); });
    });
    showStep(1);
  }

  // 和紙(デザイン)が割り当てられている部位の名前(この形式にある部位だけ)
  function washiPartLabels(layout) {
    const groups = effectiveGroups();
    const out = [];
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      if (g.linkedInto) return;
      const on = g.keys.some((key) => layout.parts[key] && (state.fabrics.find((f) => f.id === state.assignments[key]) || {}).washi);
      if (on) { if (k === "tenchi") out.unshift(g.label); else out.push(g.label); } // 天地を先に
    });
    return out;
  }

  // プレビューの下: 和紙の部位があるときだけ「和紙に印刷: 天地・中廻し」
  function updateMaterialNote() {
    const note = document.getElementById("material-note");
    if (!note) return;
    const washi = washiPartLabels(computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions()));
    note.hidden = washi.length === 0;
    note.textContent = washi.length ? "和紙に印刷: " + washi.join("・") : "";
  }

  // 5 確認: 選んだ内容と、部位ごとの素材
  function renderConfirm() {
    const dl = document.getElementById("confirm-list");
    if (!dl) return;
    const layout = computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions());
    const rows = [["大きさ", sizeSummaryText()], ["仕立て", formatSummaryText()]];
    fabricSummaryLines(layout).forEach((l) => {
      const i = l.indexOf(": ");
      rows.push([l.slice(0, i), l.slice(i + 2)]);
    });
    rows.push(["軸先", JIKU_LABEL[state.jikuColor] || state.jikuColor]);
    rows.push(["箱", state.boxKey === "kiri" ? "桐箱" : "紙箱"]);
    dl.innerHTML = "";
    rows.forEach(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
    });
    const washi = washiPartLabels(layout);
    const alert = document.getElementById("confirm-washi");
    alert.hidden = washi.length === 0;
    alert.innerHTML = washi.length ? washi.join("・") + "は、布の<ruby>裂地<rt>きれじ</rt></ruby>ではなく、和紙に印刷して仕立てます。" : ""; // 部位名は定数
  }

  // ---- AR 体験(スマホ・タブレットで表示。iPhone は Quick Look、Android は WebXR / Scene Viewer)----
  // PC では AR を起動できないため出さない(PC 向けの写真合成は後続)。
  function isARCapableDevice() {
    const ua = navigator.userAgent || "";
    const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1; // iPadOS はデスクトップ UA
    return /iPhone|iPad|iPod|Android/i.test(ua) || iPadOS;
  }

  // アプリの中の画面(WebView)では AR Quick Look / Scene Viewer が起動しない(2026-10-05 本人が LINE で確認)。
  // Threads の "Barcelona" は Threads アプリの UA に入る名前(実機では未確認)
  const IN_APP = [
    { id: "line", name: "LINE", re: /\bLine\/\d/i },
    { id: "instagram", name: "Instagram", re: /Instagram/i },
    { id: "threads", name: "Threads", re: /Barcelona/i },
    { id: "facebook", name: "Facebook", re: /FBAN|FBAV|FB_IAB/i },
  ];
  function inAppBrowser() {
    const ua = navigator.userAgent || "";
    return IN_APP.find((a) => a.re.test(ua)) || null;
  }
  function openInAppDialog(app) {
    const dlg = document.getElementById("inapp-dialog");
    const openBtn = document.getElementById("inapp-open");
    const again = "開き直した先では、写真と<ruby>裂地<rt>きれじ</rt></ruby>をもう一度お選びください。"; // 固定文
    // LINE だけは外のブラウザで開く仕組み(?openExternalBrowser=1)がある。効かないときのために手順も添える
    document.getElementById("inapp-text").innerHTML = app.id === "line"
      ? "LINE の中の画面では、AR(壁に掛けてみる)を起動できません。下のボタンで Safari または Chrome に開き直すと使えます。開かないときは、画面のメニューから「Safari で開く」または「ブラウザで開く」を選んでください。" + again
      : app.name + " の中の画面では、AR(壁に掛けてみる)を起動できません。画面の右上の「…」から「外部ブラウザで開く」(または「ブラウザで開く」)を選ぶと使えます。" + again;
    openBtn.hidden = app.id !== "line";
    if (typeof gtag === "function") gtag("event", "ar_inapp", { app: app.id });
    dlg.showModal();
  }
  function initInAppDialog() {
    const dlg = document.getElementById("inapp-dialog");
    if (!dlg) return;
    document.getElementById("inapp-close").addEventListener("click", () => dlg.close());
    document.getElementById("inapp-room").addEventListener("click", () => {
      dlg.close();
      document.getElementById("room-btn").click();
    });
    document.getElementById("inapp-open").addEventListener("click", () => {
      const u = new URL(location.href);
      u.searchParams.set("openExternalBrowser", "1");
      location.href = u.toString();
    });
  }

  function initAR() {
    const btn = document.getElementById("ar-btn");
    const viewer = document.getElementById("ar-viewer");
    if (!btn || !viewer) return;
    btn.hidden = !isARCapableDevice();
    const label = btn.textContent;
    initInAppDialog();
    btn.addEventListener("click", () => {
      const app = inAppBrowser();
      if (app) { openInAppDialog(app); return; }
      if (!window.KakeAR) { showToast("AR の部品が読み込めていません。通信状態をご確認ください。"); return; }
      if (typeof gtag === "function") gtag("event", "ar_open", { size: state.sizeMode, format: state.formatId });
      btn.disabled = true;
      btn.textContent = "準備中…";
      renderPreviewToCanvas()
        .then((canvas) => KakeAR.openAR(viewer, canvas, canvas._mmPerPx, 15))
        .then((info) => {
          if (!info.canActivate) showToast("この端末では AR を起動できませんでした。iPhone または Android のブラウザでお試しください。");
        })
        .catch(() => showToast("AR の準備に失敗しました。時間をおいてもう一度お試しください。"))
        .then(() => { btn.disabled = false; btn.textContent = label; });
    });
  }

  // ---- 写真から裂地の取り合わせを3案出す ----
  // 判定は js/suggest.js(外部 API は使わない)。ここは UI と、選ばれた案の反映だけを持つ。
  function applyPlan(plan) {
    const groups = effectiveGroups();
    Object.keys(state.assignments).forEach((k) => delete state.assignments[k]);
    const set = (groupKey, fab) => {
      const g = groups[groupKey];
      if (!g || g.linkedInto || !fab) return;
      g.keys.forEach((k) => { state.assignments[k] = fab.id; });
    };
    set("tenchi", plan.picks.tenchi);
    set("nakamawashi", plan.picks.nakamawashi);
    set("ichimonji", plan.picks.ichimonji);
  }

  // 案ごとの小さなプレビュー。割り当てを一時的に差し替えて描き、必ず元へ戻す。
  function renderPlanThumb(plan) {
    const backup = Object.assign({}, state.assignments);
    const restore = () => { state.assignments = backup; };
    applyPlan(plan);
    return renderPreviewToCanvas().then(
      (cv) => { restore(); return cv; },
      (e) => { restore(); throw e; }
    );
  }

  // 作り方のカードは隠さず、写真が無いときは薄くして、押したら写真を促す
  function updateSuggestVisibility() {
    const btn = document.getElementById("suggest-btn");
    if (!btn) return;
    btn.hidden = typeof KakeSuggest === "undefined";
    btn.classList.toggle("needs-photo", !state.honshiImage);
  }

  function initSuggest() {
    const btn = document.getElementById("suggest-btn");
    const dlg = document.getElementById("suggest-dialog");
    if (!btn || !dlg || typeof KakeSuggest === "undefined") return;
    const listEl = document.getElementById("suggest-list");
    document.getElementById("suggest-close-btn").addEventListener("click", () => dlg.close());

    function loadPhoto() {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = state.honshiImage.dataUrl;
      });
    }

    function renderPlans(plans) {
      listEl.innerHTML = "";
      // 案は順に描く(同時に描くと割り当ての差し替えがぶつかる)
      return plans.reduce((chain, plan) => chain.then(() => renderPlanThumb(plan).then((cv) => {
        const li = document.createElement("li");
        li.className = "suggest-card";
        const thumb = document.createElement("div");
        thumb.className = "suggest-thumb";
        cv.style.maxHeight = "100%";
        cv.style.width = "auto";
        thumb.appendChild(cv);
        const body = document.createElement("div");
        body.className = "suggest-body";
        const h = document.createElement("p");
        h.className = "suggest-label";
        h.textContent = plan.label + "　" + plan.summary;
        const p = document.createElement("p");
        p.className = "suggest-reason";
        p.textContent = plan.reason;
        const pick = document.createElement("button");
        pick.type = "button";
        pick.textContent = "この案にする";
        pick.addEventListener("click", () => {
          applyPlan(plan);
          setMethod("suggest");
          if (typeof gtag === "function") gtag("event", "suggest_pick", { plan: plan.id, size: state.sizeMode, format: state.formatId });
          dlg.close();
          render();
          updatePrice();
          showToast(plan.label + "を反映しました。ここから裂地を変えることもできます。");
        });
        body.appendChild(h); body.appendChild(p); body.appendChild(pick);
        li.appendChild(thumb); li.appendChild(body);
        listEl.appendChild(li);
      })), Promise.resolve());
    }

    btn.addEventListener("click", () => {
      if (!state.honshiImage) { showToast("先に写真を入れてください(1 写真)。"); return; }
      btn.disabled = true;
      btn.classList.add("busy"); // カードの中身(素材の札など)は書き換えない
      if (typeof gtag === "function") gtag("event", "suggest_open", { size: state.sizeMode, format: state.formatId });
      loadPhoto()
        .then((img) => {
          const photo = KakeSuggest.measurePhoto(img);
          if (!photo) throw new Error("photo");
          return KakeSuggest.measureFabrics(state.fabrics.filter((f) => !f.generated)).then((fm) => KakeSuggest.buildPlans(photo, fm));
        })
        .then((plans) => {
          if (!plans.length) { showToast("ご提案できる裂地が足りませんでした。"); return; }
          return renderPlans(plans).then(() => { if (!dlg.open) dlg.showModal(); });
        })
        .catch(() => showToast("ご提案の作成に失敗しました。写真を入れ直してお試しください。"))
        .then(() => { btn.disabled = false; btn.classList.remove("busy"); });
    });
  }

  // ---- スマホの価格の欄: 続きがあるあいだは下端をぼかす(スクロールの合図) ----
  function updatePriceScrollHint() {
    const c = document.querySelector(".price-card");
    if (!c) return;
    c.classList.toggle("more", c.scrollHeight - c.scrollTop - c.clientHeight > 4);
    if (!c._hintBound) {
      c._hintBound = true;
      c.addEventListener("scroll", updatePriceScrollHint, { passive: true });
      window.addEventListener("resize", updatePriceScrollHint);
    }
  }

  // ---- 写真に合わせてデザインする ----
  // 通信と画像の下ごしらえは js/design.js。ここは「同意 → 作成中」の画面と、できた天地の割り当て。
  // できたらすぐプレビューに反映し、番号と選び直せることはお知らせで伝える(2026-10-02 本人「すぐにプレビューを表示するので良い」)。
  // デザインの天地は「1 枚の絵を敷く特別な裂地」(cover)として裂地の一覧に加える。だから裂地の選択画面から
  // 裂地に変えることも、デザインに戻すこともでき、注文の要約にも名前(デザイン番号入り)が載る。
  // 中廻しは絵柄に合わせた紙(無地)を同じく裂地として加えて割り当てる。選び直しは従来の画面で。
  const DESIGN_CONSENT_KEY = "kp_design_consent_v2"; // 2026-10-02 同意の文面を変えた(評価用の見本の保存)ので取り直す

  function currentDesignFabric() {
    const fab = state.fabrics.find((f) => f.id === state.assignments.ten);
    return fab && fab.cover ? fab : null;
  }

  function updateDesignVisibility() {
    const btn = document.getElementById("design-btn");
    if (!btn) return;
    btn.hidden = typeof KakeDesign === "undefined";
    btn.classList.toggle("needs-photo", !state.honshiImage);
  }

  // 天・地の仕上がり寸法(mm)。絵の縦横比と、印刷のときの寸法の記録に使う
  function designPartsMm() {
    const layout = computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions());
    const t = layout.parts.ten, c = layout.parts.chi;
    if (!t || !c) return null;
    return { ten: { wMm: Math.round(t.w), hMm: Math.round(t.h) }, chi: { wMm: Math.round(c.w), hMm: Math.round(c.h) } };
  }

  // できた 1 案を裂地の一覧に加える(割り当てはしない)。res = { id, nakaHex, variant }
  function addDesignFabrics(res, tenUrl, chiUrl) {
    const tenchi = {
      id: "design_" + res.id, designId: res.id, generated: true, variant: res.variant,
      name: "和紙に印刷・写真に合わせた絵柄(" + res.id + ")", uses: ["tenchi"], grade: "standard", washi: true,
      dataUrl: tenUrl, tileW: 40, tileH: 40,
      cover: { ten: tenUrl, chi: chiUrl, fallbackHex: res.nakaHex },
    };
    const paper = {
      id: "paper_" + res.id, designId: res.id, generated: true,
      name: "和紙に印刷・絵柄に合わせた無地(" + res.id + ")", uses: ["nakamawashi"], grade: "standard", washi: true,
      dataUrl: KakeDesign.paperSwatch(res.nakaHex), tileW: 40, tileH: 40,
    };
    tenchi.paperId = paper.id;
    state.fabrics.unshift(tenchi, paper);
    return tenchi;
  }

  // 案ごとの小さなプレビュー(写真入りの掛軸全体)。割り当てを一時的に差し替えて描き、必ず元へ戻す
  function renderDesignThumb(tenchi) {
    const backup = Object.assign({}, state.assignments);
    const restore = () => { state.assignments = backup; };
    applyDesign(tenchi, true);
    return renderPreviewToCanvas().then(
      (cv) => { restore(); return cv; },
      (e) => { restore(); throw e; }
    );
  }

  const VARIANT_LABEL = { blend: "写真になじませる", echo: "写真の差し色を拾う", lift: "写真を引き立てる" };

  // デザインを天地に割り当てる。中廻し+柱は、新しいデザインのとき、いまデザインの紙が入っているとき、
  // まだ何も選んでいない(無地・お任せ)ときにそのデザインの紙にする(お客様が裂地を選んでいたら、その裂地を残す)。
  // 未選択も含めるのは、履歴の見本(中廻しは紙の色)と切り替え後の見た目を揃えるため(2026-10-06)
  function applyDesign(tenchi, isNew) {
    const groups = effectiveGroups();
    const set = (gk, id) => {
      const g = groups[gk];
      if (g && !g.linkedInto) g.keys.forEach((k) => { state.assignments[k] = id; });
    };
    const curNaka = state.assignments.nakaUe || "";
    set("tenchi", tenchi.id);
    if (isNew || !curNaka || curNaka.indexOf("paper_") === 0) {
      set("nakamawashi", tenchi.paperId);
      set("hashira", tenchi.paperId);
    }
  }

  // デザインする直前の裂地の選び方(部位 -> 裂地)。「デザイン前」の見本から、いつでも元に戻せるように
  // (2026-10-02 お客様の声: 選んでいた裂地が消えてしまうのが心配)
  let beforeDesign = null;
  function rememberBeforeDesign() {
    // いまの天地がデザインなら、お客様の選び方ではないので覚え直さない(前に覚えたものを残す)
    if ((state.assignments.ten || "").indexOf("design_") === 0) return;
    beforeDesign = Object.assign({}, state.assignments);
  }

  // これまでのデザイン: デザインができたらプレビューの下に小さく並べ、押すとそのデザインに切り替える。
  // 先頭は「デザイン前」(押すとお客様が選んでいた裂地に戻る)
  function renderDesignHistory() {
    const box = document.getElementById("design-history");
    const list = document.getElementById("design-history-list");
    if (!box || !list) return;
    const designs = state.fabrics.filter((f) => f.cover).slice().reverse(); // 古い順
    box.hidden = !beforeDesign && designs.length < 2;
    if (box.hidden) return;
    list.innerHTML = "";
    if (beforeDesign) {
      const fabUrl = (key) => { const f = state.fabrics.find((x) => x.id === beforeDesign[key]); return f ? f.dataUrl : "#e9e2d4"; };
      const same = Object.keys(Object.assign({}, beforeDesign, state.assignments)).every((k) => (beforeDesign[k] || "") === (state.assignments[k] || ""));
      const wrap = document.createElement("span");
      wrap.className = "design-before";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "design-thumb";
      b.title = "デザイン前(選んでいた裂地に戻す)";
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-pressed", String(same));
      [["t", fabUrl("ten")], ["n", fabUrl("nakaUe")], ["c", fabUrl("chi")]].forEach(([cls, bg]) => {
        const sp = document.createElement("span");
        sp.className = cls;
        if (bg.indexOf("#") === 0) sp.style.backgroundColor = bg;
        else sp.style.backgroundImage = "url(" + bg + ")";
        b.appendChild(sp);
      });
      b.addEventListener("click", () => {
        state.assignments = Object.assign({}, beforeDesign);
        render();
        updatePrice();
      });
      const cap = document.createElement("small");
      cap.textContent = "デザイン前";
      wrap.appendChild(b);
      wrap.appendChild(cap);
      list.appendChild(wrap);
    }
    designs.forEach((fab, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "design-thumb";
      b.title = (i + 1) + "つ目のデザイン(" + fab.designId + ")";
      b.setAttribute("aria-label", b.title);
      b.setAttribute("aria-pressed", String(state.assignments.ten === fab.id));
      const part = (cls, bg) => {
        const sp = document.createElement("span");
        sp.className = cls;
        if (bg.indexOf("#") === 0) sp.style.backgroundColor = bg;
        else sp.style.backgroundImage = "url(" + bg + ")";
        b.appendChild(sp);
      };
      part("t", fab.cover.ten);
      part("n", fab.cover.fallbackHex || "#e9e2d4");
      part("c", fab.cover.chi);
      b.addEventListener("click", () => {
        rememberBeforeDesign(); // 自分で選び直した裂地から切り替えるときも、その選び方を残す
        applyDesign(fab, false);
        render();
        updatePrice();
      });
      list.appendChild(b);
    });
  }

  function initDesign() {
    const btn = document.getElementById("design-btn");
    const dConsent = document.getElementById("design-consent-dialog");
    const dProgress = document.getElementById("design-progress-dialog");
    const dWish = document.getElementById("design-wish-dialog");
    const noteEl = document.getElementById("design-wish-note");
    // 要望(もう一度デザインするときも前回の選択を残す)
    let wishes = {};
    if (!btn || !dConsent || typeof KakeDesign === "undefined") return;
    const agree = document.getElementById("design-agree");
    const okBtn = document.getElementById("design-consent-ok");
    const stepRead = document.getElementById("design-step-read");
    const stepDraw = document.getElementById("design-step-draw");
    const elapsedEl = document.getElementById("design-elapsed");
    const ga = (name, extra) => { if (typeof gtag === "function") gtag("event", name, Object.assign({ size: state.sizeMode, format: state.formatId }, extra || {})); };
    const consented = () => { try { return sessionStorage.getItem(DESIGN_CONSENT_KEY) === "1"; } catch (e) { return false; } };

    agree.addEventListener("change", () => { okBtn.disabled = !agree.checked; });
    document.getElementById("design-consent-cancel").addEventListener("click", () => dConsent.close());
    okBtn.addEventListener("click", () => {
      if (!dConsent.open || !agree.checked) return;
      try { sessionStorage.setItem(DESIGN_CONSENT_KEY, "1"); } catch (e) { /* 保存できなくても今回は進める */ }
      ga("design_consent");
      dConsent.close();
      openWish();
    });

    // 要望の画面: 各項目は 1 つだけ選べ、もう一度押すと外れる
    dWish.querySelectorAll(".wish-group").forEach((g) => {
      g.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          const on = b.getAttribute("aria-pressed") === "true";
          g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", String(!on));
        });
      });
    });
    function openWish() {
      dWish.querySelectorAll(".wish-group").forEach((g) => {
        g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(wishes[g.dataset.wish] === b.dataset.value)));
      });
      noteEl.value = wishes.note || "";
      dWish.showModal();
    }
    // ×: デザインを始めずに閉じる(次に開いたときは、前回デザインしたときの選択が出る)
    document.getElementById("design-wish-close").addEventListener("click", () => dWish.close());
    document.getElementById("design-wish-auto").addEventListener("click", () => {
      if (!dWish.open) return;
      wishes = {};
      dWish.close();
      start();
    });
    document.getElementById("design-wish-ok").addEventListener("click", () => {
      if (!dWish.open) return;
      const w = {};
      dWish.querySelectorAll(".wish-group").forEach((g) => {
        const on = g.querySelector('button[aria-pressed="true"]');
        if (on) w[g.dataset.wish] = on.dataset.value;
      });
      const note = noteEl.value.trim().slice(0, 100);
      if (note) w.note = note;
      wishes = w;
      dWish.close();
      start();
    });
    // 作成中は閉じさせない(Esc でも)
    dProgress.addEventListener("cancel", (e) => e.preventDefault());

    btn.addEventListener("click", () => {
      if (!state.honshiImage) { showToast("先に写真を入れてください(1 写真)。"); return; }
      if (consented()) { openWish(); return; }
      agree.checked = false;
      okBtn.disabled = true;
      dConsent.showModal();
    });

    // 2 案を並べて選んでもらう。小さなプレビューは評価用の見本としても送る(同意画面とポリシー第 7 条に明記)。
    // 1 案しかできなかったときは、そのまま反映する
    const dChoice = document.getElementById("design-choice-dialog");
    function finishWith(tenchi, list) {
      applyDesign(tenchi, true);
      setMethod("design");
      render();
      updatePrice();
      if (list.length > 1) KakeDesign.pick(tenchi.designId);
      ga("design_pick", { variant: tenchi.variant || "", count: list.length });
      showToast("デザインしました(" + tenchi.designId + ")。「デザイン前」で元に戻せます。");
    }
    function chooseDesign(fabs, concept) {
      rememberBeforeDesign(); // 2 案を選ばずに閉じても、デザイン前に戻れるように
      // プレビューは順に描く(同時に描くと割り当ての差し替えがぶつかる)
      return fabs.reduce((chain, f) => chain.then((arr) => renderDesignThumb(f).then((cv) => arr.concat([{ f, cv }]))), Promise.resolve([]))
        .then((items) => {
          items.forEach((it) => KakeDesign.uploadPreview(it.f.designId, it.cv));
          if (items.length === 1) { finishWith(items[0].f, items); return; }
          const listEl = document.getElementById("design-choice-list");
          document.getElementById("design-choice-concept").textContent = concept || "";
          listEl.innerHTML = "";
          items.forEach((it) => {
            const li = document.createElement("li");
            li.className = "design-choice-card";
            const thumb = document.createElement("div");
            thumb.className = "design-choice-thumb";
            it.cv.style.maxHeight = "100%";
            it.cv.style.maxWidth = "100%";
            thumb.appendChild(it.cv);
            const label = document.createElement("p");
            label.className = "design-choice-label";
            label.textContent = VARIANT_LABEL[it.f.variant] || "";
            const pick = document.createElement("button");
            pick.type = "button";
            pick.textContent = "こちらにする";
            pick.addEventListener("click", () => { dChoice.close(); finishWith(it.f, items); });
            li.appendChild(thumb); li.appendChild(label); li.appendChild(pick);
            listEl.appendChild(li);
          });
          if (dProgress.open) dProgress.close();
          dChoice.showModal();
        });
    }
    if (dChoice) {
      // 選ばずに閉じたときは、天地は変えない(2 案とも「これまでのデザイン」と裂地の一覧から選べる)
      document.getElementById("design-choice-close").addEventListener("click", () => { dChoice.close(); render(); });
    }

    let running = false; // 作成中に重ねて始めない(連打・二重の呼び出しで費用が二重にかからないように)
    function start() {
      if (running) return;
      const parts = designPartsMm();
      if (!state.honshiImage || !parts) { showToast("お写真を入れてからお試しください。"); return; }
      running = true;
      btn.disabled = true;
      stepRead.className = "active";
      stepDraw.className = "";
      const t0 = Date.now();
      elapsedEl.textContent = "30秒ほどかかります。このままお待ちください。";
      const timer = setInterval(() => {
        elapsedEl.textContent = Math.round((Date.now() - t0) / 1000) + "秒経過。このままお待ちください。";
      }, 1000);
      dProgress.showModal();
      ga("design_start", { mood: wishes.mood || "auto", tone: wishes.tone || "auto", density: wishes.density || "auto", note: wishes.note ? 1 : 0 });
      let res = null;
      KakeDesign.photoJpeg(state.honshiImage.dataUrl, state.honshiImage.cropRect, 768)
        .then((photo) => KakeDesign.analyze(photo, parts.ten, parts.chi, wishes))
        .then((r) => {
          res = r;
          stepRead.className = "done";
          stepDraw.className = "active";
          // 2 案(なじませる / 引き立てる)を同時に描く。片方が失敗しても、できた方で進める
          return Promise.all(r.designs.map((d) => KakeDesign.renderBoth(d.id).then((img) => ({ d, img }), (e) => ({ d, e }))));
        })
        .then((results) => {
          const ok = results.filter((x) => x.img);
          if (!ok.length) throw results[0].e;
          const fabs = ok.map((x) => addDesignFabrics(x.d, x.img.ten, x.img.chi));
          ga("design_done", { seconds: Math.round((Date.now() - t0) / 1000), count: fabs.length });
          return chooseDesign(fabs, res.concept).then(() => dProgress.close());
        })
        .catch((e) => {
          if (dProgress.open) dProgress.close();
          showToast(KakeDesign.errorMessage(e));
          ga("design_error", { code: (e && e.code) || "failed" });
        })
        .then(() => { clearInterval(timer); btn.disabled = false; running = false; });
    }
  }

  // ---- 部屋に飾ったイメージ(写真合成)。AR と違い PC でも使える ----
  // 掛軸は実寸で置く。背景ごとの較正値(catalog.js の ROOM_SCENES)から 1px 当たりの mm を出し、
  // 掛軸キャンバスの _mmPerPx と突き合わせて描画サイズを決める。
  function initRoom() {
    const btn = document.getElementById("room-btn");
    const dlg = document.getElementById("room-dialog");
    if (!btn || !dlg || typeof ROOM_SCENES === "undefined" || !ROOM_SCENES.length) return;

    const canvas = document.getElementById("room-canvas");
    const ctx = canvas.getContext("2d");
    const listEl = document.getElementById("room-list");
    const scaleEl = document.getElementById("room-scale");
    const noteEl = document.getElementById("room-scale-note");

    const bgCache = {};
    let scene = ROOM_SCENES[0];
    let bg = null;        // 背景の Image
    let scrollCv = null;  // 掛軸のキャンバス(透明余白)
    let pos = null;       // 掛軸の左上(背景の座標系)
    let dragging = false;
    let grabDx = 0, grabDy = 0;
    let lastScale = 1;  // スライダーの直前の倍率(中心を保って拡縮するために使う)

    function bgMmPerPx() {
      const span = (scene.floorYPct - scene.ceilYPct) * bg.height;
      return scene.wallHeightMm / span;
    }
    function userScale() { return (parseInt(scaleEl.value, 10) || 100) / 100; }
    function scrollSizePx() {
      const hMm = scrollCv.height * scrollCv._mmPerPx;
      const h = (hMm / bgMmPerPx()) * userScale();
      return { w: h * (scrollCv.width / scrollCv.height), h: h, hMm: hMm };
    }
    function resetPos() {
      const s = scrollSizePx();
      const floorY = scene.floorYPct * bg.height;
      const bottom = floorY - ROOM_DEFAULT_BOTTOM_MM / bgMmPerPx();
      pos = { x: scene.centerXPct * bg.width - s.w / 2, y: bottom - s.h };
    }
    function clampPos() {
      const s = scrollSizePx();
      pos.x = Math.max(-s.w * 0.3, Math.min(bg.width - s.w * 0.7, pos.x));
      pos.y = Math.max(-s.h * 0.3, Math.min(bg.height - s.h * 0.7, pos.y));
    }

    function draw() {
      if (!bg || !scrollCv) return;
      canvas.width = bg.width;
      canvas.height = bg.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0);
      const s = scrollSizePx();
      clampPos();
      // 壁との馴染みのため、うっすら影を落とす
      ctx.save();
      ctx.shadowColor = "rgba(40,25,20,0.30)";
      ctx.shadowBlur = Math.max(6, s.w * 0.06);
      ctx.shadowOffsetX = s.w * 0.02;
      ctx.shadowOffsetY = s.w * 0.03;
      ctx.drawImage(scrollCv, pos.x, pos.y, s.w, s.h);
      ctx.restore();
      // 表示するのは仕上がりの実寸。スライダーは背景側の見え方を合わせるためのもので、掛軸の寸法は変わらない。
      noteEl.textContent = "高さ 約" + Math.round(s.hMm / 10) + "cm";
    }

    function loadBg(sc) {
      if (bgCache[sc.id]) return Promise.resolve(bgCache[sc.id]);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { bgCache[sc.id] = img; resolve(img); };
        img.onerror = reject;
        img.src = sc.file;
      });
    }

    function selectScene(sc, keepPos) {
      scene = sc;
      Array.prototype.forEach.call(listEl.querySelectorAll("button"), (b) => {
        b.setAttribute("aria-pressed", String(b.dataset.room === sc.id));
      });
      return loadBg(sc).then((img) => {
        bg = img;
        if (!keepPos || !pos) resetPos();
        draw();
      });
    }

    function renderList() {
      listEl.innerHTML = "";
      ROOM_SCENES.forEach((sc) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = sc.name;
        b.dataset.room = sc.id;
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          selectScene(sc, false);
          if (typeof gtag === "function") gtag("event", "room_view", { room: sc.id, size: state.sizeMode, format: state.formatId });
        });
        li.appendChild(b);
        listEl.appendChild(li);
      });
    }

    // 画面上の座標 → 背景画像の座標
    function toCanvasXY(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (!pos) return;
      const p = toCanvasXY(e);
      const s = scrollSizePx();
      if (p.x < pos.x || p.x > pos.x + s.w || p.y < pos.y || p.y > pos.y + s.h) return;
      dragging = true;
      grabDx = p.x - pos.x;
      grabDy = p.y - pos.y;
      canvas.classList.add("dragging");
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = toCanvasXY(e);
      pos.x = p.x - grabDx;
      pos.y = p.y - grabDy;
      draw();
    });
    ["pointerup", "pointercancel"].forEach((type) => canvas.addEventListener(type, () => {
      dragging = false;
      canvas.classList.remove("dragging");
    }));

    scaleEl.addEventListener("input", () => {
      if (!pos || !bg || !scrollCv) return;
      // 拡縮しても掛軸の中心が動かないようにする。
      // input が来た時点で value は新しい値なので、直前の倍率を覚えておいて元の大きさを割り戻す。
      const next = userScale();
      const ratio = next / lastScale;
      const s = scrollSizePx();
      pos.x = (pos.x + s.w / ratio / 2) - s.w / 2;
      pos.y = (pos.y + s.h / ratio / 2) - s.h / 2;
      lastScale = next;
      draw();
    });

    document.getElementById("room-reset-btn").addEventListener("click", () => {
      scaleEl.value = 100;
      lastScale = 1;
      resetPos();
      draw();
    });
    document.getElementById("room-close-btn").addEventListener("click", () => dlg.close());
    document.getElementById("room-save-btn").addEventListener("click", () => {
      downloadCanvas(canvas, "kakephoto-room-" + scene.id + ".png").then((ok) => {
        showToast(ok ? "画像を保存しました。" : "画像の保存に失敗しました。お手数ですが画面の写真をお撮りください。");
      });
    });

    btn.addEventListener("click", () => {
      btn.disabled = true;
      renderPreviewToCanvas({ transparent: true })
        .then((cv) => {
          scrollCv = cv;
          pos = null;
          scaleEl.value = 100;
          lastScale = 1;
          if (!listEl.children.length) renderList();
          if (typeof gtag === "function") gtag("event", "room_view", { room: scene.id, size: state.sizeMode, format: state.formatId });
          return selectScene(scene, false);
        })
        .then(() => { if (!dlg.open) dlg.showModal(); })
        .catch(() => showToast("背景の読み込みに失敗しました。通信状態をご確認ください。"))
        .then(() => { btn.disabled = false; });
    });
  }

  // ---- 裂地候補(catalog から)を読み込む ----
  // 裏方で追加した裂地もサーバー経由で js/catalog.js に書き込まれるので、ここは catalog 一本。
  function loadFabrics() {
    state.fabrics = (typeof FABRIC_CATALOG !== "undefined" ? FABRIC_CATALOG : []).map((f) => ({
      id: f.id,
      name: f.name,
      dataUrl: f.file,
      tileW: f.tileW,
      tileH: f.tileH,
      uses: f.uses || [],
      grade: f.grade || "standard",
      cropRect: null,
    }));
  }

  // ---- 裏方: 裂地の追加/削除(#admin のときだけ表示。サーバー経由で catalog.js を更新)----
  let adminPendingImage = null; // トリミング済みの取り込み画像(dataURL)。編集で未変更なら null。
  let adminEditingId = null;    // 編集中の裂地 id(null = 追加モード)

  function isAdmin() { return (location.hash || "").indexOf("admin") >= 0; }

  function updateAdminVisibility() {
    const panel = document.getElementById("admin-panel");
    if (!panel) return;
    const on = isAdmin();
    panel.hidden = !on;
    document.body.classList.toggle("admin-mode", on); // スマホの 100dvh 固定を解除
    if (on) { renderAdminList(); renderFabricMap(); }
  }

  // 裂地の地図(職人用。js/fabricmap.js)。開いたときと「地図を更新」で描く
  function renderFabricMap() {
    if (typeof KakeFabricMap === "undefined") return;
    KakeFabricMap.render(document.getElementById("fabric-map"), state.fabrics);
  }

  function initAdmin() {
    updateAdminVisibility();
    window.addEventListener("hashchange", updateAdminVisibility);
    const fileInput = document.getElementById("admin-fabric-file");
    if (fileInput) fileInput.addEventListener("change", onAdminFileChange);
    const addBtn = document.getElementById("admin-fabric-add");
    if (addBtn) addBtn.addEventListener("click", onAdminSubmit);
    const cancelBtn = document.getElementById("admin-fabric-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", resetAdminForm);
    const recropBtn = document.getElementById("admin-fabric-recrop");
    if (recropBtn) recropBtn.addEventListener("click", onAdminRecrop);
    const mapBtn = document.getElementById("fabric-map-refresh");
    if (mapBtn) mapBtn.addEventListener("click", renderFabricMap);
  }

  function adminWarn(msg) {
    const w = document.getElementById("admin-fabric-warning");
    if (!w) return;
    w.textContent = msg || "";
    w.hidden = !msg;
  }

  // 画像を選んだら、その場でトリミング。確定で取り込み画像を確定。
  function onAdminFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    adminWarn("");
    const reader = new FileReader();
    reader.onload = () => openFabricTrim(reader.result);
    reader.onerror = () => adminWarn("画像の読み込みに失敗しました。");
    reader.readAsDataURL(file);
  }

  // 「切り抜きを調整」: いま表示中の画像(新規取り込み or 保存済みスワッチ)を再トリミングする。
  // 保存済み画像は同一オリジン配信なので canvas で切り出し可能(狭める調整向け。元より広げるのは不可)。
  function onAdminRecrop() {
    const img = document.getElementById("admin-fabric-preview");
    const src = img && img.getAttribute("src");
    if (!src) return adminWarn("先に画像を選んでください。");
    openFabricTrim(src);
  }

  // 指定画像でトリミングダイアログを開き、確定したら取り込み画像(adminPendingImage)を更新する。
  function openFabricTrim(srcUrl) {
    const img = new Image();
    img.onload = () => {
      openTrimDialogWith({
        dataUrl: srcUrl,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        lockEnabled: false,
        title: "裂地のトリミング",
        needCropped: true,
        onConfirm: function (cropRect, croppedDataUrl) {
          downscaleImage(croppedDataUrl, 400, function (small) {
            adminPendingImage = small;
            showAdminPreview(small);
          });
        },
      });
    };
    img.onerror = () => adminWarn("画像の読み込みに失敗しました。");
    img.src = srcUrl;
  }

  function showAdminPreview(dataUrl) {
    const wrap = document.getElementById("admin-fabric-preview-wrap");
    const img = document.getElementById("admin-fabric-preview");
    if (!wrap || !img) return;
    if (dataUrl) { img.src = dataUrl; wrap.hidden = false; }
    else { img.removeAttribute("src"); wrap.hidden = true; }
  }

  // 追加 / 更新の送信(adminEditingId があれば更新)。
  function onAdminSubmit() {
    const name = (document.getElementById("admin-fabric-name").value || "").trim();
    const uses = [];
    if (document.getElementById("admin-use-tenchi").checked) uses.push("tenchi");
    if (document.getElementById("admin-use-nakamawashi").checked) uses.push("nakamawashi");
    if (document.getElementById("admin-use-ichimonji").checked) uses.push("ichimonji");
    const grade = document.getElementById("admin-fabric-grade").value || "standard";
    const tile = Math.max(8, Math.min(200, parseInt(document.getElementById("admin-fabric-tile").value, 10) || 40));
    const editing = !!adminEditingId;
    if (!name) return adminWarn("名前を入力してください。");
    if (!uses.length) return adminWarn("用途を1つ以上選んでください。");
    if (!editing && !adminPendingImage) return adminWarn("画像を選んでトリミングしてください。");

    const payload = { name: name, uses: uses, grade: grade, tileW: tile, tileH: tile };
    if (adminPendingImage) payload.dataUrl = adminPendingImage; // 新規 or 画像差し替え時のみ送る
    const url = editing ? "/api/fabric/update" : "/api/fabric/add";
    if (editing) payload.id = adminEditingId;
    adminWarn(editing ? "更新しています…" : "追加しています…");

    postJSON(url, payload, function (err, resp) {
      if (err || !resp || !resp.ok) {
        const verb = editing ? "更新" : "追加";
        adminWarn(resp && resp.error ? verb + "できませんでした: " + resp.error : verb + "できませんでした(ローカルで node server.js を起動していますか?)。");
        return;
      }
      if (typeof FABRIC_CATALOG !== "undefined" && resp.fabric) {
        const i = FABRIC_CATALOG.findIndex((f) => f.id === resp.fabric.id);
        if (i >= 0) FABRIC_CATALOG[i] = resp.fabric; else FABRIC_CATALOG.push(resp.fabric);
      }
      resetAdminForm();
      loadFabrics();
      renderAdminList();
      render();
      updatePrice();
    });
  }

  // 編集開始: その裂地の値をフォームに展開(画像は据え置き。差し替えたいときだけ選び直す)。
  function onAdminEditFabric(fab) {
    adminEditingId = fab.id;
    adminPendingImage = null;
    document.getElementById("admin-fabric-name").value = fab.name || "";
    document.getElementById("admin-use-tenchi").checked = (fab.uses || []).indexOf("tenchi") >= 0;
    document.getElementById("admin-use-nakamawashi").checked = (fab.uses || []).indexOf("nakamawashi") >= 0;
    document.getElementById("admin-use-ichimonji").checked = (fab.uses || []).indexOf("ichimonji") >= 0;
    document.getElementById("admin-fabric-grade").value = fab.grade || "standard";
    document.getElementById("admin-fabric-tile").value = fab.tileW || 40;
    document.getElementById("admin-fabric-file").value = "";
    showAdminPreview(fab.dataUrl); // 現在の画像(ファイルパス)
    setAdminEditingUI(true);
    adminWarn("");
    const panel = document.getElementById("admin-panel");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setAdminEditingUI(editing) {
    const addBtn = document.getElementById("admin-fabric-add");
    const cancelBtn = document.getElementById("admin-fabric-cancel");
    if (addBtn) addBtn.textContent = editing ? "更新する" : "追加する";
    if (cancelBtn) cancelBtn.hidden = !editing;
  }

  // フォームを追加モードへ戻す(編集のキャンセル・送信成功後)。
  function resetAdminForm() {
    adminEditingId = null;
    adminPendingImage = null;
    document.getElementById("admin-fabric-file").value = "";
    document.getElementById("admin-fabric-name").value = "";
    document.getElementById("admin-use-tenchi").checked = false;
    document.getElementById("admin-use-nakamawashi").checked = false;
    document.getElementById("admin-use-ichimonji").checked = false;
    document.getElementById("admin-fabric-grade").value = "standard";
    document.getElementById("admin-fabric-tile").value = "40";
    showAdminPreview(null);
    setAdminEditingUI(false);
    adminWarn("");
  }

  function onAdminDeleteFabric(id) {
    postJSON("/api/fabric/delete", { id: id }, function (err, resp) {
      if (err || !resp || !resp.ok) {
        adminWarn(resp && resp.error ? "削除できませんでした: " + resp.error : "削除できませんでした(ローカルで node server.js を起動していますか?)。");
        return;
      }
      adminWarn("");
      if (typeof FABRIC_CATALOG !== "undefined") {
        const i = FABRIC_CATALOG.findIndex((f) => f.id === id);
        if (i >= 0) FABRIC_CATALOG.splice(i, 1);
      }
      Object.keys(state.assignments).forEach((k) => { if (state.assignments[k] === id) delete state.assignments[k]; });
      loadFabrics();
      renderAdminList();
      render();
      updatePrice();
    });
  }

  function renderAdminList() {
    const ul = document.getElementById("admin-fabric-list");
    if (!ul) return;
    const arr = state.fabrics.filter((f) => /^cust_/.test(f.id)); // 追加した裂地のみ
    ul.innerHTML = "";
    if (!arr.length) {
      ul.innerHTML = '<li class="admin-empty">まだありません。</li>';
      return;
    }
    const useLabel = { tenchi: "天地", nakamawashi: "中廻し・柱", ichimonji: "一文字" };
    const gradeLabel = { standard: "標準", joh: "上", tokujou: "特上" };
    arr.forEach((f) => {
      const li = document.createElement("li");
      li.className = "admin-item";
      const img = document.createElement("img");
      img.src = f.dataUrl; img.alt = f.name;
      const info = document.createElement("div");
      info.className = "admin-item-info";
      info.textContent = f.name + " / " + (f.uses || []).map((u) => useLabel[u] || u).join("・") + " / " + (gradeLabel[f.grade] || f.grade);
      const edit = document.createElement("button");
      edit.type = "button"; edit.className = "secondary"; edit.textContent = "編集";
      edit.addEventListener("click", () => onAdminEditFabric(f));
      const del = document.createElement("button");
      del.type = "button"; del.className = "secondary"; del.textContent = "削除";
      del.addEventListener("click", () => onAdminDeleteFabric(f.id));
      li.appendChild(img); li.appendChild(info); li.appendChild(edit); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  // POST(JSON)。サーバー(ローカル)に投げる。
  function postJSON(url, body, cb) {
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json().then((j) => cb(null, j)).catch(() => cb(null, { ok: r.ok })))
      .catch((e) => cb(e, null));
  }

  // 画像を最大 maxPx に縮小して dataURL を返す。
  function downscaleImage(dataUrl, maxPx, cb) {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const cw = Math.max(1, Math.round(img.width * scale));
      const ch = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      c.getContext("2d").drawImage(img, 0, 0, cw, ch);
      try { cb(c.toDataURL("image/png")); } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }

  // 元画像の crop 範囲を切り出して dataURL にする(トリミング確定用)。
  function cropImageToDataUrl(src, crop, cb) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = crop.sw; c.height = crop.sh;
      c.getContext("2d").drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
      try { cb(c.toDataURL("image/png")); } catch (e) { cb(src); }
    };
    img.onerror = () => cb(src);
    img.src = src;
  }

  // ---- サイズ ----
  function currentSizeMode() {
    const r = Array.from(el.sizeModeRadios).find((x) => x.checked);
    return r ? r.value : ""; // 未選択
  }
  function currentOrientation() {
    const r = Array.from(el.orientationRadios).find((x) => x.checked);
    return r ? r.value : "portrait";
  }

  function onSizeModeChange() {
    state.sizeMode = currentSizeMode();
    const isFree = state.sizeMode === "free";
    el.orientationRow.hidden = isFree;
    el.freeSizeRow.hidden = !isFree;
    onSizeChange();
  }

  // サイズ入力(向き・自由サイズ)変更時。有効なら honshi 寸法と価格を更新、無効なら警告して直前値を保つ。
  function onSizeChange() {
    state.sizeMode = currentSizeMode();
    state.orientation = currentOrientation();
    recomputeSize();
  }

  // 現在の UI から本紙寸法とサイズ価格を算出して state に反映する。
  // 無効入力(自由サイズの空・0以下・A3超)なら警告を出し、state.honshiW/H/sizePrice は更新しない(直前値を保持)。
  function recomputeSize() {
    el.sizeWarning.hidden = true;
    const mode = state.sizeMode;

    // 未選択: サイズ価格 0(お見積もりは ¥0 から)。プレビューは既定比率のまま描く。
    if (!mode) {
      // 向きだけは反映する(写真の位置合わせで縦横を切り替えたときに、プレビューも合わせる)
      const portrait = state.orientation === "portrait";
      state.honshiW = portrait ? 210 : 297;
      state.honshiH = portrait ? 297 : 210;
      state.sizePrice = 0;
      state.sizeTierLabel = "";
      render();
      updatePrice();
      return;
    }

    if (mode === "a4" || mode === "a3") {
      const fixed = FIXED_SIZES[mode];
      const portrait = state.orientation === "portrait";
      // longSide = 高さ(縦) / 幅(横)
      const w = portrait ? fixed.shortSide : fixed.longSide;
      const h = portrait ? fixed.longSide : fixed.shortSide;
      state.honshiW = w;
      state.honshiH = h;
      state.sizePrice = fixed.price;
      state.sizeTierLabel = mode.toUpperCase();
      render();
      updatePrice();
      return;
    }

    // 自由サイズ
    const w = parseFloat(el.freeW.value);
    const h = parseFloat(el.freeH.value);
    const res = priceForFreeSize(w, h);
    if (!res.ok) {
      if (res.reason === "over") {
        el.sizeWarning.textContent =
          "A3(420 × 297 mm)を超える大きさは承れません。寸法を小さくしてください。";
      } else {
        el.sizeWarning.textContent = "幅・高さは 1 mm 以上の数値を入力してください。";
      }
      el.sizeWarning.hidden = false;
      // 直前の有効状態を保つ(プレビュー・価格は更新しない)
      return;
    }
    // 有効: 入力寸法を本紙寸法に反映
    state.honshiW = w;
    state.honshiH = h;
    state.freeW = w;
    state.freeH = h;
    state.sizePrice = res.price;
    state.sizeTierLabel = res.label;
    render();
    updatePrice();
  }

  // ---- 箱オプション(スプリント2) ----
  function currentBoxKey() {
    const r = Array.from(elBox.radios).find((x) => x.checked);
    return r ? r.value : "paper";
  }

  function onBoxChange() {
    state.boxKey = currentBoxKey();
    const photo = document.getElementById("box-photo");
    if (photo) photo.hidden = state.boxKey !== "kiri"; // 桐箱を選んだら下に写真
    updatePrice();
  }

  // 軸先の色(黒・茶・アイボリー)。価格には影響せず、見た目のみ。
  function onJikuColorChange() {
    const checked = Array.from(document.getElementsByName("jiku-color")).find((r) => r.checked);
    if (checked) state.jikuColor = checked.value;
    render();
  }

  // ---- 価格表示(リアルタイム) ----
  function updatePrice() {
    // 風帯あり(実際に風帯が付く)なら +¥3,000。
    const fuutaiOn = !partOptions().noFuutai;
    const optionSurcharge = fuutaiOn
      ? (typeof OPTION_SURCHARGES !== "undefined" ? (OPTION_SURCHARGES.fuutai || 0) : 0)
      : 0;
    const bd = computeTotal({
      sizePrice: state.sizePrice,
      assignments: state.assignments,
      fabrics: state.fabrics,
      groups: effectiveGroups(),
      boxKey: state.boxKey,
      optionSurcharge: optionSurcharge,
    });
    el.priceTotal.textContent = formatYen(bd.total);
    el.bdSize.textContent = formatYen(bd.size);
    // 風帯加算(付くときだけ行を表示)
    const fuutaiRow = document.getElementById("bd-fuutai-row");
    const bdFuutai = document.getElementById("bd-fuutai");
    if (fuutaiRow && bdFuutai) {
      fuutaiRow.hidden = bd.option <= 0;
      bdFuutai.textContent = bd.option > 0 ? "+" + formatYen(bd.option) : formatYen(0);
    }
    // 裂地加算(スプリント2: +¥0 の場合も表示)
    if (elBox.bdFabric) {
      elBox.bdFabric.textContent = bd.fabric > 0 ? "+" + formatYen(bd.fabric) : formatYen(0);
    }
    // 箱加算
    if (elBox.bdBox) {
      elBox.bdBox.textContent = bd.box > 0 ? "+" + formatYen(bd.box) : formatYen(0);
    }
  }

  // ---- 表装形式 ----
  // 丸表装で「明朝仕立て」チェックが入っているときは内部プリセット mincho を使う
  function activePreset() {
    if (state.formatId === "maru" && state.opt.mincho) {
      return getPreset("mincho");
    }
    return getPreset(state.formatId);
  }

  function updateFormatNote() {
    // 顧客画面では内部の「要確認(仮値)」注記は表示しない。
    el.formatNote.hidden = true;
  }

  // 形式変更。確定済みの与件: オプションのチェック状態は形式を変えても保持する(リセットしない)。
  // initial=true は初期化時(チェックボックスへ state を一度反映する)。
  function onFormatChange() {
    state.formatId = el.formatSelect.value || state.formatId;
    if (el.formatSelect.value) state.formatChosen = true;
    updateStepNav();
    // 「明朝仕立て」チェックは丸表装のときだけ表示。他形式では UI を隠すが state.mincho 値は保持する。
    el.minchoLabel.hidden = state.formatId !== "maru";
    if (!el.minchoLabel.hidden) el.optMincho.checked = state.opt.mincho;
    // 形式の裂地リンク(袋表具/明朝の 柱=天地 等)を切替時に反映。
    //   例: 三段→袋表具 で、天地の裂地を柱へ適用する。
    syncLinkedAssignments();
    // チェック状態の取り込み・反映・可視/無効の更新は onPartOptionChange に集約。
    onPartOptionChange();
  }

  // 形式の linkGroups に従い、従属部位(例: 袋表具の柱)へ親グループ(天地)の裂地を反映する。
  // 形式切替時に呼び、「天地の裂地を柱に適用」「柱=天地は常に同じ」を保つ。
  function syncLinkedAssignments() {
    const preset = activePreset() || {};
    const links = preset.linkGroups || {};
    Object.keys(links).forEach((from) => {
      const to = links[from];
      if (!PART_GROUPS[from] || !PART_GROUPS[to]) return;
      const leader = PART_GROUPS[to].keys[0]; // 親グループの代表キー(例: tenchi → ten)
      const fab = state.assignments[leader];
      PART_GROUPS[from].keys.forEach((k) => {
        if (fab) state.assignments[k] = fab;
        else delete state.assignments[k];
      });
    });
  }

  // 形式の linkGroups(風帯=一文字、柱=中廻し 等)を反映した部位グループを返す
  function effectiveGroups() {
    const preset = activePreset() || {};
    const links = preset.linkGroups || {};
    const groups = {};
    Object.keys(PART_GROUPS).forEach((k) => {
      groups[k] = { label: PART_GROUPS[k].label, keys: PART_GROUPS[k].keys.slice() };
    });
    Object.keys(links).forEach((from) => {
      const to = links[from];
      if (!groups[from] || !groups[to]) return;
      groups[to].keys = groups[to].keys.concat(groups[from].keys);
      groups[to].label = groups[to].label + "+" + PART_GROUPS[from].label;
      groups[from].linkedInto = to;
    });
    return groups;
  }

  function partOptions() {
    // 形式に存在しない部位はその形式では無効。チェック状態(state.opt)は維持しつつ、
    //   computeLayout へ渡すのは「現在の形式で実際に適用される」値にする。
    const preset = activePreset() || {};
    const pp = preset.parts || {};
    return {
      // 一文字を持たない形式は実質「一文字なし」。
      noIchimonji: state.opt.noIchimonji || pp.ichimonji === false,
      noFuutai: state.opt.noFuutai || pp.fuutai === false,
    };
  }

  // オプションのチェック変更(または形式変更時の再評価)。
  // 状態は state.opt に保持し、形式変更では消さない。形式に無い部位のチェックは「無効化」表示にする。
  function onPartOptionChange() {
    const preset = getPreset(state.formatId) || {};
    const pp = preset.parts || {};
    const ichimonjiAvailable = pp.ichimonji !== false;
    const fuutaiAvailable = pp.fuutai !== false;

    // 一文字あり: 形式が一文字を持つときのみ操作可。チェック値 → state(なし = !あり)。
    el.optIchimonjiAri.disabled = !ichimonjiAvailable;
    if (ichimonjiAvailable) {
      state.opt.noIchimonji = !el.optIchimonjiAri.checked;
    }
    const ichimonjiOn = ichimonjiAvailable && !state.opt.noIchimonji;

    // 風帯あり: 一文字あり かつ 形式が風帯を持つときだけ表示。非表示時は風帯オフ。
    const showFuutai = ichimonjiOn && fuutaiAvailable;
    el.fuutaiAriLabel.hidden = !showFuutai;
    if (showFuutai) {
      state.opt.noFuutai = !el.optFuutaiAri.checked;
    } else {
      state.opt.noFuutai = true; // 一文字なし or 形式に風帯なし → 風帯は付かない
    }

    if (!el.minchoLabel.hidden) state.opt.mincho = el.optMincho.checked;

    // 保持中の state をチェックボックスへ反映
    el.optIchimonjiAri.checked = ichimonjiOn;
    el.optFuutaiAri.checked = showFuutai && !state.opt.noFuutai;
    if (!el.minchoLabel.hidden) el.optMincho.checked = state.opt.mincho;

    updateFormatNote();
    render();
    updatePrice(); // 風帯あり(+¥3,000)を価格に反映
  }

  // ---- 部位クリック → 用途別の裂地ピッカー ----
  let pickerCtx = null; // { ui: 割り当てグループ, cat: 用途カテゴリ(null = 絞らない) }

  // 部位種別 → 割り当てグループ(ui)の対応表。linkGroups(風帯=一文字、柱=中廻し)を反映。
  // ピッカーの割り当て先と、ホバー時の「一緒に変わる部位」のグループ判定で共用する。
  function buildAssignmentUiMap() {
    const groups = effectiveGroups();
    return {
      ten: "tenchi",
      chi: "tenchi",
      nakamawashi: "nakamawashi",
      hashira: groups.hashira.linkedInto || "hashira",
      ichimonji: "ichimonji",
      fuutai: groups.fuutai.linkedInto || "fuutai",
      heri: "heri",
    };
  }

  // ---- ホバー: 一緒に変わる部位をまとめて囲む ----
  function onPreviewHover(e) {
    const part = e.target.closest(".part");
    setPartHighlight(part ? part.dataset.hlGroup : null);
  }
  function setPartHighlight(group) {
    el.preview.querySelectorAll(".hl-frame").forEach((f) => f.remove());
    if (!group) return;
    const rects = Array.from(el.preview.querySelectorAll(".part"))
      .filter((p) => p.dataset.hlGroup === group)
      .map((p) => ({ x: p.offsetLeft, y: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight, hashira: p.dataset.partGroup === "hashira" }));
    if (!rects.length) return;
    const drawFrame = (x, y, w, h) => {
      const f = document.createElement("div");
      f.className = "hl-frame";
      f.style.left = px(x); f.style.top = px(y); f.style.width = px(w); f.style.height = px(h);
      el.preview.appendChild(f);
    };
    // 接触している部位どうしを連結。各かたまりは外周を、柱で左右が囲まれていれば内周(窓)も描く。
    clusterRects(rects).forEach((c) => {
      drawFrame(c.x, c.y, c.w, c.h);
      if (c.hole) drawFrame(c.hole.x, c.hole.y, c.hole.w, c.hole.h);
    });
  }
  function clearPartHighlight() {
    setPartHighlight(null);
  }

  // 矩形群を「接触している(隣り合う)ものどうし」で連結し、各かたまりの外接矩形(+柱で囲まれた窓)を返す。
  function clusterRects(rects) {
    const tol = 1.5;
    const touch = (a, b) =>
      a.x + a.w > b.x - tol && b.x + b.w > a.x - tol &&
      a.y + a.h > b.y - tol && b.y + b.h > a.y - tol;
    const parent = rects.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (touch(rects[i], rects[j])) parent[find(i)] = find(j);
      }
    }
    const members = {};
    rects.forEach((r, i) => { const root = find(i); (members[root] = members[root] || []).push(r); });
    return Object.keys(members).map((k) => {
      const ms = members[k];
      const x1 = Math.min.apply(null, ms.map((r) => r.x));
      const y1 = Math.min.apply(null, ms.map((r) => r.y));
      const x2 = Math.max.apply(null, ms.map((r) => r.x + r.w));
      const y2 = Math.max.apply(null, ms.map((r) => r.y + r.h));
      const cluster = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      // 柱が左右にあるかたまりは、本紙側の「窓」(内周)も算出する。
      const cx = (x1 + x2) / 2;
      const hs = ms.filter((r) => r.hashira);
      const ls = hs.filter((r) => r.x + r.w / 2 < cx);
      const rs = hs.filter((r) => r.x + r.w / 2 >= cx);
      if (ls.length && rs.length) {
        const hl = Math.max.apply(null, ls.map((r) => r.x + r.w));
        const hr = Math.min.apply(null, rs.map((r) => r.x));
        const ht = Math.min.apply(null, hs.map((r) => r.y));
        const hb = Math.max.apply(null, hs.map((r) => r.y + r.h));
        if (hr > hl && hb > ht) cluster.hole = { x: hl, y: ht, w: hr - hl, h: hb - ht };
      }
      return cluster;
    });
  }

  // ---- 「掛軸の各部はタップできる」を指の動きで見せる ----
  // 写真の位置合わせを閉じた直後に、天を指がトントンと叩く。
  // 一度でも部位を押した人には、このブラウザでは二度と出さない。
  const TAP_HINT_KEY = "kakephoto.tapHintDone";
  // 指のアイコン(Material Icons "touch_app"、Apache License 2.0)
  const FINGER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4.5 4.5 0 0 0-9 0c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/></svg>';

  function tapHintDone() {
    try { return localStorage.getItem(TAP_HINT_KEY) === "1"; } catch (e) { return false; }
  }
  function hideTapHint() {
    const h = el.preview.querySelector(".tap-hint");
    if (h) h.remove();
  }
  function markTapHintDone() {
    try { localStorage.setItem(TAP_HINT_KEY, "1"); } catch (e) { /* 保存できない環境では毎回出るだけ */ }
    hideTapHint();
  }
  function showTapHint(force) {
    if (!force && (tapHintDone() || !state.honshiImage)) return;
    hideTapHint();
    // 天がいちばん広く、札を出しても入れたばかりの写真にかぶらない
    const target = el.preview.querySelector('.part[data-part="ten"]') || el.preview.querySelector('.part[data-part="nakaUe"]');
    if (!target) return;
    const hint = document.createElement("div");
    hint.className = "tap-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.style.left = target.offsetLeft + target.offsetWidth / 2 + "px";
    hint.style.top = target.offsetTop + target.offsetHeight / 2 + "px";
    hint.innerHTML = '<span class="tap-hint-ripple"></span>' + FINGER_SVG +
      '<span class="tap-hint-label">ここを<span class="act-tap">タップ</span><span class="act-click">クリック</span></span>';
    // 叩き終えたら消える。押されなくても、次に写真を位置合わせしたときにまた出る
    hint.addEventListener("animationend", (e) => { if (e.animationName === "tap-hint-out") hint.remove(); });
    el.preview.appendChild(hint);
  }

  function openPartFabricPicker(partKind) {
    markTapHintDone();
    const groups = effectiveGroups();
    const useCat = {
      tenchi: "tenchi",
      nakamawashi: "nakamawashi",
      hashira: "nakamawashi",
      ichimonji: "ichimonji",
      fuutai: "ichimonji",
      heri: null,
    };
    const ui = buildAssignmentUiMap()[partKind];
    if (!ui) return;
    pickerCtx = { ui, cat: useCat[ui] };
    document.getElementById("part-fabric-title").innerHTML = groups[ui].label + " の<ruby>裂地<rt>きれじ</rt></ruby>を選ぶ"; // 部位名は定数なので innerHTML で安全
    document.getElementById("part-fabric-showall").checked = false;
    renderPartFabricList();
    document.getElementById("part-fabric-dialog").showModal();
  }

  function renderPartFabricList() {
    if (!pickerCtx) return;
    const showAll = document.getElementById("part-fabric-showall").checked;
    const ul = document.getElementById("part-fabric-list");
    ul.innerHTML = "";
    const groups = effectiveGroups();
    const keys = groups[pickerCtx.ui].keys;
    const currentId = state.assignments[keys[0]] || null;
    const list = state.fabrics.filter((f) => {
      if (showAll || !pickerCtx.cat) return true;
      if (!f.uses || f.uses.length === 0) return true;
      return f.uses.includes(pickerCtx.cat);
    });
    if (list.length === 0) {
      const li = document.createElement("li");
      li.className = "note";
      li.style.gridColumn = "1 / -1";
      li.textContent = "この箇所向けの裂地がありません。「すべての裂地を表示する」をお試しください。";
      ul.appendChild(li);
      return;
    }
    // 追加料金(等級加算)の安い順に並べ、料金ごとの見出しで区切る。
    list.sort((a, b) => fabricSurcharge(a) - fabricSurcharge(b));
    let prevSurcharge = null;
    list.forEach((f) => {
      const sur = fabricSurcharge(f);
      if (sur !== prevSurcharge) {
        const head = document.createElement("li");
        head.className = "fabric-group-head";
        head.textContent = sur > 0 ? "追加 +" + formatYen(sur) : "追加料金なし";
        ul.appendChild(head);
        prevSurcharge = sur;
      }
      const li = document.createElement("li");
      li.className = "fabric-item";
      if (f.id === currentId) li.classList.add("selected");
      const img = document.createElement("img");
      img.src = f.dataUrl;
      img.alt = f.name;
      img.title = "タップで選ぶ";
      const choose = () => {
        keys.forEach((k) => (state.assignments[k] = f.id));
        render();
        updatePrice();
        document.getElementById("part-fabric-dialog").close();
        pickerCtx = null;
      };
      img.addEventListener("click", choose);
      const cap = document.createElement("div");
      cap.className = "fname";
      cap.textContent = f.name;
      const kana = FABRIC_KANA[f.name];
      if (kana) { const k = document.createElement("span"); k.className = "fkana"; k.textContent = kana; cap.prepend(k); }
      cap.addEventListener("click", choose);
      li.appendChild(img);
      li.appendChild(cap);
      ul.appendChild(li);
    });
  }

  // ---- 写真(本紙画像)の取り込み / 取り外し ----
  function onHonshiImageChange(e) {
    const file = e.target.files && e.target.files[0];
    el.honshiImageWarning.hidden = true;
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
      el.honshiImageWarning.textContent =
        "画像ファイルではありません。取り込めませんでした(" + (file.name || "不明") + ")。";
      el.honshiImageWarning.hidden = false;
      el.honshiImageFile.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        state.honshiImage = {
          dataUrl: reader.result,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          cropRect: null,
        };
        el.removeHonshiBtn.hidden = false;
        el.trimHonshiBtn.style.display = "";
        el.honshiImageFile.value = "";
        setHonshiFileName(file.name || "選んだ写真");
        render();
        // 取り込んだらそのまま位置合わせへ(トリミング画面の「写真を変更」から来た場合は開いたまま差し替わる)
        openTrimDialog();
      };
      img.onerror = function () {
        el.honshiImageWarning.textContent = "画像として読み込めませんでした。";
        el.honshiImageWarning.hidden = false;
        el.honshiImageFile.value = "";
      };
      img.src = reader.result;
    };
    reader.onerror = function () {
      el.honshiImageWarning.textContent = "ファイルの読み込みに失敗しました。";
      el.honshiImageWarning.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  // 写真の欄の表示(標準のファイル欄は隠しているので、選んだファイル名とボタンの文言をここで出す)
  function setHonshiFileName(name) {
    const nameEl = document.getElementById("honshi-image-name");
    const btn = document.getElementById("honshi-pick-btn");
    if (nameEl) {
      nameEl.textContent = name || "まだ選んでいません";
      nameEl.title = name || "";
      nameEl.classList.toggle("has-file", !!name);
    }
    if (btn) btn.textContent = name ? "別の写真にする" : "写真を選ぶ";
  }

  function onRemoveHonshiImage() {
    setHonshiFileName("");
    state.honshiImage = null;
    el.removeHonshiBtn.hidden = true;
    el.trimHonshiBtn.style.display = "none";
    render();
  }

  // 実寸(cm)の数字ラベルを更新する。未選択のときは空にする。
  // 寸法ラベルは掛軸「全体」(本紙＋表装)の仕上がり寸法を表示する。
  // 全体寸法は computeLayout の totalW/totalH(一文字なし・風帯などの状態も反映)。
  function updateDimLabels(layout) {
    const dimW = document.getElementById("dim-w");
    const dimH = document.getElementById("dim-h");
    if (!dimW || !dimH) return;
    if (!state.sizeMode) {
      dimW.textContent = "";
      dimH.textContent = "";
      return;
    }
    // サイズ帯×向き×形式の本人確認済み「仕上がり全体寸法」を優先表示。
    // 形式は実効値(明朝仕立ては maru+mincho で activePreset が mincho を返す)。
    const fmtId = (activePreset() || {}).id || state.formatId;
    const fixed = finishedSizeFor(state.sizeMode, state.honshiW, state.honshiH, fmtId);
    if (fixed) {
      dimW.textContent = "幅 " + cmRange(fixed.w) + " cm";
      // 高さは縦書きラベル。数字は縦中横(横並び)で表示する。
      dimH.innerHTML = "高さ " + cmRangeTcy(fixed.h) + " " + tcy("cm");
      return;
    }
    // 未登録(自由サイズ 等)は比率(暫定計算)でキリよく(5cm 刻み)概算。
    const lay = layout || computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions());
    const r5mm = (mm) => Math.round(mm / 10 / 5) * 5; // mm → cm を 5 刻みに
    dimW.textContent = "幅 約" + r5mm(lay.totalW) + " cm";
    dimH.innerHTML = "高さ 約" + tcy(r5mm(lay.totalH)) + " " + tcy("cm");
  }
  // [min,max] cm → "約80〜100" / 同値なら "約23"
  function cmRange(r) {
    return r[0] === r[1] ? "約" + r[0] : "約" + r[0] + "〜" + r[1];
  }
  // 縦書きラベル用: 数字を縦中横(横並び)にするための span で囲む。
  function tcy(s) {
    return '<span class="tcy">' + s + "</span>";
  }
  function cmRangeTcy(r) {
    return r[0] === r[1] ? "約" + tcy(r[0]) : "約" + tcy(r[0]) + "〜" + tcy(r[1]);
  }

  // 仕上がり全体寸法(cm)を返す。FINISHED_SIZE には各サイズ帯の「縦・三段/茶掛」のみ持ち、
  // 以下は本人ルールに基づき導出する:
  //   ・袋表具(maru): 中廻し分が天地に入るため、全体寸法は三段表装と同じ。
  //   ・明朝(mincho): 袋表具(=三段)に明朝縁を片側 +2分(両側 +4分≒1.2cm)。高さは不変。
  //   ・横向き(landscape): 裂地寸法は縦と同じで本紙だけ縦横入替 → 高さは本紙(長辺−短辺)ぶん減り、幅は同ぶん増える。
  // 導出した値はキリよく 5cm 刻みに丸める。未登録(自由サイズ 等)は null でフォールバック。
  function finishedSizeFor(sizeMode, honshiW, honshiH, formatId) {
    const base = FINISHED_SIZE[sizeMode + "-portrait"] || {};
    // 茶掛は専用。三段・袋表具・明朝は三段の縦値を土台にする。
    const src = formatId === "chagake" ? base["chagake"] : base["santan-gyo"];
    if (!src) return null;
    let h = src.h.slice();
    let w = src.w.slice();
    let derived = false;

    // 明朝: 明朝縁を片側 +2分 → 両側で +4分。高さは変わらない。
    if (formatId === "mincho") {
      const heri = 4 * 0.30303; // 4分 ≒ 1.21cm
      w = [w[0] + heri, w[1] + heri];
      derived = true;
    }

    // 横向き: 高さ −(本紙 長辺−短辺)、幅 +(同じ量)。
    if (honshiW > honshiH) {
      const fx = FIXED_SIZES[sizeMode];
      if (fx) {
        const d = (fx.longSide - fx.shortSide) / 10;
        h = [h[0] - d, h[1] - d];
        w = [w[0] + d, w[1] + d];
        derived = true;
      }
    }

    if (derived) {
      const r5 = (x) => Math.round(x / 5) * 5; // キリよく 5cm 刻み
      h = [r5(h[0]), r5(h[1])];
      w = [r5(w[0]), r5(w[1])];
    }
    return { h: h, w: w };
  }

  // ---- レンダリング(プレビュー) ----
  // プレビューは常に「A4 定型」の大きさで固定して描く(A3 で大きくなりすぎず、
  // 自由サイズで小さくなりすぎないようにし、裂地選びを安定させる)。
  // 実際の寸法は数字(cm)で別に表示する。スケールは本紙基準で固定し、
  // 仕立て(形式・一文字・風帯)を変えても本紙の大きさは変わらない。
  function render(forcedScale) {
    updateSuggestVisibility(); // 写真が入っているときだけ 3案ボタンを出す
    updateDesignVisibility(); // 写真が入っているときだけ「写真に合わせてデザインする」を出す
    renderDesignHistory(); // これまでのデザイン(縮小計算の前に置き、スマホでも枠の高さに入れる)
    updateMaterialNote(); // 和紙の部位の表示(同じく縮小計算の前に)
    if (currentStep === 5) renderConfirm();
    updateStepNav(); // 写真・大きさ・作り方が満たされたら「次へ」を有効に
    el.previewWarning.hidden = true;

    const opts = partOptions();
    const preset = activePreset();

    // 本紙は実寸の縦横比で描く(正方形なら正方形)。サイズ選択・仕立てに依らず
    // 本紙の長辺を一定 px に固定し、A3 で大きくなりすぎ/自由サイズで小さくなりすぎを防ぐ。
    const honshiW = state.honshiW;
    const honshiH = state.honshiH;
    const layout = computeLayout(preset, honshiW, honshiH, opts);
    updateDimLabels(layout); // 掛軸全体の仕上がり寸法を表示
    let scale;
    if (typeof forcedScale === "number") {
      scale = forcedScale; // 2 段目: プレビュー枠に収めるための縮小値
    } else {
      const targetHonshiLong = Math.min(210, Math.max(150, (window.innerHeight - 200) / 3.0)); // px
      scale = targetHonshiLong / Math.max(honshiW, honshiH);
    }

    el.preview.innerHTML = "";
    el.preview.style.width = px(layout.totalW * scale);
    el.preview.style.height = px(layout.totalH * scale);

    const drawOrder = [
      "ten", "nakaUe", "honshi", "ichimonjiUe", "ichimonjiShita",
      "hashiraLeft", "hashiraRight", "nakaShita", "chi",
      "fuutaiLeft", "fuutaiRight", "heriLeft", "heriRight",
    ];

    // 同じ裂地として一緒に変わる部位のグループ(ホバー時のまとめ囲み用)
    const hlUiMap = buildAssignmentUiMap();

    drawOrder.forEach((key) => {
      const rect = layout.parts[key];
      if (!rect) return;
      const div = document.createElement("div");
      div.className = "part part-" + rect.part;
      div.dataset.part = key;
      div.dataset.partGroup = rect.part;
      if (rect.part === "honshi") div.dataset.hlGroup = "honshi"; // 本紙もホバーで囲む(単独)
      else if (hlUiMap[rect.part]) div.dataset.hlGroup = hlUiMap[rect.part];
      div.style.left = px(rect.x * scale);
      div.style.top = px(rect.y * scale);
      div.style.width = px(rect.w * scale);
      div.style.height = px(rect.h * scale);
      if (rect.part === "fuutai") {
        div.style.top = px(rect.y * scale - 8);
        div.style.height = px(rect.h * scale + 8);
      }

      // 部位クリック: まわりの部位は裂地ピッカー、本紙(写真)は位置調整(写真がなければ写真選択)。
      if (rect.part !== "honshi") {
        div.addEventListener("click", () => openPartFabricPicker(rect.part));
      } else {
        div.style.cursor = "pointer";
        div.addEventListener("click", () => {
          if (state.honshiImage) openTrimDialog();
          else el.honshiImageFile.click();
        });
      }

      if (key === "honshi") {
        // 写真を 1 枚表示(cover 相当。はみ出しは overflow:hidden でクリップ)
        if (state.honshiImage) {
          applyHonshiImage(div, state.honshiImage, rect.w * scale, rect.h * scale);
        }
      } else {
        const fabricId = state.assignments[key];
        if (fabricId) {
          const fab = state.fabrics.find((f) => f.id === fabricId);
          if (fab && fab.cover) {
            applyCover(div, fab, key, "center");
            div.dataset.fabricId = fabricId;
          } else if (fab) {
            const tilePxW = Math.max(2, fab.tileW * scale);
            const tilePxH = Math.max(2, fab.tileH * scale);
            applyFabricTiling(div, fab, tilePxW, tilePxH);
            div.dataset.fabricId = fabricId;
          }
        }
      }

      el.preview.appendChild(div);
    });

    // 軸棒・八双・軸先の見え
    const top = document.createElement("div");
    top.className = "jiku-bar top";
    const bottom = document.createElement("div");
    bottom.className = "jiku-bar bottom";
    const tenFab = state.fabrics.find((f) => f.id === state.assignments.ten);
    const chiFab = state.fabrics.find((f) => f.id === state.assignments.chi);
    // 八双・軸棒には天・地の紙が巻き込まれるので、デザインの天地はその絵の上端・下端を続けて見せる
    if (tenFab && tenFab.cover) applyCover(top, tenFab, "ten", "top");
    else if (tenFab) applyFabricTiling(top, tenFab, Math.max(2, tenFab.tileW * scale), Math.max(2, tenFab.tileH * scale));
    if (chiFab && chiFab.cover) applyCover(bottom, chiFab, "chi", "bottom");
    else if (chiFab) applyFabricTiling(bottom, chiFab, Math.max(2, chiFab.tileW * scale), Math.max(2, chiFab.tileH * scale));
    const endL = document.createElement("div");
    endL.className = "jiku-end left " + state.jikuColor + (jikuSpot ? " spot" : "");
    const endR = document.createElement("div");
    endR.className = "jiku-end right " + state.jikuColor + (jikuSpot ? " spot" : "");
    el.preview.appendChild(top);
    el.preview.appendChild(bottom);
    el.preview.appendChild(endL);
    el.preview.appendChild(endR);

    updatePriceScrollHint();

    // 裂地が1つでも割り当てられていれば「すべてリセット」を有効化(PC/スマホ両方)
    const noFabric = Object.keys(state.assignments).length === 0;
    document.querySelectorAll(".fabric-reset-btn").forEach((b) => { b.disabled = noFabric; });

    // スマホ等で 1 画面に収めるため、描画後にプレビュー枠を実測し、
    // 掛軸全体(寸法ラベル込み)が枠にちょうど収まる大きさで描き直す(はみ出せば縮め、余れば広げる)。
    // 2026-10-02 本人「プレビューをもっと大きく」で、拡大もするように変えた(以前は縮小のみ)。
    // forcedScale 指定時(2 段目)は再計算しない(無限ループ防止)。
    if (forcedScale === undefined && el.previewFrame &&
        window.matchMedia("(max-width: 960px)").matches) {
      const stage = el.preview.closest(".preview-stage");
      const fw = el.previewFrame.clientWidth;
      const fh = el.previewFrame.clientHeight;
      const pw = el.preview.offsetWidth;
      const ph = el.preview.offsetHeight;
      if (stage && fw > 0 && fh > 0 && pw > 0 && ph > 0) {
        const overheadW = stage.offsetWidth - pw;   // 高さラベル等の固定幅ぶん
        const overheadH = stage.offsetHeight - ph;  // 幅ラベル等の固定高ぶん
        // 軸先(左右に ~20px)・軸棒(上 ~8px / 下 ~10px)はプレビュー枠の外へ
        // はみ出す固定 px。その分を余白として確保し、下端の軸棒が見切れるのを防ぐ。
        const jikuPadX = 22, jikuPadY = 12;
        const shrink = Math.min(
          (fw - overheadW - jikuPadX * 2) / pw,
          (fh - overheadH - jikuPadY * 2) / ph
        ) * 0.94;
        if (shrink > 0 && Math.abs(shrink - 1) > 0.02) {
          render(scale * shrink);
          return;
        }
      }
    }
  }

  // ---- 写真描画ヘルパ(cover 相当) ----
  function applyHonshiImage(div, imgState, displayW, displayH) {
    const src = imgState.dataUrl;
    const crop = imgState.cropRect;
    if (!crop) {
      div.style.backgroundImage = "url(" + src + ")";
      div.style.backgroundSize = "cover";
      div.style.backgroundPosition = "center";
      div.style.backgroundRepeat = "no-repeat";
    } else {
      applyCroppedBackground(div, src, imgState.naturalW, imgState.naturalH, crop, displayW, displayH);
    }
  }

  // ---- デザインの天地(1 枚の絵)を部位いっぱいに敷く。天地以外(柱が天地と一緒の形式など)は中廻しの紙の色 ----
  function applyCover(div, fab, key, pos) {
    const src = fab.cover[key];
    if (!src) { div.style.backgroundColor = fab.cover.fallbackHex || "#e9e2d4"; return; }
    div.style.backgroundImage = "url(" + src + ")";
    div.style.backgroundSize = "cover";
    div.style.backgroundPosition = pos === "top" ? "center top" : pos === "bottom" ? "center bottom" : "center";
    div.style.backgroundRepeat = "no-repeat";
  }

  // ---- 裂地タイリングヘルパ ----
  function applyFabricTiling(div, fab, tilePxW, tilePxH) {
    const src = fab.cropRect && fab._croppedDataUrl ? fab._croppedDataUrl : fab.dataUrl;
    div.style.backgroundImage = "url(" + src + ")";
    div.style.backgroundSize = tilePxW + "px " + tilePxH + "px";
    div.style.backgroundRepeat = "repeat";
    div.style.backgroundPosition = "0 0";
  }

  // ---- cropRect → background-position/size の変換(本紙 cover 用) ----
  function applyCroppedBackground(div, src, natW, natH, crop, displayW, displayH) {
    const scaleX = displayW / crop.sw;
    const scaleY = displayH / crop.sh;
    const sc = Math.max(scaleX, scaleY);
    const bgW = natW * sc;
    const bgH = natH * sc;
    const bgX = -crop.sx * sc + (displayW - crop.sw * sc) / 2;
    const bgY = -crop.sy * sc + (displayH - crop.sh * sc) / 2;
    div.style.backgroundImage = "url(" + src + ")";
    div.style.backgroundSize = bgW.toFixed(2) + "px " + bgH.toFixed(2) + "px";
    div.style.backgroundPosition = bgX.toFixed(2) + "px " + bgY.toFixed(2) + "px";
    div.style.backgroundRepeat = "no-repeat";
  }

  // ---- 写真のトリミング(位置調整)ダイアログ ----
  let trimCtx = null;
  let _trimCachedImg = null;
  let trimOnClose = null; // トリミング画面が閉じたら一度だけ呼ぶ(Esc で閉じた場合も含む)

  // 本紙の位置調整(従来)。トリミングは汎用の openTrimDialogWith に委譲する。
  function openTrimDialog() {
    if (!state.honshiImage) return;
    const s = state.honshiImage;
    openTrimDialogWith({
      dataUrl: s.dataUrl,
      naturalW: s.naturalW,
      naturalH: s.naturalH,
      prevCropRect: s.cropRect ? Object.assign({}, s.cropRect) : null,
      aspectW: state.honshiW,
      aspectH: state.honshiH,
      lockEnabled: true,
      lockDefault: true,
      title: "写真の位置を調整",
      needCropped: false,
      allowChangePhoto: true,
      allowOrient: true,
      onClose: showTapHint,
      onConfirm: function (cropRect) { state.honshiImage.cropRect = cropRect; render(); },
    });
  }

  // 汎用トリミング。opts.onConfirm(cropRect, croppedDataUrl|null) を呼ぶ。
  //   needCropped: true なら切り出した画像(dataURL)も生成して渡す(裂地取り込み用)。
  //   lockEnabled: false なら本紙比率固定オプションを隠す(自由トリミング)。
  function openTrimDialogWith(opts) {
    trimCtx = {
      origDataUrl: opts.dataUrl,
      naturalW: opts.naturalW,
      naturalH: opts.naturalH,
      prevCropRect: opts.prevCropRect || null,
      aspectW: opts.aspectW || opts.naturalW,
      aspectH: opts.aspectH || opts.naturalH,
      onConfirm: opts.onConfirm || null,
      needCropped: !!opts.needCropped,
    };
    _trimCachedImg = null;

    const titleEl = document.getElementById("trim-dialog-title");
    if (titleEl) titleEl.textContent = opts.title || "トリミング";
    document.getElementById("trim-warning").hidden = true;

    const lockOpt = document.querySelector(".trim-options");
    const lockCheck = document.getElementById("trim-lock-aspect");
    if (opts.lockEnabled) {
      if (lockOpt) lockOpt.hidden = false;
      lockCheck.disabled = false;
      lockCheck.checked = opts.lockDefault !== false;
    } else {
      if (lockOpt) lockOpt.hidden = true;
      lockCheck.disabled = true;
      lockCheck.checked = false;
    }

    document.getElementById("trim-change-photo-btn").hidden = !opts.allowChangePhoto;
    const orient = document.getElementById("trim-orient");
    if (orient) { orient.hidden = !opts.allowOrient; updateTrimOrientButtons(); }
    trimOnClose = opts.onClose || null;

    initTrimCanvas();
    // すでに開いている(写真を変更した)ときは開き直さない。showModal は二重に呼ぶと例外になる
    const trimDialog = document.getElementById("trim-dialog");
    if (!trimDialog.open) trimDialog.showModal();
  }

  // 写真の位置合わせ中に本紙の縦横を切り替える。定型は「向き」を、自由サイズは幅と高さを入れ替える。
  // 切り替えたら、切り抜き枠も新しい縦横比に合わせ直す
  function updateTrimOrientButtons() {
    const land = state.honshiW > state.honshiH;
    document.querySelectorAll("#trim-orient button").forEach((b) => {
      b.setAttribute("aria-pressed", String((b.dataset.o === "landscape") === land));
    });
  }
  function onTrimOrient(o) {
    const land = state.honshiW > state.honshiH;
    if ((o === "landscape") === land) return;
    if (state.sizeMode === "free") {
      const w = el.freeW.value;
      el.freeW.value = el.freeH.value;
      el.freeH.value = w;
    } else {
      const r = Array.from(el.orientationRadios).find((x) => x.value === o);
      if (r) r.checked = true;
    }
    onSizeChange();
    if (!trimCtx) return;
    trimCtx.aspectW = state.honshiW;
    trimCtx.aspectH = state.honshiH;
    const lockCheck = document.getElementById("trim-lock-aspect");
    const canvas = document.getElementById("trim-canvas");
    const sel = canvas._selection;
    if (sel && lockCheck.checked && !lockCheck.disabled) {
      // 新しい縦横比で入るいちばん大きな枠を、今の枠の中心に置く
      const ar = trimCtx.aspectW / trimCtx.aspectH;
      let w = canvas.width, h = w / ar;
      if (h > canvas.height) { h = canvas.height; w = h * ar; }
      const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
      sel.w = w; sel.h = h;
      sel.x = Math.max(0, Math.min(canvas.width - w, cx - w / 2));
      sel.y = Math.max(0, Math.min(canvas.height - h, cy - h / 2));
      drawTrimOverlay(canvas, canvas.getContext("2d"), sel);
    }
    updateTrimOrientButtons();
  }

  function onTrimLockToggle(e) {
    const canvas = document.getElementById("trim-canvas");
    const sel = canvas._selection;
    if (!sel) return;
    if (e.target.checked && trimCtx && sel.w > 0 && sel.h > 0) {
      const ar = trimCtx.aspectW / trimCtx.aspectH;
      const cx = sel.x + sel.w / 2;
      const cy = sel.y + sel.h / 2;
      let w = Math.min(sel.w, canvas.width);
      let h = w / ar;
      if (h > canvas.height) { h = canvas.height; w = h * ar; }
      sel.w = w; sel.h = h;
      sel.x = Math.max(0, Math.min(canvas.width - w, cx - w / 2));
      sel.y = Math.max(0, Math.min(canvas.height - h, cy - h / 2));
    }
    drawTrimOverlay(canvas, canvas.getContext("2d"), sel);
  }

  function initTrimCanvas() {
    if (!trimCtx) return;
    const canvas = document.getElementById("trim-canvas");
    const MAX = 460;
    const { naturalW, naturalH, origDataUrl, prevCropRect } = trimCtx;

    const scale = Math.min(MAX / naturalW, MAX / naturalH, 1);
    canvas.width = Math.round(naturalW * scale);
    canvas.height = Math.round(naturalH * scale);
    canvas._trimScale = scale;

    const ctx2d = canvas.getContext("2d");
    function afterLoad(img) {
      ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
      let initRect;
      const lockCheck = document.getElementById("trim-lock-aspect");
      const lockAr = (lockCheck.checked && !lockCheck.disabled && trimCtx)
        ? trimCtx.aspectW / trimCtx.aspectH : null;
      if (prevCropRect) {
        initRect = {
          x: prevCropRect.sx * scale, y: prevCropRect.sy * scale,
          w: prevCropRect.sw * scale, h: prevCropRect.sh * scale,
        };
      } else if (lockAr) {
        let w = canvas.width;
        let h = w / lockAr;
        if (h > canvas.height) { h = canvas.height; w = h * lockAr; }
        initRect = { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
      } else {
        initRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      }
      canvas._selection = initRect;
      drawTrimOverlay(canvas, ctx2d, initRect);
    }
    const img = new Image();
    img.onload = function () { _trimCachedImg = img; afterLoad(img); };
    img.src = origDataUrl;
  }

  function drawTrimOverlay(canvas, ctx2d, sel) {
    if (!trimCtx) return;
    function doDraw(img) {
      ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = "rgba(0,0,0,0.5)";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      if (sel.w > 0 && sel.h > 0) {
        ctx2d.clearRect(sel.x, sel.y, sel.w, sel.h);
        ctx2d.drawImage(img, sel.x / canvas._trimScale, sel.y / canvas._trimScale,
          sel.w / canvas._trimScale, sel.h / canvas._trimScale,
          sel.x, sel.y, sel.w, sel.h);
        ctx2d.strokeStyle = "#fff";
        ctx2d.lineWidth = 1.5;
        ctx2d.setLineDash([4, 3]);
        ctx2d.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w - 1, sel.h - 1);
        ctx2d.setLineDash([]);
        const HS = 8;
        ctx2d.fillStyle = "#fff";
        ctx2d.strokeStyle = "rgba(0,0,0,0.6)";
        ctx2d.lineWidth = 1;
        [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]]
          .forEach(([hx, hy]) => {
            ctx2d.fillRect(hx - HS / 2, hy - HS / 2, HS, HS);
            ctx2d.strokeRect(hx - HS / 2 + 0.5, hy - HS / 2 + 0.5, HS - 1, HS - 1);
          });
      }
    }
    if (_trimCachedImg && _trimCachedImg.complete) {
      doDraw(_trimCachedImg);
    } else {
      const img = new Image();
      img.onload = function () { _trimCachedImg = img; doDraw(img); };
      img.src = trimCtx.origDataUrl;
    }
  }

  function setupTrimCanvasDrag() {
    const canvas = document.getElementById("trim-canvas");
    const HANDLE_HIT = 16;
    let drag = null;

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const cssToPixelX = canvas.width / r.width;
      const cssToPixelY = canvas.height / r.height;
      return {
        x: Math.max(0, Math.min(canvas.width, (clientX - r.left) * cssToPixelX)),
        y: Math.max(0, Math.min(canvas.height, (clientY - r.top) * cssToPixelY)),
      };
    }
    function lockedAspect() {
      const lockCheck = document.getElementById("trim-lock-aspect");
      if (lockCheck.checked && !lockCheck.disabled && trimCtx) return trimCtx.aspectW / trimCtx.aspectH;
      return null;
    }
    function hitCorner(sel, pos) {
      const corners = [
        { cx: sel.x, cy: sel.y, ax: sel.x + sel.w, ay: sel.y + sel.h },
        { cx: sel.x + sel.w, cy: sel.y, ax: sel.x, ay: sel.y + sel.h },
        { cx: sel.x, cy: sel.y + sel.h, ax: sel.x + sel.w, ay: sel.y },
        { cx: sel.x + sel.w, cy: sel.y + sel.h, ax: sel.x, ay: sel.y },
      ];
      for (const c of corners) {
        if (Math.abs(pos.x - c.cx) <= HANDLE_HIT && Math.abs(pos.y - c.cy) <= HANDLE_HIT) return c;
      }
      return null;
    }
    function inside(sel, pos) {
      return pos.x >= sel.x && pos.x <= sel.x + sel.w && pos.y >= sel.y && pos.y <= sel.y + sel.h;
    }
    function rectFromPoints(ax, ay, px, py) {
      let x = Math.min(ax, px), y = Math.min(ay, py);
      let w = Math.abs(px - ax), h = Math.abs(py - ay);
      const ar = lockedAspect();
      if (ar) {
        const wFromH = h * ar;
        if (wFromH <= w) { w = wFromH; } else { h = w / ar; }
        if (px < ax) x = ax - w;
        if (py < ay) y = ay - h;
        if (x < 0) { w += x; x = 0; h = w / ar; if (py < ay) y = ay - h; }
        if (y < 0) { h += y; y = 0; w = h * ar; if (px < ax) x = ax - w; }
        if (x + w > canvas.width) { w = canvas.width - x; h = w / ar; if (py < ay) y = ay - h; }
        if (y + h > canvas.height) { h = canvas.height - y; w = h * ar; if (px < ax) x = ax - w; }
      } else {
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > canvas.width) w = canvas.width - x;
        if (y + h > canvas.height) h = canvas.height - y;
      }
      return { x, y, w, h };
    }
    function onStart(e) {
      e.preventDefault();
      const pos = getPos(e);
      const sel = canvas._selection;
      if (sel && sel.w > 0 && sel.h > 0) {
        const corner = hitCorner(sel, pos);
        if (corner) { drag = { mode: "resize", anchorX: corner.ax, anchorY: corner.ay }; return; }
        if (inside(sel, pos)) { drag = { mode: "move", offX: pos.x - sel.x, offY: pos.y - sel.y }; return; }
      }
      drag = { mode: "new", anchorX: pos.x, anchorY: pos.y };
      canvas._selection = { x: pos.x, y: pos.y, w: 0, h: 0 };
    }
    function onMove(e) {
      if (!drag) { updateCursor(e); return; }
      e.preventDefault();
      const pos = getPos(e);
      let sel;
      if (drag.mode === "move") {
        const cur = canvas._selection;
        sel = {
          x: Math.max(0, Math.min(canvas.width - cur.w, pos.x - drag.offX)),
          y: Math.max(0, Math.min(canvas.height - cur.h, pos.y - drag.offY)),
          w: cur.w, h: cur.h,
        };
      } else {
        sel = rectFromPoints(drag.anchorX, drag.anchorY, pos.x, pos.y);
      }
      canvas._selection = sel;
      drawTrimOverlay(canvas, canvas.getContext("2d"), sel);
    }
    function updateCursor(e) {
      if (e.touches) return;
      const sel = canvas._selection;
      if (!sel || sel.w <= 0 || sel.h <= 0) { canvas.style.cursor = "crosshair"; return; }
      const pos = getPos(e);
      if (hitCorner(sel, pos)) canvas.style.cursor = "nwse-resize";
      else if (inside(sel, pos)) canvas.style.cursor = "move";
      else canvas.style.cursor = "crosshair";
    }
    function onEnd() { drag = null; }

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);
  }

  function onTrimConfirm() {
    const canvas = document.getElementById("trim-canvas");
    const sel = canvas._selection;
    const trimWarning = document.getElementById("trim-warning");
    if (!sel || sel.w < 1 || sel.h < 1) {
      trimWarning.textContent = "切り取り範囲を指定してください。";
      trimWarning.hidden = false;
      return;
    }
    const scale = canvas._trimScale;
    const cropRect = {
      sx: Math.round(sel.x / scale), sy: Math.round(sel.y / scale),
      sw: Math.max(1, Math.round(sel.w / scale)), sh: Math.max(1, Math.round(sel.h / scale)),
    };
    const ctx = trimCtx;
    document.getElementById("trim-dialog").close();
    trimCtx = null;
    if (!ctx || !ctx.onConfirm) return;
    if (ctx.needCropped) {
      cropImageToDataUrl(ctx.origDataUrl, cropRect, function (durl) { ctx.onConfirm(cropRect, durl); });
    } else {
      ctx.onConfirm(cropRect, null);
    }
  }

  function onTrimCancel() {
    document.getElementById("trim-dialog").close();
    trimCtx = null;
  }

  // ===========================================================================
  // 共有(LINE で相談・フォームへ引き継ぎ・プレビュー画像の保存)
  //   静的サイトのため自動送信はできない。お客様の選択内容をテキストに、
  //   プレビューを PNG に書き出し、LINE は手動添付、フォームは本文へ引き継ぐ。
  // ===========================================================================
  const LINE_URL = "https://line.me/R/ti/p/@447updgf";
  const JIKU_LABEL = { black: "黒", brown: "茶", ivory: "アイボリー" };
  const JIKU_GRAD = {
    black: ["#565656", "#333333", "#111111"],
    brown: ["#9c7a50", "#7a5c38", "#543c22"],
    ivory: ["#f6f0e2", "#e7dac2", "#d3c2a2"],
  };

  // 現在の設定を、職人が読んで分かる注文内容テキストにまとめる。
  function buildOrderSummary() {
    const layout = computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions());
    const lines = [];
    lines.push("【掛軸オーダー内容】");
    lines.push("■ 本紙サイズ: " + sizeSummaryText());
    const fin = finishedSizeText(layout);
    if (fin) lines.push("■ 仕上がり寸法(目安): " + fin);
    lines.push("■ 仕立て: " + formatSummaryText());
    const design = currentDesignFabric();
    if (design) lines.push("■ デザイン番号: " + design.designId + "(天地を写真に合わせてデザイン)");
    const washi = washiPartLabels(layout);
    if (washi.length) lines.push("■ 素材: " + washi.join("・") + "は和紙に印刷(布の裂地ではありません)");
    lines.push(washi.length ? "■ 各部の裂地・和紙:" : "■ 裂地:");
    fabricSummaryLines(layout).forEach((l) => lines.push("　・" + l));
    lines.push("■ 軸先の色: " + (JIKU_LABEL[state.jikuColor] || state.jikuColor));
    lines.push("■ 箱: " + (state.boxKey === "kiri" ? "桐箱(+¥11,000)" : "紙箱(無料)"));
    lines.push("■ お見積もり(目安): " + el.priceTotal.textContent + "(税込・送料別)");
    return lines.join("\n");
  }

  function sizeSummaryText() {
    if (!state.sizeMode) return "未選択";
    if (state.sizeMode === "free") {
      return "自由サイズ " + Math.round(state.honshiW) + " × " + Math.round(state.honshiH) + " mm";
    }
    const f = FIXED_SIZES[state.sizeMode];
    const orient = state.honshiW > state.honshiH ? "横" : "縦";
    return (f ? f.label : state.sizeMode.toUpperCase()) + "(" + orient + ")";
  }

  function finishedSizeText(layout) {
    if (!state.sizeMode) return "";
    const fmtId = (activePreset() || {}).id || state.formatId;
    const fixed = finishedSizeFor(state.sizeMode, state.honshiW, state.honshiH, fmtId);
    if (fixed) return "幅 " + cmRange(fixed.w) + " cm × 高さ " + cmRange(fixed.h) + " cm";
    const r5 = (mm) => Math.round(mm / 10 / 5) * 5;
    return "幅 約" + r5(layout.totalW) + " cm × 高さ 約" + r5(layout.totalH) + " cm";
  }

  function formatSummaryText() {
    const preset = activePreset() || {};
    let s = preset.label || "";
    const po = partOptions();
    if (!po.noIchimonji) s += "・一文字追加";
    if (!po.noFuutai) s += "・風帯あり";
    return s;
  }

  function fabricSummaryLines(layout) {
    const groups = effectiveGroups();
    const out = [];
    Object.keys(groups).forEach((k) => {
      const g = groups[k];
      if (g.linkedInto) return; // 別グループへ統合済み(例: 柱→天地)は重複表示しない
      const presentKeys = g.keys.filter((key) => layout.parts[key]);
      if (presentKeys.length === 0) return; // この形式に存在しない部位
      let name = "無地(お任せ)";
      for (const key of presentKeys) {
        const id = state.assignments[key];
        if (id) {
          const fab = state.fabrics.find((f) => f.id === id);
          if (fab) { name = fab.name; break; }
        }
      }
      out.push(g.label + ": " + name);
    });
    return out;
  }

  // ---- プレビューを PNG(canvas)に書き出す ----
  // on-screen と同じレイアウト計算を使い、本紙長辺を固定 px にして高解像度で描く。
  // opts.transparent: 余白を白で塗らない(部屋の写真に載せるときに使う)
  function renderPreviewToCanvas(opts) {
    const EXPORT_HONSHI_LONG = 720;
    const scale = EXPORT_HONSHI_LONG / Math.max(state.honshiW, state.honshiH);
    const layout = computeLayout(activePreset(), state.honshiW, state.honshiH, partOptions());
    const bodyW = layout.totalW * scale;
    const bodyH = layout.totalH * scale;
    const u = bodyW * 0.02; // 軸棒・軸先の装飾サイズの基準
    const padX = Math.round(u * 1.6);
    const padTop = Math.round(u * 1.2);
    const padBottom = Math.round(u * 2.0);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bodyW + padX * 2);
    canvas.height = Math.round(bodyH + padTop + padBottom);
    const ctx = canvas.getContext("2d");
    const ox = padX, oy = padTop;

    const fabSrc = (fab) => (fab.cropRect && fab._croppedDataUrl ? fab._croppedDataUrl : fab.dataUrl);
    const srcSet = {};
    if (state.honshiImage) srcSet[state.honshiImage.dataUrl] = true;
    Object.keys(state.assignments).forEach((key) => {
      const fab = state.fabrics.find((f) => f.id === state.assignments[key]);
      if (fab && fab.cover) { if (fab.cover.ten) srcSet[fab.cover.ten] = true; if (fab.cover.chi) srcSet[fab.cover.chi] = true; }
      else if (fab) srcSet[fabSrc(fab)] = true;
    });

    return loadImageMap(Object.keys(srcSet)).then((imgs) => {
      if (!(opts && opts.transparent)) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const drawOrder = [
        "ten", "nakaUe", "honshi", "ichimonjiUe", "ichimonjiShita",
        "hashiraLeft", "hashiraRight", "nakaShita", "chi",
        "fuutaiLeft", "fuutaiRight", "heriLeft", "heriRight",
      ];
      drawOrder.forEach((key) => {
        const rect = layout.parts[key];
        if (!rect) return;
        const x = ox + rect.x * scale, y = oy + rect.y * scale;
        const w = rect.w * scale, h = rect.h * scale;
        if (rect.part === "honshi") {
          drawHonshiCover(ctx, imgs[state.honshiImage && state.honshiImage.dataUrl], x, y, w, h);
        } else {
          const fab = state.fabrics.find((f) => f.id === state.assignments[key]);
          if (fab && fab.cover) {
            drawCover(ctx, imgs[fab.cover[key]], x, y, w, h, "center", fab.cover.fallbackHex);
          } else if (fab && imgs[fabSrc(fab)]) {
            fillTiled(ctx, imgs[fabSrc(fab)], x, y, w, h, fab.tileW * scale, fab.tileH * scale);
          } else {
            ctx.fillStyle = "#efe9de"; // 無地
            ctx.fillRect(x, y, w, h);
          }
        }
        ctx.strokeStyle = "rgba(80,15,30,0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      });

      // 軸棒(上下)・軸先
      const tenFab = state.fabrics.find((f) => f.id === state.assignments.ten);
      const chiFab = state.fabrics.find((f) => f.id === state.assignments.chi);
      const rodH = u * 1.1;
      const bottomY = oy + bodyH - rodH * 0.2;
      if (tenFab && tenFab.cover) drawCover(ctx, imgs[tenFab.cover.ten], ox - u * 0.2, oy - rodH * 0.4, bodyW + u * 0.4, rodH, "top");
      else drawRod(ctx, imgs[tenFab && fabSrc(tenFab)], tenFab, scale, ox - u * 0.2, oy - rodH * 0.4, bodyW + u * 0.4, rodH);
      if (chiFab && chiFab.cover) drawCover(ctx, imgs[chiFab.cover.chi], ox - u * 0.2, bottomY, bodyW + u * 0.4, rodH * 1.3, "bottom");
      else drawRod(ctx, imgs[chiFab && fabSrc(chiFab)], chiFab, scale, ox - u * 0.2, bottomY, bodyW + u * 0.4, rodH * 1.3);
      const capW = u * 1.4, capH = rodH * 1.4;
      drawJikuEnd(ctx, ox - capW * 0.8, bottomY, capW, capH);
      drawJikuEnd(ctx, ox + bodyW - capW * 0.2, bottomY, capW, capH);

      canvas._mmPerPx = 1 / scale; // AR 検証で実寸に戻すための換算(1px あたりの mm)
      return canvas;
    });
  }

  function loadImageMap(srcs) {
    return Promise.all(srcs.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve([src, img]);
      img.onerror = () => resolve([src, null]);
      img.src = src;
    }))).then((pairs) => {
      const map = {};
      pairs.forEach((p) => { if (p[1]) map[p[0]] = p[1]; });
      return map;
    });
  }

  function fillTiled(ctx, img, x, y, w, h, tileW, tileH) {
    tileW = Math.max(2, tileW); tileH = Math.max(2, tileH);
    const tile = document.createElement("canvas");
    tile.width = Math.round(tileW); tile.height = Math.round(tileH);
    tile.getContext("2d").drawImage(img, 0, 0, tile.width, tile.height);
    const pat = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x, y);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawHonshiCover(ctx, img, x, y, w, h) {
    if (!img) { ctx.fillStyle = "#f6f2ea"; ctx.fillRect(x, y, w, h); return; }
    const crop = state.honshiImage.cropRect;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (!crop) {
      const s = Math.max(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      const sc = Math.max(w / crop.sw, h / crop.sh);
      const dx = x - crop.sx * sc + (w - crop.sw * sc) / 2;
      const dy = y - crop.sy * sc + (h - crop.sh * sc) / 2;
      ctx.drawImage(img, dx, dy, img.width * sc, img.height * sc);
    }
    ctx.restore();
  }

  // デザインの天地を cover で描く(pos: 絵のどこを残すか)
  function drawCover(ctx, img, x, y, w, h, pos, fallbackHex) {
    if (!img) { ctx.fillStyle = fallbackHex || "#e9e2d4"; ctx.fillRect(x, y, w, h); return; }
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    const dy = pos === "top" ? y : pos === "bottom" ? y + h - dh : y + (h - dh) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, dy, dw, dh);
    ctx.restore();
  }

  function drawRod(ctx, img, fab, scale, x, y, w, h) {
    if (fab && img) {
      fillTiled(ctx, img, x, y, w, h, fab.tileW * scale, fab.tileH * scale);
    } else {
      ctx.fillStyle = "#e3dccd";
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = "rgba(80,15,30,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function drawJikuEnd(ctx, x, y, w, h) {
    const c = JIKU_GRAD[state.jikuColor] || JIKU_GRAD.brown;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, c[0]); grad.addColorStop(0.4, c[1]); grad.addColorStop(1, c[2]);
    roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.3);
    ctx.fillStyle = grad; ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 画像を端末に保存する。結果は Promise<boolean>。
  // data: URL だと大きな画像で Safari が「Unknown.png」になり保存に失敗する(2026-10-05 本人の Mac で確認)ので、
  // Blob の URL で渡す。URL は保存が始まってからしばらくして片付ける(すぐ消すと Safari が読み切れない)
  function downloadCanvas(canvas, filename) {
    return new Promise((resolve) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(false); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click();
          setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60000);
          resolve(true);
        }, "image/png");
      } catch (e) { resolve(false); } // 外部画像で汚れた canvas など
    });
  }

  function savePreviewImage() {
    return renderPreviewToCanvas()
      .then((canvas) => downloadCanvas(canvas, "kakephoto-kakejiku-preview.png"))
      .catch(() => false);
  }

  function showToast(msg) {
    let t = document.getElementById("share-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "share-toast";
      t.className = "share-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    // 再表示でアニメーションさせるため一度クラスを外す
    t.classList.remove("show");
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 6000);
  }

  function onSaveImageClick() {
    savePreviewImage().then((ok) => {
      showToast(ok ? "プレビュー画像を保存しました。" : "画像の保存に失敗しました。お手数ですが画面の写真をお撮りください。");
    });
  }

  // LINE: 本文をコピー＋画像を保存し、LINE は既定の動作(新規タブ)で開く。
  // preventDefault しないのは、プログラム的な window.open がポップアップブロックされるのを避けるため。
  // 相談ボタンを押した記録(GA4)。デザインした人ほど相談に進むかを測る(2026-10-03 研究「欲しくなる掛軸」E)
  function consultEvent(via) {
    if (typeof gtag !== "function") return;
    const d = currentDesignFabric();
    gtag("event", "consult_click", {
      via: via, // どこから開いて何を選んだか: step5_line / step5_form / bar_line / bar_form
      has_design: d ? 1 : 0,
      variant: d ? d.variant || "" : "",
      method: state.method || "",
      step: currentStep,
      size: state.sizeMode,
      format: state.formatId,
      transport_type: "beacon", // フォームはすぐページを移るので、移っても届く送り方で
    });
  }

  // 相談の方法を選ぶ画面を開く。from = "step5"(5 のボタン)/ "bar"(お見積もり欄の「相談する」)
  let consultFrom = "bar";
  function openConsult(from) {
    consultFrom = from;
    if (typeof gtag === "function") gtag("event", "consult_open", { via: from, step: currentStep, method: state.method || "" });
    document.getElementById("consult-dialog").showModal();
  }
  function closeConsult() {
    const d = document.getElementById("consult-dialog");
    if (d && d.open) d.close();
  }

  function onLineClick() {
    consultEvent(consultFrom + "_line");
    setTimeout(closeConsult, 0); // LINE は別の画面で開く。戻ったときに選択画面が残らないよう閉じる
    const summary = buildOrderSummary();
    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(() => { copied = true; }).catch(() => {});
    }
    savePreviewImage().then((imgOk) => {
      showToast(
        (imgOk ? "プレビュー画像を保存し、" : "") +
        "ご希望内容をコピーしました。LINE のトーク画面で画像を添付し、本文を貼り付けて送信してください。"
      );
    });
  }

  // フォーム: 選択内容をクエリに載せて /contact へ。フォームの本文に初期表示される。
  function onFormClick(e) {
    e.preventDefault();
    consultEvent(consultFrom + "_form");
    const href = e.currentTarget.getAttribute("href") || "/contact";
    const sep = href.indexOf("?") >= 0 ? "&" : "?";
    const url = href + sep + "summary=" + encodeURIComponent(buildOrderSummary());
    // 作りかけは端末に保存していないので、フォームは新しいタブで開いてシミュレーターの画面を残す。
    // 新しいタブが開けない環境(アプリの中の画面など)では、これまでどおり同じ画面で移る
    const w = window.open(url, "_blank");
    if (w) closeConsult(); else window.location.href = url;
  }

  // ---- ユーティリティ ----
  function px(v) { return v.toFixed(2) + "px"; }

  document.addEventListener("DOMContentLoaded", init);
})();
