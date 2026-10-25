"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPLORER_URL } from "@/lib/links";

interface FaucetInfo {
  enabled: boolean;
  dripVault?: number;
  ceilingVault?: number;
  cooldownHours?: number;
  low?: boolean;
}
type Outcome =
  | { kind: "ok"; txHash: string; amount: string }
  | { kind: "error"; message: string; retryAfterSeconds?: number };

export function fmtWait(seconds: number): string {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} seconds`;
  const m = Math.round(seconds / 60);
  if (m < 90) return `${m} minutes`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
}

/** "Get devnet funds" control. Posts the profile's address to this site's /api/faucet. */
export function FaucetButton({ address, onFunded }: { address: string; onFunded?: () => void }) {
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);

  useEffect(() => {
    let dead = false;
    fetch("/api/faucet", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<FaucetInfo>) : { enabled: false }))
      .then((j) => !dead && setInfo(j))
      .catch(() => !dead && setInfo({ enabled: false }));
    return () => {
      dead = true;
    };
  }, []);

  async function request() {
    setBusy(true);
    setOut(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; txHash?: string; amountUvault?: string; retryAfterSeconds?: number };
      if (res.ok && j.txHash) {
        setOut({ kind: "ok", txHash: j.txHash, amount: String(Number(j.amountUvault ?? "0") / 1e6) });
        onFunded?.();
      } else {
        setOut({ kind: "error", message: j.error ?? `The faucet answered HTTP ${res.status}.`, retryAfterSeconds: j.retryAfterSeconds });
      }
    } catch {
      setOut({ kind: "error", message: "Could not reach the faucet. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  if (info && !info.enabled) {
    return <p className="muted small">The devnet faucet is not enabled on this deployment. Ask the operator for funds or run your own node.</p>;
  }
  return (
    <div className="faucet" data-testid="faucet">
      <p>
        <button type="button" className="btn primary" onClick={request} disabled={busy || !info}>
          {busy ? "Sending…" : `Get ${info?.dripVault ?? 100} devnet VAULT`}
        </button>
      </p>
      <p className="muted small">
        Devnet only: the tokens have no value, one request per address every {info?.cooldownHours ?? 24} hours, and a devnet reset wipes balances.{" "}
        <Link href="/docs/guides/faucet">How the faucet works</Link>.
      </p>
      {info?.low ? <p className="muted small">The faucet balance is low and may refuse requests.</p> : null}
      {out?.kind === "ok" ? (
        <p className="callout good" role="status" data-testid="faucet-result">
          Sent {out.amount} VAULT. It is in block now.{" "}
          <a href={`${EXPLORER_URL}/tx/${out.txHash}`} target="_blank" rel="noopener noreferrer">
            View transaction ↗
          </a>
        </p>
      ) : null}
      {out?.kind === "error" ? (
        <p className="callout bad" role="alert" data-testid="faucet-result">
          {out.message}
          {out.retryAfterSeconds ? ` Try again in ${fmtWait(out.retryAfterSeconds)}.` : ""}
        </p>
      ) : null}
    </div>
  );
}
