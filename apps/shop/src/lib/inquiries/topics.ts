// The /contact topics. Pure and client-safe (the contact form and the admin use it).
export const TOPICS = ["order", "product", "wholesale", "account", "other"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<Topic, string> = {
  order: "Order question", product: "Product or COA", wholesale: "Wholesale", account: "Account", other: "Other",
};
// The small mono tag in the admin list.
export const TOPIC_TAG: Record<Topic, string> = {
  order: "Order", product: "Product", wholesale: "Wholesale", account: "Account", other: "Other",
};

export const parseTopic = (v: unknown): Topic | null => ((TOPICS as readonly unknown[]).includes(v) ? (v as Topic) : null);

// "Order question — AP-1052", "Wholesale inquiry — Meridian Peptide Lab".
export function inquirySubject(topic: Topic, orderNumber: string | null, organization: string | null): string {
  switch (topic) {
    case "order": return orderNumber ? `Order question — ${orderNumber}` : "Order question";
    case "product": return "Product or COA question";
    case "wholesale": return organization ? `Wholesale inquiry — ${organization}` : "Wholesale inquiry";
    case "account": return "Account question";
    case "other": return "Message";
  }
}
