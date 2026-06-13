// pricing.js — 価格計算ロジック(catalog.js のデータに基づく)。
// 合計 = サイズ価格 + 裂地加算(合計) + 箱。内訳を足し合わせる構造にしておく
//   (スプリント1では裂地加算=0・箱=0 でも、関数は内訳合算の形を保つ)。

// 自由サイズ(幅・高さ mm)→ 収まる最小の定型枠に切り上げてサイズ価格を返す。
// 戻り値: { ok: true, tierId, label, price } か { ok: false, reason }
//   reason: "empty"(空・0以下) / "over"(A3 超過)
// 判定: 入力の幅・高さの両方が枠の w・h 以内なら「収まる」。
//   ※スプリント1の仮実装は「入力した向きのまま」で判定する(回転・縦横入れ替えはしない。本人確認項目 7-5)。
function priceForFreeSize(w, h) {
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
    return { ok: false, reason: "empty" };
  }
  // A3 上限チェック(最大枠を超えたら拒否)。境界(ちょうど A3)は許可。
  if (w > MAX_TIER.w || h > MAX_TIER.h) {
    return { ok: false, reason: "over" };
  }
  // 小さい枠から順に「収まる」最初の枠を採用(= 切り上げ)。
  for (const tier of SIZE_TIERS) {
    if (w <= tier.w && h <= tier.h) {
      return { ok: true, tierId: tier.id, label: tier.label, price: tier.price };
    }
  }
  // ここには来ない想定(A3 以内なら必ずどれかに収まる)。保険で最大枠。
  return { ok: true, tierId: MAX_TIER.id, label: MAX_TIER.label, price: MAX_TIER.price };
}

// 定型(A4/A3)のサイズ価格を返す。
function priceForFixed(sizeKey) {
  const s = FIXED_SIZES[sizeKey];
  return s ? s.price : 0;
}

// 割り当て済み裂地から等級加算の合計を返す(各部位ぶん合算 = 仮実装の方針)。
// assignments: { layoutKey: fabricId }, fabrics: 裂地配列。
// 重複加算を避けるため、同一 layoutKey 群(連動部位)で 1 つの裂地につき 1 回だけ数える。
//   ここでは「割り当てキーごと」に等級加算を足す簡易方式(部位ごとに加算)。
function fabricSurchargeTotal(assignments, fabrics) {
  let total = 0;
  Object.keys(assignments || {}).forEach((key) => {
    const id = assignments[key];
    const fab = (fabrics || []).find((f) => f.id === id);
    total += fabricSurcharge(fab);
  });
  return total;
}

// 合計とその内訳を計算する。
// args: { sizePrice, assignments, fabrics, boxKey }
// 戻り値: { size, fabric, box, total }
function computeTotal(args) {
  const sizePrice = args.sizePrice || 0;
  // スプリント2: 裂地加算と箱を合計に反映する。
  const fabric = fabricSurchargeTotal(args.assignments, args.fabrics);
  const box = args.boxKey && BOX_OPTIONS[args.boxKey] ? BOX_OPTIONS[args.boxKey].surcharge : 0;
  // 仕立てオプション(風帯あり 等)の加算。
  const option = args.optionSurcharge || 0;
  const total = sizePrice + fabric + box + option;
  return { size: sizePrice, fabric: fabric, box: box, option: option, total: total };
}

// 価格を「¥46,000」形式に整形。
function formatYen(n) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}
