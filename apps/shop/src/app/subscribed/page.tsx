import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";

// Landing page for the Aura letter's confirm link (/api/subscribe/confirm).
export const metadata: Metadata = { title: "Email confirmed", robots: { index: false } };

export default async function SubscribedPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  if (state === "invalid") {
    return <ProsePage eyebrow="The Aura letter" title={<>This link has <em>expired.</em></>}
      intro={<p>The confirmation link was already used or is no longer valid. You can subscribe again from the bottom of the <Link className="p-link" href="/">home page</Link>.</p>}
      sections={[]} />;
  }
  if (state === "error") {
    return <ProsePage eyebrow="The Aura letter" title={<>Something went <em>wrong.</em></>}
      intro={<p>We couldn&apos;t confirm your email just now. Please click the link in the email again in a few minutes.</p>}
      sections={[]} />;
  }
  if (state === "returning") {
    return <ProsePage eyebrow="The Aura letter" title={<>You&apos;re on <em>the list.</em></>}
      intro={<p>Your email is confirmed. Promotions, research updates and store news will arrive when there&apos;s something worth sending. No spam.</p>}
      sections={[]} />;
  }
  return <ProsePage eyebrow="The Aura letter" title={<>You&apos;re on <em>the list.</em></>}
    intro={<p>Your email is confirmed and the first letter is on its way. While you wait, look up any lot on our <Link className="p-link" href="/coa">COA Lookup</Link>.</p>}
    sections={[]} />;
}
