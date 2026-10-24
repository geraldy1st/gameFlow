#!/usr/bin/env python3
"""perf-ios lot B: 800 px WebP variants of the heavy JPEGs, generated offline and committed.

For every public/game/**/*.jpg larger than 500 KB (lower-case .jpg only), writes <name>.webp next
to it: width 800 px (never upscaled, same aspect ratio so cropping / object-fit are unchanged),
quality 78, method 6. A file above the size ceiling (300 KB, QA RES-5) is re-encoded at lower
quality (step 6, floor 50). The JPEGs stay as they are (fallback, QA Q6).

Then writes the manifest the app reads (src/components/game/webp-manifest.json): the sorted list
of paths relative to public/game/ that have a variant. The app derives a .webp URL ONLY for paths
in this list (QA RES-1: a missing file would be a 404, <img>/<picture> do not fall back on it).

usage: tools/webp-assets.py [--check]   (--check: verify manifest <-> files, exit 1 on mismatch)
"""
import json, os, sys
from PIL import Image

ROOT = "public/game"
MANIFEST = "src/components/game/webp-manifest.json"
MIN_BYTES = 500 * 1024
WIDTH = 800
QUALITY = 78
CEILING = 300 * 1024


def sources():
    out = []
    for d, _, files in os.walk(ROOT):
        for f in files:
            p = os.path.join(d, f)
            if f.endswith(".jpg") and os.path.getsize(p) > MIN_BYTES:
                out.append(os.path.relpath(p, ROOT).replace(os.sep, "/"))
    return sorted(out)


def encode(src, dst):
    im = Image.open(src)
    im = im.convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    q = QUALITY
    while True:
        im.save(dst, "WEBP", quality=q, method=6)
        if os.path.getsize(dst) <= CEILING or q <= 50:
            return q
        q -= 6


def check():
    listed = json.load(open(MANIFEST))
    bad = [r for r in listed if not os.path.isfile(f"{ROOT}/{r[:-4]}.webp")]
    missing = [r for r in sources() if r not in listed]
    big = [r for r in listed if os.path.isfile(f"{ROOT}/{r[:-4]}.webp") and os.path.getsize(f"{ROOT}/{r[:-4]}.webp") > CEILING]
    for r in bad:
        print("manifest entry without .webp:", r)
    for r in missing:
        print("heavy jpg without manifest entry:", r)
    for r in big:
        print("webp above ceiling:", r)
    print(f"{len(listed)} entries, {len(bad)} without file, {len(missing)} unlisted, {len(big)} above {CEILING // 1024} KB")
    return 1 if bad or missing or big else 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    rels = sources()
    for r in rels:
        q = encode(f"{ROOT}/{r}", f"{ROOT}/{r[:-4]}.webp")
        if q != QUALITY:
            print(f"{r}: quality {q} (ceiling)")
    with open(MANIFEST, "w") as f:
        json.dump(rels, f, indent=1)
        f.write("\n")
    print(f"{len(rels)} variants, manifest {MANIFEST}")
