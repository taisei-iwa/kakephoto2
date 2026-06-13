// 表装形式プリセット + 本紙寸法 → 各部位の領域(mm 単位の矩形)を算出する。
// 戻り値の矩形は { x, y, w, h }(mm)。原点は掛軸全体の左上。
// 部位領域は重なり・隙間なく組み上がるように積算する。
//
// レイアウト構造(縦方向に上→下):
//   天 / 中廻し上 / 一文字上 / 本紙 / 一文字下 / 中廻し下 / 地
// 左右方向:
//   [明朝縁(左)] 柱(左) / [一文字・本紙の縦帯] / 柱(右) [明朝縁(右)]
//   ※柱は本紙〜一文字の高さ範囲に通す。明朝縁は全高(明朝仕立てのみ)。
// 風帯:
//   天の領域に上から垂れる 2 本の細い帯(プレビュー上の見え)
//
// 形式による構造の違い(preset.parts):
//   nakamawashi: false … 中廻しの段を持たない(丸表装・明朝仕立て)
//   heri: true         … 左右両端に細い明朝縁(全高)を持つ(明朝仕立て)
//
// 軸棒・八双・軸先はプレビューの装飾(レイアウト矩形には含めず renderer 側で上下端に描く)。

// opts: { noIchimonji: 一文字なし, noFuutai: 風帯なし }(省略可)。
// 部位を抜いても他の部位の寸法は通常どおり(比率の連鎖は崩さない)。
function computeLayout(preset, honshiW, honshiH, opts) {
  opts = opts || {};
  const r = preset.ratios;
  const pp = preset.parts || {};
  const hasNaka = pp.nakamawashi !== false;

  // 裂地(表装)の寸法は本紙の向きで変わらない(本人ルール: 裂地は同じ・本紙のみ縦横入替)。
  // そこで高さ系は本紙の「長辺」、柱・縁の幅は「短辺」を基準にする。
  //   縦向きでは長辺=honshiH・短辺=honshiW なので従来と同じ。横向きでも裂地寸法が一定になる。
  const longSide = Math.max(honshiW, honshiH);
  const shortSide = Math.min(honshiW, honshiH);

  // --- 高さ方向の各寸法(mm) ---
  const ichimonjiTotal = longSide * r.ichimonjiTotalOfHonshiH;
  const ichiSum = r.ichimonjiTopRatio + r.ichimonjiBottomRatio;
  const ichimonjiTop = ichimonjiTotal * (r.ichimonjiTopRatio / ichiSum);
  const ichimonjiBottom = ichimonjiTotal * (r.ichimonjiBottomRatio / ichiSum);

  const nakaShita = hasNaka ? ichimonjiTotal * r.nakaShitaOfIchimonjiTotal : 0; // 中廻し下高
  const nakaUe = hasNaka ? nakaShita * r.nakaUeOfNakaShita : 0; // 中廻し上高

  // 地: 中廻し連鎖(地 = 中廻し上下合計)か、本紙長辺基準の直接指定
  const chi = r.chiOfHonshiH != null ? longSide * r.chiOfHonshiH : nakaUe + nakaShita;
  const ten = chi * r.tenOfChi; // 天

  // --- 幅方向 ---
  const hashiraW = r.hashiraOfHonshiW != null
    ? shortSide * r.hashiraOfHonshiW
    : nakaShita * r.hashiraOfNakaShita; // 柱(片側)幅
  const heriW = r.heriOfHonshiW != null && pp.heri ? shortSide * r.heriOfHonshiW : 0; // 明朝縁(片側)幅
  const totalW = honshiW + hashiraW * 2 + heriW * 2; // 掛軸全体幅
  const bodyX = heriW; // 明朝縁の内側(本体)の左端
  const bodyW = totalW - heriW * 2; // 本体幅
  const fuutaiW = totalW * r.fuutaiOfTotalW; // 風帯幅

  // --- 縦の積み上げ(y 座標) ---
  let y = 0;
  const parts = {};

  // 天(本体幅)
  parts.ten = { x: bodyX, y, w: bodyW, h: ten, name: "天", part: "ten" };
  y += ten;

  // 中廻し上(本体幅)
  if (hasNaka) {
    parts.nakaUe = { x: bodyX, y, w: bodyW, h: nakaUe, name: "中廻し上", part: "nakamawashi" };
    y += nakaUe;
  }

  // ここから本紙帯(柱に挟まれる範囲): 一文字上 / 本紙 / 一文字下
  const bandTop = y;
  const innerX = bodyX + hashiraW; // 中央帯の左端
  const innerW = honshiW; // 中央帯の幅 = 本紙幅

  if (!opts.noIchimonji) {
    parts.ichimonjiUe = { x: innerX, y, w: innerW, h: ichimonjiTop, name: "一文字上", part: "ichimonji" };
    y += ichimonjiTop;
  }

  parts.honshi = { x: innerX, y, w: innerW, h: honshiH, name: "本紙", part: "honshi" };
  y += honshiH;

  if (!opts.noIchimonji) {
    parts.ichimonjiShita = { x: innerX, y, w: innerW, h: ichimonjiBottom, name: "一文字下", part: "ichimonji" };
    y += ichimonjiBottom;
  }

  const bandBottom = y;
  const bandH = bandBottom - bandTop;

  // 柱(左右): 本紙帯の高さ範囲に通す
  parts.hashiraLeft = { x: bodyX, y: bandTop, w: hashiraW, h: bandH, name: "柱(左)", part: "hashira" };
  parts.hashiraRight = { x: innerX + innerW, y: bandTop, w: hashiraW, h: bandH, name: "柱(右)", part: "hashira" };

  // 中廻し下(本体幅)
  if (hasNaka) {
    parts.nakaShita = { x: bodyX, y, w: bodyW, h: nakaShita, name: "中廻し下", part: "nakamawashi" };
    y += nakaShita;
  }

  // 地(本体幅)
  parts.chi = { x: bodyX, y, w: bodyW, h: chi, name: "地", part: "chi" };
  y += chi;

  const totalH = y;

  // 明朝縁(左右・全高)
  if (heriW > 0) {
    parts.heriLeft = { x: 0, y: 0, w: heriW, h: totalH, name: "縁(左)", part: "heri" };
    parts.heriRight = { x: totalW - heriW, y: 0, w: heriW, h: totalH, name: "縁(右)", part: "heri" };
  }

  // 風帯(2本): 天の上端から垂れ、下端は中廻し上の上端(=天の下端)に揃える。
  if (!opts.noFuutai) {
    const fuutaiGap = totalW * 0.18; // 中央寄りに2本配置(仮の見え方)
    const fuutaiLeftX = totalW / 2 - fuutaiGap - fuutaiW;
    const fuutaiRightX = totalW / 2 + fuutaiGap;
    const fuutaiH = ten;
    parts.fuutaiLeft = { x: fuutaiLeftX, y: 0, w: fuutaiW, h: fuutaiH, name: "風帯(左)", part: "fuutai" };
    parts.fuutaiRight = { x: fuutaiRightX, y: 0, w: fuutaiW, h: fuutaiH, name: "風帯(右)", part: "fuutai" };
  }

  return { totalW, totalH, parts };
}
