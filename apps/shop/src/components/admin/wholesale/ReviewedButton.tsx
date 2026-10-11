// "Reviewed" for a new wholesale buyer (spec 2026-10-10). Owner only — callers render
// it only when the viewer can("wholesale.manage"); the action checks again.
import { markWholesaleReviewedAction } from "@/app/admin/wholesale/actions";

export default function ReviewedButton({ customerId, name }: { customerId: string; name: string }) {
  return (
    <form action={markWholesaleReviewedAction} style={{ display: "inline" }}>
      <input type="hidden" name="customerId" value={customerId} />
      <button type="submit" className="a-btn sm" aria-label={`Mark ${name} reviewed`}>Reviewed</button>
    </form>
  );
}
