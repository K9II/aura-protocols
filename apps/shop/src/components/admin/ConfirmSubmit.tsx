"use client";
// A submit button that asks first (End now / End all can't be undone).
export default function ConfirmSubmit({ message, className, children }: { message: string; className: string; children: React.ReactNode }) {
  return <button type="submit" className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>{children}</button>;
}
