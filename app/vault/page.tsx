import type { Metadata } from "next";
import { VaultApp } from "@/components/vault/app";
import "../vault.css";

export const metadata: Metadata = {
  title: "Web vault",
  description: "A local-first, non-custodial web vault for VaultChain: profiles with passphrase-encrypted keys, encrypted uploads, sharing and downloads.",
};

export default function VaultPage() {
  return (
    <>
      <noscript>
        <p className="wrap callout bad">The web vault needs JavaScript: keys are generated and used in your browser.</p>
      </noscript>
      <VaultApp />
    </>
  );
}
