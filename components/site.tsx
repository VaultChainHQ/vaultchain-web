import Link from "next/link";
import { EXPLORER_URL, REPOS } from "@/lib/links";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="wrap header-row">
        <Link href="/" className="brand" aria-label="VaultChain home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="3" width="26" height="26" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 10v-4M16 26v-4M10 16H6M26 16h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>VaultChain</span>
          <span className="badge">devnet</span>
        </Link>
        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-label="Toggle menu" />
        <label htmlFor="nav-toggle" className="nav-burger" aria-hidden="true">
          <span />
          <span />
          <span />
        </label>
        <nav className="nav" aria-label="Main">
          <Link href="/docs">Docs</Link>
          <Link href="/vault" className="nav-cta">
            Open vault
          </Link>
          <a href={EXPLORER_URL} rel="noopener noreferrer" target="_blank">
            Explorer
          </a>
          <a href={REPOS.chain} rel="noopener noreferrer" target="_blank">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <strong>VaultChain</strong>
          <p className="muted small">
            A lab-grade devnet for verifiable, user-owned storage. Not audited. Tokens have no value. Do not store anything you
            cannot afford to lose.
          </p>
        </div>
        <div>
          <h2 className="footer-h">Build</h2>
          <ul>
            <li><Link href="/docs/getting-started">Getting started</Link></li>
            <li><Link href="/docs/reference/node-rest">REST API</Link></li>
            <li><Link href="/docs/reference/cli">CLI</Link></li>
            <li><Link href="/docs/guides/run-a-provider">Run a provider</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="footer-h">Use</h2>
          <ul>
            <li><Link href="/vault">Web vault</Link></li>
            <li><a href={EXPLORER_URL} rel="noopener noreferrer" target="_blank">Explorer</a></li>
            <li><Link href="/docs/concepts/threat-model">Threat model</Link></li>
            <li><Link href="/docs/roadmap">Status and roadmap</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="footer-h">Source (MIT)</h2>
          <ul>
            <li><a href={REPOS.chain} rel="noopener noreferrer" target="_blank">vaultchain</a></li>
            <li><a href={REPOS.web} rel="noopener noreferrer" target="_blank">vaultchain-web</a></li>
            <li><a href={REPOS.upload} rel="noopener noreferrer" target="_blank">vaultchain-upload</a></li>
            <li><a href={REPOS.explorer} rel="noopener noreferrer" target="_blank">vaultchain-explorer</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
