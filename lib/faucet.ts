// Devnet faucet logic, kept free of Next.js so it can be unit tested with a fake node.
// The faucet signs ordinary bank/Send transactions with a dedicated key (FAUCET_PRIVATE_KEY,
// server-side only). Nothing here is consensus: the chain does not know it is a faucet.
import { HttpError, type NodeClient } from "./vault/client";
import { DENOM } from "./vault/config";
import { submitMsgs, type Signer } from "./vault/flows";
import { DEFAULT_FEE } from "./vault/tx";
import { isValidAddress } from "./vault/keys";

export const UVAULT_PER_VAULT = 1_000_000n;

export interface FaucetLimits {
  /** Amount sent per drip, in uvault. */
  dripUvault: bigint;
  /** Recipients holding this much or more are refused: the faucet is for empty accounts. */
  ceilingUvault: bigint;
  /** One drip per address per window. */
  addressWindowMs: number;
  /** Successful drips per client IP per window. */
  ipDrips: number;
  ipWindowMs: number;
  /** Requests of any outcome per client IP per window (stops probing the node through the faucet). */
  ipAttempts: number;
  ipAttemptWindowMs: number;
  /** Successful drips per server instance per window. */
  globalDrips: number;
  globalWindowMs: number;
  /** Never let the faucet's own balance drop below this (keeps fees payable). */
  reserveUvault: bigint;
}

const HOUR = 3_600_000;
export const DEFAULT_LIMITS: FaucetLimits = {
  dripUvault: 100n * UVAULT_PER_VAULT,
  ceilingUvault: 50n * UVAULT_PER_VAULT,
  addressWindowMs: 24 * HOUR,
  ipDrips: 3,
  ipWindowMs: 24 * HOUR,
  ipAttempts: 20,
  ipAttemptWindowMs: HOUR,
  globalDrips: 40,
  globalWindowMs: 24 * HOUR,
  reserveUvault: 10n * UVAULT_PER_VAULT,
};

/** Sliding-window counter keyed by string. In memory only: it resets on a cold start and is per instance. */
export class WindowCounter {
  private hits = new Map<string, number[]>();
  constructor(private maxKeys = 5_000) {}

  private prune(key: string, windowMs: number, now: number): number[] {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length) this.hits.set(key, arr);
    else this.hits.delete(key);
    return arr;
  }

  /** Milliseconds until another hit is allowed, or 0 if one is allowed now. */
  retryAfterMs(key: string, limit: number, windowMs: number, now: number): number {
    const arr = this.prune(key, windowMs, now);
    if (arr.length < limit) return 0;
    return Math.max(1, arr[arr.length - limit] + windowMs - now);
  }

  add(key: string, windowMs: number, now: number): number {
    if (!this.hits.has(key) && this.hits.size >= this.maxKeys) {
      for (const k of [...this.hits.keys()]) this.prune(k, windowMs, now);
      while (this.hits.size >= this.maxKeys) {
        const oldest = this.hits.keys().next().value;
        if (oldest === undefined) break;
        this.hits.delete(oldest);
      }
    }
    const arr = this.prune(key, windowMs, now);
    arr.push(now);
    this.hits.set(key, arr);
    return now;
  }

  remove(key: string, stamp: number): void {
    const arr = this.hits.get(key);
    if (!arr) return;
    const i = arr.lastIndexOf(stamp);
    if (i >= 0) arr.splice(i, 1);
    if (!arr.length) this.hits.delete(key);
  }

  get size(): number {
    return this.hits.size;
  }
}

export type DripResult =
  | { ok: true; status: 200; txHash: string; height: number; amountUvault: string; address: string; nextEligibleAt: number }
  | { ok: false; status: 400 | 409 | 429 | 502 | 503; code: string; error: string; retryAfterSeconds?: number };

type FaucetNode = Pick<NodeClient, "info" | "account" | "balance" | "submit" | "waitTx">;

export interface FaucetDeps {
  node: FaucetNode;
  signer: Signer;
  now?: () => number;
  limits?: Partial<FaucetLimits>;
}

function fail(status: 400 | 409 | 429 | 502 | 503, code: string, error: string, retryMs?: number): DripResult {
  return { ok: false, status, code, error, ...(retryMs ? { retryAfterSeconds: Math.ceil(retryMs / 1000) } : {}) };
}

export class Faucet {
  readonly limits: FaucetLimits;
  readonly address: string;
  private node: FaucetNode;
  private signer: Signer;
  private now: () => number;
  private byAddress = new WindowCounter();
  private byIp = new WindowCounter();
  private attempts = new WindowCounter();
  private global = new WindowCounter(2);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(deps: FaucetDeps) {
    this.node = deps.node;
    this.signer = deps.signer;
    this.now = deps.now ?? Date.now;
    this.limits = { ...DEFAULT_LIMITS, ...deps.limits };
    this.address = deps.signer.key.address;
  }

  /** Run `fn` after every earlier call has settled: one signing nonce at a time within an instance. */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async drip(rawAddress: string, rawIp: string): Promise<DripResult> {
    const L = this.limits;
    const ip = rawIp || "unknown";
    const address = String(rawAddress ?? "").trim().toLowerCase();
    if (!isValidAddress(address)) return fail(400, "invalid_address", 'Not a valid VaultChain address (expected "vault1…").');
    if (address === this.address) return fail(400, "invalid_address", "That is the faucet's own address.");

    const t = this.now();
    const attemptWait = this.attempts.retryAfterMs(ip, L.ipAttempts, L.ipAttemptWindowMs, t);
    if (attemptWait) return fail(429, "too_many_requests", "Too many requests from this network. Try again later.", attemptWait);
    this.attempts.add(ip, L.ipAttemptWindowMs, t);

    const addrWait = this.byAddress.retryAfterMs(address, 1, L.addressWindowMs, t);
    if (addrWait) return fail(429, "address_cooldown", "This address already received devnet funds recently.", addrWait);
    const ipWait = this.byIp.retryAfterMs(ip, L.ipDrips, L.ipWindowMs, t);
    if (ipWait) return fail(429, "ip_limit", "This network has reached the faucet limit for today.", ipWait);
    const globalWait = this.global.retryAfterMs("all", L.globalDrips, L.globalWindowMs, t);
    if (globalWait) return fail(429, "faucet_busy", "The faucet has reached its daily limit on this server. Try again later.", globalWait);

    // Reserve the slots first so concurrent requests cannot all pass the checks, give them back on failure.
    const sAddr = this.byAddress.add(address, L.addressWindowMs, t);
    const sIp = this.byIp.add(ip, L.ipWindowMs, t);
    const sAll = this.global.add("all", L.globalWindowMs, t);
    const release = () => {
      this.byAddress.remove(address, sAddr);
      this.byIp.remove(ip, sIp);
      this.global.remove("all", sAll);
    };

    try {
      return await this.serial(async (): Promise<DripResult> => {
        const { chainId } = await this.node.info();
        if (!/devnet/i.test(chainId)) return fail(503, "not_devnet", "The faucet only works on the devnet.");
        const [have, mine] = await Promise.all([this.node.balance(address, DENOM), this.node.balance(this.address, DENOM)]);
        if (have >= L.ceilingUvault) {
          release();
          return fail(409, "already_funded", `This address already holds ${L.ceilingUvault / UVAULT_PER_VAULT}+ VAULT. The faucet only tops up emptier accounts.`);
        }
        const fee = BigInt(DEFAULT_FEE[0].amount);
        if (mine < L.dripUvault + fee + L.reserveUvault) {
          release();
          return fail(503, "faucet_empty", "The faucet is out of funds. Ask the operator to top it up.");
        }
        const rec = await submitMsgs(this.node as NodeClient, this.signer, [
          { type: "bank/Send", to: address, amount: [{ denom: DENOM, amount: L.dripUvault.toString() }] },
        ]);
        return {
          ok: true,
          status: 200,
          txHash: rec.hash,
          height: rec.height,
          amountUvault: L.dripUvault.toString(),
          address,
          nextEligibleAt: t + L.addressWindowMs,
        };
      });
    } catch (e) {
      release();
      if (e instanceof HttpError && e.status === 429) return fail(503, "node_busy", "The node is rate limiting right now. Try again in a minute.");
      return fail(502, "node_error", "The devnet node did not accept the transfer. Try again in a minute.");
    }
  }
}

/** Client IP as set by the hosting edge. On Vercel the edge overwrites these headers, so they are not client-controlled. */
export function clientIp(h: { get(name: string): string | null }): string {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || "unknown";
}
