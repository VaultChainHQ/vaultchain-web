"use client";

import { useState } from "react";
import type { Unlocked } from "@/lib/session";
import type { ProfileRecord } from "@/lib/vaultstore";
import { isValidAddress } from "@/lib/vault/keys";
import type { Deal, ManifestRecord } from "@/lib/vault/client";
import { downloadObject, grantRead, revokeRead } from "@/lib/vault/flows";
import { Badge, CopyButton, ErrorNote, Field } from "./ui";
import { errMsg, fmtBytes, fmtDuration, node, provider, saveBytes, short, usePoll } from "./util";

export function nameFor(addr: string, profile: ProfileRecord): string | undefined {
  if (addr === profile.entry.address) return `${profile.entry.name} (you)`;
  return profile.contacts.find((c) => c.address === addr)?.name;
}

export function DownloadButton({ root, unlocked, name }: { root: string; unlocked: Unlocked | null; name?: string }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function go() {
    if (!unlocked) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await downloadObject({
        node,
        provider,
        signer: { key: unlocked.key, priv: unlocked.priv },
        root,
        progress: (s) => setStep(s),
      });
      saveBytes(r.data, r.name || name || "download.bin");
      setNote(`Verified against the on-chain root${r.decrypted ? " and decrypted in your browser" : ""}.`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  return (
    <span className="dl">
      <button type="button" className="btn sm primary" onClick={go} disabled={busy || !unlocked} title={unlocked ? undefined : "Unlock the profile first"}>
        {busy ? "Downloading…" : "Download"}
      </button>
      {busy && step ? <span className="muted small"> {step}</span> : null}
      {note ? <span className="muted small"> {note}</span> : null}
      <ErrorNote error={error} />
    </span>
  );
}

function dealTone(s: string): "good" | "warn" | "bad" | "" {
  if (s === "open") return "good";
  if (s === "pending") return "warn";
  if (s === "expired" || s === "failed" || s === "cancelled") return "bad";
  return "";
}

function DealLine({ d, height }: { d: Deal; height: number }) {
  const left = d.expire_height - height;
  const proven = d.replicas.filter((r) => (r.last_proven_height ?? 0) > 0).length;
  return (
    <li>
      <Badge tone={dealTone(d.status)}>{d.status}</Badge> deal #{d.id} · {d.class} · {d.replicas.length}/{d.replication} replica{d.replication === 1 ? "" : "s"}
      {d.status === "open" || d.status === "pending" ? (
        <>
          {" "}
          · {proven} proving · {left > 0 ? `expires in ${left.toLocaleString("en-US")} blocks (about ${fmtDuration(left)})` : "past its end height"}
        </>
      ) : null}
    </li>
  );
}

function SharePanel({ rec, profile, unlocked, height }: { rec: ManifestRecord; profile: ProfileRecord; unlocked: Unlocked | null; height: number }) {
  const grants = usePoll(`grants:${rec.root}`, () => node.grants(rec.root), 0);
  const [who, setWho] = useState("");
  const [custom, setCustom] = useState("");
  const [blocks, setBlocks] = useState(10_000);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const grantee = who === "custom" ? custom.trim() : who;
  const signer = unlocked ? { key: unlocked.key, priv: unlocked.priv } : null;

  async function share(e: React.FormEvent) {
    e.preventDefault();
    if (!signer) return;
    setError(null);
    if (grantee !== "*" && !isValidAddress(grantee)) return setError("Choose a contact or enter a valid vault1… address.");
    setBusy(true);
    try {
      await grantRead(node, signer, rec, grantee, height + blocks, (s) => setStep(s));
      grants.reload();
      setWho("");
      setCustom("");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  async function revoke(grantId: number) {
    if (!signer) return;
    setError(null);
    setBusy(true);
    try {
      await revokeRead(node, signer, rec, { grantId }, (s) => setStep(s));
      grants.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  return (
    <div className="share">
      <h4>Access</h4>
      {grants.data?.length ? (
        <ul className="plain">
          {grants.data.map((g) => (
            <li key={g.id}>
              {g.grantee === "*" ? <Badge tone="warn">anyone</Badge> : <strong>{nameFor(g.grantee, profile) ?? short(g.grantee, 12, 6)}</strong>} · until height{" "}
              {g.expiry_height.toLocaleString("en-US")}
              {g.expiry_height <= height ? " (expired)" : ""}{" "}
              <button type="button" className="btn sm danger" disabled={busy || !signer} onClick={() => revoke(g.id)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{grants.loading ? "Loading…" : "Only you can read this file."}</p>
      )}
      <form onSubmit={share} className="form row">
        <Field label="Share with">
          <select value={who} onChange={(e) => setWho(e.target.value)} required>
            <option value="">Choose…</option>
            {profile.contacts.map((c) => (
              <option key={c.id} value={c.address}>
                {c.name} ({short(c.address, 10, 4)})
              </option>
            ))}
            <option value="custom">Another address…</option>
            {!rec.encryption ? <option value="*">Anyone (public, unencrypted file)</option> : null}
          </select>
        </Field>
        {who === "custom" ? (
          <Field label="Address">
            <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="vault1…" spellCheck={false} />
          </Field>
        ) : null}
        <Field label="For">
          <select value={blocks} onChange={(e) => setBlocks(Number(e.target.value))}>
            {[1_000, 10_000, 100_000].map((b) => (
              <option key={b} value={b}>
                about {fmtDuration(b)}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className="btn sm primary" disabled={busy || !signer || !who}>
          {busy ? "Working…" : "Grant read access"}
        </button>
      </form>
      {step ? <p className="muted small">{step}</p> : null}
      {!signer ? <p className="muted small">Unlock the profile to grant or revoke access.</p> : null}
      <p className="muted small">
        Revoking stops the provider serving this file to that address within seconds. It cannot take back a file someone has already downloaded or a key they have
        already opened.
      </p>
      <ErrorNote error={error} />
    </div>
  );
}

function FileRow({
  rec,
  deals,
  height,
  profile,
  unlocked,
}: {
  rec: ManifestRecord;
  deals: Deal[];
  height: number;
  profile: ProfileRecord;
  unlocked: Unlocked | null;
}) {
  const [open, setOpen] = useState(false);
  const live = deals.some((d) => d.status === "open" || d.status === "pending");
  return (
    <li className="file">
      <div className="file-head">
        <div>
          <strong className="wrap-any">{rec.name || "(unnamed)"}</strong>{" "}
          {rec.encryption ? <Badge tone="violet">encrypted</Badge> : <Badge tone="warn">not encrypted</Badge>} {!live ? <Badge tone="bad">no live deal</Badge> : null}
          <div className="muted small">
            {fmtBytes(rec.size)} · {rec.mime || "unknown type"} · root <span className="mono">{short(rec.root, 10, 6)}</span> <CopyButton text={rec.root} label="Copy root" />
          </div>
        </div>
        <div className="file-actions">
          <DownloadButton root={rec.root} unlocked={unlocked} name={rec.name} />
          <button type="button" className="btn sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Hide details" : "Deals & sharing"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="file-body">
          <h4>Deals</h4>
          {deals.length ? (
            <ul className="plain">
              {deals.map((d) => (
                <DealLine key={d.id} d={d} height={height} />
              ))}
            </ul>
          ) : (
            <p className="callout bad">No deal exists for this file, so no provider is paid to keep it.</p>
          )}
          <SharePanel rec={rec} profile={profile} unlocked={unlocked} height={height} />
        </div>
      ) : null}
    </li>
  );
}

export function FilesTab({ profile, unlocked, refreshKey }: { profile: ProfileRecord; unlocked: Unlocked | null; refreshKey: number }) {
  const addr = profile.entry.address;
  const q = usePoll(
    `files:${addr}:${refreshKey}`,
    async () => {
      const [m, d, i] = await Promise.all([node.manifests(addr), node.deals({ owner: addr }), node.info()]);
      return { manifests: [...m].sort((a, b) => b.height - a.height), deals: d, height: i.height };
    },
    15_000,
  );
  return (
    <div className="panel">
      <div className="row between">
        <h3>My files</h3>
        <button type="button" className="btn sm" onClick={q.reload}>
          Refresh
        </button>
      </div>
      <p className="muted small">
        This list comes from the chain, filtered by your address, so it is the same on any device and visible to anyone who knows the address. Nothing about your files is
        stored in this browser.
      </p>
      <ErrorNote error={q.error} />
      {q.loading ? <p className="muted">Loading…</p> : null}
      {q.data && q.data.manifests.length === 0 ? <p className="muted">No files yet. Upload one from the Upload tab.</p> : null}
      {q.data ? (
        <ul className="files">
          {q.data.manifests.map((m) => (
            <FileRow key={m.root} rec={m} deals={q.data!.deals.filter((d) => d.cid === m.root)} height={q.data!.height} profile={profile} unlocked={unlocked} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SharedTab({ profile, unlocked }: { profile: ProfileRecord; unlocked: Unlocked | null }) {
  const addr = profile.entry.address;
  const q = usePoll(
    `shared:${addr}`,
    async () => {
      const [grants, i] = await Promise.all([node.grants(), node.info()]);
      const mine = grants.filter((g) => g.grantee === addr);
      const recs = await Promise.all(mine.map((g) => node.manifest(g.cid)));
      return { rows: mine.map((g, n) => ({ g, rec: recs[n] })), height: i.height };
    },
    20_000,
  );
  return (
    <div className="panel">
      <div className="row between">
        <h3>Shared with me</h3>
        <button type="button" className="btn sm" onClick={q.reload}>
          Refresh
        </button>
      </div>
      <p className="muted small">Files other accounts granted to {short(addr, 12, 6)}. For encrypted files the key arrives sealed to you and is opened in your browser.</p>
      <ErrorNote error={q.error} />
      {q.loading ? <p className="muted">Loading…</p> : null}
      {q.data && q.data.rows.length === 0 ? <p className="muted">Nothing has been shared with this address.</p> : null}
      <ul className="files">
        {q.data?.rows.map(({ g, rec }) => {
          const expired = g.expiry_height <= q.data!.height;
          return (
            <li key={g.id} className="file">
              <div className="file-head">
                <div>
                  <strong className="wrap-any">{rec?.name ?? short(g.cid, 10, 6)}</strong> {rec?.encryption ? <Badge tone="violet">encrypted</Badge> : null}{" "}
                  {expired ? <Badge tone="bad">grant expired</Badge> : <Badge tone="good">active</Badge>}
                  <div className="muted small">
                    from {nameFor(g.owner, profile) ?? short(g.owner, 12, 6)} · {rec ? fmtBytes(rec.size) : "?"} · until height {g.expiry_height.toLocaleString("en-US")}
                  </div>
                </div>
                <div className="file-actions">
                  <DownloadButton root={g.cid} unlocked={unlocked} name={rec?.name} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
