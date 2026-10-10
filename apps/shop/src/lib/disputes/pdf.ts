// The evidence PDF (spec: receipt, shipping and tracking, lots with
// certificate links, agreement record, policy excerpts). Text only, standard
// fonts, US Letter. Built from the records alone with fixed dates, so the
// same records always give the same bytes: what the owner downloads is
// exactly what is attached in Stripe.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SHOP_LEGAL_NAME } from "@/lib/disputes/constants";
import { evidenceSections, type EvidenceFacts } from "@/lib/disputes/evidence";
import { pdfSafe } from "@/lib/disputes/format";

const PAGE: [number, number] = [612, 792];
const MARGIN = 54;
const BODY = 10;
const LEAD = 14;
const INK = rgb(0.11, 0.1, 0.08);
const RED = rgb(0.64, 0.17, 0.12);
const MUTED = rgb(0.45, 0.42, 0.36);

// Word-wrap to the line width; a single word wider than a line (a long URL)
// is cut into pieces rather than running off the page.
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
      if (line) out.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

export async function buildEvidencePdf(f: EvidenceFacts): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE[0] - 2 * MARGIN;
  let page: PDFPage = doc.addPage(PAGE);
  let y = PAGE[1] - MARGIN;
  const room = (h: number) => {
    if (y - h < MARGIN) { page = doc.addPage(PAGE); y = PAGE[1] - MARGIN; }
  };
  const write = (s: string, font: PDFFont, size: number, color = INK, lead = LEAD) => {
    for (const line of wrap(pdfSafe(s), font, size, width)) {
      room(lead);
      if (line) page.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      y -= lead;
    }
  };

  write(`${SHOP_LEGAL_NAME} - Dispute evidence`, bold, 15, INK, 20);
  write(`Order ${f.order.number} · Stripe dispute ${f.stripeDisputeId}`, regular, BODY, MUTED);
  evidenceSections(f).forEach((s, i) => {
    y -= 10;
    room(LEAD * 3); // keep a heading with its first lines
    write(`${i + 1} · ${s.title}`.toUpperCase(), bold, 9, RED);
    for (const line of s.lines) write(line, regular, BODY);
  });

  const stamp = new Date(f.openedAt);
  doc.setTitle(`Dispute evidence ${f.order.number}`);
  doc.setAuthor(SHOP_LEGAL_NAME);
  doc.setCreator(SHOP_LEGAL_NAME);
  doc.setProducer(SHOP_LEGAL_NAME);
  doc.setCreationDate(stamp);
  doc.setModificationDate(stamp);
  return { bytes: await doc.save(), pages: doc.getPageCount() };
}
