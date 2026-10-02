import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/account/SignInForm";
import SignUpForm from "@/components/account/SignUpForm";
import { getCustomer, safeNext } from "@/lib/dal";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext, "/account");
  if (await getCustomer()) redirect(next);
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        {error === "link" && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-6">That link has expired or was already used — sign in, or request a new one.</p>}
        <div className="grid gap-12 md:grid-cols-2" style={{ maxWidth: 900 }}>
          <SignInForm next={next} />
          <SignUpForm next={next} />
        </div>
      </div>
    </div>
  );
}
