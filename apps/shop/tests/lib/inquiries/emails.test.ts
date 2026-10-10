import { describe, it, expect } from "vitest";
import { ackEmail, ownerNotifyEmail, replyEmail } from "@/lib/inquiries/emails";
import { assertCompliant } from "@/lib/email/compliance";

describe("inquiry emails", () => {
  it("confirmation: Q-number in the subject, invites a reply, never echoes the message", () => {
    const m = ackEmail({ ref: 1047, firstName: "Dana", topic: "order" });
    expect(m.subject).toBe("We've got your message [Q-1047]");
    expect(m.html).toContain("Q-1047 · Order question");
    expect(m.html).toContain("Hi Dana");
    expect(m.text).toContain("just reply to this email");
    expect(() => assertCompliant(m.subject, m.html)).not.toThrow();
  });
  it("reply: Re: subject with the ref once, paragraphs escaped, no quoted history", () => {
    const m = replyEmail({ ref: 1047, subject: "Order question — AP-1052", body: "Thanks <Dana>.\n\nLine two\nline three" });
    expect(m.subject).toBe("Re: Order question — AP-1052 [Q-1047]");
    expect(m.html).toContain("<p>Thanks &lt;Dana&gt;.</p>");
    expect(m.html).toContain("<p>Line two<br>line three</p>");
    expect(m.text.startsWith("Thanks <Dana>.\n\nLine two")).toBe(true);
    expect(replyEmail({ ref: 1047, subject: "Re: Order question [Q-1047]", body: "x" }).subject).toBe("Re: Order question [Q-1047]");
  });
  it("owner notification: no CR/LF from the name in the subject, link to the thread", () => {
    const m = ownerNotifyEmail({ ref: 1049, topic: "wholesale", name: "Dr. Lab\r\nBcc: x@evil.example", email: "lab@example.edu", organization: "Example U", orderNumber: null, message: "200 vials <monthly>", link: "https://auraprotocols.com/admin/inquiries/Q-1049" });
    expect(m.subject).toBe("New inquiry Q-1049 · Wholesale — Dr. Lab Bcc: x@evil.example");
    expect(m.html).toContain("200 vials &lt;monthly&gt;");
    expect(m.html).toContain('href="https://auraprotocols.com/admin/inquiries/Q-1049"');
  });
});
