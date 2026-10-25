"use client";

import Link from "next/link";
import type { ProfileRecord } from "@/lib/vaultstore";
import { DENOM } from "@/lib/vault/config";
import { EXPLORER_URL } from "@/lib/links";
import { CopyButton, ErrorNote } from "./ui";
import { fmtBytes, fmtVault, node, provider, usePoll } from "./util";

export function Overview({ profile }: { profile: ProfileRecord }) {
  const addr = profile.entry.address;
  const bal = usePoll(`bal:${addr}`, () => node.balance(addr, DENOM), 10_000);
  const info = usePoll("info", () => node.info(), 10_000);
  const prov = usePoll("provider", () => provider.status(), 30_000);
  const provList = usePoll("providers", () => node.providers(), 30_000);

  const first = provList.data?.[0];
  return (
    <div className="grid2">
      <div className="panel">
        <h3>Balance</h3>
        <p className="big">
          {bal.data !== undefined ? fmtVault(bal.data) : bal.error ? "—" : "…"} <small>VAULT</small>
        </p>
        <p className="muted small">Devnet tokens. They have no value. 1 VAULT = 1,000,000 {DENOM}.</p>
        <ErrorNote error={bal.error} />
        {bal.data === 0n ? (
          <p className="callout">
            This address has no funds yet, so you cannot send transactions. There is no public faucet. Send your address to whoever runs the devnet, or{" "}
            <Link href="/docs/guides/run-a-node">run your own node</Link> and fund it from genesis.
          </p>
        ) : null}
      </div>
      <div className="panel">
        <h3>Your address</h3>
        <p className="mono wrap-any">{addr}</p>
        <p>
          <CopyButton text={addr} label="Copy address" />{" "}
          <a className="btn sm" href={EXPLORER_URL} target="_blank" rel="noopener noreferrer">
            Explorer ↗
          </a>
        </p>
        <p className="muted small">
          To receive encrypted files from someone, your public key must be known on chain, which happens the first time this address signs any transaction.
        </p>
      </div>
      <div className="panel">
        <h3>Network</h3>
        {info.data ? (
          <dl className="kv">
            <dt>Chain</dt>
            <dd className="mono">{info.data.chainId}</dd>
            <dt>Height</dt>
            <dd className="mono">{info.data.height.toLocaleString("en-US")}</dd>
          </dl>
        ) : (
          <p className="muted">{info.error ? "Node unreachable." : "Loading…"}</p>
        )}
        <ErrorNote error={info.error} />
      </div>
      <div className="panel">
        <h3>Storage provider</h3>
        {prov.data ? (
          <dl className="kv">
            <dt>Status</dt>
            <dd>{prov.data.status}</dd>
            <dt>Objects held</dt>
            <dd>{prov.data.objects}</dd>
            <dt>Free space</dt>
            <dd>{first ? fmtBytes(first.free_bytes) : "—"}</dd>
          </dl>
        ) : (
          <p className="muted">{prov.error ? "Provider unreachable." : "Loading…"}</p>
        )}
        <ErrorNote error={prov.error} />
        <p className="muted small">The web vault stores to the one provider it is configured for. Replication needs more providers than the public devnet has.</p>
      </div>
    </div>
  );
}
