import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vaultchain-web.vercel.app"),
  title: { default: "VaultChain: verifiable, user-owned storage (devnet)", template: "%s · VaultChain" },
  description:
    "VaultChain is a lab-grade devnet where files are chunked, committed to a Merkle root, stored by competing providers, and checked by on-chain possession proofs. Docs, a local-first web vault, and an explorer.",
  openGraph: {
    title: "VaultChain",
    description: "Verifiable, user-owned storage on a devnet. Encrypt in your browser, keep your keys, check the proofs.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#07090d", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
