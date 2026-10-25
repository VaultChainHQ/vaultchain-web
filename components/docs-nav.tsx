"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/docs";

export function DocsNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  return (
    <nav className="docs-nav">
      {sections.map((s) => (
        <div key={s.title}>
          <h2>{s.title}</h2>
          <ul>
            {s.items.map((d) => {
              const href = `/docs/${d.slug}`;
              const current = pathname === href;
              return (
                <li key={d.slug}>
                  <Link href={href} aria-current={current ? "page" : undefined} className={current ? "on" : ""}>
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
