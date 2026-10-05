// ShownSwitch.tsx — server-rendered form; asks first.
import { setShownAction } from "@/app/admin/catalog/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export default function ShownSwitch({ slug, name, shown }: { slug: string; name: string; shown: boolean }) {
  return (
    <form action={setShownAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="shown" value={shown ? "false" : "true"} />
      <ConfirmSubmit className={`a-switch${shown ? "" : " off"}`}
        message={shown ? `Hide ${name}? It disappears from the store; open checkouts still complete.` : `Show ${name} on the store again?`}>
        <span className="k" />{shown ? "Shown on store" : "Hidden"}
      </ConfirmSubmit>
    </form>
  );
}
