"use client";

import { useFormStatus } from "react-dom";
import { startGoogleAction } from "@/app/auth/google-actions";
import GoogleMark from "@/components/account/GoogleMark";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="g-signin" disabled={pending}>
      <GoogleMark /><span>Continue with Google</span>
    </button>
  );
}

// The one "Continue with Google" (Google's button branding: white, #747775
// border, #1F1F1F text, the G). Its own form — never put it inside another form.
export default function GoogleButton({ next }: { next: string }) {
  return (
    <form action={startGoogleAction} className="g-signin-form">
      <input type="hidden" name="next" value={next} />
      <Submit />
    </form>
  );
}

export function OrEmail() {
  return <p className="or-email"><span>or use email</span></p>;
}
