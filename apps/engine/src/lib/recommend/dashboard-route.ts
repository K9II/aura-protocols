// Pure dashboard-routing logic. Must live in a server-safe module (NOT a
// "use client" file) so /dashboard (a server component) can call it directly —
// invoking a function exported from a client module on the server throws at the
// RSC boundary. Mirrors the resolveRouting pattern in ./routing.ts.

export type DashboardRoute = "signin" | "onboarding" | "hub";

export interface DashboardRouteInput {
  hasUser: boolean;
  onboardingComplete: boolean;
}

export function resolveDashboardRoute(input: DashboardRouteInput): DashboardRoute {
  if (!input.hasUser) return "signin";
  if (!input.onboardingComplete) return "onboarding";
  return "hub";
}
