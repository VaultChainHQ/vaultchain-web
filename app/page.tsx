import Link from "next/link";
import { ConsensusDiagram, MerkleDiagram, PipelineDiagram, RepairDiagram, TrustDiagram } from "@/components/diagrams";
import { LiveStats } from "@/components/live-stats";
import { EXPLORER_URL, REPOS } from "@/lib/links";
import "./landing.css";

export default function Home() {
  return (
    <>
      <section className="hero wrap" id="top">
        <p className="eyebrow">Devnet · lab-grade · unaudited</p>
        <h1>
          Store files you can <em>prove</em> are still there.
        </h1>
        <p className="lead">
          VaultChain splits a file into chunks, commits to it with a Merkle root, pays a provider to hold it, and keeps checking with possession proofs
          that the provider really has it. Encrypt in your browser, keep your own keys, and check the chain yourself.
        </p>
        <div className="hero-cta">
          <Link href="/vault" className="btn primary">
            Open the web vault
          </Link>
          <Link href="/docs/getting-started" className="btn">
            Read the docs
          </Link>
          <a href={EXPLORER_URL} className="btn" rel="noopener noreferrer" target="_blank">
            Explorer ↗
          </a>
        </div>
        <LiveStats />
        <p className="callout hero-warn">
          <strong>Devnet only.</strong> One validator, one provider, tokens with no value, no audit, and the network can be reset. Do not store anything
          you cannot afford to lose, and never reuse a real-money key here.
        </p>
      </section>

      <section className="wrap section" aria-labelledby="pipeline">
        <h2 id="pipeline">How a file becomes a verifiable deal</h2>
        <p className="sub">Everything below is how the code in the repository behaves today, not a roadmap.</p>
        <PipelineDiagram />
      </section>

      <section className="wrap section" aria-labelledby="flow">
        <h2 id="flow">Four steps</h2>
        <ol className="steps4">
          <li>
            <h3>Commit</h3>
            <p>
              Your device chunks the file (256 KiB by default), builds a Merkle tree and publishes a manifest with the root, size, name and type.
            </p>
          </li>
          <li>
            <h3>Pay</h3>
            <p>
              You open a deal: pick a class, a provider (or let the chain pick), a duration, and escrow the payment. A small file for 10,000 blocks
              (about 8 hours) costs 10 VAULT on the devnet.
            </p>
          </li>
          <li>
            <h3>Store</h3>
            <p>
              The provider receives the bytes, verifies them against the root, accepts the deal and locks collateral. If it never accepts, you are
              refunded.
            </p>
          </li>
          <li>
            <h3>Prove</h3>
            <p>
              The chain challenges a random chunk each epoch. Valid proofs earn the provider the escrow; repeated misses slash collateral and trigger
              repair.
            </p>
          </li>
        </ol>
      </section>

      <section className="wrap section" aria-labelledby="ways">
        <h2 id="ways">Three ways in</h2>
        <p className="sub">Same chain, same wire format. Pick the one that fits.</p>
        <div className="ways">
          <div className="card">
            <h3>Web vault</h3>
            <p>
              Create a profile in your browser. Its key is encrypted with your passphrase, never uploaded, and used to sign uploads, shares and
              downloads.
            </p>
            <pre>{`1. Create a profile + passphrase
2. Get devnet funds sent to your address
3. Drop a file, tick "encrypt"
4. Share with a contact, or revoke`}</pre>
            <Link href="/vault" className="btn primary">
              Open the vault
            </Link>
          </div>
          <div className="card">
            <h3>CLI</h3>
            <p>
              <code>vaultd</code> is the node and the client. Commit, deal, upload and decrypt from a terminal.
            </p>
            <pre>{`vaultd tx storage commit-manifest ./a.pdf \\
  --encrypt --cipher-out a.vle --from me
vaultd tx storage open-deal market <root> \\
  0 - 10000 uvault --from me
curl -X POST --data-binary @a.vle \\
  $PROVIDER/v1/objects/<root>`}</pre>
            <Link href="/docs/reference/cli" className="btn">
              CLI reference
            </Link>
          </div>
          <div className="card">
            <h3>REST API</h3>
            <p>Plain JSON over HTTP with CORS on. Query state, then submit transactions you signed yourself.</p>
            <pre>{`curl -s https://vaultl1-devnet.fly.dev\\
/vaultchain/storage/providers
curl -s https://vaultl1-devnet.fly.dev\\
/vaultchain/storage/deals/1`}</pre>
            <Link href="/docs/reference/node-rest" className="btn">
              API reference
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="holds">
        <h2 id="holds">Who holds what</h2>
        <p className="sub">The chain is public on purpose. What stays private depends on what you encrypt and how you keep your key.</p>
        <TrustDiagram />
        <div className="split" style={{ marginTop: 24 }}>
          <div className="card good">
            <h3>Protected</h3>
            <ul>
              <li>File contents, if you encrypted before upload (the provider sees ciphertext).</li>
              <li>Your private key and passphrase: they never leave your browser.</li>
              <li>Integrity: a provider cannot swap bytes without breaking the Merkle root.</li>
              <li>Access: readers need a signed token and an on-chain grant; revocation takes effect within seconds.</li>
              <li>Your payment: escrowed on chain and paid out at expiry only to a replica that proved; otherwise refunded.</li>
            </ul>
          </div>
          <div className="card warn">
            <h3>Not promised</h3>
            <ul>
              <li>Metadata privacy: names, sizes, types, owners, grants and deal history are public.</li>
              <li>Availability: one provider, one node, no backups. Loss of a volume is loss of the chain.</li>
              <li>Recovery: lose your passphrase or key and nobody can restore your files.</li>
              <li>Un-sharing: revocation cannot take back a key someone already opened.</li>
              <li>Unencrypted files: readable by the provider and anyone it serves them to.</li>
              <li>Security review: none. Treat it as a lab.</li>
            </ul>
          </div>
        </div>
        <div className="table-scroll" style={{ marginTop: 24 }}>
          <table className="holds">
            <caption className="sr-only">What each party can see</caption>
            <thead>
              <tr>
                <th scope="col">Party</th>
                <th scope="col">Holds</th>
                <th scope="col">Can see</th>
                <th scope="col">Cannot do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>You</td>
                <td>Private key, passphrase, file key, plaintext</td>
                <td>Everything you own</td>
                <td>Recover a lost key</td>
              </tr>
              <tr>
                <td>Chain</td>
                <td>Manifests, deals, proofs, grants, sealed key envelopes</td>
                <td>Metadata and public keys</td>
                <td>Read your file contents</td>
              </tr>
              <tr>
                <td>Provider</td>
                <td>Chunks of ciphertext (or plaintext if not encrypted)</td>
                <td>Chunk bytes, your IP, who reads</td>
                <td>Decrypt without your grant, forge a proof for chunks it deleted</td>
              </tr>
              <tr>
                <td>This website</td>
                <td>Static pages and a thin provider proxy</td>
                <td>Chunk bytes and read tokens in transit</td>
                <td>Sign for you; it never receives keys or passphrases</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="proofs">
        <h2 id="proofs">Possession proofs</h2>
        <p className="sub">
          A provider that deleted your file cannot answer a challenge it could not predict. The check is cheap for the chain: one chunk, one path, one hash
          comparison.
        </p>
        <MerkleDiagram />
        <p className="muted small" style={{ marginTop: 12 }}>
          Honest limits: the challenge seed is the public app hash, a proof shows one chunk in one epoch (not the whole file), and there is no validator
          staking yet. Details in <Link href="/docs/concepts/proofs-and-slashing">proofs and slashing</Link> and the{" "}
          <Link href="/docs/concepts/threat-model">threat model</Link>.
        </p>
      </section>

      <section className="wrap section" aria-labelledby="repair">
        <h2 id="repair">Replication and repair</h2>
        <p className="sub">Archive deals default to three replicas on different providers. When one stops proving, its slot moves.</p>
        <RepairDiagram />
      </section>

      <section className="wrap section" aria-labelledby="consensus">
        <h2 id="consensus">Consensus</h2>
        <p className="sub">
          Deterministic state machine, signed transactions, a bbolt store. Two engines run it. IBC is limited to a payments-only policy.{" "}
          <Link href="/docs/concepts/consensus">Read more</Link>.
        </p>
        <ConsensusDiagram />
      </section>

      <section className="wrap section" aria-labelledby="notes">
        <h2 id="notes">Lab notes</h2>
        <p className="sub">What has been run, what is live, and what is missing. Last updated 25 Oct 2026.</p>
        <div className="notes">
          <div className="card">
            <h3>Verified</h3>
            <ul>
              <li>Remote end-to-end script: 44/44 checks against the public devnet.</li>
              <li>Private (encrypted) end-to-end script: 24/24 checks.</li>
              <li>Replication 11/11 and repair 15/15 on an earlier devnet with extra providers.</li>
              <li>A 3-validator CometBFT network on Fly, run and retired.</li>
              <li>TypeScript client checked byte-for-byte against Go test vectors.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Live right now</h3>
            <ul>
              <li>One timer-engine validator on Fly (chain <span className="mono">vault-devnet-1</span>, 3 s blocks, reset 25 Oct 2026).</li>
              <li>One provider with 700 MB capacity.</li>
              <li>Test files and deals left behind by the end-to-end runs.</li>
              <li>No faucet. Ask for funds or run your own node.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Not built</h3>
            <ul>
              <li>Staking and validator slashing, a state Merkle commitment for light clients.</li>
              <li>Stronger challenge randomness, deal renewal, partial decryption.</li>
              <li>Real IBC token transfers.</li>
              <li>An external audit.</li>
            </ul>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          <Link href="/docs/roadmap">Roadmap</Link> · <a href={REPOS.chain} rel="noopener noreferrer" target="_blank">source</a>
        </p>
      </section>

      <section className="wrap">
        <div className="cta-band">
          <h2>Try it with a throwaway key</h2>
          <p className="muted">No account, no email. A profile lives in your browser and its key is encrypted with your passphrase.</p>
          <div className="hero-cta">
            <Link href="/vault" className="btn primary">
              Open the web vault
            </Link>
            <Link href="/docs" className="btn">
              Browse the docs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
