import Link from "next/link";
import { DocsSearch } from "@/components/docs-search";
import { DocsNav } from "@/components/docs-nav";
import { navSections } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = navSections();
  return (
    <div className="wrap docs-shell">
      <aside className="docs-side" aria-label="Documentation">
        <DocsSearch />
        <details className="docs-nav-details" open>
          <summary>Browse docs</summary>
          <DocsNav sections={sections} />
        </details>
        <p className="muted small docs-side-note">
          Something wrong or missing? <Link href="/docs/faq">FAQ</Link> or open an issue on{" "}
          <a href="https://github.com/VaultChainHQ/vaultchain-web/issues" rel="noopener noreferrer" target="_blank">
            GitHub
          </a>
          .
        </p>
      </aside>
      <div className="docs-main">{children}</div>
    </div>
  );
}
