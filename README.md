# vaultchain-web

Marketing site, docs hub and a local-first **profile vault** for the [VaultChain](https://github.com/VaultChainHQ/vaultchain) devnet.

- **Landing page** with SVG/CSS motion diagrams (file → proof loop, replication and repair, who holds what, consensus, Merkle proofs). Animation is off under `prefers-reduced-motion` and every diagram has a pause button.
- **Docs hub** at `/docs`: sidebar, full-text search, and pages written as Markdown in [`content/docs`](content/docs).
- **Web vault** at `/vault`: several profiles, each with its own key. Create or import a key, back it up as an encrypted file, upload (optionally encrypted in the browser), see your files and files shared with you, download and decrypt, grant and revoke access, keep an address book.
- Explorer: <https://vaultchain-explorer.vercel.app> · Node and CLI: [vaultchain](https://github.com/VaultChainHQ/vaultchain) · Upload tool: [vaultchain-upload](https://github.com/VaultChainHQ/vaultchain-upload)

> **This is a devnet.** One validator, one storage provider, test tokens with no value, unaudited software, and the chain can be reset. Do not store anything you cannot afford to lose and do not reuse a real-money key. There is no faucet: a new profile has a zero balance until someone sends it devnet tokens.

## Why there is no "log in with email"

A VaultChain account is a secp256k1 key. Whoever holds the key controls the funds and the files, and the chain has no administrator who can reset it. An email login would need a server that holds or can recover your key, which is exactly what this site avoids. Profiles live in your browser; the site has no accounts and no database, and **never receives a private key or a passphrase**.

## Keystore design (`lib/keystore.ts`)

| Item | Value |
| --- | --- |
| Key | secp256k1 private key, 32 bytes, generated with `crypto.getRandomValues` or imported |
| KDF | scrypt, N = 2^16, r = 8, p = 2 (about 64 MiB), 32-byte random salt |
| Passphrase | NFKC-normalised; at least 12 characters, at least 6 distinct characters, common-password check |
| Cipher | AES-256-GCM, 12-byte random IV, via WebCrypto |
| Authenticated data | `vaultchain-web/keystore/v1` + profile id, address, public key, algorithm and the KDF parameters + salt, so editing any of them breaks decryption |
| After decrypt | address and public key must match the entry; derived key and plaintext buffers are zeroed |
| KDF bounds when importing | N from 2^14 to 2^18, r up to 16, p up to 4 (stops a hostile backup from hanging the tab) |
| Storage | `localStorage` key `vaultchain-web:vault:v1` |
| Backup file | `{ "format": "vaultchain-keystore", "version": 1, "entries": [...] }`, max 1 MB and 50 entries. It holds the same ciphertext as the browser, so anyone with the file can guess the passphrase offline. Use a strong one |

Session handling (`lib/session.ts`): one profile is unlocked at a time. The decrypted key lives in a `Uint8Array` that is zeroed when you lock. The vault locks after an inactivity timeout (1, 5, 10, 30 or 60 minutes; default 10), when you switch profile, when the page is hidden for longer than the timeout, and on `pagehide`.

### Honest limits

- The ported client exposes the key as a hex **string** (`KeyPair.privHex`) while signing, and JavaScript strings cannot be zeroed. Memory scraping by malware or a hostile browser extension is out of scope.
- Profile name, colour and **contacts are stored unencrypted** next to the encrypted key. Name and colour are labels only and are not authenticated.
- Anyone who can run script on this origin (an XSS bug, a malicious extension) can read what you can. We ship no third-party scripts and no analytics, and the pages are static.
- Provider traffic goes through this site's `/api/provider/*` route because the provider does not enable browser CORS. The proxy forwards a fixed allowlist of paths and sees chunk bytes (ciphertext if you encrypted) and read tokens. It never receives keys or passphrases, and it stores nothing.
- The file list is derived from chain state, so manifest names, sizes, owners, grants and deals are public.
- The UI has been exercised against the live devnet in headless Chrome (create, lock, wrong passphrase, unlock, balance and tab navigation) but not with a funded account; the upload, share and download flows rely on the ported client, which is covered by the Go-vs-TS vector tests and passed the end-to-end suite in `vaultchain-upload`.

## Develop

```bash
npm ci
cp .env.example .env.local   # optional; defaults point at the public devnet
npm run dev                  # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```

Environment (all optional, see [`.env.example`](.env.example)):

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_VAULT_REST` | `https://vaultl1-devnet.fly.dev` | node REST endpoint, called directly from the browser |
| `NEXT_PUBLIC_VAULT_PROVIDER` | `https://vaultl1-provider.fly.dev` | storage provider |
| `NEXT_PUBLIC_VAULT_PROVIDER_MODE` | `proxy` | `proxy` uses `/api/provider`; `direct` needs the provider to allow this origin |
| `VAULT_PROVIDER_URL` | provider URL above | server-side override for the proxy target |
| `FAUCET_PRIVATE_KEY` | unset (faucet disabled) | server-only secret: 64-hex key of a dedicated devnet faucet account (never `NEXT_PUBLIC_`) |

`NEXT_PUBLIC_*` values are baked in at build time, so set them before building.

## Tests

`npm test` runs vitest:

- **Protocol vectors**: the TypeScript client must produce byte-identical addresses, sign bytes, signatures, Merkle roots, read tokens and vaultcrypt output to the Go implementation (`test/vectors/go-vectors.json`, generated from the node repo).
- **Keystore and profile store**: round trip, wrong passphrase fails, tampering with ciphertext or any authenticated field fails, backup parsing limits, id/createdAt preserved on passphrase change.
- **Session**: lock wipes key bytes, inactivity deadline, single unlocked profile.
- **Proxy**: path allowlist and header handling.
- **Docs and rendering**: every doc page parses with valid links, the search index builds, diagrams render accessibly, animation CSS is confined to `prefers-reduced-motion: no-preference`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a production build on Node 22.

## Devnet faucet

`POST /api/faucet` (`lib/faucet.ts`) sends 100 VAULT from a dedicated key to an empty devnet address. It is devnet-only (it refuses unless the chain id contains `devnet`), limits are per address, per IP and for the whole faucet, kept in memory and mirrored in the Vercel Runtime Cache so instances in a region share them (`lib/faucet-shared.ts`), which is best effort rather than a database, and the faucet's own balance is the hard cap. Details and honest limits: [`content/docs/guides/faucet.md`](content/docs/guides/faucet.md).

## Layout

```
app/            routes: landing, /docs, /vault, /api/provider, /api/faucet
components/     site chrome, diagrams, docs search/nav, vault UI
content/docs/   Markdown docs
lib/            keystore, session, profile store, docs loader, proxy
lib/vault/      TypeScript client (see attribution)
test/           vitest suites and Go vectors
```

## Attribution

`lib/vault/*` is a port of the client in [vaultchain-upload](https://github.com/VaultChainHQ/vaultchain-upload), which itself follows the Go reference in [vaultchain](https://github.com/VaultChainHQ/vaultchain). Both are MIT licensed.

## License

MIT, see [LICENSE](LICENSE).
