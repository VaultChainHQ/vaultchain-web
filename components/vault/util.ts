"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { session, type Unlocked } from "@/lib/session";
import { EMPTY_VAULT, vaultStore, type ProfileRecord, type VaultData } from "@/lib/vaultstore";
import { NodeClient, ProviderClient } from "@/lib/vault/client";
import { NODE_URL, PROVIDER_MODE, PROVIDER_URL } from "@/lib/vault/config";

export const node = new NodeClient(NODE_URL);
export const provider = new ProviderClient(PROVIDER_URL, PROVIDER_MODE);

/** Devnet block time, used only to turn block counts into rough durations. */
export const BLOCK_SECONDS = 3;
export const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

export function useVault(): VaultData {
  const s = vaultStore();
  return useSyncExternalStore(s.subscribe, s.snapshot, () => EMPTY_VAULT);
}

export function useUnlocked(): Unlocked | null {
  const s = session();
  return useSyncExternalStore(s.subscribe, s.snapshot, () => null);
}

export function activeProfile(v: VaultData): ProfileRecord | undefined {
  return v.profiles.find((p) => p.entry.id === v.activeId);
}

export interface Polled<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Poll an async function. `key` identifies the query: change it to refetch immediately. */
export function usePoll<T>(key: string, fn: () => Promise<T>, ms = 0): Polled<T> {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const [state, setState] = useState<{ key: string; data?: T; error: string | null }>({ key, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let dead = false;
    async function run() {
      try {
        const d = await fnRef.current();
        if (!dead) setState({ key, data: d, error: null });
      } catch (e) {
        if (!dead) setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: e instanceof Error ? e.message : String(e) }));
      }
    }
    void run();
    const t = ms > 0 ? setInterval(run, ms) : undefined;
    return () => {
      dead = true;
      if (t) clearInterval(t);
    };
  }, [key, ms, tick]);

  const current = state.key === key;
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: !current || (state.data === undefined && state.error === null),
    reload,
  };
}

const UVAULT = 1_000_000n;

/** 1234567 uvault -> "1.234567" (trailing zeros trimmed). */
export function fmtVault(u: bigint): string {
  const neg = u < 0n;
  const a = neg ? -u : u;
  const whole = a / UVAULT;
  const frac = (a % UVAULT).toString().padStart(6, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? "." + frac : ""}`;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KiB", "MiB", "GiB", "TiB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
}

export function short(s: string, head = 10, tail = 6): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function fmtDuration(blocks: number): string {
  const s = Math.max(0, Math.round(blocks * BLOCK_SECONDS));
  if (s < 90) return `${s} s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86400).toFixed(1)} days`;
}

/** Save bytes as a file through a blob URL (never rendered inline, so a hostile file type cannot run script). */
export function saveBytes(data: Uint8Array, name: string) {
  const blob = new Blob([data as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "download.bin";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function saveText(text: string, name: string) {
  saveBytes(new TextEncoder().encode(text), name);
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
