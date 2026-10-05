// pricing.js — 価格計算ロジック(catalog.js のデータに基づく)。
// 合計 = サイズ価格 + 裂地加算(合計) + 箱。内訳を足し合わせる構造にしておく
//   (スプリント1では裂地加算=0・箱=0 でも、関数は内訳合算の形を保つ)。

// 自由サイズ(幅・高さ mm)→ 収まる最小の定型枠に切り上げてサイズ価格を返す。
// 戻り値: { ok: true, tierId, label, price } か { ok: false, reason }
//   reason: "empty"(空・0以下) / "over"(A3 超過)
// 判定: 向きは問わない。入力の長い辺が枠の長い辺以内、短い辺が枠の短い辺以内なら「収まる」
//   (定型の A4/A3 が縦横どちらでも同じ値段なのと揃える)。
//   2026-10-06 修正: 以前は入力した向きのまま横長の枠と比べていたため、縦長(例 210×297)が一つ上の枠の値段になり、
//   A3 の縦(297×420)は「大きすぎる」と断っていた。
function priceForFreeSize(w, h) {
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
    return { ok: false, reason: "empty" };
  }
  const long = Math.max(w, h), short = Math.min(w, h);
  const fits = (tier) => long <= Math.max(tier.w, tier.h) && short <= Math.min(tier.w, tier.h);
  // A3 上限チェック(最大枠を超えたら拒否)。境界(ちょうど A3)は許可。
  if (!fits(MAX_TIER)) {
    return { ok: false, reason: "over" };
  }
  // 小さい枠から順に「収まる」最初の枠を採用(= 切り上げ)。
  for (const tier of SIZE_TIERS) {
    if (fits(tier)) {
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

// 割り当て済み裂地から等級加算の合計を返す。
// assignments: { layoutKey: fabricId }, fabrics: 裂地配列。
// groups: effectiveGroups() の戻り値(任意)。渡された場合は「部位グループごと」に
//   等級加算を 1 回だけ数える(本人確定の課金方針):
//     中廻し+柱 = セットで +¥3,000 / 天地 = セットで +¥3,000 / 一文字(上下+風帯) = セットで加算。
//   連動して親に併合された子グループ(linkedInto あり)は親側で 1 回だけ数える。
// groups 未指定のときは後方互換で「割り当てキーごと」に加算する。
function fabricSurchargeTotal(assignments, fabrics, groups) {
  assignments = assignments || {};
  fabrics = fabrics || [];
  const findFab = (id) => fabrics.find((f) => f.id === id);
  if (groups) {
    let total = 0;
    Object.keys(groups).forEach((gk) => {
      const g = groups[gk];
      if (g.linkedInto) return; // 子グループは親グループで数える
      // グループ内で割り当てのあるキーの裂地を 1 回だけ加算する。
      for (const k of g.keys) {
        if (assignments[k]) { total += fabricSurcharge(findFab(assignments[k])); break; }
      }
    });
    return total;
  }
  let total = 0;
  Object.keys(assignments).forEach((key) => { total += fabricSurcharge(findFab(assignments[key])); });
  return total;
}

// 合計とその内訳を計算する。
// args: { sizePrice, assignments, fabrics, boxKey }
// 戻り値: { size, fabric, box, total }
function computeTotal(args) {
  const sizePrice = args.sizePrice || 0;
  // スプリント2: 裂地加算と箱を合計に反映する。
  const fabric = fabricSurchargeTotal(args.assignments, args.fabrics, args.groups);
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
