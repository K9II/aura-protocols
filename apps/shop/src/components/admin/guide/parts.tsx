// Building blocks for Guide chapters (mock 2026-10-04-admin-guide-mocks).
// Chapter enforces the structure: lede → Common tasks → How it works → Watch out for.
import { Fragment } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/ui";
import { SECTIONS, chapterById, chapterNumber, sectionId, type ChapterId, type SectionKey } from "@/components/admin/guide/chapters";

export function Ui({ children }: { children: React.ReactNode }) {
  return <span className="a-ui">{children}</span>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="a-gp">{children}</p>;
}

export function Step({ children }: { children: React.ReactNode }) {
  return <li><span>{children}</span></li>;
}

export function Task({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="a-task">
      <h4>{title}{note && <small>{note}</small>}</h4>
      <ol className="a-gsteps">{children}</ol>
    </div>
  );
}

export function Rules({ items }: { items: Array<[string, React.ReactNode]> }) {
  return <div className="a-rulelist">{items.map(([k, v]) => <Fragment key={k}><div className="k">{k}</div><div>{v}</div></Fragment>)}</div>;
}

export function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="a-ex">
      <div className="a-ex-h"><b>Worked example</b><span>{title}</span></div>
      <div className="a-ex-b">{children}</div>
    </div>
  );
}

export function Chapter({ id, lede, tasks, how, watch }: { id: ChapterId; lede: React.ReactNode; tasks: React.ReactNode; how: React.ReactNode; watch: React.ReactNode[] }) {
  const c = chapterById(id);
  const body: Record<SectionKey, React.ReactNode> = {
    tasks,
    how,
    watch: <ul className="a-watch">{watch.map((w, i) => <li key={i}><Icon name="warn" /><span>{w}</span></li>)}</ul>,
  };
  return (
    <section className="a-chap" id={id} aria-labelledby={`${id}-title`}>
      <div className="a-chap-k">Chapter {chapterNumber(id)}{c.group ? ` · ${c.group}` : ""}</div>
      <div className="a-chap-h">
        <h2 id={`${id}-title`}>{c.title}</h2>
        {c.href && <Link href={c.href}>Open {c.title} <Icon name="arrow" /></Link>}
      </div>
      <p className="a-chap-lede">{lede}</p>
      {SECTIONS.map((s) => (
        <div key={s.key} className="a-gsec" id={sectionId(id, s.key)}>
          <h3>{s.title}</h3>
          {body[s.key]}
        </div>
      ))}
    </section>
  );
}
