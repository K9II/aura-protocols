"use client";

// Contents rail (desktop, follows the scroll) and jump menu (phone) for the Guide.
import { useEffect, useState } from "react";
import { CHAPTERS, SECTIONS, chapterNumber, sectionId, type ChapterId } from "@/components/admin/guide/chapters";

const chapterOf = (id: string) => id.split("-")[0] as ChapterId;

export default function GuideNav() {
  const [active, setActive] = useState<string>(CHAPTERS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = CHAPTERS.flatMap((c) => [c.id, ...SECTIONS.map((s) => sectionId(c.id, s.key))]);
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    // A band just under the sticky top bar: whatever crosses it is "where you are".
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target.id);
      const pick = hit.find((id) => id.includes("-")) ?? hit[0];
      if (pick) setActive(pick);
    }, { rootMargin: "-60px 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const chapter = chapterOf(active);
  return (
    <>
      <nav className="a-g-toc a-only-desk" aria-label="Guide contents">
        <div className="l">Contents</div>
        <ol>
          {CHAPTERS.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className={chapter === c.id ? "on" : undefined} aria-current={chapter === c.id ? "true" : undefined}>
                <span className="n">{chapterNumber(c.id)}</span>{c.title}
              </a>
              {chapter === c.id && (
                <ul>
                  {SECTIONS.map((s) => {
                    const id = sectionId(c.id, s.key);
                    return <li key={id}><a href={`#${id}`} className={active === id ? "on" : undefined}>{s.title}</a></li>;
                  })}
                </ul>
              )}
            </li>
          ))}
          <li className="soon"><span className="n">·</span>Disputes, Inquiries… added as each ships</li>
        </ol>
      </nav>
      <label className="a-g-jump a-only-phone">
        <small>Chapter</small>
        <select aria-label="Jump to chapter" value={chapter} onChange={(e) => { window.location.hash = e.target.value; }}>
          {CHAPTERS.map((c) => <option key={c.id} value={c.id}>{chapterNumber(c.id)} · {c.title}</option>)}
        </select>
      </label>
    </>
  );
}
