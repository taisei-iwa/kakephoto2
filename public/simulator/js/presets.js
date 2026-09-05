// 表装形式プリセット定義。
// 重要: 仕様 0.1 の寸法比率は「定説ベースの仮値・本人確認待ち」。
// ここでは確定値としてハードコードせず、編集可能なプリセットデータとして持つ。
// プリセットを差し替えれば別形式・別比率を後続スプリントで追加できる構造にしてある。
//
// 寸法の決め方(スプリント1の三段表装・行):
//   本紙(幅 honshiW × 高さ honshiH)を入力値として受け取り、
//   各部位の寸法を下記 ratios から算出する。すべて本紙基準の係数。
//
//   高さ方向(上→下に積む):
//     一文字 上下合計 = 本紙高 × ichimonjiTotalOfHonshiH (仮値)
//       上 : 下 = ichimonjiTopRatio : ichimonjiBottomRatio
//     中廻し下 = 一文字上下合計      (= 一文字合計)
//     中廻し上 = 中廻し下 × 2
//     地 = 中廻し(上+下)合計
//     天 = 地 × tenOfChi
//   幅方向:
//     柱(左右)幅 = 中廻し下高 × hashiraOfNakaShita  (中廻し下と同等〜やや狭い)
//     掛軸全体幅 = 本紙幅 + 柱左右
//     風帯幅 = 掛軸全体幅 × fuutaiOfTotalW
//
// 注: 数値はいずれも仮値。UI からの比率編集(F7)は後続スプリントだが、
//     データ構造としてはここを書き換えるだけで差し替え可能。
//
// 拡張キー(形式によって使う):
//   parts.nakamawashi: false … 中廻しを持たない形式(丸表装・明朝仕立て)
//   parts.heri: true         … 左右両端の細い縁(明朝縁)を持つ形式
//   ratios.ichimonjiTopMm / ichimonjiBottomMm … 一文字の上/下を mm 固定(本紙比に優先。2026-09-05 本人確認)
//   ratios.chiOfIchimonjiTotal … 地 = 一文字合計 × 係数(中廻しを持たない形式用。chiOfHonshiH に優先)
//   ratios.hashiraMm / heriMm  … 柱幅 / 明朝縁幅を mm 固定(比率指定に優先)
//   ratios.chiOfHonshiH      … 地 = 本紙高 × 係数(中廻し連鎖を使わない形式用)
//   ratios.hashiraOfHonshiW  … 柱幅 = 本紙幅 × 係数(同上)
//   ratios.heriOfHonshiW     … 明朝縁幅 = 本紙幅 × 係数
//   defaults                 … 形式選択時のチェックボックス初期値(一文字なし/風帯なし)
//   linkGroups               … 裂地割り当てのセット連動(例: { fuutai: "ichimonji" } = 風帯は一文字とセット)
//   hidden: true             … 形式一覧に出さない内部プリセット(丸表装の「明朝仕立て」トグルが参照)

const FORMAT_PRESETS = [
  {
    id: "santan-gyo",
    label: "三段表装(スタンダード)",
    status: "confirmed", // 2026-09-05 本人確認: 一文字上≈1寸固定、以降は基本ルールの連鎖。
    note: "一文字上30mm/下20mm(3:2)固定 → 中廻し下=一文字合計 → 中廻し上=その2倍 → 地=中廻し上下合計 → 天=地×2 → 柱=中廻し下。",
    linkGroups: { fuutai: "ichimonji", hashira: "nakamawashi" }, // 風帯=一文字、柱=中廻しとセット
    // 部位の有無(後続の別形式追加時に使う想定)
    parts: {
      ichimonji: true, // 一文字(上下)
      nakamawashi: true, // 中廻し(上下)
      hashira: true, // 柱(左右)
      ten: true, // 天
      chi: true, // 地
      fuutai: true, // 風帯(2本)
    },
    ratios: {
      // 一文字は本紙の大きさに比例させず mm 固定(かけフォトでは上が約1寸を超えることはほぼ無い・本人)。
      ichimonjiTopMm: 30, // 一文字上 = 1寸
      ichimonjiBottomMm: 20, // 一文字下(上:下 = 3:2)
      nakaShitaOfIchimonjiTotal: 1, // 中廻し下 = 一文字合計
      nakaUeOfNakaShita: 2, // 中廻し上 = 中廻し下×2
      // 地は chiOfHonshiH を指定しない → 中廻し上下合計
      tenOfChi: 2, // 天 = 地×2(関東式)
      hashiraOfNakaShita: 1, // 柱幅 = 中廻し下(これより太くなることは無い・本人)
      fuutaiOfTotalW: 0.04, // 風帯幅 = 全幅/25 相当
    },
  },
  {
    id: "chagake",
    label: "茶掛(茶道スタイル)",
    status: "confirmed", // 高さ各部は三段と同じ(本人)。柱だけ細身。
    note: "高さ各部は三段表装と同じ連鎖。柱は本来3.5分相当の細身(mm 固定)。",
    linkGroups: { fuutai: "ichimonji", hashira: "nakamawashi" }, // 風帯=一文字、柱=中廻しとセット
    parts: {
      ichimonji: true,
      nakamawashi: true,
      hashira: true,
      ten: true,
      chi: true,
      fuutai: true,
    },
    ratios: {
      ichimonjiTopMm: 30,
      ichimonjiBottomMm: 20,
      nakaShitaOfIchimonjiTotal: 1,
      nakaUeOfNakaShita: 2,
      tenOfChi: 2,
      hashiraMm: 10.5, // 茶掛の柱は 3.5分(≈10.5mm)の細身
      fuutaiOfTotalW: 0.04,
    },
  },
  {
    id: "maru",
    label: "袋表具(シンプル)",
    status: "provisional",
    note: "一文字以外を 1 種の裂で覆う形式。中廻しが無く、天地と柱は同じ裂(本人ルール)。",
    linkGroups: { hashira: "tenchi" }, // 柱=天地とセット(袋表具は天地と柱が同じ裂)
    parts: {
      ichimonji: true,
      nakamawashi: false, // 中廻しの区切りを持たない
      hashira: true,
      ten: true,
      chi: true,
      fuutai: true,
    },
    defaults: { noFuutai: true }, // 風帯は省略されることが多い(要確認)
    ratios: {
      ichimonjiTopMm: 30,
      ichimonjiBottomMm: 20,
      // 天地の合計は「三段の天地+中廻し(=一文字合計×12)より若干短い」(本人 2026-09-05)。
      // 地 = 一文字合計×3.6 → 天地合計 = 一文字合計×10.8(三段比 9割)。仮置き。
      chiOfIchimonjiTotal: 3.6,
      tenOfChi: 2,
      hashiraOfNakaShita: 1, // 柱幅 = 一文字合計(三段の中廻し下と同じ太さ)
      fuutaiOfTotalW: 0.04,
    },
  },
  {
    id: "mincho",
    label: "明朝仕立て",
    hidden: true, // 形式一覧には出さない(丸表装の「明朝仕立て」チェックで切り替え)
    status: "provisional",
    note: "袋表装の左右両端に細い明朝縁(約 1cm)を通した形式。天地と柱は同じ裂(本人ルール)。",
    linkGroups: { hashira: "tenchi" }, // 柱=天地とセット
    parts: {
      ichimonji: true,
      nakamawashi: false,
      hashira: true,
      ten: true,
      chi: true,
      fuutai: true,
      heri: true, // 明朝縁(左右・全高)
    },
    defaults: { noIchimonji: true, noFuutai: true }, // 文人系の簡素な既定(要確認)
    ratios: {
      ichimonjiTopMm: 30,
      ichimonjiBottomMm: 20,
      chiOfIchimonjiTotal: 3.6, // 袋表具と同じ(仮置き)
      tenOfChi: 2,
      hashiraOfNakaShita: 1,
      heriMm: 10, // 明朝縁 約1cm
      fuutaiOfTotalW: 0.04,
    },
  },
];

// プリセット取得ヘルパ
function getPreset(id) {
  return FORMAT_PRESETS.find((p) => p.id === id) || null;
}
