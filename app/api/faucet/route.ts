import { Faucet, UVAULT_PER_VAULT, clientIp } from "@/lib/faucet";
import { NodeClient } from "@/lib/vault/client";
import { NODE_URL } from "@/lib/vault/config";
import { keyFromHex } from "@/lib/vault/keys";
import { signerFromKey } from "@/lib/vault/flows";

// Devnet faucet. FAUCET_PRIVATE_KEY is a server-only secret (a Vercel sensitive env var): it is a
// dedicated key that holds a small devnet balance and nothing else. See /docs/guides/faucet.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
const g = globalThis as unknown as { __vaultFaucet?: Faucet | null };

function getFaucet(): Faucet | null {
  if (g.__vaultFaucet !== undefined) return g.__vaultFaucet;
  const hex = process.env.FAUCET_PRIVATE_KEY;
  if (!hex) return (g.__vaultFaucet = null);
  try {
    g.__vaultFaucet = new Faucet({ node: new NodeClient(NODE_URL), signer: signerFromKey(keyFromHex(hex)) });
  } catch {
    // Never echo the key material: report only that it is unusable.
    console.error("faucet: FAUCET_PRIVATE_KEY is set but invalid");
    g.__vaultFaucet = null;
  }
  return g.__vaultFaucet;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

export async function GET() {
  const f = getFaucet();
  if (!f) return json({ enabled: false });
  const node = new NodeClient(NODE_URL);
  let low = false;
  try {
    const bal = await node.balance(f.address, "uvault");
    low = bal < f.limits.dripUvault + f.limits.reserveUvault;
  } catch {
    // Node unreachable: still report the static facts.
  }
  return json({
    enabled: true,
    network: "devnet",
    address: f.address,
    dripVault: Number(f.limits.dripUvault / UVAULT_PER_VAULT),
    ceilingVault: Number(f.limits.ceilingUvault / UVAULT_PER_VAULT),
    cooldownHours: f.limits.addressWindowMs / 3_600_000,
    low,
  });
}

export async function POST(req: Request) {
  const f = getFaucet();
  if (!f) return json({ error: "The faucet is not configured on this deployment.", code: "disabled" }, 503);
  const raw = await req.text();
  if (raw.length > 1024) return json({ error: "Request too large.", code: "bad_request" }, 413);
  let address: unknown;
  try {
    address = (JSON.parse(raw) as { address?: unknown }).address;
  } catch {
    return json({ error: 'Send JSON like {"address":"vault1…"}.', code: "bad_request" }, 400);
  }
  if (typeof address !== "string") return json({ error: 'Send JSON like {"address":"vault1…"}.', code: "bad_request" }, 400);
  const r = await f.drip(address, clientIp(req.headers));
  if (r.ok) return json(r);
  return json(r, r.status, r.retryAfterSeconds ? { "Retry-After": String(r.retryAfterSeconds) } : {});
}
