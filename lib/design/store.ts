/**
 * デザインの保存先。本番は Netlify Blobs(ストア名 "designs")、手元の `next dev` では .design-store/ フォルダ。
 * 保存するのは、読み取り結果・指示文・部位の寸法・作った天地の画像と、評価用の小さな見本(写真を含む縮小画像。
 * 2026-10-02 本人決定「小さい見本だけ保存する。評価に使うため」)。写真を元の大きさで保存することはしない。
 *   idx/<作成日時>_<ID>(作成順の一覧のための目印)  lessons.json(職人の評価の記録。次の案づくりの見本)
 *   <ID>/preview.jpg(評価用の小さな見本)  <ID>/review.json(職人の評価)
 *   <ID>/meta.json(読み取り結果・案・寸法)  <ID>/ten.jpg(シミュレーターで見せた版)  <ID>/ten_raw.*(画像 AI の出力そのまま)
 *   <ID>/ten.json(清書用の指示文・モデル・切り抜き位置)  地も同じ
 *   <ID>/both.jpg・both_raw.*(天地をつなげて描いた 1 枚。切り分ける前)
 */
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), ".design-store");

async function blobStore() {
  try {
    const { getStore } = await import("@netlify/blobs");
    const s = getStore({ name: "designs", consistency: "strong" });
    await s.list({ prefix: "__probe__" }); // Netlify の外では使えないので、ここで確かめる
    return s;
  } catch {
    return null;
  }
}

export async function putFile(key: string, data: Buffer | string) {
  const s = await blobStore();
  if (s) {
    if (typeof data === "string") await s.set(key, data);
    else await s.set(key, new Blob([new Uint8Array(data)]));
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function getFile(key: string): Promise<Buffer | null> {
  const s = await blobStore();
  if (s) {
    const ab = await s.get(key, { type: "arrayBuffer" });
    return ab ? Buffer.from(ab) : null;
  }
  try {
    return await fs.readFile(path.join(LOCAL_DIR, key));
  } catch {
    return null;
  }
}

/** prefix で始まるキーの一覧(名前の順) */
export async function listKeys(prefix: string): Promise<string[]> {
  const s = await blobStore();
  if (s) {
    const { blobs } = await s.list({ prefix });
    return blobs.map((b) => b.key).sort();
  }
  const dir = path.join(LOCAL_DIR, prefix.replace(/\/[^/]*$/, ""));
  try {
    const base = prefix.slice(0, prefix.lastIndexOf("/") + 1);
    return (await fs.readdir(dir)).map((n) => base + n).filter((k) => k.startsWith(prefix)).sort();
  } catch {
    return [];
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const b = await getFile(key);
  return b ? (JSON.parse(b.toString("utf8")) as T) : null;
}

/** 見間違えにくい文字だけのデザイン番号(例 KP-7K3M2Q) */
export function newDesignId() {
  const A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "KP-" + Array.from(bytes, (b) => A[b % A.length]).join("");
}

export type DesignMeta = {
  id: string;
  createdAt: string;
  brief: {
    ok: boolean;
    scene_ja: string;
    subject: string;
    colors: { name_ja: string; hex: string }[];
    concept_ja: string;
    ten_prompt: string;
    chi_prompt: string;
    season?: string;
    mitate_ja?: string;
    include_subject?: boolean;
  };
  // 2 案のどちらか(blend = 写真になじませる / echo = 写真の差し色を拾う。lift = 写真を引き立てる は 2026-10-08 までの案)と、同時に作ったもう一方の番号
  variant?: "blend" | "lift" | "echo";
  pair?: string;
  // 計算で決めた色(lib/design/color.ts)と、写真を測った数値(写真そのものではない)
  palette?: { base: string; naka: string; accent: string | null };
  photo?: { dominant: string; accent: string | null; edgeL: number; meanC: number; colorfulness: number };
  picked?: boolean; // お客様が 2 案からこちらを選んだ
  // お客様の要望(要望の画面。おまかせなら空)
  wishes?: { mood?: string; tone?: string; density?: string; note?: string };
  parts: { ten: { wMm: number; hMm: number; aspect: string }; chi: { wMm: number; hMm: number; aspect: string } };
  // 職人が清書したら付ける(注文に使ったもの)。付いていないものは作成から 1 年で消す(netlify/functions/design-cleanup.mts)
  ordered?: boolean;
  orderedAt?: string;
};
