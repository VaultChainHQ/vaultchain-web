import type { SearchEntry } from "./docs";

export interface SearchHit {
  slug: string;
  title: string;
  section: string;
  anchor?: string;
  anchorText?: string;
  snippet: string;
  score: number;
}

function terms(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .filter((t) => t.length > 1 || /\d/.test(t));
}

/** Small, dependency-free scorer: title > headings > description > body. */
export function searchDocs(index: SearchEntry[], query: string, limit = 8): SearchHit[] {
  const ts = terms(query);
  if (ts.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const e of index) {
    const title = e.title.toLowerCase();
    const desc = e.description.toLowerCase();
    const text = e.text.toLowerCase();
    let score = 0;
    let matchedAll = true;
    let anchor: SearchHit["anchor"];
    let anchorText: SearchHit["anchorText"];
    let bestHeading = 0;
    for (const t of ts) {
      let s = 0;
      if (title.includes(t)) s += 10;
      if (desc.includes(t)) s += 3;
      let hs = 0;
      for (const h of e.headings) {
        if (h.text.toLowerCase().includes(t)) {
          hs += 5;
          if (hs > bestHeading) {
            bestHeading = hs;
            anchor = h.id;
            anchorText = h.text;
          }
        }
      }
      s += hs;
      const idx = text.indexOf(t);
      if (idx >= 0) s += 1 + Math.min(3, (text.split(t).length - 1) / 3);
      if (s === 0) matchedAll = false;
      score += s;
    }
    if (!matchedAll || score === 0) continue;
    const first = text.indexOf(ts[0]);
    const start = Math.max(0, first - 50);
    const snippet = first >= 0 ? (start > 0 ? "…" : "") + e.text.slice(start, start + 140) + "…" : e.description;
    hits.push({ slug: e.slug, title: e.title, section: e.section, anchor, anchorText, snippet, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
