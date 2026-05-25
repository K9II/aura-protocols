import { LEAD_MAGNET } from "@/lib/constants";

export default function EmailCapture() {
  if (LEAD_MAGNET.beehiivPublicationId === "PLACEHOLDER_PUB_ID") return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1117] p-8">
      <h3 className="font-display text-2xl font-bold text-white">{LEAD_MAGNET.title}</h3>
      <p className="mt-2 text-slate-300">{LEAD_MAGNET.blurb}</p>
      <iframe
        title="Email signup"
        src={LEAD_MAGNET.beehiivEmbedUrl}
        className="mt-4 h-[200px] w-full rounded-lg border-0 bg-transparent"
        loading="lazy"
      />
    </section>
  );
}
