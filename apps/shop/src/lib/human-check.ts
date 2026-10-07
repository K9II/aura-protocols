// Cloudflare Turnstile on /checkout (spec 2026-10-07-checkout-human-check-design.md).
// Shared by the widget (components/account/HumanCheck.tsx) and the server check (lib/turnstile.ts).
export const HUMAN_CHECK_ACTION = "checkout";
export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const HUMAN_CHECK_FAILED = "The check didn't go through — please tick the box again.";
export const HUMAN_CHECK_UNAVAILABLE = "We couldn't confirm the check — please try again in a moment.";
