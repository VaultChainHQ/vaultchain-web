"use client";

import { useState } from "react";

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase();
  return (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {initial}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the text is selectable anyway */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function ErrorNote({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <p className="callout bad" role="alert">
      <strong>Error.</strong> {error}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-row" role="status">
      <span className="spinner" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Working</span>}
    </span>
  );
}

export function Badge({ tone = "", children }: { tone?: "" | "good" | "warn" | "bad" | "violet"; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
