#!/usr/bin/env python3
"""Build-time conversion of Mirage's "Chez Aoi" mockup assets (gameflow-bc/v3) into bundled WebP files.
Run once by hand: python3 tools/home-assets.py <mockup v3 dir>. Nothing is generated at runtime.
- room backgrounds 1280x720 -> WebP q72
- furniture sprites -> WebP alpha, max 512 px wide
- Aoi bodies (6 outfits) -> WebP alpha, 600 px high
- the nap clip (sleep sheet, 15 frames) -> horizontal strips of <= 4096 px, plus one still frame (Safari / reduced motion)
"""
import json, sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1]); out = Path(__file__).resolve().parent.parent / "public/game/scenes/home"
out.mkdir(parents=True, exist_ok=True)
for r in ["salon", "cuisine", "chambre", "sdb"]:
    Image.open(src / f"assets/home2/{r}-day.jpg").convert("RGB").save(out / f"{r}.webp", quality=72, method=6)
for f in sorted((src / "assets/home2/sprites").glob("*.png")):
    im = Image.open(f).convert("RGBA")
    if im.width > 512: im = im.resize((512, round(im.height * 512 / im.width)), Image.LANCZOS)
    im.save(out / f"{f.stem}.webp", quality=80, method=6)
    print(f.stem, "ar", round(im.height / im.width, 4))
for f in sorted((src / "assets/drive/body-cut").glob("aoi-*.png")):
    im = Image.open(f).convert("RGBA"); im = im.resize((round(im.width * 600 / im.height), 600), Image.LANCZOS)
    im.save(out / f"{f.stem}.webp", quality=80, method=6)
    print(f.stem, im.size)
sheet = Image.open(src / "assets/anim/sleep/sheet.webp").convert("RGBA"); meta = json.load(open(src / "assets/anim/sleep/meta.json"))
fw, fh, n = meta["w"], meta["h"], meta["frames"]; per = 4096 // fw
for k in range(0, n, per):
    c = min(per, n - k); sheet.crop((k * fw, 0, (k + c) * fw, fh)).save(out / f"aoi-nap-{k // per}.webp", quality=78, method=6)
sheet.crop((7 * fw, 0, 8 * fw, fh)).save(out / "aoi-nap-still.png", optimize=True)
print("nap", fw, fh, n, "per strip", per)
