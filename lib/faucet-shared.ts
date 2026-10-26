// Cross-instance faucet counters. The in-memory WindowCounter only sees one serverless instance; this keeps the same
// sliding-window timestamps in a small key-value store that every instance can read (Vercel's Runtime Cache in
// production). It is best effort by design: reads and writes are not atomic and the store is a cache, so it can evict.
// Any store error degrades to the per-instance limits instead of failing the request.
import { createHash } from "node:crypto";

export interface SharedKV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options?: { ttl?: number; name?: string }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class SharedCounter {
  /** Number of store errors seen (for tests and logging); the limiter keeps working per instance when it grows. */
  errors = 0;
  constructor(
    private kv: SharedKV,
    private ns = "faucet",
  ) {}

  private key(name: string, id: string): string {
    // Hash the id so raw IPs and addresses are not stored as cache keys.
    return `${this.ns}:${name}:${createHash("sha256").update(id).digest("hex").slice(0, 32)}`;
  }

  private async read(k: string, windowMs: number, now: number): Promise<number[]> {
    const v = await this.kv.get(k);
    if (!Array.isArray(v)) return [];
    return v.filter((t): t is number => typeof t === "number" && now - t < windowMs).slice(-1000);
  }

  private async write(k: string, arr: number[], windowMs: number): Promise<void> {
    if (!arr.length) await this.kv.delete(k);
    else await this.kv.set(k, arr, { ttl: Math.max(1, Math.ceil(windowMs / 1000)), name: "faucet-limit" });
  }

  /** Milliseconds until another hit is allowed, or 0. A store error counts as 0 (fail open to the local limit). */
  async retryAfterMs(name: string, id: string, limit: number, windowMs: number, now: number): Promise<number> {
    try {
      const arr = await this.read(this.key(name, id), windowMs, now);
      if (arr.length < limit) return 0;
      return Math.max(1, arr[arr.length - limit] + windowMs - now);
    } catch {
      this.errors++;
      return 0;
    }
  }

  async add(name: string, id: string, windowMs: number, now: number): Promise<void> {
    try {
      const k = this.key(name, id);
      const arr = await this.read(k, windowMs, now);
      arr.push(now);
      await this.write(k, arr, windowMs);
    } catch {
      this.errors++;
    }
  }

  async remove(name: string, id: string, windowMs: number, stamp: number, now: number): Promise<void> {
    try {
      const k = this.key(name, id);
      const arr = await this.read(k, windowMs, now);
      const i = arr.lastIndexOf(stamp);
      if (i >= 0) arr.splice(i, 1);
      await this.write(k, arr, windowMs);
    } catch {
      this.errors++;
    }
  }
}

/** The production store, or null when shared limits are switched off (FAUCET_SHARED_LIMITS=off). */
export async function runtimeCacheCounter(): Promise<SharedCounter | null> {
  if (process.env.FAUCET_SHARED_LIMITS === "off") return null;
  try {
    const { getCache } = await import("@vercel/functions");
    // Falls back to an in-memory cache outside Vercel, which is the same as no sharing.
    return new SharedCounter(getCache({ namespace: "vaultchain-web" }) as unknown as SharedKV);
  } catch {
    return null;
  }
}
