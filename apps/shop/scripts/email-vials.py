# The approved photo vials (Downloads\Aura ads\photo-vials, 2026-10-23) for email:
# every vial scaled to the same height on one white canvas, so grids line up.
# Usage: python scripts/email-vials.py "<photo-vials folder>"
import sys, os
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "email", "vials")
CW, CH, VH, BOT = 480, 1140, 1060, 1115  # canvas, vial height, vial bottom
os.makedirs(OUT, exist_ok=True)
for key in ["bpc-157", "klow", "nad-plus", "wolverine", "ghk-cu", "glow"]:
    im = Image.open(os.path.join(SRC, key + ".jpg")).convert("RGB")
    x0, y0, x1, y1 = im.convert("L").point(lambda v: 255 if v < 200 else 0).getbbox()
    s = VH / (y1 - y0)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    c = Image.new("RGB", (CW, CH), (255, 255, 255))
    c.paste(r, (round(CW / 2 - (x0 + x1) / 2 * s), round(BOT - y1 * s)))
    c.save(os.path.join(OUT, key + ".jpg"), quality=86, optimize=True, progressive=True)
    print(key, "ok")
