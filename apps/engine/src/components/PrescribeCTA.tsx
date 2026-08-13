import { PRESCRIBE_URL, PRESCRIBE_LABEL, EXTERNAL_REL } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";

export default function PrescribeCTA({ template }: { template: ProtocolTemplateId }) {
  const href = `${PRESCRIBE_URL}/?source=engine&template=${encodeURIComponent(template)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel={EXTERNAL_REL}
      className="p-btn-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
    >
      {PRESCRIBE_LABEL}
    </a>
  );
}
