import { LEAD_MAGNET } from "@/lib/constants";

export default function EmailCapture() {
  return (
    <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] px-2 py-5 text-center sm:p-8">
      <div style={{ height: 620, overflow: "hidden", maxWidth: "100%", margin: "0 auto" }}>
        <iframe
          src={LEAD_MAGNET.brevoFormSrc}
          width="100%"
          height="660"
          frameBorder={0}
          scrolling="no"
          style={{ display: "block", maxWidth: "100%", margin: "0 auto" }}
          title={LEAD_MAGNET.title}
        />
      </div>
    </section>
  );
}
