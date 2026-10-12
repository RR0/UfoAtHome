#!/usr/bin/env python3
"""The trees around the place where the Saint-Lô witness stood, from the IGN's LiDAR HD canopy height model
(MNH, height of what stands above the ground, Licence Ouverte 2.0), served by the Géoplateforme's WMS.

Writes scripts/data/cases/saint-lo/trees.json: one entry per tree crown found within 130 m of the observer,
{eastM, northM, heightM, widthM}, east and north in metres from where he stood.

    python3 scripts/data/cases/saint-lo/fetch_trees.py
"""
import json
import math
import pathlib
import struct
import subprocess
import urllib.parse

LAT, LNG = 49.104890, -1.075382          # the spot he sent a Google Maps link to
HALF_M = 150.0                           # the zone fetched, around the observer
SIZE = 600                               # pixels: 0.5 m each
RADIUS_M = 130.0                         # the trees kept
MIN_HEIGHT_M = 4.0
EYE_M = 1.6
OUT = pathlib.Path(__file__).with_name("trees.json")
LAYER = "IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"


def fetch():
    dlat = HALF_M / 111320.0
    dlng = HALF_M / (111320.0 * math.cos(math.radians(LAT)))
    query = urllib.parse.urlencode({
        "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetMap", "LAYERS": LAYER, "STYLES": "", "CRS": "EPSG:4326",
        "BBOX": f"{LAT - dlat:.6f},{LNG - dlng:.6f},{LAT + dlat:.6f},{LNG + dlng:.6f}", "WIDTH": SIZE, "HEIGHT": SIZE,
        "FORMAT": "image/geotiff"})
    # curl rather than urllib: the answer is 1.4 MB and the proxy of a sandbox cuts it short for urllib
    answer = subprocess.run(["curl", "-s", "--fail", "--retry", "3", "-m", "90", "https://data.geopf.fr/wms-r/wms?" + query],
                            check=True, capture_output=True)
    return answer.stdout


def read_float_tiff(data):
    """The one layout the service answers with: little-endian, uncompressed, 32-bit floats, in strips."""
    assert data[:2] == b"II"
    ifd = struct.unpack("<I", data[4:8])[0]
    count = struct.unpack("<H", data[ifd:ifd + 2])[0]
    tags = {}
    for i in range(count):
        tag, kind, n, value = struct.unpack("<HHII", data[ifd + 2 + i * 12:ifd + 14 + i * 12])
        tags[tag] = (kind, n, value)
    width, height = tags[256][2], tags[257][2]

    def array(tag):
        kind, n, value = tags[tag]
        size = {3: 2, 4: 4}[kind]
        raw = struct.pack("<I", value)[:n * size] if n * size <= 4 else data[value:value + n * size]
        return list(struct.unpack("<" + ("H" if kind == 3 else "I") * n, raw))

    buffer = b"".join(data[o:o + c] for o, c in zip(array(273), array(279)))
    return width, height, struct.unpack("<%df" % (width * height), buffer[:width * height * 4])


def crowns(width, height, heights):
    """Local maxima of the canopy, each with the width of the crown around it."""
    res = 2 * HALF_M / width

    def at(x, y):
        return heights[y * width + x] if 0 <= x < width and 0 <= y < height else 0.0

    reach = int(round(2.5 / res))
    found = []
    centre = width // 2
    for y in range(height):
        for x in range(width):
            h = at(x, y)
            if h < MIN_HEIGHT_M:
                continue
            east, north = (x - centre) * res, (centre - y) * res
            if math.hypot(east, north) > RADIUS_M:
                continue
            if any(at(x + dx, y + dy) > h or (at(x + dx, y + dy) == h and (dy, dx) < (0, 0))
                   for dy in range(-reach, reach + 1) for dx in range(-reach, reach + 1) if (dx, dy) != (0, 0)):
                continue
            # the crown: what stands above half the top's height around it, within 8 m
            area = 0
            span = int(round(8.0 / res))
            for dy in range(-span, span + 1):
                for dx in range(-span, span + 1):
                    if math.hypot(dx, dy) * res <= 8.0 and at(x + dx, y + dy) >= h * 0.5:
                        area += 1
            diameter = 2 * math.sqrt(area * res * res / math.pi)
            found.append({"eastM": round(east, 1), "northM": round(north, 1), "heightM": round(h, 1),
                          "widthM": round(max(2.0, min(diameter, 16.0)), 1)})
    return found


if __name__ == "__main__":
    width, height, heights = read_float_tiff(fetch())
    trees = crowns(width, height, heights)
    # What matters to what he saw is what rises above the ground's own horizon: keep the trees that stand out
    # at 2 degrees or more above his eye line, nearest and tallest first.
    def angle(t):
        return math.degrees(math.atan2(t["heightM"] - EYE_M, math.hypot(t["eastM"], t["northM"])))
    trees = [t for t in trees if angle(t) >= 2.0]
    trees.sort(key=lambda t: -angle(t))
    OUT.write_text(json.dumps(trees, indent=0) + "\n")
    print(f"{len(trees)} trees, tallest {max(t['heightM'] for t in trees)} m, written to {OUT}")
