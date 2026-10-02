/**
 * 「写真に合わせてデザインする」で保管したデザインのうち、注文に使われなかったもの(meta.ordered が無い)を
 * 作成から 1 年で消す。毎日 1 回動く(Netlify の定期実行)。2026-10-02 本人決定「1 年でよい」。
 * プライバシーポリシー第 7 条「ご注文に使われなかったものは、作成から1年を目安に削除します」に対応。
 */
import { getStore } from "@netlify/blobs";

const KEEP_DAYS = 365;

export default async () => {
  const store = getStore({ name: "designs", consistency: "strong" });
  const { directories } = await store.list({ directories: true });
  const limit = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const dir of directories) {
    const meta = (await store.get(`${dir}/meta.json`, { type: "json" })) as { createdAt?: string; ordered?: boolean } | null;
    if (meta?.ordered) continue;
    const created = meta?.createdAt ? Date.parse(meta.createdAt) : 0;
    if (meta && created > limit) continue; // 1 年たっていない(meta の無い壊れたものは消す)
    const { blobs } = await store.list({ prefix: `${dir}/` });
    for (const b of blobs) await store.delete(b.key);
    removed++;
  }
  console.log(`design-cleanup: ${removed} 件を削除`);
};

export const config = { schedule: "@daily" };
