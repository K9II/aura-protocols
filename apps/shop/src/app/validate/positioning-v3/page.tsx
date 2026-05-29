import EmailCapture from "@/components/EmailCapture";

export default function PositioningV3Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        The legal way to run the protocols you&apos;ve been researching.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        You&apos;ve already read the papers. Now get the same compounds prescribed, dosed, and shipped — without the COA roulette.
      </p>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}
