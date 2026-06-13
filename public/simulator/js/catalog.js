// catalog.js — 価格・裂地・等級・箱の「編集可能データ」一元置き場(運営=裏方の管理領域)。
// 顧客画面のハードコードを避けるため、金額や裂地メタはすべてここに集約する(F8 の土台)。
// スプリント1では「サイズ価格」を本実装し、裂地等級加算/箱はデータだけ定義しておく
//   (合計関数は内訳を足し合わせる構造。スプリント1では裂地加算=0・箱=未適用)。
//
// 注: 例示の裂地名はダミー。岩﨑精正堂(表具師業)との関係は出さない。

// ---- 本紙サイズの定型枠(実寸 mm)。「収まる最小の定型枠に切り上げ」の判定に使う。----
// width/height は「縦向き(ポートレート)基準」の実寸。判定は幅・高さの両方が枠内かで行う。
const SIZE_TIERS = [
  { id: "b5", label: "B5", w: 257, h: 182, price: 33000 },
  { id: "a4", label: "A4", w: 297, h: 210, price: 46000 },
  { id: "a3", label: "A3", w: 420, h: 297, price: 77000 },
];

// A3 が上限(これを超える自由サイズは拒否する)。
const MAX_TIER = SIZE_TIERS[SIZE_TIERS.length - 1]; // A3

// 定型(A4/A3)選択肢。縦・横で実寸を入れ替える。
const FIXED_SIZES = {
  a4: { label: "A4 定型", longSide: 297, shortSide: 210, price: 46000 },
  a3: { label: "A3 定型", longSide: 420, shortSide: 297, price: 77000 },
};

// ---- 仕上がり「全体」寸法(cm)。サイズ帯×向き×形式ごとの本人確認済み実寸範囲。----
// プレビューの寸法ラベル(幅・高さ)に表示する。八双・軸棒を含む仕上がり寸法。
// キー = `${sizeMode}-portrait`(縦のみ保持)。値 = 形式ID → {h,w}(cm の [最小,最大])。
// 横向き・袋表具は app.js の finishedSizeFor() が縦の値から導出する(本人ルール):
//   ・袋表具(maru) = 中廻し分が天地に入るため全体寸法は三段表装と同じ。
//   ・横(landscape) = 裂地は縦と同じ・本紙のみ縦横入替 → 高さは本紙(長辺−短辺)ぶん減・幅は同ぶん増。
// 未登録(自由サイズ・明朝 など)は暫定計算にフォールバック。
// 出典: 本人ヒアリング(曲尺 1寸=3.0303cm)。本人指定でキリよく丸めた範囲。
//   A4縦: 天6〜8寸(八双込)/中廻し上2〜3寸/一文字上8分〜1寸/一文字下5〜7分/中廻し下1.5〜2寸/地5〜7寸(軸棒込)
//         三段の柱=1.5〜2寸 → 幅約30〜33cm。茶掛の柱=本来3.5分(1.06cm)→ 幅約23cm。高さは三段・茶掛とも約80〜100cm。
//   A3縦: 天10〜12寸/中廻し上3.5〜4.5寸/一文字上1〜1.2寸/一文字下7〜9分/中廻し下2〜2.5寸/地7〜10寸
//         高さは三段・茶掛とも本人指定で約120〜140cm。幅は三段約40〜50cm、茶掛約30cm。
const FINISHED_SIZE = {
  "a4-portrait": {
    "santan-gyo": { h: [80, 100], w: [30, 33] },
    "chagake":    { h: [80, 100], w: [23, 23] },
  },
  "a3-portrait": {
    "santan-gyo": { h: [120, 140], w: [40, 50] },
    "chagake":    { h: [120, 140], w: [30, 30] },
  },
};

// ---- 裂地の等級(グレード)と加算額(税込・確定値 / 2026-06-12 本人指定)----
// 加算額は確定。等級ラベルは仮(本人確認項目 7-1)。段階数を増減してもここを編集すれば顧客計算に効く。
const FABRIC_GRADES = {
  standard: { label: "標準", surcharge: 0 },
  joh: { label: "上", surcharge: 3000 },
  tokujou: { label: "特上", surcharge: 5000 },
};

// ---- 箱(梱包)オプション(金額は確定値 / 2026-06-13 本人指定)----
// 紙箱 = 無料(既定)。桐箱 = +¥11,000(税込・確定)。
const BOX_OPTIONS = {
  paper: { label: "紙箱", surcharge: 0 },
  kiri: { label: "桐箱", surcharge: 11000 }, // 確定値(2026-06-13)
};

// 仕立てオプションの加算(税込)。風帯あり = +¥3,000(確定 2026-06-13)。
const OPTION_SURCHARGES = {
  fuutai: 3000,
};

// ---- 顧客ピッカーに並べる裂地候補(初期セット。ダミー)----
// uses: 用途(どの部位向けか)。grade: 等級キー(FABRIC_GRADES の key)。
// 画像は assets/fabrics/ の同梱 SVG(ダミー)を流用。各裂地の等級割り当ては運営が裏方で編集する想定(仮割り当て)。
const FABRIC_CATALOG = [
  { id: "f01", file: "assets/fabrics/kinran_botan_karakusa.svg", name: "裂地 牡丹唐草(紺)", tileW: 70, tileH: 70, uses: ["ichimonji", "nakamawashi"], grade: "tokujou" },
  { id: "f02", file: "assets/fabrics/kinran_koaoi.svg", name: "裂地 小葵(海老茶)", tileW: 40, tileH: 40, uses: ["ichimonji", "nakamawashi"], grade: "tokujou" },
  { id: "f03", file: "assets/fabrics/kinran_unmon.svg", name: "裂地 雲文(茶)", tileW: 80, tileH: 60, uses: ["ichimonji", "nakamawashi"], grade: "tokujou" },
  { id: "f04", file: "assets/fabrics/kinran_shippou.svg", name: "裂地 七宝(緑青)", tileW: 50, tileH: 50, uses: ["ichimonji", "nakamawashi"], grade: "tokujou" },
  { id: "f05", file: "assets/fabrics/donsu_hanabishi.svg", name: "裂地 花菱(白茶)", tileW: 45, tileH: 45, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f06", file: "assets/fabrics/donsu_shippou.svg", name: "裂地 七宝(利休茶)", tileW: 40, tileH: 40, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f07", file: "assets/fabrics/donsu_kikkou.svg", name: "裂地 亀甲(金茶)", tileW: 35, tileH: 33, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f08", file: "assets/fabrics/donsu_tatewaku.svg", name: "裂地 立涌(白緑)", tileW: 60, tileH: 60, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f09", file: "assets/fabrics/seigaiha.svg", name: "裂地 青海波(藍)", tileW: 45, tileH: 45, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f10", file: "assets/fabrics/asanoha.svg", name: "裂地 麻の葉(桜鼠)", tileW: 35, tileH: 31, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f11", file: "assets/fabrics/ichimatsu.svg", name: "裂地 市松(墨)", tileW: 40, tileH: 40, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f12", file: "assets/fabrics/hishi_tsunagi.svg", name: "裂地 菱繋ぎ(紺鼠)", tileW: 40, tileH: 40, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f13", file: "assets/fabrics/uroko.svg", name: "裂地 鱗(紺×白)", tileW: 40, tileH: 40, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f14", file: "assets/fabrics/same_komon.svg", name: "裂地 鮫小紋(鉄紺)", tileW: 25, tileH: 25, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f15", file: "assets/fabrics/donsu_karahana.svg", name: "裂地 唐花(薄縹)", tileW: 40, tileH: 40, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f16", file: "assets/fabrics/kandou_shima.svg", name: "裂地 縞(茶×紺)", tileW: 50, tileH: 50, uses: ["nakamawashi", "tenchi"], grade: "joh" },
  { id: "f17", file: "assets/fabrics/muji_tsumugi.svg", name: "裂地 紬無地(生成)", tileW: 30, tileH: 30, uses: ["tenchi"], grade: "standard" },
  { id: "f18", file: "assets/fabrics/muji_kogecha.svg", name: "裂地 無地(焦茶)", tileW: 30, tileH: 30, uses: ["tenchi"], grade: "standard" },
  { id: "f19", file: "assets/fabrics/muji_tetsukon.svg", name: "裂地 無地(鉄紺)", tileW: 30, tileH: 30, uses: ["tenchi"], grade: "standard" },
  { id: "f20", file: "assets/fabrics/kin_muji.svg", name: "裂地 金無地(箔風)", tileW: 35, tileH: 35, uses: ["ichimonji"], grade: "standard" },
  { id: "cust_1781359351036", file: "assets/fabrics/custom_1781363792924.png", name: "小花紋", tileW: 40, tileH: 40, uses: ["tenchi","nakamawashi"], grade: "standard" },
];

// 裂地の等級加算額を引く(等級が未定義なら 0)。
function fabricSurcharge(fab) {
  if (!fab) return 0;
  const g = FABRIC_GRADES[fab.grade];
  return g ? g.surcharge : 0;
}
