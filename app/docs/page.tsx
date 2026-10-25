import type { Metadata } from "next";
import Link from "next/link";
import { navSections } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Docs",
  description: "Guides, concepts and API references for the VaultChain devnet.",
};

const BLURBS: Record<string, string> = {
  Start: "Upload, prove and read a file in about ten minutes.",
  Concepts: "How storage deals, Merkle roots, proofs, encryption and the limits actually work.",
  Guides: "Run your own node or provider, deploy a devnet to Fly.io, use the web vault.",
  Reference: "CLI commands, REST routes with real JSON, provider API and the signed-transaction format.",
  Project: "FAQ, status and roadmap, honestly.",
};

export default function DocsIndex() {
  const sections = navSections();
  return (
    <div className="prose docs-index">
      <p className="eyebrow">Documentation</p>
      <h1>VaultChain docs</h1>
      <p className="lead">
        Everything here describes the <strong>devnet</strong> as it runs today: one validator, one provider, no value on the tokens, not
        audited. Pages say what is verified and what is not.
      </p>
      <p>
        New here? Start with <Link href="/docs/getting-started">Getting started</Link>, or try the <Link href="/vault">web vault</Link> without
        installing anything. Press <kbd>/</kbd> to search.
      </p>
      <div className="card-grid">
        {sections.map((s) => (
          <section key={s.title} className="card">
            <h2>{s.title}</h2>
            <p className="muted">{BLURBS[s.title]}</p>
            <ul>
              {s.items.map((d) => (
                <li key={d.slug}>
                  <Link href={`/docs/${d.slug}`}>{d.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
