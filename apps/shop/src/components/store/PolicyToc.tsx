"use client";

import { useEffect, useState } from "react";

// Contents list for a policy page. Plain anchor links (works without JS);
// on wide screens it sits in a sticky rail and highlights the section in view.
export default function PolicyToc({ items }: { items: { id: string; heading: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    for (const { id } of items) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="s-toc" aria-label="Contents">
      <p className="s-micro mb-3">Contents</p>
      <ol>
        {items.map(({ id, heading }, i) => (
          <li key={id} data-active={active === id || undefined}>
            <a href={`#${id}`} aria-current={active === id ? "location" : undefined}>
              <span className="s-toc-num">{String(i + 1).padStart(2, "0")}</span>
              {heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
