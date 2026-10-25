"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a server-rendered SVG diagram. Animations run only while the diagram is on screen
 * and can be paused by the reader. The CSS also drops all motion under prefers-reduced-motion,
 * leaving a readable static end state.
 */
export function DiagramFrame({
  id,
  title,
  caption,
  children,
}: {
  id: string;
  title: string;
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const play = visible && !paused;
  return (
    <figure className="dg" data-play={play ? "1" : "0"} ref={ref} aria-labelledby={`${id}-t`}>
      <div className="dg-bar">
        <figcaption id={`${id}-t`}>{title}</figcaption>
        <button type="button" className="btn sm dg-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          {paused ? "▶ Play animation" : "❚❚ Pause animation"}
        </button>
      </div>
      <div className="dg-scroll" role="img" aria-label={title} tabIndex={0}>
        {children}
      </div>
      <div className="dg-caption">{caption}</div>
    </figure>
  );
}
