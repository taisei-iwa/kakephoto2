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

    // トリミング
    document.getElementById("trim-confirm-btn").addEventListener("click", onTrimConfirm);
    document.getElementById("trim-cancel-btn").addEventListener("click", onTrimCancel);
    document.getElementById("trim-lock-aspect").addEventListener("change", onTrimLockToggle);
    setupTrimCanvasDrag();

    // 共有(LINE で相談・フォームへ引き継ぎ・画像保存)
    const ctaLine = document.getElementById("cta-line");
    const ctaForm = document.getElementById("cta-form");
    const saveImageBtn = document.getElementById("save-image-btn");
    if (ctaLine) ctaLine.addEventListener("click", onLineClick);
    if (ctaForm) ctaForm.addEventListener("click", onFormClick);
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
    if (on) renderAdminList();
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

  function openPartFabricPicker(partKind) {
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
    document.getElementById("part-fabric-title").textContent = groups[ui].label + " の裂地を選ぶ";
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
        render();
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

  function onRemoveHonshiImage() {
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
          if (fab) {
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
    if (tenFab) applyFabricTiling(top, tenFab, Math.max(2, tenFab.tileW * scale), Math.max(2, tenFab.tileH * scale));
    if (chiFab) applyFabricTiling(bottom, chiFab, Math.max(2, chiFab.tileW * scale), Math.max(2, chiFab.tileH * scale));
    const endL = document.createElement("div");
    endL.className = "jiku-end left " + state.jikuColor;
    const endR = document.createElement("div");
    endR.className = "jiku-end right " + state.jikuColor;
    el.preview.appendChild(top);
    el.preview.appendChild(bottom);
    el.preview.appendChild(endL);
    el.preview.appendChild(endR);

    // スマホ等で 1 画面に収めるため、描画後にプレビュー枠を実測し、
    // 掛軸全体(寸法ラベル込み)が枠からはみ出すなら縮小して描き直す。
    // forcedScale 指定時(2 段目)は再計算しない(無限ループ防止)。拡大はしない。
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
        ) * 0.90;
        if (shrink > 0 && shrink < 0.999) {
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

    initTrimCanvas();
    document.getElementById("trim-dialog").showModal();
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
    lines.push("■ 裂地:");
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
  function renderPreviewToCanvas() {
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
      if (fab) srcSet[fabSrc(fab)] = true;
    });

    return loadImageMap(Object.keys(srcSet)).then((imgs) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
          if (fab && imgs[fabSrc(fab)]) {
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
      drawRod(ctx, imgs[tenFab && fabSrc(tenFab)], tenFab, scale, ox - u * 0.2, oy - rodH * 0.4, bodyW + u * 0.4, rodH);
      const bottomY = oy + bodyH - rodH * 0.2;
      drawRod(ctx, imgs[chiFab && fabSrc(chiFab)], chiFab, scale, ox - u * 0.2, bottomY, bodyW + u * 0.4, rodH * 1.3);
      const capW = u * 1.4, capH = rodH * 1.4;
      drawJikuEnd(ctx, ox - capW * 0.8, bottomY, capW, capH);
      drawJikuEnd(ctx, ox + bodyW - capW * 0.2, bottomY, capW, capH);

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

  function downloadCanvas(canvas, filename) {
    let url;
    try { url = canvas.toDataURL("image/png"); } catch (e) { return false; }
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => a.remove(), 0);
    return true;
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
  function onLineClick() {
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
    const href = e.currentTarget.getAttribute("href") || "/contact";
    const sep = href.indexOf("?") >= 0 ? "&" : "?";
    window.location.href = href + sep + "summary=" + encodeURIComponent(buildOrderSummary());
  }

  // ---- ユーティリティ ----
  function px(v) { return v.toFixed(2) + "px"; }

  document.addEventListener("DOMContentLoaded", init);
})();
