// The "Coming soon" ribbon across the very top of the pre-launch page (option A, picked by
// Alvester 2026-10-24): says plainly the store isn't open yet and jumps to the waitlist form.
// No date here — the opening date is tentative.
export default function SoonRibbon() {
  return (
    <div className="cs-soon" role="note" aria-label="Coming soon">
      <div className="cs-soon-in">
        <span className="cs-soon-dot" aria-hidden /><b>Coming soon</b>
        <p>The store isn&apos;t open yet. Join the waitlist and you&apos;ll get in first.</p>
        <a href="#join">Join the waitlist →</a>
      </div>
    </div>
  );
}
