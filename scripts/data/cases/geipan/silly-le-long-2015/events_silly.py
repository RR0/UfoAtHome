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


# The aircraft, as build_silly.py solves it from the simulation's pointings (CR p.49-54): the runway (OSM 96594549, threshold 25 at its east
# end), a uniform approach along its centreline fitted to them, and their heights above the eye, then a touch-and-go.
rwy = ways[96594549]["geometry"]
THR_E, THR_N = enu(rwy[0]["lat"], rwy[0]["lon"])
END_E, END_N = enu(rwy[-1]["lat"], rwy[-1]["lon"])
LAND_HDG = math.degrees(math.atan2(END_E - THR_E, END_N - THR_N)) % 360
# build_silly.x0 and .slope: metres before the threshold at Tavion 0, and their rate (m/s, negative: towards it).
APPROACH_X0, APPROACH_SLOPE = 6318.6885163556635, -33.96764010718883
HEIGHTS = [(56.2, 182.75715920035987), (84.6, 130.86141923993748), (119.2, 118.37374731167196), (125.4, 109.57200010783303),
           (128.9, 102.28217491549732), (161.7, 42.37993911395558), (202.0, 0.0)]


# The phenomenon, as build_silly.py draws it (its front_shapes, rear_shapes and keyframes), by variant: when the bar becomes the V under the
# bridge's deck (T_SWITCH), when the rectangles stop blinking (T_END), when it is lost (T_END + 0.5 s), and its size: build_silly.PHEN_METRES,
# the GEIPAN simulation's fitted size and elevation turned into metres at its instants (for the witnesses' speed, at the instants the van is
# where the simulation's was then).
PHENOMENON = {
    "geipan": {"switch": 69500, "end": 202000, "vanish": 202500, "metres": [
        (0, 34.481865001039154, 25.862580550941594), (8200, 34.31177029211056, 26.031427948634526), (36600, 31.991476039460714, 19.811764400875774),
        (71200, 25.346678777057857, 20.256454601309603), (77400, 41.09324256299565, 30.771552880027997), (80900, 61.295209886782814, 27.933759117179576),
        (113700, 52.25622171226259, 20.660760769530814), (154000, 37.82469507912616, 24.144786670689438), (209200, 38.51365951227697, 26.693272210704002)]},
    "temoins": {"switch": 83800, "end": 210800, "vanish": 211300, "metres": [
        (0, 34.481865001039154, 25.862580550941594), (10800, 34.31177029211056, 26.031427948634526), (46200, 31.991476039460714, 19.811764400875774),
        (85900, 25.346678777057857, 20.256454601309603), (92600, 41.09324256299565, 30.771552880027997), (96200, 61.295209886782814, 27.933759117179576),
        (127200, 52.25622171226259, 20.660760769530814), (165300, 37.82469507912616, 24.144786670689438), (217900, 38.51365951227697, 26.693272210704002)]},
}
TITLES = {
    "pan": {"fr": "Le phénomène", "en": "The phenomenon", "es": "El fenómeno", "it": "Il fenomeno"},
    "blanc-g": {"fr": "Feu blanc fixe (gauche)", "en": "Steady white light (left)", "es": "Luz blanca fija (izquierda)", "it": "Luce bianca fissa (sinistra)"},
    "blanc-d": {"fr": "Feu blanc fixe (droite)", "en": "Steady white light (right)", "es": "Luz blanca fija (derecha)", "it": "Luce bianca fissa (destra)"},
    "rouge": {"fr": "Feu rouge clignotant", "en": "Flashing red light", "es": "Luz roja intermitente", "it": "Luce rossa lampeggiante"},
    "rect-g": {"fr": "Rectangle blanc (gauche)", "en": "White rectangle (left)", "es": "Rectángulo blanco (izquierda)", "it": "Rettangolo bianco (sinistro)"},
    "rect-d": {"fr": "Rectangle blanc (droite)", "en": "White rectangle (right)", "es": "Rectángulo blanco (derecha)", "it": "Rettangolo bianco (destro)"},
}
BAR = [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 1}]
VEE = [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 0.45}, {"x": 0.5, "y": 1}, {"x": 0, "y": 0.45}]
WHITE = "#f4f7ff"


def wrap(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def events(recording, variant):
    e = next(m["t"] for m in recording["milestones"] if m["label"] == "E")
    until = recording["durationSeconds"] * 1000 if variant == "geipan" else None
    keys = recording["observerTrack"]["keyframes"]
    until = max(k["t"] for k in keys) if keys else until
    # Run again on a recording already stated as events: the end it already says.
    until = next((event["until"] for event in recording.get("events", []) if event["eventType"] == "drive"), until)
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
    (h0t, h0), (h1t, h1) = HEIGHTS[0], HEIGHTS[1]
    heights = [{"t": 0, "altitudeM": round(h0 + (h0t - T0) * (h1 - h0) / (h0t - h1t), 3)}]
    heights += [{"t": ms(tau), "altitudeM": round(h, 3)} for tau, h in HEIGHTS]
    # The touch-and-go: the roll, then the climb-out along the runway at 3 m/s (CR p.54: still in line 45 s climbing; the rate ASSUMED).
    heights += [{"t": ms(210), "altitudeM": 0}, {"t": ms(330), "altitudeM": 360}]
    fly = {
        "from": wrap({"lat": rwy[0]["lat"], "lng": rwy[0]["lon"]}, "stated", "Threshold 25 of runway 07/25 of Le Plessis-Belleville (OSM 96594549)"),
        "headingDeg": wrap(round(LAND_HDG, 3), "derived", "The runway's own heading, from its two ends (OSM 96594549)"),
        "speeds": wrap([{"t": 0, "kmh": round(-APPROACH_SLOPE * 3.6, 3)}], "derived",
                       "A uniform approach fitted to the distances and elevations the GEIPAN simulation gives of the aircraft seen from the van (CR p.49-54)"),
        "at": {"t": 0, "metresBefore": round(APPROACH_X0 + APPROACH_SLOPE * T0, 3)},
        "heights": wrap(heights, "derived", "The simulation's heights above the eye at its instants (CR p.49-54); the touch-and-go's climb ASSUMED"),
    }
    ph = PHENOMENON[variant]
    light = lambda source, along, color: {"sourceId": source, "title": TITLES[source], "kind": "oval", "color": color, "brightness": 0.8, "halo": 1.2,
                                          "widthShare": 0.035, "minWidthDeg": 0.18, "alongShare": along}
    rect = lambda source, along: {"sourceId": source, "title": TITLES[source], "kind": "polygon", "points": BAR, "color": WHITE, "brightness": 0.5,
                                  "widthShare": 0.095, "heightShare": 0.06, "alongShare": along, "upShare": 0.06}
    phenomenon = [
        {"type": "event", "eventType": "stand", "who": "phenomenon", "t": 0, "until": ph["vanish"], "params": {
            "place": target,
            "metres": wrap([{"t": t, "widthM": round(w, 3), "heightM": round(h, 3)} for t, w, h in ph["metres"]], "derived",
                           "The GEIPAN simulation's size and elevation fitted to T1's pointings (CR p.49-54), as metres at its distance then")}},
        {"type": "event", "eventType": "appearance", "who": "phenomenon", "t": 0, "until": ph["switch"], "params": {"parts": wrap([
            {"sourceId": "pan", "title": TITLES["pan"], "kind": "polygon", "points": BAR, "color": "#1d1f22", "widthShare": 1, "heightShare": 0.07, "minHeightDeg": 0.12},
            light("blanc-g", -0.5, WHITE), light("blanc-d", 0.5, WHITE),
            light("rouge", -0.385, "#ff2a1f")], "stated", "From the front, low and far: the dark flat bar of drawing 004, its two white lights at its ends and "
                                                         "the red one about 11.5 % of its span right of the left one (CR p.4-6)")}},
        {"type": "event", "eventType": "appearance", "who": "phenomenon", "t": ph["switch"], "until": ph["vanish"], "params": {"parts": wrap([
            {"sourceId": "pan", "title": TITLES["pan"], "kind": "polygon", "points": VEE, "color": "#8e9194", "widthShare": 1, "heightShare": 0.2},
            rect("rect-g", -0.4525), rect("rect-d", 0.4525)], "stated", "Past the bridge, close and from behind: the grey V of drawing 005, "
                                                                        "\"représente correctement la forme\", and its two white rectangles (CR p.8)")}},
        {"type": "event", "eventType": "blink", "who": "phenomenon", "t": 0, "until": ph["switch"], "params": {
            "parts": ["rouge"], "onS": wrap(0.5, "stated", "0.5 s on, 0.5 s off (CR p.5)"), "offS": 0.5, "off": {"transparency": 1, "brightness": 0}}},
        {"type": "event", "eventType": "blink", "who": "phenomenon", "t": ph["switch"], "until": ph["end"], "params": {
            "parts": ["rect-g", "rect-d"], "onS": wrap(2, "stated", "2 s on, 2 s off, together (CR p.8)"), "offS": 2,
            "off": {"color": "#0b0c0e", "brightness": None}}},
        {"type": "event", "eventType": "vanish", "who": "phenomenon", "t": ph["vanish"]},
    ]
    return [
        {"type": "event", "eventType": "drive", "t": 0, "until": until, "params": drive},
        {"type": "event", "eventType": "fly", "who": "f-hobs", "t": 0, "until": until, "params": fly},
        {"type": "event", "eventType": "lookAhead", "t": 0, "until": e, "params": {
            "target": target, "pitchShare": 0.6,
            "keepDeg": wrap(25, "assumed", "A driver keeps what he watches in the corner of his eye, and looks at the road"),
            "glanceBeyondDeg": wrap(50, "assumed", "Further off than that he does not look away from the road for long"),
            "glanceS": wrap(1.25, "assumed", "Nobody timed his glances; their order is his (CR p.9)"),
            "roadS": wrap(2.5, "assumed", "Nobody timed his glances; their order is his (CR p.9)")}},
        {"type": "event", "eventType": "lean", "t": e, "until": e + 5800, "params": {
            "offsetM": wrap({"x": -0.10, "y": -0.05, "z": -0.12}, "stated", "\"Il a dû au début se baisser légèrement pour réussir à le voir\" (CR p.9); how far, SUPPOSED"),
            "holdS": 5.0, "turnS": 0.8}},
        *phenomenon,
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
    recording["timeline"] = {"keyframes": []}
    for decor in recording["decor"]:
        if decor["id"] in ("van", "f-hobs"):
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
