/**
 * デザインの保存先。本番は Netlify Blobs(ストア名 "designs")、手元の `next dev` では .design-store/ フォルダ。
 * 保存するのは、読み取り結果・指示文・部位の寸法と、作った天地の画像だけ。お客様の写真は保存しない。
 *   <ID>/meta.json(読み取り結果・案・寸法)  <ID>/ten.jpg(シミュレーターで見せた版)  <ID>/ten_raw.*(画像 AI の出力そのまま)
 *   <ID>/ten.json(使った指示文・モデル・切り抜き位置)  地も同じ
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
    naka_hex: string;
  };
  parts: { ten: { wMm: number; hMm: number; aspect: string }; chi: { wMm: number; hMm: number; aspect: string } };
  // 職人が清書したら付ける(注文に使ったもの)。付いていないものは作成から 1 年で消す(netlify/functions/design-cleanup.mts)
  ordered?: boolean;
  orderedAt?: string;
};
