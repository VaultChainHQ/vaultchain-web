"use client";

import { useState } from "react";
import type { ProfileRecord } from "@/lib/vaultstore";
import { vaultStore } from "@/lib/vaultstore";
import { CopyButton, ErrorNote, Field } from "./ui";
import { errMsg } from "./util";

export function ContactsTab({ profile }: { profile: ProfileRecord }) {
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      vaultStore().addContact(profile.entry.id, name, addr);
      setName("");
      setAddr("");
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="panel">
      <h3>Contacts</h3>
      <p className="muted small">
        An address book for sharing files. It is stored in this browser next to this profile (not encrypted, not synced) and never sent anywhere. Check an address with its owner
        through another channel before sharing something sensitive.
      </p>
      <form onSubmit={add} className="form row">
        <Field label="Name">
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Address">
          <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="vault1…" spellCheck={false} required />
        </Field>
        <button type="submit" className="btn primary">
          Add contact
        </button>
      </form>
      <ErrorNote error={error} />
      {profile.contacts.length ? (
        <ul className="plain contacts">
          {profile.contacts.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong> <span className="mono wrap-any">{c.address}</span> <CopyButton text={c.address} />{" "}
              <button type="button" className="btn sm danger" onClick={() => vaultStore().removeContact(profile.entry.id, c.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No contacts yet.</p>
      )}
    </div>
  );
}
