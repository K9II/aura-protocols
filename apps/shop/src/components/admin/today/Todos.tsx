// Today's left column: the to-do sections in order, each loaded on its own.
// Server component; only the Done dialog is client-side.
import { Fragment } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/ui";
import AlertDone from "@/components/admin/today/AlertDone";
import { announceAction } from "@/app/admin/email/actions";
import WarningAction from "@/components/admin/disputes/WarningAction";
import ReviewedButton from "@/components/admin/wholesale/ReviewedButton";
import type { Slot, TodoLine, TodoSection } from "@/lib/today/todos";

function Title({ l }: { l: TodoLine }) {
  if (l.mono) return <>{l.href ? <Link className="mono" href={l.href}>{l.mono}</Link> : <span className="mono">{l.mono}</span>} · {l.title}</>;
  return l.href ? <Link href={l.href}>{l.title}</Link> : <>{l.title}</>;
}

type Can = { resolve: boolean; warnings: boolean; announce: boolean; review: boolean };

function Action({ a, can }: { a: NonNullable<TodoLine["action"]>; can: Can }) {
  if ("announce" in a) {
    if (!can.announce) return null;
    return <form action={announceAction}><button type="submit" className="a-btn sm"><Icon name="send" />{a.label}</button></form>;
  }
  if ("warning" in a) return can.warnings ? <WarningAction w={a.warning} dialogKey={`today-${a.warning.id}`} /> : null;
  if ("review" in a) return can.review ? <ReviewedButton customerId={a.review.customerId} name={a.review.name} /> : null;
  return <Link className="a-btn sm" href={a.href}>{a.icon && <Icon name={a.icon} />}{a.label}</Link>;
}

function Line({ l, can }: { l: TodoLine; can: Can }) {
  return (
    <div className="a-trow">
      <span className={`ic ${l.tone}`}><Icon name={l.icon} /></span>
      <div>
        <div className="t1"><Title l={l} />{l.alert && <span className="x">×{l.alert.count}</span>}</div>
        <div className="t2">{l.detail}{l.age && <span className={`age-ph${l.age.late ? " red" : ""}`}> · {l.age.text}</span>}</div>
      </div>
      <div className="rt">
        {l.age && <span className={`age${l.age.late ? " red" : ""}`}>{l.age.text}</span>}
        {l.chip && <span className={`a-chip ${l.chip.tone} nodot`}>{l.chip.text}</span>}
        {l.alert && can.resolve && <AlertDone alert={l.alert} />}
        {l.action && <Action a={l.action} can={can} />}
      </div>
    </div>
  );
}

function Section({ s, can }: { s: TodoSection; can: Can }) {
  return (
    <section className={`a-tsec${s.key === "alerts" ? " alerts" : ""}`} aria-labelledby={`t-${s.key}`}>
      <div className="a-tsec-h">
        <Icon name={s.icon} style={s.key === "alerts" ? { color: "var(--specimen)" } : undefined} />
        <h2 id={`t-${s.key}`}>{s.title}</h2>
        <span className={`n${s.tone ? ` ${s.tone}` : ""}`}>{s.n}</span>
        {s.link && <Link className="r" href={s.link.href}>{s.link.label}</Link>}
      </div>
      {s.lines.map((l) => <Line key={l.key} l={l} can={can} />)}
      {s.more > 0 && (s.link
        ? <Link className="a-tmore" href={s.link.href}>and {s.more} more →</Link>
        : <div className="a-tmore">and {s.more} more</div>)}
    </section>
  );
}

function Failed({ slot, reloadHref }: { slot: Slot; reloadHref: string }) {
  return (
    <section className="a-tsec" aria-labelledby={`t-${slot.key}`}>
      <div className="a-tsec-h"><Icon name={slot.icon} /><h2 id={`t-${slot.key}`}>{slot.title}</h2></div>
      <div className="a-failed" role="alert">
        <Icon name="warn" /><span>Couldn&apos;t load {slot.title.toLowerCase()}. The rest of the page is current.</span>
        <a className="a-btn sm" href={reloadHref}>Reload</a>
      </div>
    </section>
  );
}

export default function Todos({ slots, reloadHref, can }: { slots: Slot[]; reloadHref: string; can: Can }) {
  const failed = slots.some((s) => s.sections === null);
  const anything = slots.some((s) => (s.sections?.length ?? 0) > 0);
  return (
    <div className="a-todo">
      {slots.map((slot) => (
        <Fragment key={slot.key}>
          {slot.sections === null ? <Failed slot={slot} reloadHref={reloadHref} /> : slot.sections.map((s) => <Section key={s.key} s={s} can={can} />)}
        </Fragment>
      ))}
      {!failed && !anything && (
        <div className="a-allclear">
          <Icon name="check" />
          <div className="big">All <em>clear.</em></div>
          <div className="tdate">No alerts, nothing to ship, stock above its low marks, emails healthy.</div>
        </div>
      )}
    </div>
  );
}
