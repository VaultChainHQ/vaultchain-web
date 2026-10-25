import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allDocs, getDoc, prevNext } from "@/lib/docs";

export const dynamicParams = false;

export function generateStaticParams() {
  return allDocs().map((d) => ({ slug: d.slug.split("/") }));
}

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = getDoc(slug.join("/"));
  if (!d) return {};
  return { title: d.title, description: d.description };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const d = getDoc(slug.join("/"));
  if (!d) notFound();
  const { prev, next } = prevNext(d.slug);
  return (
    <div className="docs-article-row">
      <article className="prose">
        <p className="eyebrow">{d.section}</p>
        <div dangerouslySetInnerHTML={{ __html: d.html }} />
        <nav className="pager" aria-label="Previous and next">
          {prev ? (
            <Link href={`/docs/${prev.slug}`} rel="prev">
              <span>← Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/docs/${next.slug}`} rel="next" className="right">
              <span>Next →</span>
              {next.title}
            </Link>
          ) : null}
        </nav>
      </article>
      {d.headings.length > 1 && (
        <nav className="toc" aria-label="On this page">
          <h2>On this page</h2>
          <ul>
            {d.headings.map((h) => (
              <li key={h.id} className={h.depth === 3 ? "sub" : ""}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
