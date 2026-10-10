import { describe, it, expect } from "vitest";
import { cutQuoted, htmlToText } from "@/lib/inquiries/quote";

const GMAIL = `Here you go — both vials and the box.
The lot number on the label is BPC-2609-A.

On Tue, Oct 6, 2026 at 3:30 PM Aura Protocols <
r-0123456789abcdef0123456789abcdef@in.auraprotocols.com> wrote:

> Sorry about that, Dana. Could you reply with a photo?
>
> — Kearney, Aura Protocols
`;
const OUTLOOK_DESKTOP = `Thanks, that works.

________________________________
From: Aura Protocols <r-0123@in.auraprotocols.com>
Sent: Tuesday, October 6, 2026 3:30 PM
To: Dana Whitfield <dana.w@example.com>
Subject: Re: Order question — AP-1052 [Q-1047]

Sorry about that, Dana.`;
const OUTLOOK_WEB = `Got it, thank you!

From: Aura Protocols <r-0123@in.auraprotocols.com>
Date: Tuesday, October 6, 2026 at 3:30 PM
To: dana.w@example.com
Subject: Re: Order question

Sorry about that.`;
const APPLE = `Perfect.

> On Oct 6, 2026, at 3:30 PM, Aura Protocols <r-0123@in.auraprotocols.com> wrote:
>
> Sorry about that, Dana.`;
const IOS = `Will do

Sent from my iPhone

> On Oct 6, 2026, at 3:30 PM, Aura Protocols <r-0123@in.auraprotocols.com> wrote:
> Sorry about that.`;
const ORIGINAL = `See below.

-----Original Message-----
From: Aura Protocols
Sent: Tue
Subject: x`;

describe("cutQuoted", () => {
  it.each([
    ["Gmail (wrapped 'On … wrote:')", GMAIL, "Here you go — both vials and the box.\nThe lot number on the label is BPC-2609-A."],
    ["Outlook desktop", OUTLOOK_DESKTOP, "Thanks, that works."],
    ["Outlook web", OUTLOOK_WEB, "Got it, thank you!"],
    ["Apple Mail", APPLE, "Perfect."],
    ["iOS Mail (drops 'Sent from my iPhone')", IOS, "Will do"],
    ["-----Original Message-----", ORIGINAL, "See below."],
  ])("%s", (_l, input, body) => {
    expect(cutQuoted(input)).toEqual({ body, cut: true });
  });

  it("drops the Outlook mobile footer (live check 2026-10-06)", () => {
    const outlookAndroid = [
      "Thx- Found it !", "", "Get Outlook for Android<https://aka.ms/AAb9ysg>", "________________________________",
      "From: Aura Protocols <support@auraprotocols.com>", "Sent: Tuesday, 06 October 2026 17:04:25", "To: k9misc@gmail.com",
      "Subject: Re: Order question [Q-1002]", "", "Earlier text",
    ].join("\n");
    expect(cutQuoted(outlookAndroid).body).toBe("Thx- Found it !");
  });

  it("CRLF line endings", () => {
    expect(cutQuoted(APPLE.replace(/\n/g, "\r\n")).body).toBe("Perfect.");
  });

  it("a plain message is kept whole", () => {
    expect(cutQuoted("Hello,\n\nTwo vials arrived cracked.\n")).toEqual({ body: "Hello,\n\nTwo vials arrived cracked.", cut: false });
  });

  it("cuts at a signature delimiter", () => {
    expect(cutQuoted("Thanks\n-- \nDana W.\nLab manager").body).toBe("Thanks");
  });

  it("if cutting would leave nothing, keeps the whole text", () => {
    expect(cutQuoted("> only quoted\n> text")).toEqual({ body: "> only quoted\n> text", cut: false });
  });
});

describe("htmlToText", () => {
  it("keeps line breaks, drops tags, decodes entities, turns Gmail's quote into '>'", () => {
    const html = `<div dir="ltr">Hi &amp; thanks<br>Line two</div><div class="gmail_quote"><div class="gmail_attr">On Tue, Oct 6, 2026 Aura wrote:<br></div><blockquote>Old text</blockquote></div>`;
    const text = htmlToText(html);
    expect(text.startsWith("Hi & thanks\nLine two")).toBe(true);
    expect(cutQuoted(text).body).toBe("Hi & thanks\nLine two");
  });
  it("drops style and script blocks", () => {
    expect(htmlToText("<style>p{}</style><p>Body</p><script>x()</script>")).toBe("Body");
  });
});
