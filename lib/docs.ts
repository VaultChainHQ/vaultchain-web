import fs from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";

export const DOCS_DIR = path.join(process.cwd(), "content", "docs");
export const SECTION_ORDER = ["Start", "Concepts", "Guides", "Reference", "Project"] as const;

export interface DocMeta {
  slug: string; // "concepts/consensus"
  title: string;
  section: string;
  order: number;
  description: string;
}
export interface Heading {
  id: string;
  text: string;
  depth: number;
}
export interface Doc extends DocMeta {
  html: string;
  headings: Heading[];
  raw: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Minimal `key: value` frontmatter. */
export function parseFrontmatter(src: string): { data: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: src.slice(m[0].length) };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderMarkdown(body: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const md = new Marked({
    gfm: true,
    renderer: {
      heading(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Heading) {
        const text = token.text.replace(/[*_`]/g, "");
        let id = slugify(token.text);
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n > 0) id = `${id}-${n}`;
        if (token.depth === 2 || token.depth === 3) headings.push({ id, text, depth: token.depth });
        const inner = this.parser.parseInline(token.tokens as Tokens.Generic[]);
        return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Link to this section">#</a>${inner}</h${token.depth}>\n`;
      },
      code(token: Tokens.Code) {
        const lang = (token.lang ?? "").split(/\s+/)[0];
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
        return `<pre tabindex="0"><code${cls}>${escapeHtml(token.text)}</code></pre>\n`;
      },
      table(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Table) {
        const cell = (c: Tokens.TableCell, tag: string) => {
          const align = c.align ? ` style="text-align:${c.align}"` : "";
          return `<${tag}${align}>${this.parser.parseInline(c.tokens as Tokens.Generic[])}</${tag}>`;
        };
        const head = `<tr>${token.header.map((c) => cell(c, "th")).join("")}</tr>`;
        const rows = token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("");
        return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>\n`;
      },
      link(this: { parser: { parseInline(t: Tokens.Generic[]): string } }, token: Tokens.Link) {
        const inner = this.parser.parseInline(token.tokens as Tokens.Generic[]);
        const external = /^https?:\/\//.test(token.href);
        const attrs = external ? ' rel="noopener noreferrer" target="_blank"' : "";
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
        return `<a href="${escapeHtml(token.href)}"${title}${attrs}>${inner}</a>`;
      },
    },
  });
  const html = md.parse(body, { async: false }) as string;
  return { html, headings };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function toSlug(file: string): string {
  return path.relative(DOCS_DIR, file).replace(/\\/g, "/").replace(/\.md$/, "");
}

let cache: Doc[] | null = null;

export function allDocs(): Doc[] {
  if (cache) return cache;
  const docs = walk(DOCS_DIR).map((file) => {
    const slug = toSlug(file);
    const src = fs.readFileSync(file, "utf8");
    const { data, body } = parseFrontmatter(src);
    const { html, headings } = renderMarkdown(body);
    const meta: Doc = {
      slug,
      title: data.title ?? slug,
      section: data.section ?? "Project",
      order: Number(data.order ?? 99),
      description: data.description ?? "",
      html,
      headings,
      raw: body,
    };
    return meta;
  });
  docs.sort((a, b) => {
    const sa = SECTION_ORDER.indexOf(a.section as (typeof SECTION_ORDER)[number]);
    const sb = SECTION_ORDER.indexOf(b.section as (typeof SECTION_ORDER)[number]);
    return sa - sb || a.order - b.order || a.title.localeCompare(b.title);
  });
  cache = docs;
  return docs;
}

export function getDoc(slug: string): Doc | undefined {
  return allDocs().find((d) => d.slug === slug);
}

export interface NavSection {
  title: string;
  items: DocMeta[];
}

export function navSections(): NavSection[] {
  const map = new Map<string, DocMeta[]>();
  for (const d of allDocs()) {
    const meta: DocMeta = { slug: d.slug, title: d.title, section: d.section, order: d.order, description: d.description };
    map.set(d.section, [...(map.get(d.section) ?? []), meta]);
  }
  return [...map.entries()].map(([title, items]) => ({ title, items }));
}

export function prevNext(slug: string): { prev?: DocMeta; next?: DocMeta } {
  const docs = allDocs();
  const i = docs.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? docs[i - 1] : undefined, next: i >= 0 && i < docs.length - 1 ? docs[i + 1] : undefined };
}

export interface SearchEntry {
  slug: string;
  title: string;
  section: string;
  description: string;
  headings: { id: string; text: string }[];
  text: string;
}

/** Plain text of a markdown body for the search index. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, " "))
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/[*>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchIndex(): SearchEntry[] {
  return allDocs().map((d) => ({
    slug: d.slug,
    title: d.title,
    section: d.section,
    description: d.description,
    headings: d.headings.map((h) => ({ id: h.id, text: h.text })),
    text: plainText(d.raw),
  }));
}

/** Every internal `/docs/...` link in a markdown body (path and optional anchor). */
export function internalLinks(md: string): { path: string; hash?: string }[] {
  const out: { path: string; hash?: string }[] = [];
  const re = /\]\((\/[^)\s]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const [p, h] = m[1].split("#");
    out.push({ path: p, hash: h });
  }
  return out;
}
