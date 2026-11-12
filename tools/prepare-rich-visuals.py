"""Crop scenery only: no reference UI, hero, NPC labels, or fake level numbers."""
import argparse
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("journey", type=Path)
parser.add_argument("camp", type=Path)
args = parser.parse_args()
journey = ImageOps.fit(Image.open(args.journey).convert("RGB"), (1280, 720), method=Image.Resampling.LANCZOS)
camp = ImageOps.fit(Image.open(args.camp).convert("RGB"), (1365, 768), method=Image.Resampling.LANCZOS)
folder = ROOT / "assets" / "images" / "scenery"
folder.mkdir(parents=True, exist_ok=True)
images = {
    "camp-preview.webp": (camp, (410, 267, 953, 480), (480, 240)),
    "river-preview.webp": (journey, (855, 466, 1082, 674), (480, 240)),
    "hills-preview.webp": (journey, (310, 185, 700, 282), (480, 240)),
    "jerusalem-preview.webp": (journey, (0, 125, 330, 226), (480, 240)),
    "camp-mountains.webp": (camp, (378, 78, 854, 254), (952, 352)),
}
for name, (source, box, size) in images.items():
    image = ImageOps.fit(source.crop(box), size, method=Image.Resampling.LANCZOS)
    image.save(folder / name, "WEBP", quality=89, method=6)
    print(f"{name}: {(folder / name).stat().st_size:,} bytes")
    image.save(ROOT / "tmp" / (name.replace(".webp", ".jpg")), quality=90)
