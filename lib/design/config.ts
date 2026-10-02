/**
 * 「写真に合わせてデザインする」(オーダーシミュレーター)の設定。
 * 写真を読み取り → 天地の物語を決め → 天・地の絵を作る。注文が決まったら職人が別の手順で 4K に清書して印刷する。
 *
 * 指示文には、試作で本人が出した判断を決まりとして入れてある(2026-10-02):
 * - 写真の主役を天地で絵として繰り返さない(花火の写真の天に花火を描くと安っぽい)
 * - 和紙のちり(繊維・粒)は入れない。紙の縁(漉き耳)を描かない。四辺はまっすぐ
 * - 天から地へ物語がつながる(月と水面の映り込み、風が運ぶ花びらと浜の貝 など)
 */

// 写真の読み取り(画像を受け付ける一番安いモデル)と、天地の絵(Nano Banana 2 Lite)
export const ANALYZE_MODEL = "gemini-3.5-flash-lite";
export const IMAGE_MODEL = "gemini-3.1-flash-lite-image";

// 画像 AI が出せる縦横比。部位の縦横比にいちばん近いものを選ぶ
export const ASPECTS: [string, number][] = [
  ["1:1", 1], ["5:4", 1.25], ["4:3", 4 / 3], ["3:2", 1.5], ["16:9", 16 / 9], ["21:9", 21 / 9],
  ["4:5", 0.8], ["3:4", 0.75], ["2:3", 2 / 3], ["9:16", 9 / 16],
];

export function nearestAspect(ratio: number): string {
  let best = ASPECTS[0];
  for (const a of ASPECTS) if (Math.abs(Math.log(a[1] / ratio)) < Math.abs(Math.log(best[1] / ratio))) best = a;
  return best[0];
}

// 天・地の絵に必ず付ける共通の指示
export const STYLE =
  "Flat printed design for a Japanese hanging scroll mounting, Japanese woodblock print and katazome stencil-dye feeling, " +
  "quiet and elegant, generous empty space. Slight color misregistration and gentle uneven ink, hand-made irregular lines. " +
  "Smooth clean paper with no fibers, no specks, no flecks, no dust. " +
  "No photographic realism, no glow effects, no gloss, no 3D, no drop shadows, no people, no faces, no text, no letters, no logo, " +
  "no frame, no border, no hanging scroll, no mockup. " +
  "The entire image is the design itself in the requested format: no white background, no paper card, no mat, " +
  "no photo of a print lying on a table. Fill the whole canvas edge to edge. The paper is already trimmed: clean straight cut edges " +
  "on all four sides, no torn edges, no deckled edges, no fold lines, no vertical seams, no white margin.";

// 写真の読み取りと、天地の案づくり(1 回の呼び出しで JSON を返させる)
export const ANALYZE_PROMPT = `You design the printed paper mounting (the top panel "ten" and the bottom panel "chi") of a Japanese hanging scroll (kakejiku) whose center is the customer's photo.
Look at the photo and return JSON only.

Rules for the design:
1. The photo is the star. NEVER draw the photo's main subject again in ten or chi (a fireworks photo gets no fireworks; a flower photo gets no copy of that flower; never draw people or pets). Use what the subject implies instead: the setting, the season, the air, a symbolic traditional motif.
2. Tell one quiet story from ten (top: sky, distance, above) to chi (bottom: ground, water, near, below) that links the two (for example: a moon in ten and its reflection on water in chi; petals carried by the wind in ten landing beside a pair of clam shells on the shore in chi).
3. Elegant and restrained, like a fine traditional Japanese painting or katazome print. Lots of empty space. Few motifs. Avoid cheap clip-art, avoid cliches unless they truly fit the photo.
4. Colors come from the photo and are named as traditional Japanese colors (for example kon, ai, torinoko, taikou, wasurenagusa, suou, yamabuki, wakatake, nezumi).
5. Ten: keep the key motif near the horizontal center, or leave it almost empty; avoid important motifs at about one quarter and three quarters of the width (narrow vertical ribbons hang there). Chi: keep motifs within the vertical middle band.
6. If the photo shows nudity, violence, or anything unsuitable for a family keepsake, set "ok" to false.

JSON fields:
- "ok": boolean
- "scene_ja": the photo in one short Japanese sentence (what, where, season, mood)
- "subject": the photo's main subject in English (what must NOT be drawn)
- "colors": 3 to 5 items, each {"name_ja": traditional color name in Japanese, "hex": "#rrggbb"}
- "concept_ja": the design in Japanese, exactly in the form "天：…／地：…", each side at most 18 characters, plain description of what is drawn (no sales talk, no claims about craftsmen)
- "ten_prompt": English instruction for the ten image (scene, motifs, positions, colors). Do not mention the photo's subject except as something to avoid.
- "chi_prompt": English instruction for the chi image, continuing the story from ten.
- "naka_hex": "#rrggbb" a calm solid paper color for the middle band (nakamawashi) around the photo that harmonizes with both ten and chi and does not compete with the photo.`;

export const ANALYZE_SCHEMA = {
  type: "OBJECT",
  properties: {
    ok: { type: "BOOLEAN" },
    scene_ja: { type: "STRING" },
    subject: { type: "STRING" },
    colors: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { name_ja: { type: "STRING" }, hex: { type: "STRING" } }, required: ["name_ja", "hex"] },
    },
    concept_ja: { type: "STRING" },
    ten_prompt: { type: "STRING" },
    chi_prompt: { type: "STRING" },
    naka_hex: { type: "STRING" },
  },
  required: ["ok", "scene_ja", "subject", "colors", "concept_ja", "ten_prompt", "chi_prompt", "naka_hex"],
};

export function partPrompt(
  part: "ten" | "chi",
  brief: { ten_prompt: string; chi_prompt: string; subject: string; colors: { name_ja: string; hex: string }[] },
  aspect: string
) {
  // 部位の実際の縦横比をそのまま伝える(「横長」と書くと、正方形の画像の中に横長の台紙を描いてしまう)
  const canvas = `The design fills the whole ${aspect} canvas from edge to edge. `;
  const head =
    part === "ten"
      ? "Top panel (ten) of a Japanese hanging scroll mounting. " + canvas
      : "Bottom panel (chi) of the same hanging scroll mounting, continuing the story from the top panel. " + canvas;
  const colors = brief.colors.map((c) => `${c.name_ja} ${c.hex}`).join(", ");
  return (
    head +
    (part === "ten" ? brief.ten_prompt : brief.chi_prompt) +
    ` Absolutely do not draw: ${brief.subject}, people. Colors: ${colors}. ` +
    STYLE
  );
}
