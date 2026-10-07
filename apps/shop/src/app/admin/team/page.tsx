import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { listTeam, inquiryDraftsBy, type TeamMember } from "@/lib/staff/data";
import { PERMISSIONS, PERMISSION_LABEL } from "@/lib/staff/permissions";
import { rolePermissions, ROLE_LABEL, type RoleId } from "@/lib/staff/roles";
import { activityFeed, ACTIVITY_PAGE } from "@/lib/audit/feed";
import { currentMs } from "@/lib/clock";
import { whenText } from "@/lib/today/time";
import { Crumbs, Icon } from "@/components/admin/ui";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { disableStaffAction, enableStaffAction, signOutStaffAction } from "@/app/admin/team/actions";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };

const DAY_MS = 86_400_000;
const initials = (name: string, role: RoleId) => (role === "assistant" ? "AI" : name.slice(0, 2).toUpperCase());

// Kill-switch controls for one row — Sign out everywhere / Disable when
// active, Enable when disabled. Identical content renders twice (desktop
// table + phone cards); ConfirmDialog's useId keeps each dialog unique.
function RowActions({ m }: { m: TeamMember }) {
  if (m.status === "disabled") {
    return (
      <ConfirmDialog label="Enable" title="Enable the Assistant?" confirmLabel="Enable" action={enableStaffAction} fields={{ id: m.id }} small>
        Claude can sign in to the command center again.
      </ConfirmDialog>
    );
  }
  return (
    <>
      <ConfirmDialog label="Sign out everywhere" title="Sign the Assistant out everywhere?" confirmLabel="Sign out everywhere" action={signOutStaffAction} fields={{ id: m.id }} small>
        Ends every session for {m.email}. Claude can sign in again with its password — use Disable to keep it out.
      </ConfirmDialog>
      <ConfirmDialog label="Disable" tone="danger" title="Disable the Assistant?" confirmLabel="Disable" action={disableStaffAction} fields={{ id: m.id }} small>
        <div style={{ color: "var(--ink-soft)" }}>Claude is signed out and can&apos;t open the command center until you enable it again. Its drafts stay where they are; nothing it did is undone.</div>
        <label className="a-fld" style={{ marginTop: 12 }}>
          <span>Reason <span className="muted" style={{ fontWeight: 400 }}>(optional, shown in Activity)</span></span>
          <div className="a-input"><input name="reason" maxLength={200} /></div>
        </label>
      </ConfirmDialog>
    </>
  );
}

export default async function TeamPage() {
  const me = await requirePermission("staff.manage");
  const nowMs = currentMs();
  const team = await listTeam();
  const since = new Date(nowMs - 7 * DAY_MS).toISOString();
  const counts = await Promise.all(team.map((m) => activityFeed({ actor: m.id, since }, () => "").then((r) => r.items.length)));
  const assistant = team.find((m) => m.role === "assistant");
  const drafts = assistant ? await inquiryDraftsBy(assistant.id) : 0;

  const assistantPerms = rolePermissions("assistant");
  const canDo = PERMISSIONS.filter((p) => assistantPerms.has(p));
  const cant = PERMISSIONS.filter((p) => !assistantPerms.has(p));

  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Team" }]} />
      <div className="a-ph"><div><h1>Team</h1><p>Who can sign in to the command center. Everything each person does is in Activity under their name.</p></div></div>

      <table className="a-t a-team a-only-desk">
        <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Last 7 days</th><th /></tr></thead>
        <tbody>{team.map((m, i) => {
          const isSelf = m.id === me.id;
          const n = counts[i];
          const countLabel = n >= ACTIVITY_PAGE ? `${ACTIVITY_PAGE}+` : String(n);
          return (
            <tr key={m.id}>
              <td>
                <div className="a-team-person">
                  <div className={`a-avatar${m.role === "assistant" ? " asst" : ""}`} aria-hidden>{initials(m.name, m.role)}</div>
                  <div><b style={{ fontWeight: 600 }}>{m.name}</b><span className="sub">{m.email} · {m.signIn}</span></div>
                </div>
              </td>
              <td><span className={`a-chip ${m.role === "owner" ? "owner" : "asst"}`}>{ROLE_LABEL[m.role]}</span></td>
              <td>
                {m.status === "active" ? <span className="a-chip active">Active</span> : (
                  <>
                    <span className="a-chip disabled">Disabled</span>
                    {m.disabledReason && <small className="muted" style={{ display: "block", marginTop: 2 }}>{m.disabledReason}</small>}
                  </>
                )}
              </td>
              <td>{m.lastSignInAt ? whenText(m.lastSignInAt, nowMs) : <span className="muted">Never</span>}</td>
              <td>
                <Link className="a-ulink" href={`/admin/activity?who=${m.id}&p=7d`}>{countLabel} action{n === 1 ? "" : "s"}</Link>
                {m.role === "assistant" && drafts > 0 && <span className="muted"> · {drafts} draft{drafts === 1 ? "" : "s"} waiting</span>}
              </td>
              <td>{isSelf ? <span className="muted">You</span> : <div className="a-acts"><RowActions m={m} /></div>}</td>
            </tr>
          );
        })}</tbody>
      </table>
      <div className="a-tfoot">{team.length} people<div className="r" style={{ color: "var(--muted)" }}>Adding staff comes with the first hire</div></div>

      <div className="a-plist a-only-phone">{team.map((m, i) => {
        const isSelf = m.id === me.id;
        const n = counts[i];
        const countLabel = n >= ACTIVITY_PAGE ? `${ACTIVITY_PAGE}+` : String(n);
        return (
          <div key={m.id} className="a-team-card">
            <div className="row">
              <div className={`a-avatar${m.role === "assistant" ? " asst" : ""}`} aria-hidden>{initials(m.name, m.role)}</div>
              <div style={{ flex: 1 }}>
                <b style={{ fontWeight: 600 }}>{m.name}</b>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{ROLE_LABEL[m.role]} · {m.lastSignInAt ? whenText(m.lastSignInAt, nowMs) : "Never"}</div>
              </div>
              {isSelf ? <span style={{ color: "var(--muted)", fontSize: 12 }}>You</span> : (
                <span className={`a-chip ${m.status === "active" ? "active" : "disabled"}`}>{m.status === "active" ? "Active" : "Disabled"}</span>
              )}
            </div>
            {m.disabledReason && <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>{m.disabledReason}</div>}
            {!isSelf && (
              <>
                <div style={{ fontSize: 12.5, margin: "10px 0" }}>
                  <Link className="a-ulink" href={`/admin/activity?who=${m.id}&p=7d`}>{countLabel} action{n === 1 ? "" : "s"} this week</Link>
                  {m.role === "assistant" && drafts > 0 && ` · ${drafts} draft${drafts === 1 ? "" : "s"} waiting`}
                </div>
                <div className="a-acts"><RowActions m={m} /></div>
              </>
            )}
          </div>
        );
      })}</div>

      <div className="a-card" style={{ marginTop: 22 }}>
        <div className="a-card-h"><h3>What the Assistant can do</h3><span className="sub">fixed in code · widening it is a code change you approve</span></div>
        <div className="a-card-b">
          <div className="a-perm-grid">
            <div>
              <h4>Can</h4>
              <ul>{canDo.map((p) => <li key={p} className="yes"><Icon name="check" />{PERMISSION_LABEL[p]}</li>)}</ul>
            </div>
            <div>
              <h4>Can&apos;t</h4>
              <ul>{cant.map((p) => <li key={p} className="no"><Icon name="lock" />{PERMISSION_LABEL[p]}</li>)}</ul>
            </div>
          </div>
          <div className="a-callout info" style={{ marginTop: 14 }}>
            <Icon name="info" />
            <span>This login guards the normal path and puts Claude&apos;s name on its work. The database key on your PC and on Vercel can still go around it — Claude only uses that for database changes you OK in chat.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
