import EmailCapture from "@/components/EmailCapture";

export default function PositioningV2Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        Prescribed peptide protocols from US doctors.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Skip the vendor research. Get a personalized peptide protocol prescribed by a US-licensed MD and shipped monthly from a compounding pharmacy.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
