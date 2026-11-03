#!/usr/bin/env python3
"""Writes T1's events in observer-silly-le-long.json (and -temoins.json): what he did, instead of the 2107 poses and the van's track that
add_van.py wrote from it. The player works the poses out of them (src/engine/events), by the law add_van.py followed.

Every figure is build_silly.py's and add_van.py's, with where it comes from. Run after build_silly.py (it reads the recordings' milestones):

    python3 events_silly.py ../../../../../public/demo-data/observer-silly-le-long.json geipan
    python3 events_silly.py ../../../../../public/demo-data/observer-silly-le-long-temoins.json temoins
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = 6371008.8
osm = json.load(open(os.path.join(HERE, "osm.json")))
ways = {e["id"]: e for e in osm["elements"]}

# The north-east-bound carriageway of the RN2, chained end to end from OSM (build_silly.CHAIN).
CHAIN = [407462461, 1306007374, 1306007373, 386593458, 147925061, 10313918, 147925062, 8279892,
         1306008472, 1306008473, 1306008477, 1306008476]
road = []
for wid in CHAIN:
    g = [(p["lat"], p["lon"]) for p in ways[wid]["geometry"]]
    road.extend(g if not road else g[1:])
LAT0, LNG0 = road[0]


def enu(lat, lng):
    return (math.radians(lng - LNG0) * R * math.cos(math.radians(LAT0)), math.radians(lat - LAT0) * R)


def geo(e, n):
    return (LAT0 + math.degrees(n / R), LNG0 + math.degrees(e / (R * math.cos(math.radians(LAT0)))))


pts = [enu(*p) for p in road]
cum = [0.0]
for a, b in zip(pts, pts[1:]):
    cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))


def at(s):
    for i in range(len(pts) - 1):
        if cum[i + 1] >= s:
            f = (s - cum[i]) / (cum[i + 1] - cum[i])
            (e0, n0), (e1, n1) = pts[i], pts[i + 1]
            return e0 + (e1 - e0) * f, n0 + (n1 - n0) * f
    raise ValueError(s)


def project(e, n):
    best = None
    for i in range(len(pts) - 1):
        (e0, n0), (e1, n1) = pts[i], pts[i + 1]
        dx, dy = e1 - e0, n1 - n0
        f = max(0, min(1, ((e - e0) * dx + (n - n0) * dy) / (dx * dx + dy * dy)))
        d = math.hypot(e0 + dx * f - e, n0 + dy * f - n)
        if best is None or d < best[0]:
            best = (d, cum[i] + f * math.hypot(dx, dy))
    return best[1]


T0 = 48.0  # Tavion s at the start of the recording (CR p.39)
ms = lambda tau: int(round((tau - T0) * 1000))
SPEEDS = [(48.0, 138.0), (56.2, 135.72), (84.6, 73.23), (119.2, 48.56), (125.4, 47.02), (128.9, 42.59),
          (161.7, 48.11), (202.0, 57.52), (257.2, 77.25)]


def speed(tau):
    for (t0, v0), (t1, v1) in zip(SPEEDS, SPEEDS[1:]):
        if t0 <= tau <= t1:
            return (v0 + (v1 - v0) * (tau - t0) / (t1 - t0)) / 3.6
    return SPEEDS[-1][1] / 3.6


# "Just after passing under the bridge" at Tavion 119.2 (CR p.50): 15 m past it, on the road.
S_THROUGH = project(*enu(49.1140315, 2.7724948)) + 15
through_lat, through_lng = geo(*at(S_THROUGH))


def start_place():
    """Where the simulation's van is at the start: the témoins' van starts there too (build_silly.same place)."""
    s, s_of, tau = 0.0, {}, T0
    for i in range(int((250 + 80 - 48) / 0.1) + 1):
        tau = round(48 + i * 0.1, 1)
        s_of[tau] = s
        s += speed(tau) * 0.1
    return geo(*at(s_of[48.0] + S_THROUGH - s_of[119.2]))


def wrap(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def events(recording, variant):
    e = next(m["t"] for m in recording["milestones"] if m["label"] == "E")
    until = recording["durationSeconds"] * 1000 if variant == "geipan" else None
    keys = recording["observerTrack"]["keyframes"]
    until = max(k["t"] for k in keys) if keys else until
    speeds = wrap([{"t": ms(tau), "kmh": kmh} for tau, kmh in SPEEDS], "derived",
                  "The GEIPAN simulation's displayed speeds: the reconstitution's speed times its correction factor (CR p.49-53)")
    drive = {
        "vehicle": "van",
        "path": [{"lat": lat, "lng": lng} for lat, lng in road],
        "speeds": speeds,
        "eye": {"x": -0.47, "y": 1.50, "z": -0.25},
        "fovDeg": 60,
    }
    if variant == "geipan":
        drive["through"] = wrap({"t": ms(119.2), "lat": round(through_lat, 9), "lng": round(through_lng, 9)}, "stated",
                                "Just after passing under the bridge of the RD548 at Tavion 119.2 (Ttemoin 141.8, CR p.50): 15 m past it")
    else:
        lat, lng = start_place()
        drive["through"] = wrap({"t": 0, "lat": round(lat, 9), "lng": round(lng, 9)}, "derived",
                                "Where the simulation's van is at the first sight, near PR4: the same place, the same instant, slower after")
        drive["speedDivisors"] = wrap([{"t": ms(48.0), "divisor": 1.3}, {"t": ms(56.2), "divisor": 1.3}, {"t": ms(84.6), "divisor": 1.0}], "derived",
                                      "The 1.3 the simulation multiplied the witnesses' speed by in the first phase (CR p.51), taken out; less and less "
                                      "of it until the van slows (SUPPOSED: the report gives the factor of the first phase only)")
    target = wrap({"lat": 49.114222, "lng": 2.772042}, "stated", "RN2 PK 5+500, 49°06'51.20\"N 2°46'19.35\"E, stationary the whole time (PV p.7, CR p.5, 33)")
    return [
        {"type": "event", "eventType": "drive", "t": 0, "until": until, "params": drive},
        {"type": "event", "eventType": "lookAhead", "t": 0, "until": e, "params": {
            "target": target, "pitchShare": 0.6,
            "keepDeg": wrap(25, "assumed", "A driver keeps what he watches in the corner of his eye, and looks at the road"),
            "glanceBeyondDeg": wrap(50, "assumed", "Further off than that he does not look away from the road for long"),
            "glanceS": wrap(1.25, "assumed", "Nobody timed his glances; their order is his (CR p.9)"),
            "roadS": wrap(2.5, "assumed", "Nobody timed his glances; their order is his (CR p.9)")}},
        {"type": "event", "eventType": "lean", "t": e, "until": e + 5800, "params": {
            "offsetM": wrap({"x": -0.10, "y": -0.05, "z": -0.12}, "stated", "\"Il a dû au début se baisser légèrement pour réussir à le voir\" (CR p.9); how far, SUPPOSED"),
            "holdS": 5.0, "turnS": 0.8}},
        {"type": "event", "eventType": "watch", "t": e, "params": {
            "mirror": {"x": -0.999, "y": 1.227, "z": -0.895},
            "target": target, "pitchShare": 0.6,
            "firstS": 6.5, "mirrorS": 3.5, "glanceS": 1.25, "roadS": 1.0,
            "glancesUntil": wrap(e + 56200, "stated",
                                 "\"Ensuite il regardait alternativement en direct et dans le rétroviseur, et pour finir, au loin, uniquement au rétroviseur\" (CR p.9); when, SUPPOSED")}},
    ]


def main(path, variant):
    recording = json.load(open(path))
    recording["events"] = events(recording, variant)
    recording["observerTrack"] = {"keyframes": []}
    for decor in recording["decor"]:
        if decor["id"] == "van":
            decor.pop("track", None)
    with open(path, "w") as out:
        json.dump(recording, out, ensure_ascii=False, indent=1, separators=(",", ":"))
        out.write("\n")
    print(f"{path}: {len(recording['events'])} events")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "--print":
        print(json.dumps(events(json.load(open(sys.argv[1])), sys.argv[3] if len(sys.argv) > 3 else "geipan")))
    else:
        main(sys.argv[1], sys.argv[2])
