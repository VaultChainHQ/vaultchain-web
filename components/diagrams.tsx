import { DiagramFrame } from "./diagram-frame";

/* All diagrams are plain SVG + CSS keyframes (see app/landing.css). Default styles are the finished,
   static picture; animation is layered on only when the user has not asked for reduced motion. */

const path = (d: string) => ({ offsetPath: `path("${d}")` }) as React.CSSProperties;
const delay = (s: number) => ({ animationDelay: `${s}s` }) as React.CSSProperties;

function Stage({ x, n, label, children, f }: { x: number; n: string; label: string; children: React.ReactNode; f: number }) {
  return (
    <g className="dg-stage" style={delay(f * 6 - 0.2)}>
      <text x={x + 70} y="56" textAnchor="middle" className="dg-num">
        {n}
      </text>
      <rect x={x} y="70" width="140" height="120" rx="16" className="dg-box" style={delay(f * 6 - 0.2)} />
      <g transform={`translate(${x + 70} 118)`} className="dg-icon">
        {children}
      </g>
      <text x={x + 70} y="172" textAnchor="middle" className="dg-label">
        {label}
      </text>
    </g>
  );
}

export function PipelineDiagram() {
  const xs = [10, 220, 430, 640, 850];
  return (
    <DiagramFrame
      id="dg-pipeline"
      title="From file to proof: what happens when you store something"
      caption={
        <ol className="dg-steps">
          <li><strong>File.</strong> Chosen in your browser or CLI.</li>
          <li><strong>Encrypt (optional).</strong> XChaCha20-Poly1305 on your device; the file key is sealed to each reader.</li>
          <li><strong>Chunk.</strong> Split into 256 KiB pieces.</li>
          <li><strong>Merkle root.</strong> One hash commits to every chunk. The root and file metadata are published on chain.</li>
          <li><strong>Providers.</strong> A provider you pay holds the chunks.</li>
          <li><strong>Challenge loop.</strong> The chain keeps asking for a random chunk plus its Merkle path. Missing proofs cost the provider collateral.</li>
        </ol>
      }
    >
      <svg viewBox="0 0 1000 380" className="dg-svg" focusable="false" aria-hidden="true">
        <defs>
          <marker id="pl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" className="dg-arrowhead" />
          </marker>
        </defs>
        {[150, 360, 570, 780].map((x) => (
          <line key={x} x1={x + 6} y1="130" x2={x + 64} y2="130" className="dg-line" markerEnd="url(#pl-arrow)" />
        ))}
        <Stage x={xs[0]} n="01" label="File" f={0.07}>
          <path d="M-22 -34h30l18 18v50h-48z" className="dg-stroke" />
          <path d="M8 -34v18h18" className="dg-stroke" />
          <path d="M-12 0h24M-12 10h24M-12 20h14" className="dg-stroke thin" />
        </Stage>
        <Stage x={xs[1]} n="02" label="Encrypt" f={0.26}>
          <rect x="-22" y="-8" width="44" height="36" rx="6" className="dg-stroke violet" />
          <path d="M-12 -8v-10a12 12 0 0 1 24 0v10" className="dg-stroke violet" />
          <circle cx="0" cy="10" r="4" className="dg-fill violet" />
        </Stage>
        <Stage x={xs[2]} n="03" label="Chunk" f={0.5}>
          {[-26, 2].flatMap((x) => [-30, -2].map((y) => <rect key={`${x}${y}`} x={x} y={y + 6} width="24" height="24" rx="4" className="dg-stroke" />))}
        </Stage>
        <Stage x={xs[3]} n="04" label="Merkle root" f={0.72}>
          <circle cx="0" cy="-30" r="7" className="dg-fill" />
          <path d="M0 -23L-18 -6M0 -23L18 -6M-18 -6L-27 14M-18 -6L-9 14M18 -6L9 14M18 -6L27 14" className="dg-stroke thin" />
          {[-18, 18].map((x) => <circle key={x} cx={x} cy="-6" r="5" className="dg-stroke thin" />)}
          {[-27, -9, 9, 27].map((x) => <rect key={x} x={x - 4} y="14" width="8" height="8" className="dg-fill dim" />)}
        </Stage>
        <Stage x={xs[4]} n="05" label="Providers" f={0.97}>
          {[-32, -10, 12].map((y) => (
            <g key={y}>
              <rect x="-28" y={y} width="56" height="16" rx="4" className="dg-stroke thin" />
              <circle cx="-18" cy={y + 8} r="2.5" className="dg-fill" />
            </g>
          ))}
        </Stage>

        {/* chain */}
        <rect x="430" y="290" width="350" height="56" rx="14" className="dg-box chain" />
        <text x="605" y="314" textAnchor="middle" className="dg-label">Chain (public)</text>
        <text x="605" y="335" textAnchor="middle" className="dg-sub">manifest · deal · proofs · payouts</text>
        <line x1="710" y1="196" x2="710" y2="286" className="dg-line" markerEnd="url(#pl-arrow)" />
        <text x="722" y="246" className="dg-sub">publish root</text>
        <path d="M780 318H920V196" className="dg-line loop" fill="none" markerEnd="url(#pl-arrow)" />
        <text x="928" y="262" className="dg-sub amber">challenge ↑</text>
        <text x="928" y="284" className="dg-sub green">proof ↓</text>
        <text x="40" y="330" className="dg-sub">Encrypted chunks go to providers.</text>
        <text x="40" y="352" className="dg-sub">Only the root and metadata go on chain.</text>

        {/* moving parts */}
        <circle r="8" cx="0" cy="0" className="dg-packet" style={path("M0 130H990")} />
        <circle r="6" cx="0" cy="0" className="dg-commit" style={path("M710 196V286")} />
        <circle r="6" cx="0" cy="0" className="dg-chal" style={path("M780 318H920V196")} />
        <circle r="6" cx="0" cy="0" className="dg-proof" style={path("M920 196V318H780")} />
      </svg>
    </DiagramFrame>
  );
}

const leafXs = [70, 170, 270, 370, 470, 570, 670, 770];

export function MerkleDiagram() {
  // 8-leaf tree. Three audit paths cycle; each path = chosen leaf (accent) + siblings (amber).
  const l1 = [120, 320, 520, 720];
  const l2 = [220, 620];
  const root = 420;
  const y = { r: 40, a: 120, b: 200, l: 280 };
  const edge = (x1: number, y1: number, x2: number, y2: number) => <line key={`${x1}${y1}${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} className="dg-line thin" />;
  const hl = (x: number, yy: number, tone: string) =>
    yy === y.l ? (
      <rect key={`${x}${yy}`} x={x - 26} y={yy - 20} width="52" height="40" rx="9" className={`dg-hl ${tone}`} />
    ) : (
      <circle key={`${x}${yy}`} cx={x} cy={yy} r="17" className={`dg-hl ${tone}`} />
    );
  const paths = [
    { leaf: 2, sib: [{ x: 370, y: y.l }, { x: 120, y: y.b }, { x: 620, y: y.a }], on: [{ x: 270, y: y.l }, { x: 320, y: y.b }, { x: 220, y: y.a }], n: 5 },
    { leaf: 5, sib: [{ x: 470, y: y.l }, { x: 720, y: y.b }, { x: 220, y: y.a }], on: [{ x: 570, y: y.l }, { x: 520, y: y.b }, { x: 620, y: y.a }], n: 6 },
    { leaf: 7, sib: [{ x: 670, y: y.l }, { x: 520, y: y.b }, { x: 220, y: y.a }], on: [{ x: 770, y: y.l }, { x: 720, y: y.b }, { x: 620, y: y.a }], n: 8 },
  ];
  return (
    <DiagramFrame
      id="dg-merkle"
      title="Proving you still hold the data: a random chunk plus its Merkle path"
      caption={
        <p>
          Every few blocks the chain derives a challenge from public inputs: <code>chunk_index = H(seed ‖ deal ‖ provider) mod chunks</code>. The
          provider answers with that chunk and the sibling hashes (amber) that rebuild the root. The chain recomputes the path and compares it with
          the root committed in the manifest. Shown: three different challenges against one 8-chunk file.
        </p>
      }
    >
      <svg viewBox="0 0 840 400" className="dg-svg" focusable="false" aria-hidden="true">
        {/* edges */}
        {edge(root, y.r, 220, y.a)}
        {edge(root, y.r, 620, y.a)}
        {l2.map((x) => [edge(x, y.a, x - 100, y.b), edge(x, y.a, x + 100, y.b)])}
        {l1.map((x) => [edge(x, y.b, x - 50, y.l), edge(x, y.b, x + 50, y.l)])}
        {/* nodes */}
        <circle cx={root} cy={y.r} r="16" className="dg-node root" />
        <text x={root} y={y.r - 26} textAnchor="middle" className="dg-sub">committed root</text>
        {l2.map((x) => <circle key={x} cx={x} cy={y.a} r="13" className="dg-node" />)}
        {[120, 320, 520, 720].map((x) => <circle key={x} cx={x} cy={y.b} r="12" className="dg-node" />)}
        {leafXs.map((x, i) => (
          <g key={x}>
            <rect x={x - 22} y={y.l - 16} width="44" height="32" rx="6" className="dg-leaf" />
            <text x={x} y={y.l + 5} textAnchor="middle" className="dg-sub mono">c{i}</text>
          </g>
        ))}
        <text x="420" y="350" textAnchor="middle" className="dg-sub">chunks of the file</text>
        {paths.map((p, i) => (
          <g key={p.leaf} className={`dg-slot dg-slot-${i}`}>
            {p.sib.map((s) => hl(s.x, s.y, "amber"))}
            {p.on.map((s) => hl(s.x, s.y, "accent"))}
            <circle cx={root} cy={y.r} r="21" className="dg-hl accent" />
            <text x="420" y="382" textAnchor="middle" className="dg-label">
              challenge → chunk {p.leaf} (index {p.leaf} of 8)
            </text>
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}

export function RepairDiagram() {
  const prov = (y: number, id: string, name: string) => (
    <g id={id} className={`dg-prov ${id}`}>
      <rect x="380" y={y} width="190" height="80" rx="14" className="dg-box prov-box" />
      <text x="400" y={y + 32} className="dg-label">{name}</text>
      <text x="400" y={y + 56} className="dg-sub">collateral locked</text>
      {[0, 1, 2].map((i) => <circle key={i} cx={510 + i * 18} cy={y + 52} r="5" className={`dg-pip pip-${i}`} />)}
    </g>
  );
  return (
    <DiagramFrame
      id="dg-repair"
      title="Replication, a failing provider, a slash, and repair"
      caption={
        <p>
          With <code>replication = 3</code> the chain assigns three different providers. A replica that misses <code>max_missed_proofs</code> (3)
          challenges fails, loses 10% of its collateral to the owner, and its slot is reassigned to a provider that never held the deal, which copies
          from a healthy replica. <strong>This was verified end to end on an earlier devnet with extra providers; the public devnet currently runs a
          single provider, so you cannot trigger it there today.</strong>
        </p>
      }
    >
      <svg viewBox="0 0 1000 420" className="dg-svg" focusable="false" aria-hidden="true">
        <rect x="20" y="150" width="150" height="100" rx="14" className="dg-box" />
        <text x="95" y="196" textAnchor="middle" className="dg-label">Object</text>
        <text x="95" y="220" textAnchor="middle" className="dg-sub mono">root 9f2c…</text>
        {[80, 200, 320].map((y, i) => (
          <path key={y} d={`M170 200C260 200 280 ${y + 40} 380 ${y + 40}`} className={`dg-line thin ${i === 1 ? "p2-line" : ""}`} fill="none" />
        ))}
        {prov(40, "p1", "Provider 1")}
        {prov(160, "p2", "Provider 2")}
        {prov(280, "p3", "Provider 3")}
        <text x="650" y="205" className="dg-slash amber">− 10 % collateral → owner</text>
        <g className="dg-prov p4">
          <rect x="760" y="160" width="190" height="80" rx="14" className="dg-box prov-box spare" />
          <text x="780" y="192" className="dg-label">Provider 4</text>
          <text x="780" y="216" className="dg-sub">spare, never held it</text>
          <circle cx="925" cy="176" r="6" className="dg-pip p4-on" />
        </g>
        <path d="M570 80C680 80 700 200 760 200" className="dg-copy" fill="none" />
        <circle r="6" cx="0" cy="0" className="dg-copydot" style={path("M570 80C680 80 700 200 760 200")} />
        {/* captions */}
        <g className="dg-cap dg-cap-1"><text x="500" y="388" textAnchor="middle" className="dg-label">3 replicas, each answering a challenge every epoch</text></g>
        <g className="dg-cap dg-cap-2"><text x="500" y="388" textAnchor="middle" className="dg-label">Provider 2 stops answering: missed proofs 1, 2, 3</text></g>
        <g className="dg-cap dg-cap-3"><text x="500" y="388" textAnchor="middle" className="dg-label">Failed and slashed: 10 % of its collateral goes to the owner</text></g>
        <g className="dg-cap dg-cap-4"><text x="500" y="388" textAnchor="middle" className="dg-label">Repair: Provider 4 copies from Provider 1, then starts proving</text></g>
      </svg>
    </DiagramFrame>
  );
}

export function TrustDiagram() {
  const lines = (x: number, items: string[], cls = "") =>
    items.map((t, i) => (
      <text key={t} x={x} y={106 + i * 30} className={`dg-sub strong ${cls}`}>
        {t}
      </text>
    ));
  return (
    <DiagramFrame
      id="dg-trust"
      title="Who holds what"
      caption={
        <p>
          Your browser holds the secrets. The chain is public by design and records metadata, payments, proofs and access. Providers see only
          ciphertext (if you encrypted) and your network address. Keys and passphrases are never sent anywhere.
        </p>
      }
    >
      <svg viewBox="0 0 1000 380" className="dg-svg" focusable="false" aria-hidden="true">
        <defs>
          <marker id="tr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" className="dg-arrowhead" />
          </marker>
        </defs>
        <rect x="20" y="30" width="250" height="220" rx="16" className="dg-box you" />
        <rect x="375" y="30" width="250" height="220" rx="16" className="dg-box chain" />
        <rect x="730" y="30" width="250" height="220" rx="16" className="dg-box prov-box" />
        <text x="40" y="66" className="dg-label">You (browser)</text>
        <text x="395" y="66" className="dg-label">Chain (public)</text>
        <text x="750" y="66" className="dg-label">Provider</text>
        {lines(40, ["private key (encrypted)", "passphrase", "plaintext file", "file key"], "green")}
        {lines(395, ["name · size · type", "Merkle root", "deals · payments · proofs", "who has access", "sealed key envelopes"])}
        {lines(750, ["ciphertext chunks", "your IP address", "plaintext only if you", "skip encryption"], "amber")}
        <line x1="272" y1="150" x2="372" y2="150" className="dg-line" markerEnd="url(#tr-arrow)" />
        <text x="322" y="140" textAnchor="middle" className="dg-sub">signed tx</text>
        <path d="M145 252V300H855V252" className="dg-line" fill="none" markerEnd="url(#tr-arrow)" />
        <text x="500" y="290" textAnchor="middle" className="dg-sub">ciphertext + chunk proofs</text>
        <line x1="272" y1="206" x2="330" y2="206" className="dg-line bad" />
        <text x="338" y="213" className="dg-x">✕</text>
        <text x="322" y="236" textAnchor="middle" className="dg-sub red">keys never leave</text>
        <circle r="6" cx="0" cy="0" className="dg-chal" style={path("M272 150H372")} />
        <circle r="7" cx="0" cy="0" className="dg-packet" style={path("M145 252V300H855V252")} />
        <circle r="7" cx="285" cy="206" className="dg-key" />
        <text x="500" y="352" textAnchor="middle" className="dg-sub">Anyone can read the chain. Without your key, the provider only has ciphertext.</text>
      </svg>
    </DiagramFrame>
  );
}

export function ConsensusDiagram() {
  const val = [
    { x: 100, y: 50 },
    { x: 180, y: 120 },
    { x: 100, y: 190 },
    { x: 20, y: 120 },
  ];
  return (
    <DiagramFrame
      id="dg-consensus"
      title="Two ways to produce blocks"
      caption={
        <p>
          The public devnet runs the <strong>timer engine</strong>: one validator produces a block every 3 seconds. For multi-validator tests,{" "}
          <code>--consensus comet</code> runs CometBFT with an equal-power validator set; a block commits with more than two thirds of votes. There is
          no staking or validator slashing yet.
        </p>
      }
    >
      <svg viewBox="0 0 960 250" className="dg-svg" focusable="false" aria-hidden="true">
        <text x="20" y="28" className="dg-label">Timer engine · public devnet</text>
        <rect x="20" y="60" width="150" height="90" rx="14" className="dg-box" />
        <text x="95" y="112" textAnchor="middle" className="dg-label">1 validator</text>
        <g className="dg-blocks">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className={`dg-block b${i}`}>
              <rect x={230 + i * 90} y="75" width="64" height="60" rx="10" className="dg-leaf" />
              <text x={262 + i * 90} y="110" textAnchor="middle" className="dg-sub mono">#{i + 1}</text>
            </g>
          ))}
        </g>
        <text x="20" y="200" className="dg-sub">one block every 3 s, no voting, no redundancy</text>
        <g transform="translate(560 0)">
          <text x="0" y="28" className="dg-label">CometBFT mode · optional</text>
          {val.map((v, i) => (
            <g key={i}>
              <line x1={v.x + 60} y1={v.y + 25} x2="150" y2="125" className="dg-line thin" />
              <circle cx={v.x + 60} cy={v.y + 25} r="22" className="dg-node val" />
              <text x={v.x + 60} y={v.y + 30} textAnchor="middle" className="dg-sub mono">V{i + 1}</text>
              <circle r="5" cx="0" cy="0" className="dg-vote" style={{ ...path(`M${v.x + 60} ${v.y + 25}L150 125`), ...delay(i * 0.35) }} />
            </g>
          ))}
          <text x="150" y="130" textAnchor="middle" className="dg-sub amber">+⅔</text>
          <text x="260" y="95" className="dg-sub">4 validators tolerate 1 fault</text>
          <text x="260" y="120" className="dg-sub">3 validators tolerate none</text>
          <text x="260" y="145" className="dg-sub">fixed set · equal power</text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
