#!/usr/bin/env python3
"""Metro run v6.1: converts Mirage's runner assets (gameflow-bc/runner/assets, read only) once into
public/game/scenes/metro/. Budget (Crypto): chunk + assets <= 2 MB transferred, strips <= 4096 px wide.
- anim/<clip>.webp: sprite sheets re-packed as grids (<= 18 frames of 224 px per row), lossy WebP + alpha;
  `slide` keeps frames 0-10 (the only ones drawn). frames.json gets `cols`.
- bg/: painted backdrop (v5) downscaled (far 1600 px, facades 1280 px wide; same aspect, so WALL_L is unchanged).
- obst/: the two Drive obstacle cut-outs as WebP (384 px high).
usage: tools/metro-assets.py [src_assets_dir] [out_dir]"""
import json, os, sys
from PIL import Image

S = sys.argv[1] if len(sys.argv) > 1 else "/workspace/gameflow-bc/runner/assets"
O = sys.argv[2] if len(sys.argv) > 2 else "public/game/scenes/metro"
MAXW = 4096
for d in ("anim", "bg", "obst"):
    os.makedirs(f"{O}/{d}", exist_ok=True)
frames = json.load(open(f"{S}/anim/frames.json"))
keep = {"slide": 11}
meta = {}
for k, m in frames.items():
    im = Image.open(f"{S}/anim/{k}/sheet.webp").convert("RGBA")
    n, w, h = keep.get(k, m["n"]), m["w"], m["h"]
    cols = min(n, MAXW // w)
    rows = -(-n // cols)
    out = Image.new("RGBA", (cols * w, rows * h))
    for i in range(n):
        out.paste(im.crop((i * w, 0, i * w + w, h)), ((i % cols) * w, (i // cols) * h))
    assert out.width <= MAXW and out.height <= MAXW
    out.save(f"{O}/anim/{k}.webp", quality=78, alpha_quality=85, method=6)
    meta[k] = {"n": n, "w": w, "h": h, "cols": cols, "norm": m["norm"], "bb": m["bb"][:n]}
json.dump(meta, open(f"{O}/anim/frames.json", "w"), separators=(",", ":"))
for name, width in (("far", 1600), ("facade-left", 1280), ("facade-right", 1280)):
    im = Image.open(f"{S}/bg/{name}.webp")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(f"{O}/bg/{name}.webp", quality=74, method=6)
for name in ("demenageurs", "policier"):
    im = Image.open(f"{S}/obst/{name}.png")
    im = im.resize((im.width * 3 // 4, im.height * 3 // 4), Image.LANCZOS)
    im.save(f"{O}/obst/{name}.webp", quality=80, alpha_quality=85, method=6)
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(O) for f in fs)
print(f"{O}: {total} bytes")
