"""Convert a markdown document to a styled PDF.

Usage: python scripts/md_to_pdf.py <source.md> [output.pdf]
"""
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("input.md")
DST = Path(sys.argv[2]) if len(sys.argv) > 2 else SRC.with_suffix(".pdf")

NAVY = colors.HexColor("#1F3A5F")
NAVY_LIGHT = colors.HexColor("#2C5A8A")
GREY_RULE = colors.HexColor("#BBBBBB")
ROW_ALT = colors.HexColor("#F4F6FA")


def make_styles():
    base = getSampleStyleSheet()["BodyText"]
    body = ParagraphStyle(
        "Body",
        parent=base,
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=NAVY,
        spaceBefore=8,
        spaceAfter=10,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=20,
        textColor=NAVY,
        spaceBefore=14,
        spaceAfter=6,
    )
    h3 = ParagraphStyle(
        "H3",
        parent=body,
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=NAVY_LIGHT,
        spaceBefore=10,
        spaceAfter=4,
    )
    bullet = ParagraphStyle(
        "Bullet", parent=body, leftIndent=14, bulletIndent=2, spaceAfter=3
    )
    cell = ParagraphStyle(
        "Cell", parent=body, fontSize=10, leading=13, spaceAfter=0
    )
    cell_header = ParagraphStyle(
        "CellHeader",
        parent=cell,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )
    return {
        "body": body,
        "h1": h1,
        "h2": h2,
        "h3": h3,
        "bullet": bullet,
        "cell": cell,
        "cell_header": cell_header,
    }


def inline_md_to_html(text: str) -> str:
    """Convert bold/italic/code markdown to reportlab inline tags."""
    text = re.sub(r"&", "&amp;", text)
    text = re.sub(r"<", "&lt;", text)
    text = re.sub(r">", "&gt;", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(
        r"`([^`]+)`",
        r'<font face="Courier" size="9.5">\1</font>',
        text,
    )
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    return text


def build_table(rows, styles):
    if not rows:
        return None
    data = []
    for r_idx, row in enumerate(rows):
        cell_style = styles["cell_header"] if r_idx == 0 else styles["cell"]
        data.append(
            [Paragraph(inline_md_to_html(c.strip()), cell_style) for c in row]
        )

    ts = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
        ]
    )
    for r in range(1, len(data), 2):
        ts.add("BACKGROUND", (0, r), (-1, r), ROW_ALT)
    table = Table(data, repeatRows=1, hAlign="LEFT")
    table.setStyle(ts)
    return table


def convert(src: Path, dst: Path) -> None:
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(dst),
        pagesize=LETTER,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.85 * inch,
        title=src.stem,
    )

    story = []
    lines = src.read_text(encoding="utf-8").splitlines()
    i = 0
    pending_bullets: list[str] = []
    pending_numbers: list[str] = []

    def flush_lists():
        if pending_bullets:
            items = [
                ListItem(
                    Paragraph(inline_md_to_html(b), styles["body"]),
                    leftIndent=12,
                )
                for b in pending_bullets
            ]
            story.append(
                ListFlowable(items, bulletType="bullet", leftIndent=18)
            )
            story.append(Spacer(1, 4))
            pending_bullets.clear()
        if pending_numbers:
            items = [
                ListItem(
                    Paragraph(inline_md_to_html(n), styles["body"]),
                    leftIndent=12,
                )
                for n in pending_numbers
            ]
            story.append(
                ListFlowable(items, bulletType="1", leftIndent=18)
            )
            story.append(Spacer(1, 4))
            pending_numbers.clear()

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()

        if not line:
            flush_lists()
            i += 1
            continue

        if line.startswith("# "):
            flush_lists()
            story.append(Paragraph(inline_md_to_html(line[2:].strip()), styles["h1"]))
            i += 1
            continue
        if line.startswith("## "):
            flush_lists()
            story.append(Paragraph(inline_md_to_html(line[3:].strip()), styles["h2"]))
            i += 1
            continue
        if line.startswith("### "):
            flush_lists()
            story.append(Paragraph(inline_md_to_html(line[4:].strip()), styles["h3"]))
            i += 1
            continue

        if line.strip() == "---":
            flush_lists()
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.6, color=GREY_RULE))
            story.append(Spacer(1, 4))
            i += 1
            continue

        if line.lstrip().startswith("|") and "|" in line[1:]:
            flush_lists()
            table_lines: list[str] = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            rows: list[list[str]] = []
            for tl in table_lines:
                if re.match(r"^\|[\s\-:|]+\|$", tl):
                    continue
                cells = [c.strip() for c in tl.strip("|").split("|")]
                rows.append(cells)
            table = build_table(rows, styles)
            if table is not None:
                story.append(table)
                story.append(Spacer(1, 6))
            continue

        bullet_match = re.match(r"^(\s*)- (.+)$", line)
        number_match = re.match(r"^(\s*)(\d+)\. (.+)$", line)
        if bullet_match:
            if pending_numbers:
                flush_lists()
            pending_bullets.append(bullet_match.group(2))
            i += 1
            continue
        if number_match:
            if pending_bullets:
                flush_lists()
            pending_numbers.append(number_match.group(3))
            i += 1
            continue

        flush_lists()
        para_lines = [line]
        i += 1
        while (
            i < len(lines)
            and lines[i].strip()
            and not lines[i].startswith("#")
            and not lines[i].lstrip().startswith("- ")
            and not re.match(r"^\s*\d+\. ", lines[i])
            and not lines[i].lstrip().startswith("|")
            and lines[i].strip() != "---"
        ):
            para_lines.append(lines[i].rstrip())
            i += 1
        text = " ".join(para_lines)
        story.append(Paragraph(inline_md_to_html(text), styles["body"]))

    flush_lists()
    doc.build(story)
    print(f"wrote {dst} ({dst.stat().st_size:,} bytes)")


if __name__ == "__main__":
    convert(SRC, DST)
