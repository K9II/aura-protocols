import type { PartnerRow } from "@/lib/partners/data";
import { setPartnerStatusAction } from "@/app/admin/partners/actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const PREF = { cash: "Cash", credit: "Credit", split: "Split" } as const;
export function PayoutPref({ p }: { p: PartnerRow }) {
  return <>{PREF[p.payout_pref]}{p.payout_pref === "split" ? ` ${p.split_cash_pct}/${100 - p.split_cash_pct}` : ""}{p.payout_method ? ` · ${p.payout_method.toUpperCase()}` : ""}</>;
}
export function W9Chip({ p }: { p: PartnerRow }) {
  return p.w9_checked_at ? <span className="a-chip ver">Checked</span> : p.w9_path ? <span className="a-chip unver">Uploaded</span> : <span className="a-chip red">Not uploaded</span>;
}
const STATUS = { applied: "Applied", approved: "Active", suspended: "Suspended", declined: "Declined" } as const;
export function PartnerStatusChip({ status }: { status: PartnerRow["status"] }) {
  return <span className={`a-chip p-${status}`}>{STATUS[status]}</span>;
}
const first = (p: PartnerRow) => (p.customers?.full_name ?? p.code).split(" ")[0];
export function ApproveDecline({ p, small }: { p: PartnerRow; small?: boolean }) {
  const name = p.customers?.full_name ?? p.code;
  return (
    <div className="a-acts">
      <ConfirmDialog label="Decline" title={`Decline ${name}?`} confirmLabel="Decline" tone="plain" small={small} action={setPartnerStatusAction} fields={{ partnerId: p.id, to: "declined" }}>
        They get a short email saying the application wasn&apos;t accepted. Code {p.code} is never switched on.
      </ConfirmDialog>
      <ConfirmDialog label="Approve" title={`Approve ${name}?`} confirmLabel="Approve" small={small} action={setPartnerStatusAction} fields={{ partnerId: p.id, to: "approved" }}>
        Code {p.code} starts working now. {first(p)} gets an email with their link and the program rules.
      </ConfirmDialog>
    </div>
  );
}
