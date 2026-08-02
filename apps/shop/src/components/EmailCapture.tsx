import { LEAD_MAGNET } from "@/lib/constants";

export default function EmailCapture() {
  return (
    <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] px-2 py-5 text-center sm:p-8">
      <div className="h-[1050px] sm:h-[620px] overflow-hidden max-w-full mx-auto">
        <iframe
          src={LEAD_MAGNET.brevoFormSrc}
          width="100%"
          frameBorder={0}
          scrolling="no"
          className="block w-full max-w-full mx-auto h-[1090px] sm:h-[660px]"
          title={LEAD_MAGNET.title}
        />
      </div>
    </section>
  );
}
