// Activity on a code, a batch, or Settings (cap changes): what changed, when, and who.
import type { CodeEvent } from "@/lib/discounts/data";
import { dateTime } from "@/lib/discounts/time";

const EVENT_TEXT: Record<string, string> = { created: "Created", edited: "Rule edited", paused: "Paused", resumed: "Resumed", ended: "Ended", use_reset: "Use reset", cap_changed: "Cap changed" };

// A reset event's detail is the redemption id; show the order it belonged to.
export function eventText(e: CodeEvent, orderOf: Map<string, string> = new Map()): string {
  if (e.kind === "use_reset") { const o = e.detail ? orderOf.get(e.detail) : undefined; return o ? `Use reset on ${o}` : "Use reset"; }
  if (e.kind === "cap_changed" && e.detail) return e.detail;
  const label = EVENT_TEXT[e.kind] ?? e.kind;
  return e.detail && e.detail !== label ? `${label} — ${e.detail}` : label;
}

export default function ActivityCard({ events, orderOf, title = "Activity" }: { events: CodeEvent[]; orderOf?: Map<string, string>; title?: string }) {
  return (
    <div className="a-card">
      <div className="a-card-h"><h3>{title}</h3></div>
      <div className="a-card-b">
        {events.length === 0 ? <p className="muted">Nothing yet.</p> : (
          <ul className="a-log">{events.map((e) => <li key={e.id}><div>{eventText(e, orderOf)}<small>{dateTime(e.at)}{e.actorName ? ` · ${e.actorName}` : ""}</small></div></li>)}</ul>
        )}
      </div>
    </div>
  );
}
