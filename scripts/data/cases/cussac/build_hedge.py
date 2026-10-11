"""
Replaces the Cussac hedge of public/demo-data/observer-cussac.json (nine identical trees) by the trees the photograph
of late summer 1968 (Claude de Saint Etienne, LDLN n° 25; the "Cussac_hebdo.jpg" the recording overlays) shows,
seven of them, each at the azimuth it has there, as tall as it looks, as wide as it looks.

The photograph is registered at heading 283°, pitch -1.2°, field 47.3° across its 552 px (11.67 px per degree), so
the horizon is at y = 178 and a pixel x is the azimuth 283 + (x - 276) / 11.67. What is read off it, in pixels:
the tree's middle x, the top of its crown, its foot, and the width of its crown. Its distance is NOT read off it (the
ground is not flat, and the photographer's height is not known): the tree is put where the azimuth meets the line
of the hedge the plan gives (haie 1 to 9 of the old list, the survey's CD = 10 m before the sphere), and its height
and width then follow from the angles it subtends there.

Run with: python3 scripts/data/cases/cussac/build_hedge.py   (then build_anne_marie.py)
"""
import json
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
RECORDING = os.path.join(ROOT, "public", "demo-data", "observer-cussac.json")
PX_PER_DEG = 552 / 47.3
HORIZON_Y = 178
CENTRE_X, HEADING = 276, 283
# The old hedge's two ends, east/north from François's spot (haie-1 and haie-9): the line the trees stand on.
LINE_FROM, LINE_TO = (-73.9, 42.5), (-59.4, -11.6)

# id, model, x, top y, foot y, crown width px. A and B are cut by the photo's edge at its top: B's crown is taken to
# end at y = 0 at least.
TREES = [
    ("haie-1", "jagobo-tree-maple-a", 130, 62, 200, 65),   # dark, dense, beside the pole
    ("haie-2", "jagobo-tree-aspen-a", 190, 0, 212, 55),    # the tall slender one
    ("haie-3", "jungle-jim-tree-medium-c", 240, 145, 205, 60),  # the round bushy one
    ("haie-4", "jungle-jim-tree-medium-b", 332, 150, 205, 30),  # the small one at the sphere
    ("haie-5", "jungle-jim-tree-medium-a", 412, 128, 215, 55),
    ("haie-6", "jungle-jim-tree-large-b", 465, 128, 215, 50),
    ("haie-7", "jungle-jim-tree-medium-a", 524, 138, 215, 32),
]
# What the photograph shows as one dark mass of foliage is a second tree behind the first, which a single sparse
# model cannot be: id of the tree it stands behind, its model, how far behind (m), and how much shorter it is.
COMPANIONS = [
    ("haie-1b", "haie-1", "jungle-jim-tree-large-b", 2.5, 0.9),
]


def azimuth_of(x):
    return HEADING + (x - CENTRE_X) / PX_PER_DEG


def on_line(azimuth):
    """Where the ray at this azimuth from the origin meets the hedge's line (extended past its ends if need be)."""
    a = math.radians(azimuth)
    dx, dy = math.sin(a), math.cos(a)
    (x1, y1), (x2, y2) = LINE_FROM, LINE_TO
    ex, ey = x2 - x1, y2 - y1
    # t * (dx, dy) = (x1, y1) + s * (ex, ey)
    det = dx * (-ey) - dy * (-ex)
    t = (x1 * (-ey) - y1 * (-ex)) / det
    return t * dx, t * dy, t


trees = []
for ident, model, x, top, foot, crown in TREES:
    az = azimuth_of(x)
    east, north, dist = on_line(az)
    above = (HORIZON_Y - top) / PX_PER_DEG
    below = (foot - HORIZON_Y) / PX_PER_DEG
    height = dist * (math.tan(math.radians(above)) + math.tan(math.radians(below)))
    width = dist * math.tan(math.radians(crown / PX_PER_DEG))
    trees.append({
        "id": ident, "kind": "tree",
        "title": {"fr": "Arbre de la haie", "en": "Hedge tree", "es": "Árbol del seto", "it": "Albero della siepe"},
        "eastM": round(east, 1), "northM": round(north, 1),
        "sizeM": {"widthM": round(width, 1), "lengthM": round(width, 1), "heightM": round(height, 1)},
        "model": {"id": model},
        "occludesSourceIds": ["boule"]
    })
    print(ident, f"az {az:.1f} dist {dist:.0f} m height {height:.1f} m width {width:.1f} m")

for ident, behind, model, distance, share in COMPANIONS:
    tree = next(t for t in trees if t["id"] == behind)
    scale = distance / math.hypot(tree["eastM"], tree["northM"])
    companion = json.loads(json.dumps(tree))
    companion.update({"id": ident, "eastM": round(tree["eastM"] * (1 + scale), 1), "northM": round(tree["northM"] * (1 + scale), 1), "model": {"id": model}})
    companion["sizeM"] = {k: round(v * share, 1) for k, v in tree["sizeM"].items()}
    trees.insert(trees.index(tree) + 1, companion)

text = open(RECORDING, encoding="utf-8").read()
pattern = re.compile(r'  \{\n   "id": "haie-\w+",\n(?:.*\n)*?  \},\n')
matches = list(pattern.finditer(text))
assert len(matches) >= 7, len(matches)
first, last = matches[0].start(), matches[-1].end()
assert all(m.end() <= matches[i + 1].start() for i, m in enumerate(matches[:-1]))
block = "".join("\n".join("  " + line for line in json.dumps(t, ensure_ascii=False, indent=1).splitlines()) + ",\n" for t in trees)
open(RECORDING, "w", encoding="utf-8").write(text[:first] + block + text[last:])
