import type { Metadata } from "next";
import ProsePage from "@/components/store/ProsePage";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const mail = <a className="p-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  if (state === "invalid" || state === "error") {
    return <ProsePage eyebrow="Email" title={<>We couldn&apos;t <em>unsubscribe you.</em></>}
      intro={<p>{state === "invalid" ? "This link isn't valid." : "Something went wrong on our side."} Use the unsubscribe link in any of our emails, or write to {mail} and we&apos;ll remove you by hand.</p>}
      sections={[]} />;
  }
  return <ProsePage eyebrow="Email" title={<>You&apos;re <em>unsubscribed.</em></>}
    intro={<p>You won&apos;t get any more marketing email from Aura Protocols. Order and shipping emails still arrive for orders you place. Changed your mind? Sign up again from any page.</p>}
    sections={[]} />;
}
