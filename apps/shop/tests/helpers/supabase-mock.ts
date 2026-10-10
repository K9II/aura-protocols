import { vi } from "vitest";

type Result = { data?: unknown; error?: unknown; count?: number };

// A chainable stand-in for a Supabase query builder: every method call
// (select, eq, insert, update, order, single, ...) is recorded and returns the
// same builder; awaiting it resolves to { data, error }.
export function query(result: Result = {}) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }).then(resolve, reject);
      }
      if (prop === "calls") return calls;
      return (...args: unknown[]) => {
        calls.push([String(prop), args]);
        return builder;
      };
    },
  });
  return builder as Record<string, unknown> & { calls: Array<[string, unknown[]]> };
}

// Returns a `from` mock that hands out the next queued builder for each table.
export function fromQueue(queues: Record<string, ReturnType<typeof query>[]>) {
  return vi.fn((table: string) => {
    const q = queues[table]?.shift();
    if (!q) throw new Error(`unexpected supabase.from("${table}")`);
    return q;
  });
}

export function callArgs(q: ReturnType<typeof query>, method: string): unknown[] | undefined {
  return q.calls.find(([m]) => m === method)?.[1];
}
