import type { Metadata } from "next";
import Link from "next/link";
import ProsePage from "@/components/store/ProsePage";

export const metadata: Metadata = { title: "Email confirmed", robots: { index: false } };

export default async function SubscribedPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  if (state === "invalid") {
    return <ProsePage eyebrow="Email" title={<>This link has <em>expired.</em></>}
      intro={<p>The confirmation link was already used or is no longer valid. If you&apos;re not getting our emails, sign up again from any page.</p>}
      sections={[]} />;
  }
  return <ProsePage eyebrow="Email" title={<>You&apos;re on <em>the list.</em></>}
    intro={<p>File 01 is on its way to your inbox. While you wait, look up any lot on our <Link className="p-link" href="/coa">COA Lookup</Link>.</p>}
    sections={[]} />;
}
