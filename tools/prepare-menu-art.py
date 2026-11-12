"""Prepare the supplied journey artwork; originals are never modified.

The reference includes a baked title and start button. Rebuild only the inner
parchment title area from its blank margins and crop above the baked button.
The game draws its own title and working controls.
"""
import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("reference", type=Path)
args = parser.parse_args()

image = ImageOps.fit(Image.open(args.reference).convert("RGB"), (1280, 720),
                     method=Image.Resampling.LANCZOS)
box = (418, 50, 875, 139)
width, height = box[2] - box[0], box[3] - box[1]
patch = Image.new("RGB", (width, height))
noise = random.Random(42)
for y in range(height):
    row = box[1] + y
    left = [sum(image.getpixel((x, row))[c] for x in range(402, 415)) / 13 for c in range(3)]
    right = [sum(image.getpixel((x, row))[c] for x in range(883, 896)) / 13 for c in range(3)]
    for x in range(width):
        f = x / (width - 1)
        grain = noise.uniform(-1.8, 1.8)
        patch.putpixel((x, y), tuple(max(0, min(255, round(a * (1 - f) + b * f + grain)))
                                    for a, b in zip(left, right)))
mask = Image.new("L", (width, height), 0)
ImageDraw.Draw(mask).rectangle((5, 4, width - 6, height - 5), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(3))
image.paste(patch, box[:2], mask)

# Preserve the complete illustrated route and labels; omit the raster start UI.
panorama = image.crop((0, 0, 1280, 520)).resize((1600, 650), Image.Resampling.LANCZOS)
folder = ROOT / "assets" / "images"
folder.mkdir(parents=True, exist_ok=True)
output = folder / "entry-journey.webp"
panorama.save(output, "WEBP", quality=92, method=6)
panorama.resize((1280, 520), Image.Resampling.LANCZOS).save(
    ROOT / "tmp" / "entry-journey-art-preview.jpg", quality=90)
print(f"Prepared {output}: {output.stat().st_size:,} bytes, 1600x650")
