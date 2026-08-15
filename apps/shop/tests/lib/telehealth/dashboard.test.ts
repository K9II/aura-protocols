import { describe, it, expect } from "vitest";
import { aggregateEvents } from "@/lib/telehealth/dashboard";

const events = [
  { event: "lead.created", payload: { data: { lead: { subId: "12" } } } },
  { event: "lead.enriched", payload: { data: { lead: { subId: "12" } } } },
  { event: "order.created", payload: { data: { order: { amount: 349, commission: 75, subAccount: "12" } } } },
  { event: "order.created", payload: { data: { order: { amount: 124, commission: 28, subAccount: "3" } } } },
];

describe("aggregateEvents", () => {
  it("counts leads, enriched, orders and sums commission", () => {
    const s = aggregateEvents(events);
    expect(s.leads).toBe(1);
    expect(s.enriched).toBe(1);
    expect(s.orders).toBe(2);
    expect(s.commission).toBe(103);
  });

  it("groups commission by subId", () => {
    const s = aggregateEvents(events);
    expect(s.bySub["12"].commission).toBe(75);
    expect(s.bySub["3"].orders).toBe(1);
  });
});
