import { CLINICAL_URL, EXTERNAL_REL, PRESCRIBE_CTA_COPY } from "@/lib/constants";
import type { ProtocolTemplateId } from "@/lib/constants";

export default function PrescribeCTA({ template }: { template: ProtocolTemplateId }) {
  const href = `${CLINICAL_URL}/?source=engine&template=${encodeURIComponent(template)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel={EXTERNAL_REL}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300"
    >
      {PRESCRIBE_CTA_COPY}
    </a>
  );
}
