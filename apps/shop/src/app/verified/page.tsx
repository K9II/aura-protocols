import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";

export const metadata: Metadata = { title: "Email confirmed", robots: { index: false } };

export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  if (state === "invalid") {
    return <ProsePage eyebrow="Email" title={<>This link has <em>expired.</em></>}
      intro={<p>The link was already used or is no longer valid. Sign in and use &ldquo;Resend the link&rdquo; on your <Link className="p-link" href="/account">account page</Link>.</p>}
      sections={[]} />;
  }
  if (state === "error") {
    return <ProsePage eyebrow="Email" title={<>Something went <em>wrong.</em></>}
      intro={<p>We couldn&apos;t confirm your email just now. Please click the link in the email again in a few minutes.</p>}
      sections={[]} />;
  }
  return <ProsePage eyebrow="Email" title={<>Email <em>confirmed.</em></>}
    intro={<p>{state === "listed" ? <>File 01 is on its way to your inbox. </> : null}You can place your first order now. <Link className="p-link" href="/products">Browse compounds →</Link></p>}
    sections={[]} />;
}
