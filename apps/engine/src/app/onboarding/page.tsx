export const runtime = "nodejs";

export default async function OnboardingPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">Biosignature Setup</p>
      <h1 className="mb-2 font-display text-3xl font-bold text-white">Tell us about yourself</h1>
      <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-6 py-10 text-center">
        <div className="text-3xl">🔧</div>
        <p className="mt-3 text-lg font-semibold text-white">Under Construction</p>
        <p className="mt-2 text-sm text-slate-300">The onboarding flow is being finalized. Manual data upload is available in the meantime.</p>
        <a href="/upload" className="mt-6 inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300">
          Upload data manually
        </a>
      </div>
    </main>
  );
}
