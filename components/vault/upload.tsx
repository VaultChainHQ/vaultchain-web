"use client";

import { useRef, useState } from "react";
import type { Unlocked } from "@/lib/session";
import { ciphertextSize } from "@/lib/vault/vaultcrypt";
import { DEFAULT_DEAL_BLOCKS, DENOM, NODE_URL } from "@/lib/vault/config";
import { uploadObject, type UploadResult } from "@/lib/vault/flows";
import { ErrorNote, Field } from "./ui";
import { MAX_UPLOAD_BYTES, errMsg, fmtBytes, fmtDuration, fmtVault, node, provider, usePoll } from "./util";

const DURATIONS = [1_000, 10_000, 100_000];
const GIB = 1024 * 1024 * 1024;
const FEE_UVAULT = 1000n; // default fee per transaction

export function UploadTab({ unlocked, onUploaded }: { unlocked: Unlocked | null; onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [encrypt, setEncrypt] = useState(true);
  const [blocks, setBlocks] = useState(DEFAULT_DEAL_BLOCKS);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [frac, setFrac] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [drag, setDrag] = useState(false);

  const addr = unlocked?.key.address ?? "";
  const bal = usePoll(`ubal:${addr}`, () => (addr ? node.balance(addr, DENOM) : Promise.resolve(0n)), 15_000);
  const price = usePoll("price", async () => {
    const r = await fetch(`${NODE_URL}/vaultchain/storage/params`, { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as { params?: { price_per_gb_uvault?: string | number } };
    const p = j.params?.price_per_gb_uvault;
    return p === undefined ? undefined : BigInt(p);
  });

  const stored = file ? (encrypt ? ciphertextSize(file.size) : file.size) : 0;
  const unit = price.data;
  const escrow = unit !== undefined && file ? BigInt(Math.max(1, Math.ceil(stored / GIB))) * unit * BigInt(Math.max(1, Math.floor(blocks / 1000))) : undefined;
  const fees = FEE_UVAULT * 2n;
  const short = escrow !== undefined && bal.data !== undefined && bal.data < escrow + fees;

  function pick(f: File | undefined | null) {
    setResult(null);
    setError(null);
    setLog([]);
    if (!f) return;
    if (f.size === 0) return setError("Empty files cannot be stored.");
    if (f.size > MAX_UPLOAD_BYTES) return setError(`The web vault holds the whole file in memory, so it is limited to ${fmtBytes(MAX_UPLOAD_BYTES)}. Use the CLI for larger files.`);
    setFile(f);
    setName(f.name);
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!unlocked || !file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setLog([]);
    setFrac(null);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const r = await uploadObject({
        node,
        provider,
        signer: { key: unlocked.key, priv: unlocked.priv },
        data,
        name: name.trim() || file.name,
        mime: file.type || "application/octet-stream",
        encrypt,
        durationBlocks: blocks,
        progress: (step, f) => {
          setLog((l) => (l[l.length - 1] === step ? l : [...l.slice(-30), step]));
          setFrac(f ?? null);
        },
      });
      setResult(r);
      setFile(null);
      if (input.current) input.current.value = "";
      onUploaded();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={go}>
      <h3>Upload a file</h3>
      {!unlocked ? <p className="callout">Unlock the profile to sign the transactions an upload needs.</p> : null}
      <div
        className={drag ? "drop on" : "drop"}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <input ref={input} id="file-in" type="file" onChange={(e) => pick(e.target.files?.[0])} disabled={busy} />
        <label htmlFor="file-in" className="muted small">
          Choose a file or drop it here (up to {fmtBytes(MAX_UPLOAD_BYTES)}). It is read in your browser and sent only to the provider.
        </label>
      </div>
      {file ? (
        <div className="form">
          <Field label="Stored name (public on chain)">
            <input type="text" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} disabled={busy} />
            <span>
              Encrypt in my browser before upload <small className="muted">(XChaCha20-Poly1305; the key is sealed to your account)</small>
            </span>
          </label>
          {!encrypt ? (
            <p className="callout bad">The provider and anyone it serves will be able to read this file. The name, size and type are public either way.</p>
          ) : (
            <p className="muted small">The file name, size, type and owner stay public on chain even when the content is encrypted.</p>
          )}
          <Field label="Keep it stored for">
            <select value={blocks} onChange={(e) => setBlocks(Number(e.target.value))} disabled={busy}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d.toLocaleString("en-US")} blocks (about {fmtDuration(d)})
                </option>
              ))}
            </select>
          </Field>
          <p className="muted small">
            {fmtBytes(file.size)} → {fmtBytes(stored)} stored · escrow ≈{" "}
            {escrow !== undefined ? `${fmtVault(escrow)} VAULT` : price.error ? "unknown (could not read pricing)" : "…"} + about {fmtVault(fees)} VAULT in fees · balance{" "}
            {bal.data !== undefined ? `${fmtVault(bal.data)} VAULT` : "…"}
          </p>
          {short ? <p className="callout bad">The balance looks too low for this upload.</p> : null}
          <button className="btn primary" type="submit" disabled={busy || !unlocked}>
            {busy ? "Working…" : "Commit, pay and upload"}
          </button>
        </div>
      ) : null}
      {frac !== null && busy ? <progress value={frac} max={1} aria-label="Upload progress" /> : null}
      {log.length ? (
        <ol className="log" aria-live="polite">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      ) : null}
      <ErrorNote error={error} />
      {result ? (
        <div className="callout good" role="status">
          <strong>Stored.</strong> Deal #{result.dealId ?? "?"} is open for {fmtDuration(blocks)}. Root <span className="mono wrap-any">{result.root}</span>
          {result.encrypted ? " (encrypted)" : " (not encrypted)"}. Find it under “My files”.
        </div>
      ) : null}
    </form>
  );
}
