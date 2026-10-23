# Builds public/email/bpc-turn.gif from the frames email-vial-turn.mjs recorded:
# one lap (front -> barcode -> QR, held 1.5 s -> front), 360 px wide on pure white,
# then compresses it with gifsicle (~1.1 MB).
# Usage: python scripts/email-vial-gif.py
import glob, os, subprocess
from PIL import Image, ImageChops, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "email", "bpc-turn.gif")
W = 360

def load(f):
    im = Image.open(f).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    im = bg.convert("RGB").resize((W, round(bg.height * W / bg.width)), Image.LANCZOS)
    # flatten the near-white behind the glass to pure white (no speckle on the email's white card)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            if r > 246 and g > 246 and b > 246: px[x, y] = (255, 255, 255)
    return im

def dist(a, b): return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean)

fr = [load(f) for f in sorted(glob.glob(os.path.join(HERE, ".vial-frames", "*.png")))]
end = min(range(len(fr) // 4, len(fr)), key=lambda i: dist(fr[i], fr[0]))  # back at the front
fr = fr[:end]
seq = [[fr[0], 0]]
for im in fr[1:]:
    if dist(im, seq[-1][0]) < 0.15: seq[-1][1] += 1
    else: seq.append([im, 0])
dur = [1500 if extra >= 5 else 80 + extra * 80 for _, extra in seq]  # the pause on the QR code, as on the site
dur[0] = 1300  # rest on the front before each turn
pal = Image.new("RGB", (W * 3, seq[0][0].height))
for k, j in enumerate([0, len(seq) // 2, (len(seq) * 2) // 3]): pal.paste(seq[j][0], (k * W, 0))
pal = pal.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
q = [s[0].quantize(palette=pal, dither=Image.Dither.NONE) for s in seq]
raw = OUT + ".raw.gif"
q[0].save(raw, save_all=True, append_images=q[1:], duration=dur, loop=0, optimize=True, disposal=1)
subprocess.run(["npx", "-y", "gifsicle", "-O3", "--lossy=45", raw, "-o", OUT], check=True, shell=os.name == "nt")
os.remove(raw)
print(len(seq), "frames", os.path.getsize(OUT) // 1024, "KB")
