"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchEntry } from "@/lib/docs";
import { searchDocs, type SearchHit } from "@/lib/docsearch";

export function DocsSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const hits: SearchHit[] = index ? searchDocs(index, q) : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function load() {
    if (index || failed) return;
    fetch("/docs/search-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: SearchEntry[]) => setIndex(j))
      .catch(() => setFailed(true));
  }

  function go(h: SearchHit) {
    setOpen(false);
    setQ("");
    router.push(`/docs/${h.slug}${h.anchor ? `#${h.anchor}` : ""}`);
  }

  return (
    <div className="dsearch" role="search">
      <label className="sr-only" htmlFor={listId + "-in"}>
        Search the docs
      </label>
      <input
        ref={input}
        id={listId + "-in"}
        type="search"
        autoComplete="off"
        placeholder="Search docs  ( / )"
        value={q}
        role="combobox"
        aria-expanded={open && q.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && hits[active]) {
            e.preventDefault();
            go(hits[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      {open && q.trim().length > 0 && (
        <ul id={listId} className="dsearch-list" role="listbox">
          {failed && <li className="dsearch-empty">Search is unavailable. Use the sidebar instead.</li>}
          {!failed && !index && <li className="dsearch-empty">Loading index…</li>}
          {index && hits.length === 0 && <li className="dsearch-empty">No results for “{q}”.</li>}
          {hits.map((h, i) => (
            <li key={h.slug} role="option" aria-selected={i === active}>
              <button type="button" className={i === active ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => go(h)}>
                <span className="dsearch-title">
                  {h.title}
                  {h.anchorText ? <span className="dsearch-anchor"> › {h.anchorText}</span> : null}
                </span>
                <span className="dsearch-section">{h.section}</span>
                <span className="dsearch-snip">{h.snippet}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
