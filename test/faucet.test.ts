import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_LIMITS, Faucet, WindowCounter, clientIp } from "../lib/faucet";
import { HttpError } from "../lib/vault/client";
import { signerFromKey } from "../lib/vault/flows";
import { keyFromHex } from "../lib/vault/keys";
import { encodeMsg } from "../lib/vault/msgs";
import { signBytes, verifyTxSignature } from "../lib/vault/tx";
import { FaucetButton, fmtWait } from "../components/vault/faucet";
import { keyByName } from "./vectors";

const V = 1_000_000n;
const signer = signerFromKey(keyFromHex(keyByName("carol").priv_hex));
const A = keyByName("bob").address;
const B = keyByName("alice").address;
const fresh = (n: number) => keyByName("bob").address.slice(0, -4) + ["qqqq", "pppp", "zzzz"][n % 3]; // invalid checksum on purpose, replaced below

class FakeNode {
  balances = new Map<string, bigint>();
  nonce = 7;
  chainId = "vault-devnet-1";
  submitted: string[] = [];
  failSubmit: Error | null = null;
  calls = 0;
  async info() {
    return { chainId: this.chainId, height: 100 };
  }
  async account() {
    return { nonce: this.nonce, pending_nonce: this.nonce };
  }
  async balance(addr: string) {
    this.calls++;
    return this.balances.get(addr) ?? 0n;
  }
  async submit(raw: string) {
    if (this.failSubmit) throw this.failSubmit;
    this.submitted.push(raw);
    this.nonce++;
    return "h" + this.submitted.length;
  }
  async waitTx(hash: string) {
    return { hash, height: 101, ok: true, result: "ok" };
  }
}

function setup(limits = {}, t0 = 1_000_000) {
  const node = new FakeNode();
  node.balances.set(signer.key.address, 3000n * V);
  const clock = { t: t0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faucet = new Faucet({ node: node as any, signer, now: () => clock.t, limits });
  return { node, faucet, clock };
}

describe("faucet: validation", () => {
  it("rejects non-vault, malformed and own addresses without touching the node", async () => {
    const { node, faucet } = setup();
    for (const bad of ["", "cosmos1abc", "vault1qqqq", fresh(0), "not an address", signer.key.address]) {
      const r = await faucet.drip(bad, "1.1.1.1");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.status).toBe(400);
        expect(r.code).toBe("invalid_address");
      }
    }
    expect(node.submitted).toHaveLength(0);
    expect(node.calls).toBe(0);
  });
  it("normalises case and whitespace", async () => {
    const { faucet } = setup();
    const r = await faucet.drip("  " + A.toUpperCase() + " ", "1.1.1.1");
    expect(r.ok).toBe(true);
  });
  it("refuses anything that is not a devnet", async () => {
    const { node, faucet } = setup();
    node.chainId = "vault-mainnet-1";
    const r = await faucet.drip(A, "1.1.1.1");
    expect(r).toMatchObject({ ok: false, status: 503, code: "not_devnet" });
    expect(node.submitted).toHaveLength(0);
  });
});

describe("faucet: transaction construction", () => {
  it("signs a bank/Send of the drip with a valid fee, nonce, chain id and signature", async () => {
    const { node, faucet } = setup();
    const r = await faucet.drip(A, "1.1.1.1");
    expect(r).toMatchObject({ ok: true, status: 200, txHash: "h1", amountUvault: "100000000", address: A });
    const tx = JSON.parse(node.submitted[0]);
    expect(tx.chain_id).toBe("vault-devnet-1");
    expect(tx.nonce).toBe(7);
    expect(tx.pubkey).toBe(signer.key.pubHex);
    expect(tx.msgs).toEqual([{ type: "bank/Send", to: A, amount: [{ denom: "uvault", amount: "100000000" }] }]);
    expect(BigInt(tx.fee[0].amount)).toBeGreaterThanOrEqual(1000n);
    expect(tx.fee[0].denom).toBe("uvault");
    const sb = signBytes({
      chainId: tx.chain_id,
      nonce: tx.nonce,
      msgs: [encodeMsg({ type: "bank/Send", to: A, amount: [{ denom: "uvault", amount: "100000000" }] })],
      fee: tx.fee,
      pubHex: tx.pubkey,
    });
    expect(verifyTxSignature(signer.key.pubHex, sb, tx.sig)).toBe(true);
  });
  it("uses the node's pending nonce one request at a time", async () => {
    const { node, faucet } = setup();
    const addrs = [A, B];
    const rs = await Promise.all(addrs.map((a, i) => faucet.drip(a, `2.2.2.${i}`)));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(node.submitted.map((s) => JSON.parse(s).nonce)).toEqual(addrs.map((_, i) => 7 + i));
  });
});

describe("faucet: limits", () => {
  it("allows one drip per address per window, then again after it", async () => {
    const { faucet, clock, node } = setup();
    expect((await faucet.drip(A, "1.1.1.1")).ok).toBe(true);
    node.balances.set(A, 0n); // pretend it was spent
    const r = await faucet.drip(A, "9.9.9.9");
    expect(r).toMatchObject({ ok: false, status: 429, code: "address_cooldown" });
    if (!r.ok) expect(r.retryAfterSeconds).toBe(24 * 3600);
    clock.t += 24 * 3600_000 + 1;
    expect((await faucet.drip(A, "9.9.9.9")).ok).toBe(true);
  });
  it("limits drips per IP", async () => {
    const { faucet } = setup({ ipDrips: 1 });
    expect((await faucet.drip(A, "5.5.5.5")).ok).toBe(true);
    const r = await faucet.drip(B, "5.5.5.5");
    expect(r).toMatchObject({ ok: false, status: 429, code: "ip_limit" });
    expect((await faucet.drip(B, "6.6.6.6")).ok).toBe(true);
  });
  it("limits attempts per IP even when they fail", async () => {
    const { faucet: f2, node } = setup({ ipAttempts: 2 });
    node.balances.set(A, 80n * V);
    expect(await f2.drip(A, "7.7.7.7")).toMatchObject({ status: 409, code: "already_funded" });
    expect(await f2.drip(A, "7.7.7.7")).toMatchObject({ status: 409 });
    expect(await f2.drip(A, "7.7.7.7")).toMatchObject({ status: 429, code: "too_many_requests" });
  });
  it("has a per-instance daily cap", async () => {
    const { faucet } = setup({ globalDrips: 1 });
    expect((await faucet.drip(A, "1.1.1.1")).ok).toBe(true);
    expect(await faucet.drip(B, "2.2.2.2")).toMatchObject({ ok: false, status: 429, code: "faucet_busy" });
  });
  it("refuses recipients that already hold enough and does not burn their cooldown", async () => {
    const { faucet, node } = setup();
    node.balances.set(A, DEFAULT_LIMITS.ceilingUvault);
    expect(await faucet.drip(A, "1.1.1.1")).toMatchObject({ ok: false, status: 409, code: "already_funded" });
    node.balances.set(A, 0n);
    expect((await faucet.drip(A, "1.1.1.1")).ok).toBe(true);
  });
  it("stops when the faucet balance would fall under the reserve", async () => {
    const { faucet, node } = setup();
    node.balances.set(signer.key.address, 100n * V + 1000n + DEFAULT_LIMITS.reserveUvault - 1n);
    expect(await faucet.drip(A, "1.1.1.1")).toMatchObject({ ok: false, status: 503, code: "faucet_empty" });
    node.balances.set(signer.key.address, 100n * V + 1000n + DEFAULT_LIMITS.reserveUvault);
    expect((await faucet.drip(A, "1.1.1.1")).ok).toBe(true);
  });
  it("gives the slot back when the node fails", async () => {
    const { faucet, node } = setup();
    node.failSubmit = new HttpError(500, "boom");
    expect(await faucet.drip(A, "1.1.1.1")).toMatchObject({ ok: false, status: 502, code: "node_error" });
    node.failSubmit = new HttpError(429, "slow down");
    expect(await faucet.drip(A, "1.1.1.1")).toMatchObject({ ok: false, status: 503, code: "node_busy" });
    node.failSubmit = null;
    expect((await faucet.drip(A, "1.1.1.1")).ok).toBe(true);
  });
  it("does not leak internals in errors", async () => {
    const { faucet, node } = setup();
    node.failSubmit = new Error("secret internal detail " + signer.key.privHex);
    const r = await faucet.drip(A, "1.1.1.1");
    expect(JSON.stringify(r)).not.toContain(signer.key.privHex);
    expect(JSON.stringify(r)).not.toContain("secret internal");
  });
});

describe("WindowCounter / clientIp", () => {
  it("slides, undoes and bounds memory", () => {
    const c = new WindowCounter(3);
    expect(c.retryAfterMs("k", 2, 1000, 0)).toBe(0);
    const s1 = c.add("k", 1000, 0);
    c.add("k", 1000, 100);
    expect(c.retryAfterMs("k", 2, 1000, 200)).toBe(800);
    c.remove("k", s1);
    expect(c.retryAfterMs("k", 2, 1000, 200)).toBe(0);
    expect(c.retryAfterMs("k", 1, 1000, 1101)).toBe(0);
    for (let i = 0; i < 10; i++) c.add("x" + i, 1000, 5000 + i);
    expect(c.size).toBeLessThanOrEqual(3);
  });
  it("reads the edge-provided client IP", () => {
    const h = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIp(h({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(h({}))).toBe("unknown");
  });
});

describe("faucet UI", () => {
  it("formats waits", () => {
    expect(fmtWait(30)).toBe("30 seconds");
    expect(fmtWait(600)).toBe("10 minutes");
    expect(fmtWait(24 * 3600)).toBe("24 h");
  });
  it("renders the button and the devnet-only warning", () => {
    const html = renderToStaticMarkup(createElement(FaucetButton, { address: A }));
    expect(html).toContain("devnet VAULT");
    expect(html).toContain("Devnet only");
    expect(html).toContain("/docs/guides/faucet");
  });
});
