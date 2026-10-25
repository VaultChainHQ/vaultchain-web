"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { KeystoreEntry } from "@/lib/keystore";
import { session, setAutoLockSource } from "@/lib/session";
import { vaultStore } from "@/lib/vaultstore";
import { ContactsTab } from "./contacts";
import { FilesTab, SharedTab } from "./files";
import { NoEmailNote, Onboarding } from "./onboarding";
import { Overview } from "./overview";
import { SettingsTab, backupFilename } from "./settings";
import { UnlockPanel } from "./unlock";
import { UploadTab } from "./upload";
import { Avatar } from "./ui";
import { activeProfile, saveText, short, useUnlocked, useVault } from "./util";
import { exportBackup } from "@/lib/keystore";

type Tab = "overview" | "upload" | "files" | "shared" | "contacts" | "settings";
const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["upload", "Upload"],
  ["files", "My files"],
  ["shared", "Shared with me"],
  ["contacts", "Contacts"],
  ["settings", "Settings"],
];

const noop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VaultApp() {
  const mounted = useMounted();
  const vault = useVault();
  const u = useUnlocked();
  const [tab, setTab] = useState<Tab>("overview");
  const [adding, setAdding] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [backupFor, setBackupFor] = useState<KeystoreEntry | null>(null);

  const active = activeProfile(vault);
  const unlocked = u && active && u.profileId === active.entry.id ? u : null;
  const minutes = vault.settings.autoLockMinutes;
  const now = useNow(!!unlocked);
  void now;

  // Auto-lock wiring: activity resets the timer; hiding/leaving the page locks.
  useEffect(() => {
    setAutoLockSource(() => vaultStore().snapshot().settings.autoLockMinutes);
    const s = session();
    let last = 0;
    const activity = () => {
      const t = Date.now();
      if (t - last > 1000) {
        last = t;
        s.touch();
      }
    };
    const vis = () => {
      if (document.visibilityState === "visible") s.check();
    };
    const hide = () => s.lock();
    const evs = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    evs.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", hide);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, activity));
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", hide);
      s.lock();
    };
  }, []);

  useEffect(() => {
    session().touch();
  }, [minutes]);

  // A key unlocked for a profile that is no longer the active one must not linger.
  useEffect(() => {
    if (u && (!active || u.profileId !== active.entry.id)) session().lock();
  }, [u, active]);

  if (!mounted) return <p className="muted wrap">Loading the vault…</p>;

  const firstRun = vault.profiles.length === 0;

  function select(id: string) {
    if (active?.entry.id === id) return;
    session().lock();
    vaultStore().setActive(id);
    setAdding(false);
    setBackupFor(null);
  }

  return (
    <div className="vault wrap">
      <header className="vault-head">
        <h1>Web vault</h1>
        <p className="muted">
          Local-first and non-custodial. Profiles and keys live in this browser; the site has no accounts and never receives a key or passphrase.
        </p>
        <p className="callout bad">
          <strong>Devnet.</strong> Test tokens, unaudited software, and the network can be reset. If you lose a profile&apos;s passphrase or clear this browser without an encrypted
          backup, its key and everything tied to it are gone for good.
        </p>
      </header>

      {firstRun ? (
        <Onboarding first onCreated={setBackupFor} />
      ) : (
        <>
          <nav className="profiles" aria-label="Profiles">
            <ul>
              {vault.profiles.map((p) => {
                const on = p.entry.id === active?.entry.id;
                const open = u?.profileId === p.entry.id;
                return (
                  <li key={p.entry.id}>
                    <button type="button" className={on ? "chip on" : "chip"} aria-pressed={on} onClick={() => select(p.entry.id)}>
                      <Avatar name={p.entry.name} color={p.entry.color} />
                      <span className="chip-text">
                        <strong>{p.entry.name}</strong>
                        <small className="mono">{short(p.entry.address, 11, 4)}</small>
                      </span>
                      <span className={open ? "lockdot open" : "lockdot"} title={open ? "unlocked" : "locked"}>
                        <span className="sr-only">{open ? "unlocked" : "locked"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button type="button" className="chip add" onClick={() => setAdding(!adding)} aria-expanded={adding}>
                  + Add profile
                </button>
              </li>
            </ul>
            {unlocked ? (
              <p className="lockbar" role="status">
                Unlocked · auto-locks in <span className="mono">{mmss(session().remainingMs())}</span>{" "}
                <button type="button" className="btn sm" onClick={() => session().lock()}>
                  Lock now
                </button>
              </p>
            ) : null}
          </nav>

          {adding ? (
            <Onboarding
              first={false}
              onCreated={(en) => {
                setBackupFor(en);
              }}
              onClose={() => setAdding(false)}
            />
          ) : null}

          {backupFor ? (
            <div className="callout good" role="status">
              <strong>Back up “{backupFor.name}” now.</strong> Download the encrypted backup and keep it somewhere safe, apart from this browser. It is useless without your passphrase,
              and your passphrase is useless without it if this browser&apos;s data is cleared.{" "}
              <button type="button" className="btn sm primary" onClick={() => saveText(exportBackup([backupFor]), backupFilename(backupFor.name))}>
                Download backup
              </button>{" "}
              <button type="button" className="btn sm" onClick={() => setBackupFor(null)}>
                I have saved it
              </button>
            </div>
          ) : null}

          {active ? (
            <>
              {!unlocked ? <UnlockPanel key={active.entry.id} profile={active} /> : null}
              <div role="tablist" aria-label="Vault sections" className="tabs">
                {TABS.map(([t, label]) => (
                  <button key={t} role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls="tabpanel" type="button" className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                    {label}
                  </button>
                ))}
              </div>
              <div role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`} className="tabpanel">
                {tab === "overview" ? <Overview profile={active} unlocked={unlocked} /> : null}
                {tab === "upload" ? <UploadTab unlocked={unlocked} onUploaded={() => setRefresh((n) => n + 1)} /> : null}
                {tab === "files" ? <FilesTab profile={active} unlocked={unlocked} refreshKey={refresh} /> : null}
                {tab === "shared" ? <SharedTab profile={active} unlocked={unlocked} /> : null}
                {tab === "contacts" ? <ContactsTab profile={active} /> : null}
                {tab === "settings" ? <SettingsTab vault={vault} profile={active} /> : null}
              </div>
            </>
          ) : null}
        </>
      )}
      <footer className="vault-foot">
        <NoEmailNote />
        <p className="muted small">
          Provider traffic goes through this site&apos;s proxy (<code>/api/provider</code>) because the provider does not allow browser origins yet. The proxy forwards only file chunks
          and signed read tokens, never keys or passphrases.
        </p>
      </footer>
    </div>
  );
}
