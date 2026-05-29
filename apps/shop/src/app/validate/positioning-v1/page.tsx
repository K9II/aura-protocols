import EmailCapture from "@/components/EmailCapture";

export default function PositioningV1Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        The clinical-grade alternative to research peptides.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Same compounds. Prescribed by US-licensed doctors. Shipped from licensed compounding pharmacies. No more vial-with-bacteriostatic-water grey-zone.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
