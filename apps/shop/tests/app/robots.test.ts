import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("robots", () => {
  it("keeps private account and checkout routes out of search engines", () => {
    const rules = robots().rules as { disallow?: string[] };
    expect(rules.disallow).toEqual(expect.arrayContaining([
      "/account", "/checkout", "/order/", "/admin/", "/sign-in", "/forgot-password", "/reset-password", "/auth/", "/api/",
    ]));
  });
});
