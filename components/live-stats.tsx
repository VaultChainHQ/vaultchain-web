"use client";

import { useEffect, useState } from "react";
import { DEFAULT_REST, NODE_URL } from "@/lib/vault/config";

interface Stats {
  height: number;
  chain: string;
  providers: number;
  deals: number;
}

async function j<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

export function LiveStats() {
  const [s, setS] = useState<Stats | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let dead = false;
    async function load() {
      try {
        const [n, p, d] = await Promise.all([
          j<{ height: number; default_node_info: { network: string } }>(`${NODE_URL}/cosmos/base/tendermint/v1beta1/node_info`),
          j<{ providers: unknown[] }>(`${NODE_URL}/vaultchain/storage/providers`),
          j<{ deals: unknown[] }>(`${NODE_URL}/vaultchain/storage/deals`),
        ]);
        if (dead) return;
        setS({ height: n.height, chain: n.default_node_info.network, providers: (p.providers ?? []).length, deals: (d.deals ?? []).length });
        setDown(false);
      } catch {
        if (!dead) setDown(true);
      }
    }
    void load();
    const t = setInterval(load, 15000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return (
    <ul className="stats" aria-label="Live devnet status" aria-live="polite">
      <li className={down ? "down" : s ? "live" : ""}>
        <strong>{down ? "unreachable" : s ? s.chain : "…"}</strong>devnet {NODE_URL === DEFAULT_REST ? "(public)" : "(custom node)"}
      </li>
      <li>
        <strong>{s ? s.height.toLocaleString("en-US") : "…"}</strong>block height
      </li>
      <li>
        <strong>{s ? s.providers : "…"}</strong>providers
      </li>
      <li>
        <strong>{s ? s.deals : "…"}</strong>deals (incl. test data)
      </li>
    </ul>
  );
}
