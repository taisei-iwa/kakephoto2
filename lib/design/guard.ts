/**
 * デザインの窓口(/api/design/*)の入口の見張り。2026-10-10 本人「API の入口を締める」。
 * 画像 AI の料金はこちら持ちなので、サイトの外から大量に呼ばれて料金が膨らむのを防ぐ。
 *
 * 1. 呼び出し元: Origin(なければ Referer)が kakephoto.com か手元の開発環境のときだけ通す。
 *    ブラウザで他サイトに埋め込まれるのを断つ。プログラムからは偽れるので、本当の歯止めは 2。
 * 2. 回数の上限: 案づくり(analyze)の回数を、同じ相手ごと・サイト全体で数える。
 *    1 回の analyze で、文字の AI 1 回と画像の AI 2 回(render)が動く。render は analyze が作った番号でしか動かないので、
 *    analyze を数えれば全体が抑えられる。
 *    相手は IP をハッシュにしたもので見分ける(IP そのものは保存しない)。数えた記録は Netlify Blobs の別ストア "design-rate"。
 *    記録は前日より古いものを数えるたびに消す(プライバシーポリシー第7条「2日以内に削除」)。
 */
import { createHash } from "crypto";
import { NextResponse } from "next/server";

// 上限。普通のお客様は 1 人 2〜4 回ほど試す想定。数字はここだけで変えられる。
export const LIMITS = {
  perClientHour: 6, // 同じ相手、1 時間あたり
  perClientDay: 15, // 同じ相手、1 日あたり
  siteDay: 120, // サイト全体、1 日あたり(料金の天井)
};

const ALLOWED_HOSTS = new Set(["kakephoto.com", "www.kakephoto.com"]);
const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** 呼び出し元がサイト自身か。だめなら 403 の応答を返す */
export function checkOrigin(req: Request): NextResponse | null {
  const host = hostOf(req.headers.get("origin")) ?? hostOf(req.headers.get("referer"));
  if (host && (ALLOWED_HOSTS.has(host) || DEV_HOSTS.has(host))) return null;
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

function clientKey(req: Request): string {
  const ip =
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  return createHash("sha256").update("kakephoto-design:" + ip).digest("hex").slice(0, 16);
}

// 数えた記録の置き場。本番は Netlify Blobs、手元では動いている間だけのメモリー
type Counter = {
  get(k: string): Promise<number>;
  set(k: string, n: number): Promise<void>;
  /** 日付が cutoff(YYYY-MM-DD)より前の記録を消す */
  sweep(cutoff: string): Promise<void>;
};
// キーの 2 段目の先頭 10 文字が日付(c/<日時>/<相手>、site/<日付>)
const dayOfKey = (k: string) => (k.split("/")[1] || "").slice(0, 10);
const memory = new Map<string, number>();
const memoryCounter: Counter = {
  async get(k) { return memory.get(k) || 0; },
  async set(k, n) { memory.set(k, n); },
  async sweep(cutoff) { for (const k of [...memory.keys()]) if (dayOfKey(k) < cutoff) memory.delete(k); },
};
async function counter(): Promise<Counter> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const s = getStore({ name: "design-rate", consistency: "strong" });
    await s.list({ prefix: "__probe__" }); // Netlify の外では使えないので、ここで確かめる
    return {
      async get(k) { return Number(await s.get(k)) || 0; },
      async set(k, n) { await s.set(k, String(n)); },
      async sweep(cutoff) {
        const { blobs } = await s.list();
        await Promise.all(blobs.filter((b) => dayOfKey(b.key) < cutoff).map((b) => s.delete(b.key)));
      },
    };
  } catch {
    return memoryCounter;
  }
}

/**
 * 案づくりを 1 回数える。上限を超えていれば 429 の応答を返し、数えない。
 * 同時に来たときに 1〜2 回ずれることはあるが、料金の歯止めとしては十分。
 */
export async function takeDesignQuota(req: Request): Promise<NextResponse | null> {
  const now = new Date(Date.now() + 9 * 3600_000).toISOString(); // 日本時間で区切る
  const day = now.slice(0, 10);
  const hour = now.slice(0, 13);
  const who = clientKey(req);
  const keys = {
    hour: `c/${hour}/${who}`,
    day: `c/${day}/${who}`,
    site: `site/${day}`,
  };
  const c = await counter();
  const [h, d, s] = await Promise.all([c.get(keys.hour), c.get(keys.day), c.get(keys.site)]);
  if (s >= LIMITS.siteDay) return NextResponse.json({ error: "limit_site" }, { status: 429 });
  if (h >= LIMITS.perClientHour || d >= LIMITS.perClientDay) return NextResponse.json({ error: "limit" }, { status: 429 });
  await Promise.all([c.set(keys.hour, h + 1), c.set(keys.day, d + 1), c.set(keys.site, s + 1)]);
  // 前日より古い記録を消す(今日と前日の分だけ残る)。消すのに失敗しても依頼は通す
  const yesterday = new Date(Date.now() + 9 * 3600_000 - 24 * 3600_000).toISOString().slice(0, 10);
  await c.sweep(yesterday).catch(() => {});
  return null;
}
