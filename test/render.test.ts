import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsensusDiagram, MerkleDiagram, PipelineDiagram, RepairDiagram, TrustDiagram } from "../components/diagrams";
import { VaultApp } from "../components/vault/app";

const diagrams = { PipelineDiagram, MerkleDiagram, RepairDiagram, TrustDiagram, ConsensusDiagram };

describe("motion diagrams", () => {
  for (const [name, C] of Object.entries(diagrams)) {
    it(`${name} renders an accessible figure`, () => {
      const html = renderToStaticMarkup(createElement(C));
      expect(html).toContain("<svg");
      expect(html).toContain("<figure");
      expect(html).toMatch(/role="img"/);
      expect(html).toMatch(/aria-label="[^"]{10,}"/);
      expect(html).toMatch(/<figcaption/);
      // every diagram offers a pause control
      expect(html).toMatch(/Pause|pause/);
    });
  }

  it("all animation lives inside a prefers-reduced-motion: no-preference block", () => {
    const css = readFileSync("app/landing.css", "utf8");
    // strip every `@media (prefers-reduced-motion: no-preference) { ... }` block by brace matching
    let out = "";
    let i = 0;
    const marker = "@media (prefers-reduced-motion: no-preference)";
    for (;;) {
      const at = css.indexOf(marker, i);
      if (at < 0) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, at);
      let depth = 0;
      let j = css.indexOf("{", at);
      do {
        if (css[j] === "{") depth++;
        if (css[j] === "}") depth--;
        j++;
      } while (depth > 0 && j < css.length);
      i = j;
    }
    // keyframes definitions are inert without an `animation` property that uses them
    expect(out).not.toMatch(/animation\s*:/);
    expect(out).not.toMatch(/animation-name\s*:/);
    expect(css).toMatch(marker);
  });
});

describe("vault app shell", () => {
  it("renders a loading state on the server (no storage access, no key material)", () => {
    const html = renderToStaticMarkup(createElement(VaultApp));
    expect(html).toContain("Loading the vault");
    expect(html).not.toMatch(/password/i);
  });
});
