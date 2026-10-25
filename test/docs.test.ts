import { describe, expect, it } from "vitest";
import { allDocs, getDoc, internalLinks, navSections, renderMarkdown, searchIndex, SECTION_ORDER, slugify } from "../lib/docs";
import { searchDocs } from "../lib/docsearch";

const KNOWN_ROUTES = new Set(["/", "/docs", "/vault"]);

describe("docs content", () => {
  const docs = allDocs();

  it("has the expected pages", () => {
    const slugs = docs.map((d) => d.slug);
    for (const s of [
      "getting-started",
      "concepts/storage-classes-and-deals",
      "concepts/chunking-and-merkle-roots",
      "concepts/proofs-and-slashing",
      "concepts/access-and-encryption",
      "concepts/threat-model",
      "guides/run-a-node",
      "guides/run-a-provider",
      "guides/fly-devnet",
      "reference/cli",
      "reference/node-rest",
      "reference/provider-api",
      "faq",
      "roadmap",
    ]) {
      expect(slugs).toContain(s);
    }
  });

  it("has valid frontmatter", () => {
    for (const d of docs) {
      expect(d.title, d.slug).not.toBe(d.slug);
      expect(SECTION_ORDER as readonly string[], d.slug).toContain(d.section);
      expect(d.description.length, d.slug).toBeGreaterThan(20);
      expect(Number.isFinite(d.order)).toBe(true);
    }
    expect(new Set(docs.map((d) => d.slug)).size).toBe(docs.length);
  });

  it("every internal link points at a real page and anchor", () => {
    const problems: string[] = [];
    for (const d of docs) {
      for (const l of internalLinks(d.raw)) {
        if (KNOWN_ROUTES.has(l.path)) continue;
        const m = /^\/docs\/(.+)$/.exec(l.path);
        const target = m ? getDoc(m[1]) : undefined;
        if (!target) {
          problems.push(`${d.slug}: ${l.path} does not exist`);
          continue;
        }
        if (l.hash && !target.headings.some((h) => h.id === l.hash)) problems.push(`${d.slug}: ${l.path}#${l.hash} has no such heading`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("renders no raw markdown artefacts", () => {
    for (const d of docs) {
      expect(d.html.replace(/<pre[\s\S]*?<\/pre>/g, ""), d.slug).not.toMatch(/(^|\n)#{1,6} /);
      expect(d.html, d.slug).toContain("<h1");
    }
  });

  it("builds a sidebar in section order", () => {
    const names = navSections().map((s) => s.title);
    expect(names).toEqual([...SECTION_ORDER].filter((s) => names.includes(s)));
  });

  it("makes stable heading ids", () => {
    expect(slugify("IBC payments only")).toBe("ibc-payments-only");
    const { html, headings } = renderMarkdown("## A\n\n## A\n\ntext");
    expect(headings.map((h) => h.id)).toEqual(["a", "a-1"]);
    expect(html).toContain('id="a-1"');
  });

  it("escapes code blocks", () => {
    const { html } = renderMarkdown("```html\n<script>alert(1)</script>\n```");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("docs search", () => {
  const index = searchIndex();
  it("finds pages by title, heading and body", () => {
    expect(searchDocs(index, "merkle")[0].slug).toContain("chunking");
    expect(searchDocs(index, "slashing").map((h) => h.slug)).toContain("concepts/proofs-and-slashing");
    expect(searchDocs(index, "X-Vault-Proof").map((h) => h.slug)).toContain("reference/provider-api");
    expect(searchDocs(index, "ALLOW_ORIGIN").length).toBeGreaterThan(0);
  });
  it("returns nothing for gibberish and empty input", () => {
    expect(searchDocs(index, "")).toEqual([]);
    expect(searchDocs(index, "zzzqqxxyy")).toEqual([]);
  });
});
