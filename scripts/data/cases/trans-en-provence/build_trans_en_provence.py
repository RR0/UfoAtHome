"""
Builds public/demo-data/observer-trans-en-provence.json and case-trans-en-provence.json: Renato
Nicolaï's sighting of 8 January 1981 at Trans-en-Provence (Var), GEPAN enquiry 81/01.

Source: GEPAN Technical Note no. 16 (CNES, 1 March 1983), as translated by Velasco in the Journal of
Scientific Exploration 4(1), 1990, pp. 27-48, whose copy is on rr0.org
(time/1/9/9/0/Velasco_TransEnProvence/, pages 3 to 8). What it gives, and is used here:
- the witness's statement of 9 January (time about 17:00, a faint whistling, a device coming down "at the
  height of a big pine on the edge of the property", not spinning, no flames; he walks to the stone
  cabin and sees it on the ground from about 30 m; it lifts off at once, the same whistle, dust, "four
  openings below", leaves at high speed NE over the trees towards the forest of Trans);
- the GEPAN reconstruction of 17 February: arrival "of the order of a few seconds", total 30 to 40 s,
  never more than 70 m nor less than 30 m from it, pump house to cabin 17.5 m, cabin to impact 30 m,
  outside diameter 2.5 m, height 1.7 to 1.8 m, "gray, comparable to zinc", a thick ledge all round, under
  it four circles "like masonry pails" and two pieces that stand 20 cm below; "rose vertically over
  several metres, tilted above the platform, continued to rise in this position";
- the site (figures 1 to 3): the mark is 22 m from the tree left of which he first saw it, near the
  south-east entrance, against a retaining wall 2 to 2.5 m high; the platform is open to the south-west
  over nearly 180 degrees; the pump house, the cabin, the main house and the trees are placed from
  figure 2, whose north arrow points about 30 degrees to the left of the page's up;
- the weather of the station 17 km to the south-west: 6.8 C, humidity 30 %, no precipitation, wind from
  the south-east at 2 m/s, cloud 2/8, good visibility.
Where on the ground the property stands is NOT published: the report says only "2 km east of Trans, on the
side of a hill overlooking the valley of the Nartuby" and the map of figure 1 shows the D47 beside it. The
point taken is the D47's bend 1.9 km east-south-east of the village centre, on the valley's north side.

Run with: python3 scripts/data/cases/trans-en-provence/build_trans_en_provence.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
OUT = os.path.join(ROOT, "public", "demo-data")

THETA = 20.0  # bearing of the page's "up" (the hill): uphill on the scene's own elevation grid at the house (20 degrees), the north arrow of figure 2 (30) and the site diagram's compass (N up) agree with it; the terraces run along the contours, which are across it
# The house, placed by its author on the 1:5000 location plan of the report (figure 1): beside the Route de la Motte (D47).
HOUSE_LAT, HOUSE_LNG = 43.4969243, 6.5060473


def bearing(b):
    r = math.radians(b)
    return (math.sin(r), math.cos(r))


def add(p, v, k=1.0):
    return (p[0] + v[0] * k, p[1] + v[1] * k)


UP, RIGHT, DOWN = bearing(THETA), bearing(THETA + 90), bearing(THETA + 180)
HOUSE_FROM_A = (RIGHT[0] * 6.4 + UP[0] * -18.0, RIGHT[1] * 6.4 + UP[1] * -18.0)  # the house stands 6.4 m along and 18 m down the slope from the pump house
LAT0 = HOUSE_LAT - HOUSE_FROM_A[1] / 111320.0  # the pump house, where the witness stands first (A)
LNG0 = HOUSE_LNG - HOUSE_FROM_A[0] / (111320.0 * math.cos(math.radians(HOUSE_LAT)))
A = (0.0, 0.0)
# The pump house stands on level 3 just behind its front edge, 10.5 m above (up the slope from) the mark; the
# cabin is 17.5 m along the terrace and 30 m from the mark (GEPAN): 28 m along and 10.5 m down the slope.
B = add(A, RIGHT, 17.5)
IMPACT = add(add(B, RIGHT, 28.0), UP, -10.5)  # the trace on the ground, which is physical
# Where the ACCOUNT puts the machine so that the story holds together: the witness sees it "very well" over the roof
# from level 3, which a machine against the 2.5 m wall could not allow (see the GEPAN's reconstruction, which puts
# it at the trace). 8 m from the wall (its foot, not its middle) rather than 1 m: far enough that the line of sight
# from the edge of level 3 (5.2 m up, 8.3 m behind the wall's top edge) clears the wall's top onto the machine's foot.
IMPACT_ACCOUNT = add(IMPACT, UP, -7.05)
GAP = add(IMPACT, RIGHT, 22)  # 22 m from the mark, on the platform's far end
GAP = add(GAP, UP, 0.24 * 22)
NE = bearing(45)


def brg(frm, to):
    return math.degrees(math.atan2(to[0] - frm[0], to[1] - frm[1])) % 360


def latlng(p):
    return (LAT0 + p[1] / 111320.0, LNG0 + p[0] / (111320.0 * math.cos(math.radians(LAT0))))


def pose(t, at, look_at, look_alt, eye=1.7, turn=0.0, level=0.0):
    d = math.hypot(look_at[0] - at[0], look_at[1] - at[1])
    lat, lng = latlng(at)
    return {"t": t, "pose": {"lat": round(lat, 7), "lng": round(lng, 7), "elevationM": 0,
            "headingDeg": round((brg(at, look_at) + turn) % 360, 1),
            "pitchDeg": round(math.degrees(math.atan2(look_alt - eye - level, d)), 1), "fovDeg": 60}}


def said(fr, en, es, it):
    return {"fr": fr, "en": en, "es": es, "it": it}


# --- the machine: where it is at each instant (metres from A, altitude above the ground) -------------
T_LAND, T_LIFT, T_GONE, T_END = 3000, 30000, 35100, 40000
HULL = {"widthM": 2.5, "lengthM": 2.5, "heightM": 1.8}


def smoothstep(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def smootherstep(x):
    x = min(1.0, max(0.0, x))
    return x * x * x * (x * (6 * x - 15) + 10)


STEP_MS = 100  # the machine's position is stated every 100 ms: the player joins keyframes with straight lines, so what is smooth has to be stated densely


def arrival(impact, t):
    """(east, north, altitude above the ground) at t ms, 0 <= t <= T_LAND: the way down from the tree gap.

    GEPAN: "fast and continuous, without sudden changes in speed, and no stop until the time when contact was established
    with the ground"; the witness: it "fell like a stone and it didn't break", the whistle the whole way, no flame. So a
    curve (the figure 7 path is not a straight line: it bends to come down almost upright) at a steady pace, braked only
    over its last part, which is ASSUMED: a stone does not stop dead on a soft crust, and the shock he mentions is what
    that last part ends in. It settles on the ground; it does not bounce."""
    start = add(impact, (GAP[0] - impact[0], GAP[1] - impact[1]), 0.8)
    top = 14.0
    control = (impact[0] + (start[0] - impact[0]) * 0.18, impact[1] + (start[1] - impact[1]) * 0.18, 6.0)  # above the mark: it arrives nearly upright
    u = min(1.0, max(0.0, t / T_LAND))
    # Pace along the curve: steady, then eased over its last half to a few percent of its speed at the ground.
    BRAKE = 0.45
    # The pace is integrated numerically, so that the curve is walked at exactly that speed.
    steps = 400
    pace, area, knots = [], 0.0, [0.0]
    for i in range(1, steps + 1):
        x = i / steps
        speed = 1.0 if x <= BRAKE else 1.0 - 0.97 * smoothstep((x - BRAKE) / (1 - BRAKE))
        area += speed / steps
        knots.append(area)
    share = knots[min(steps, int(u * steps))] / knots[steps]
    # The curve walked by LENGTH, not by its parameter: a quadratic curve is not traced at a steady pace by itself.
    def point(x):
        q0, q1, q2 = (1 - x) ** 2, 2 * (1 - x) * x, x ** 2
        return (q0 * start[0] + q1 * control[0] + q2 * impact[0], q0 * start[1] + q1 * control[1] + q2 * impact[1],
                q0 * top + q1 * control[2] + q2 * 0.0)
    samples = [point(i / 400) for i in range(401)]
    lengths = [0.0]
    for i in range(1, 401):
        lengths.append(lengths[-1] + math.dist(samples[i], samples[i - 1]))
    wanted = share * lengths[-1]
    i = max(1, next((n for n, length in enumerate(lengths) if length >= wanted), 400))
    f = (wanted - lengths[i - 1]) / max(lengths[i] - lengths[i - 1], 1e-9)
    east, north, alt = (samples[i - 1][k] + (samples[i][k] - samples[i - 1][k]) * f for k in range(3))
    return east, north, alt


def departure(impact, t):
    """(east, north, altitude, heading, roll) at t ms after it lifts, 0 <= t <= T_GONE - T_LIFT.

    The witness: it "suddenly rose vertically over several metres, tilted above the platform, continued to rise in this
    position and disappeared in the sky", then "at high speed" north-east, "rising in altitude according to its decrease
    in apparent diameter". Three movements, JOINED: the rise starts and ends gently, the tilt begins while it is still
    rising and is done before it leaves, and the speed towards the north-east builds up from the end of the rise. The
    pace of each (a few seconds for the rise, 1.8 s for the tilt, up to about 70 m/s) is ASSUMED; the order is his."""
    seconds = t / 1000.0
    rise = 7.0 * smootherstep(seconds / 2.8)
    tilt = smootherstep((seconds - 0.9) / 1.9)
    # Horizontal speed, building from 1.3 s: integral of an eased ramp to 70 m/s, taken numerically.
    ground, climb, dt = 0.0, 0.0, 0.01
    for i in range(round(seconds / dt)):
        x = (i * dt - 1.3) / 2.9
        speed = 70.0 * smoothstep(x)
        ground += speed * dt
        climb += 0.45 * speed * dt
    east, north = add(impact, NE, ground)
    return east, north, rise + climb, 45.0 * tilt, 40.0 * tilt


# Where the recording's own ground (the top of level 3, where the pump house stands) is above the platform the machine lands on:
# 3.4 m, which is the difference of the two tops (measured on the scene: 3.39). The machine flies in a height of its own, counted
# from that ground (`altitudeM`), because a height above the ground UNDER it follows the terraces it passes over: crossing the edge
# of the 2.5 m wall was a jump of 2.5 m in the air, on the way down and again on the way out.
ORIGIN_ABOVE_PLATFORM = 3.4


def craft_track(impact):
    r = lambda v: round(v, 2)
    high = lambda alt: r(alt - ORIGIN_ABOVE_PLATFORM)
    keys = []
    for t in range(0, T_LAND + 1, STEP_MS):
        east, north, alt = arrival(impact, t)
        if t == 0:
            keys.append({"t": 0, "eastM": r(east), "northM": r(north), "altitudeM": high(alt), "sizeM": HULL,
                         "attitude": {"headingDeg": 0, "pitchDeg": 0, "rollDeg": 0}, "appearance": {"color": "#7d8186", "albedo": 0.3}})
        elif t == T_LAND:
            keys.append({"t": t, "eastM": r(impact[0]), "northM": r(impact[1]), "onGround": True})
        else:
            keys.append({"t": t, "eastM": r(east), "northM": r(north), "altitudeM": high(alt)})
    # Resting: square to the wall, so that its footprint (the highest of the ground under it) stops short of it.
    keys.append({"t": T_LIFT, "eastM": r(impact[0]), "northM": r(impact[1]), "onGround": True})
    for t in range(STEP_MS, T_GONE - T_LIFT - STEP_MS + 1, STEP_MS):
        east, north, alt, heading, roll = departure(impact, t)
        keys.append({"t": T_LIFT + t, "eastM": r(east), "northM": r(north), "altitudeM": high(max(alt, 0.02)),
                     "attitude": {"headingDeg": r(heading), "pitchDeg": 0, "rollDeg": r(roll)}})
    keys.append({"t": T_GONE, "present": False})
    return keys


def craft_position(impact, t):
    """Where the machine is at t ms, for the witness's eyes to follow: (east, north, altitude of its middle)."""
    if t <= T_LAND:
        east, north, alt = arrival(impact, t)
        return east, north, alt + 0.9
    if t < T_LIFT:
        return impact[0], impact[1], 0.9
    east, north, alt, _, _ = departure(impact, min(t - T_LIFT, T_GONE - T_LIFT - STEP_MS))
    return east, north, max(alt, 0.0) + 0.9


LEVEL = 3.5  # level 3 above the platform
LAG_MS = 200  # the eyes follow a moving thing a moment behind it
WALK_START, WALK_END = 4500, 16500
follow = lambda at, t, impact: pose(t, at, craft_position(impact, max(0, t - LAG_MS))[:2], craft_position(impact, max(0, t - LAG_MS))[2], level=LEVEL)
# --- the witness: at the pump house, turns round to the whistle, follows the machine down, walks to the cabin wall,
# watches, and follows it away. His gaze is stated as densely as the machine's path, a moment behind it: a gaze that
# jumps from one position to the next would lose it the moment it accelerates.
witness = [
    pose(0, A, GAP, 14.0, turn=150, level=LEVEL),  # looking away, working
    pose(1200, A, GAP, 14.0, turn=150, level=LEVEL),
]
witness += [follow(A, t, IMPACT_ACCOUNT) for t in range(2000, T_LAND + 1, 200)]
witness += [pose(WALK_START, A, craft_position(IMPACT_ACCOUNT, T_LAND)[:2], 1.0, level=LEVEL),
            pose(WALK_END, B, craft_position(IMPACT_ACCOUNT, T_LAND)[:2], 1.0, level=LEVEL),
            pose(T_LIFT, B, craft_position(IMPACT_ACCOUNT, T_LAND)[:2], 1.0, level=LEVEL)]
witness += [follow(B, t, IMPACT_ACCOUNT) for t in range(T_LIFT + 200, T_GONE + 1500, 200)]
witness += [follow(B, T_END, IMPACT_ACCOUNT)]

# --- the scenery the report names ---------------------------------------------------------------------
def building(id_, fr, en, es, it, at, w, l, h, heading=THETA, color=None, floors=1):
    # A building's width runs along bearing heading + 90: along the terrace (towards RIGHT, THETA + 90) when its heading is THETA.
    d = {"id": id_, "kind": "building", "title": said(fr, en, es, it), "eastM": round(at[0], 1), "northM": round(at[1], 1),
         "headingDeg": round(heading % 360, 1), "floors": floors, "sizeM": {"widthM": w, "lengthM": l, "heightM": h}}
    if color:
        d["color"] = color
    return d


# The hill is cut into terraces held by dry-stone walls ("restanques"): from the platform where the machine stood,
# the wall it stood against (2.5 m: the GEPAN's "retaining wall of known height"), level 2, level 3 (the pump house
# at its edge, and the cabin; the witness walks along it), level 4 ("each about one m high" above the first wall).
# The elevation grid cannot say it, so each level is a decor object of its own, flat on top.
# (name, near edge, far edge (m up the slope from the mark), height of the flat top above the relief under its centre.)
# The relief there climbs 23 % up the slope (measured on the scene's own grid, the GEPAN's hill to the north), so
# a level cut flat is further above the ground under its centre the further it is from the mark. The tops are at
# 0.1 m (the platform), 2.5 m (the wall), 3.5 and 4.5 m above the mark's own ground; the heights below are those tops
# less the relief under each centre, read on the scene's own grid (see the memory note).
LEVELS = [("platform", -14.0, 2.2, 1.45), ("level-2", 2.2, 8.0, 1.3), ("level-3", 8.0, 15.5, 0.7), ("level-4", 15.5, 22.0, 0.1)]
decor = []
for id_, near, far, top in LEVELS:
    p = add(add(IMPACT, UP, (near + far) / 2), RIGHT, -20)
    label = {"platform": ("Plate-forme de terre", "Earth platform", "Plataforma de tierra", "Piattaforma di terra")}.get(id_) or (
        "Restanque (%s)" % id_[-1], "Terrace (%s)" % id_[-1], "Bancal (%s)" % id_[-1], "Terrazzamento (%s)" % id_[-1])
    decor.append({"id": id_, "kind": "terrace", "title": said(*label), **({"color": "#5c5846"} if id_ == "platform" else {}),
                  "eastM": round(p[0], 1), "northM": round(p[1], 1), "headingDeg": round((THETA + 180) % 360, 1),
                  "sizeM": {"widthM": 120.0, "lengthM": round(far - near, 1), "heightM": top}})
# What stands on a level stands on its top (the ground the scene reads includes the terraces).
decor += [
    building("pump-house", "Abri de la pompe (en construction)", "Pump house (under construction)", "Caseta de la bomba (en construcción)",
             "Locale della pompa (in costruzione)", add(A, UP, 1.5), 1.6, 1.6, 1.3, color="#a9a395"),
    # The annex ("cabanon"): the witness stands in front of it, on level 3, "against the wall of the cabin" with its roof above him (it is
    # built over a raised level), and the house is to his right. Rising 2.4 m above the terrace, long along it. What the 1984 INA stills
    # show of it is a tree in front of it and one beside it, and a terrace wall of stone below (a terrace level is not a low building).
    building("cabin", "Cabanon de pierre", "Stone cabin", "Cabaña de piedra", "Capanno di pietra", add(B, UP, 2.6), 5.0, 3.2, 2.4, color="#9b9484"),
    building("house", "Maison des Nicolaï", "The Nicolaï house", "La casa de los Nicolaï", "La casa dei Nicolaï",
             add(add(A, RIGHT, 6.4), UP, -18), 11.0, 9.0, 6.0, color="#d8d0bf", floors=2)
]
# TREES, from the stills of the 1984 INA report: small fruit and olive trees, 4 to 5 m, standing on the terraces, a few in front of the
# annex (one on the level below its door, one beside it), and woods of pines and oaks all round and above. Their places are read off the
# stills and are APPROXIMATE; and what leaves they bore on 8 January is not known (the stills are of the autumn of 1984). Drawn as the
# built-in tree (a trunk and a crown) in an olive grey-green, which blocks more than a bare tree would.
import random
rng = random.Random(1981)
LINE_START, LINE_END = B, IMPACT_ACCOUNT
# What no tree is drawn through. (The list the trees were first drawn with: the trees are not to move when a building does.)
SOLID = [(add(A, UP, 1.5), 3.0), (add(add(B, RIGHT, 1.0), UP, -4.5), 6.0), (add(add(A, RIGHT, 6.4), UP, -18), 9.0)]


def clear_of(p, radius=2.5):
    return all(math.dist(p, q) > r + radius for q, r in SOLID)


def near_sight_line(p, width=1.8):
    ax, ay = LINE_START
    bx, by = LINE_END
    t = max(0.0, min(1.0, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
    return math.dist(p, (ax + t * (bx - ax), ay + t * (by - ay))) < width


trees = []
# on the terraces: small trees every 6 to 12 m along the middle of each band, offset at random
for _, near, far, _top in LEVELS[1:]:
    along = -70.0
    while along < 25.0:
        along += rng.uniform(6.0, 12.0)
        up_here = near + (far - near) * rng.uniform(0.35, 0.65)
        p = add(add(IMPACT, UP, up_here), RIGHT, along)
        if clear_of(p) and not near_sight_line(p):
            trees.append((p, rng.uniform(4.0, 5.2), "#6b7549"))
# the ones the stills show in front of the annex, on the level below it and beside it
for along, up, height in [(0.5, -7.0, 4.8), (6.5, -7.4, 4.3), (-5.5, -6.2, 5.0)]:
    trees.append((add(add(B, RIGHT, along), UP, up), height, "#6b7549"))
# on the platform's down-slope edge and in the old field below it: fruit trees
for along in (-30.0, -14.0, 12.0, 26.0):
    trees.append((add(add(IMPACT, UP, -12.5 + rng.uniform(-1.0, 1.0)), RIGHT, along + rng.uniform(-3.0, 3.0)), rng.uniform(4.0, 5.0), "#6b7549"))
# the woods: pines and oaks, uphill, on both flanks and beyond the edge of the slope, never towards the valley (the field of view is open
# to the south-west over nearly 180 degrees)
for _ in range(34):
    up_here = rng.uniform(26.0, 95.0)
    along = rng.uniform(-110.0, 75.0)
    p = add(add(IMPACT, UP, up_here), RIGHT, along)
    trees.append((p, rng.uniform(9.0, 15.0), "#2f4226" if rng.random() < 0.7 else "#4b5a33"))
for _ in range(14):
    side = rng.choice((-1, 1))
    along = side * rng.uniform(70.0, 130.0) - (20 if side < 0 else 0)
    up_here = rng.uniform(-18.0, 30.0)
    p = add(add(IMPACT, UP, up_here), RIGHT, along)
    trees.append((p, rng.uniform(8.0, 13.0), "#2f4226"))
for i, (p, height, colour) in enumerate(trees):
    decor.append({"id": f"tree-{i + 1}", "kind": "tree",
                  "title": said("Arbre", "Tree", "Árbol", "Albero"),
                  "eastM": round(p[0], 1), "northM": round(p[1], 1), "color": colour,
                  "sizeM": {"widthM": round(height * 0.55, 1), "lengthM": round(height * 0.55, 1), "heightM": round(height, 1)}})
for i, (dx, dy) in enumerate([(-3.0, 2.0), (3.0, 0.0)]):
    p = add(add(GAP, RIGHT, dx), UP, dy)
    decor.append({"id": f"conifer-{i + 1}", "kind": "tree", "title": said("Grand conifère", "Tall conifer", "Conífera alta", "Grande conifera"),
                  "eastM": round(p[0], 1), "northM": round(p[1], 1), "color": "#2f4226", "sizeM": {"widthM": 6.0, "lengthM": 6.0, "heightM": 24.0}})
# "Woods of conifers and leaf-bearing trees some dozens of metres tall" all round, except south-west where the
# visual field is open. Clumps of a size the slope can carry (a 22 x 30 m clump on a 17 % hillside is half buried),
# on the hill above the terraces and on both flanks, none on the terraces and none towards the valley.
for i, (e, n) in enumerate([(-30, 70), (0, 82), (40, 76), (75, 70), (110, 62), (-75, 12), (-85, -22), (125, 22), (135, -12), (95, 110)]):
    decor.append({"id": f"wood-{i + 1}", "kind": "shrub", "title": said("Bois", "Wood", "Bosque", "Bosco"),
                  "eastM": float(e), "northM": float(n), "headingDeg": 90.0, "color": "#3a4a2c",
                  "sizeM": {"widthM": 12.0, "lengthM": 10.0, "heightM": 9.0}})

# --- text ---------------------------------------------------------------------------------------------
SOURCE_JSE = {
    "type": "article",
    "title": "Report on the Analysis of Anomalous Physical Traces: The 1981 Trans-en-Provence UFO Case",
    "url": "https://rr0.org/time/1/9/9/0/Velasco_TransEnProvence/",
    "authors": ["Jean-Jacques Velasco"],
    "publication": {"publisher": "Journal of Scientific Exploration", "time": "1990"},
    "index": "vol. 4, no. 1, pp. 27-48"
}
SOURCE_NT16 = {
    "type": "article",
    "title": "Enquête 81/01 : analyse d'une trace (Note technique n° 16)",
    "url": "https://marcogee.free.fr/ovni/sepra/nt16.htm",
    "publication": {"publisher": "GEPAN, CNES", "time": "1983-03-01"}
}
description = said(
    "Jeudi 8 janvier 1981, vers 17 h, à la nuit tombante. Renato Nicolaï construit l'abri en ciment d'une pompe, derrière sa maison. Un léger sifflement attire son attention : un engin descend, sans tourner, sans flamme, à hauteur d'un gros pin du bord du terrain. Il se rapproche du cabanon de pierre et, d'une trentaine de mètres, le voit posé sur la plate-forme, contre le mur de soutènement : deux assiettes renversées l'une contre l'autre, séparées par une nervure, grises « comme du plomb », d'environ 2,5 m de diamètre et 1,8 m de haut. L'engin repart aussitôt, avec le même sifflement et un peu de poussière : il s'élève verticalement de plusieurs mètres, bascule en montrant son dessous (quatre ouvertures rondes, « comme des seaux de maçon », et deux pieds qui dépassent de 20 cm), puis file vers le nord-est au-dessus de la forêt. L'ensemble a duré 30 à 40 secondes. Le lendemain, la gendarmerie relève sur le sol deux cercles concentriques de 2,20 m et 2,40 m. Le lieu figuré est déduit du rapport (« à 2 km à l'est de Trans, sur le flanc nord de la vallée de la Nartuby ») : la propriété n'est pas publiée.",
    "On Thursday 8 January 1981, about 5 pm, at dusk. Renato Nicolaï is building the concrete shelter for a pump behind his house. A faint whistling draws his attention: a device is coming down, not spinning, with no flame, at the height of a big pine on the edge of the property. He moves towards the stone cabin and, from about thirty metres, sees it resting on the platform against the retaining wall: two saucers upside down against each other, separated by a ridge, grey \"like lead\", about 2.5 m across and 1.8 m high. It leaves at once, with the same whistling and a little dust: it rises vertically several metres, tilts to show its underside (four round openings, \"like masons' pails\", and two feet standing 20 cm below), then goes off to the north-east over the forest. The whole lasted 30 to 40 seconds. The next day the gendarmerie finds on the ground two concentric circles, 2.20 m and 2.40 m. The place shown is inferred from the report (\"2 km east of Trans, on the north side of the Nartuby valley\"): the property is not published.",
    "El jueves 8 de enero de 1981, hacia las 17 h, al anochecer. Renato Nicolaï construye el cobertizo de hormigón de una bomba detrás de su casa. Un leve silbido llama su atención: un aparato desciende, sin girar, sin llama, a la altura de un gran pino del borde del terreno. Se acerca a la cabaña de piedra y, desde unos treinta metros, lo ve posado en la plataforma, contra el muro de contención: dos platos invertidos uno contra otro, separados por un reborde, grises « como el plomo », de unos 2,5 m de diámetro y 1,8 m de alto. Despega enseguida, con el mismo silbido y un poco de polvo: se eleva verticalmente varios metros, se inclina mostrando su parte inferior (cuatro aberturas redondas, « como cubos de albañil », y dos patas que sobresalen 20 cm) y se aleja hacia el nordeste sobre el bosque. Todo duró de 30 a 40 segundos. Al día siguiente la gendarmería encuentra en el suelo dos círculos concéntricos de 2,20 m y 2,40 m. El lugar mostrado se deduce del informe (« a 2 km al este de Trans, en la ladera norte del valle del Nartuby »): la propiedad no se publica.",
    "Giovedì 8 gennaio 1981, verso le 17, al crepuscolo. Renato Nicolaï sta costruendo il riparo in cemento di una pompa dietro casa. Un leggero sibilo attira la sua attenzione: un velivolo scende, senza ruotare, senza fiamma, all'altezza di un grosso pino del bordo del terreno. Si avvicina al capanno di pietra e, da una trentina di metri, lo vede posato sulla piattaforma, contro il muro di sostegno: due piatti rovesciati l'uno contro l'altro, separati da una nervatura, grigi « come il piombo », di circa 2,5 m di diametro e 1,8 m di altezza. Riparte subito, con lo stesso sibilo e un po' di polvere: si alza in verticale di diversi metri, si inclina mostrando il lato inferiore (quattro aperture rotonde, « come secchi da muratore », e due piedi che sporgono di 20 cm), poi fila verso nord-est sopra la foresta. Il tutto è durato da 30 a 40 secondi. Il giorno dopo la gendarmeria trova sul terreno due cerchi concentrici di 2,20 m e 2,40 m. Il luogo mostrato è dedotto dal rapporto (« a 2 km a est di Trans, sul fianco nord della valle della Nartuby »): la proprietà non è pubblicata."
)
place_why = ("Not published by the investigators (the report's names and place were fictitious, see its translator's note). The house is "
             "placed from the 1:5000 location plan of the report (its figure 1: the D47, the Nartuby, the contour lines at 440 and 460 m, a "
             "property beside the road on the slope of the wooded hill) laid over the road of the map, at 43.4969243 N, 6.5060473 E, "
             "right beside the Route de la Motte, about 1.9 km east of the village centre; the pump house, where the recording starts, is put 18 m "
             "up the slope from it. The elevation model (Open-Meteo, 90 m grid) climbs about 30 % towards the north-north-east there, the hill "
             "the report describes, and the terraces run across that slope. A few tens of metres of error would change no azimuth of the sky.")


def milestone(t, label, fr, en, es, it):
    return {"t": t, "label": label, "note": said(fr, en, es, it)}


def body(track_value, rationale):
    d = {
        "id": "craft",
        "title": said("L'engin", "The craft", "El aparato", "Il velivolo"),
        "model": {"id": "ufoathome-trans-en-provence-craft"},
        "outlineNode": "hull",
        "track": {"value": track_value, "basis": "derived", "rationale": rationale}
    }
    return d


COMMON = ("The metres are the GEPAN's: 2.5 m across, 1.7 to 1.8 m high (the witness reasoning from the 2.5 m wall behind it; his own "
          "first drawing is much flatter and the private group's drawing in between), its ledge, its four pods and its two feet; it "
          "comes down \"like a stone\" in a few seconds from the tree gap 22 m from the mark and rests 27 s; it leaves "
          "by rising \"vertically several metres\", tilting, rising on, and goes \"at high speed\" north-east, \"rising in altitude "
          "according to its decrease in apparent diameter\". The arrival height (14 m, the big pine's), the speed of the departure "
          "and the tilt's side (towards the witness, so that he sees the underside) are ASSUMED; the departure's direction is the "
          "statement's \"vers le nord-est\" (the private group has it leave by the gap it came from). The positions of the pump house, "
          "the cabin and the terraces come from figure 2 of the report and the site diagrams, with the scale given by the 17.5 m between "
          "the pump house and the cabin and the 30 m from the cabin to the mark.")
ACCOUNT_INTERPRETATION = {
    "title": said("L'engin de deux assiettes renversées, posé à 8 m du mur de soutènement, que le témoin voit du haut du niveau 3",
                  "Two upturned saucers, resting 8 m from the retaining wall, seen by the witness from the top of level 3",
                  "Dos platos invertidos, posados a 8 m del muro de contención, que el testigo ve desde lo alto del nivel 3",
                  "Due piatti rovesciati, posati a 8 m dal muro di sostegno, che il testimone vede dall'alto del livello 3"),
    "bodies": [body(craft_track(IMPACT_ACCOUNT), COMMON + " HERE it rests 8 m from the wall, not at the trace: that is what lets the "
                    "account hold together, since he says he saw it \"very well\" from the higher level, over the cabin's roof, and the "
                    "wall is 2.5 m high. He also says it was \"almost against the wall\", which is the GEPAN's reading below.")]
}
GEPAN_INTERPRETATION = {
    "title": said("Le GEPAN : l'engin sur la trace, contre le mur de 2,5 m, que le témoin ne pouvait pas voir de sa position",
                  "The GEPAN: the craft on the mark, against the 2.5 m wall, which the witness could not see from where he stood",
                  "El GEPAN: el aparato sobre la marca, contra el muro de 2,5 m, que el testigo no podía ver desde su posición",
                  "Il GEPAN: il velivolo sul segno, contro il muro di 2,5 m, che il testimone non poteva vedere dalla sua posizione"),
    "bodies": [body(craft_track(IMPACT), COMMON + " HERE it rests on the mark itself, which the investigation found 22 m from the "
                    "tree and \"near the retaining wall\" (the witness: \"almost against the wall\"). Standing where he showed the "
                    "investigators, on the upper level, the witness could then see none of it, or no more than its top: his statement "
                    "(\"I clearly saw the device resting on the ground\") and the site disagree, unless the wall was lower, he stood higher "
                    "or nearer the edge, or the machine was larger than he said.")]
}

recording = {
    "version": 1,
    "id": "1981-01-08-Trans-en-Provence-Nicolai",
    "time": {"value": {"year": 1981, "month": 1, "day": 8, "hour": 17, "minute": 0, "second": 0}, "basis": "stated",
             "rationale": "\"Il était environ 17 h, le temps commençait à fraîchir\" (statement of 9 January 1981); the report, before the translation, cites the same hour."},
    "durationSeconds": {"value": 40, "basis": "derived",
                        "rationale": "GEPAN: \"the global duration of the sighting is between 30 and 40 seconds\", the arrival \"of the order of a few seconds\", the machine on the ground \"for several seconds\" (Note technique 16). Played at 40 s: it is gone at 35 s and the witness's last look follows."},
    "utcOffsetHours": {"value": 1, "basis": "derived", "rationale": "Central European Time on 8 January 1981 (France had no winter summer time)."},
    "timeZone": "Europe/Paris",
    "place": [{"value": {"lat": LAT0, "lng": LNG0, "name": "Trans-en-Provence, Var, France"}, "basis": "derived", "rationale": place_why}],
    "observer": {"id": "Trans-en-Provence-1981-Nicolai", "title": "Renato Nicolaï (déposition du 9 janvier 1981)"},
    "account": {
        "observerOccupation": said("ancien employé de la S.C.N.I., en invalidité (cœur)", "former S.C.N.I. employee, on a disability pension (heart)",
                                   "antiguo empleado de la S.C.N.I., con pensión de invalidez (corazón)", "ex dipendente della S.C.N.I., in invalidità (cuore)"),
        "source": {"value": "on-site", "basis": "stated", "rationale": "Statement to the gendarmerie at the property on 9 January 1981; GEPAN interviewed him there on 17 February 1981."},
        "followedUp": {"value": True, "basis": "stated", "rationale": "GEPAN's own enquiry on 17 February 1981, a reconstruction on the site, and his wife heard as well."}
    },
    "description": description,
    "tags": ["RR2", "landing", "trace", "dusk", "GEPAN 81/01"],
    "sources": [SOURCE_JSE, SOURCE_NT16],
    # Nobody gave an angle: the machine is placed in metres (interpretation), and the timeline carries two
    # empty keyframes, since the length of a recording is read from its keyframes.
    "timeline": {"keyframes": [{"t": 0, "shapes": []}, {"t": T_END, "shapes": []}], "order": [], "groups": []},
    "observerTrack": {"keyframes": witness},
    "milestones": [
        milestone(1200, "A", "Un léger sifflement : il se retourne et voit l'engin descendre, à hauteur d'un gros pin.",
                  "A faint whistling: he turns round and sees the device coming down, at the height of a big pine.",
                  "Un leve silbido: se vuelve y ve el aparato descender, a la altura de un gran pino.",
                  "Un leggero sibilo: si volta e vede il velivolo scendere, all'altezza di un grosso pino."),
        milestone(T_LAND, "B", "L'engin touche le sol, « comme une pierre », contre le mur de soutènement.",
                  "The device touches the ground, \"like a stone\", against the retaining wall.",
                  "El aparato toca el suelo, « como una piedra », contra el muro de contención.",
                  "Il velivolo tocca il suolo, « come una pietra », contro il muro di sostegno."),
        milestone(WALK_END, "C", "Il s'est avancé derrière le mur du cabanon : l'engin est à une trentaine de mètres.",
                  "He has gone up behind the cabin wall: the device is about thirty metres away.",
                  "Ha avanzado tras el muro de la cabaña: el aparato está a unos treinta metros.",
                  "Si è avvicinato dietro il muro del capanno: il velivolo è a una trentina di metri."),
        milestone(T_LIFT, "D", "Il redécolle d'un coup, sans flamme, avec un peu de poussière.",
                  "It lifts off at once, without flame, raising a little dust.",
                  "Despega de golpe, sin llama, levantando un poco de polvo.",
                  "Decolla di colpo, senza fiamma, sollevando un po' di polvere."),
        milestone(T_LIFT + 2500, "E", "Il bascule : quatre ouvertures rondes et deux pieds sous l'engin.",
                  "It tilts: four round openings and two feet under it.",
                  "Se inclina: cuatro aberturas redondas y dos patas debajo.",
                  "Si inclina: quattro aperture rotonde e due piedi sotto.")
    ],
    "soundTrack": {"keyframes": [{"t": 0, "sound": {"value": {"kind": "whistle", "volume": 0.2, "pitchHz": 1200}, "basis": "stated",
        "rationale": "\"Un léger bruit, une sorte de petit sifflement\": it is the sound that made him turn; at take-off \"the sounds were of similar amplitude\". Its pitch is assumed; whether it stopped on the ground is not said, so it is held."}},
        {"t": T_GONE, "sound": {"value": {"kind": "none", "volume": 0, "pitchHz": 0}, "basis": "assumed", "rationale": "Gone from sight; nothing is said of its fading."}}]},
    "decor": decor,
    "weatherTrack": {"keyframes": [{"t": 0, "weather": {
        "cloudLayers": [{"id": "station", "type": "unknown", "baseM": 3000, "thicknessM": 600, "coverage": 0.25, "sizeM": 2000, "density": 1}],
        "cloudCover": 0.25, "cloudBaseM": 3000, "relativeHumidity": 0.30, "precipitationType": "none", "precipitationIntensity": 0,
        "windDirectionDeg": 135, "windSpeed": 2, "storm": False}}]},
    "weatherSource": {"id": "station", "name": "Station météorologique à 17 km au sud-ouest : 6,8 °C, humidité 30 %, vent de sud-est 2 m/s, nuages 2/8",
                      "url": "https://rr0.org/time/1/9/9/0/Velasco_TransEnProvence/3.html"},
    "instrument": "eye",
    "interpretation": ACCOUNT_INTERPRETATION
}

with open(os.path.join(OUT, "observer-trans-en-provence.json"), "w", encoding="utf-8") as f:
    f.write(json.dumps(recording, indent=2, ensure_ascii=False) + "\n")

gepan = json.loads(json.dumps(recording))
gepan["id"] = "1981-01-08-Trans-en-Provence-Nicolai-gepan"
gepan["interpretation"] = GEPAN_INTERPRETATION
with open(os.path.join(OUT, "interpretation-trans-en-provence-gepan.json"), "w", encoding="utf-8") as f:
    f.write(json.dumps(gepan, indent=2, ensure_ascii=False) + "\n")

case = {
    "id": "TransEnProvence",
    "title": "L'affaire de Trans-en-Provence",
    "time": "1981-01-08 17:00",
    "classification": {"hynek": "CE2"},
    "events": [{"type": "event", "eventType": "sighting", "id": "nicolai", "time": "1981-01-08 17:00",
                "title": "Renato Nicolaï (déposition du 9 janvier 1981)", "url": "observer-trans-en-provence.json"},
               {"type": "event", "eventType": "sighting", "time": "1983-03-01", "interpretationOf": "nicolai",
                "title": GEPAN_INTERPRETATION["title"], "url": "interpretation-trans-en-provence-gepan.json"}]
}
with open(os.path.join(OUT, "case-trans-en-provence.json"), "w", encoding="utf-8") as f:
    f.write(json.dumps(case, indent=2, ensure_ascii=False) + "\n")
print("impact", [round(x, 1) for x in IMPACT], "account", [round(x, 1) for x in IMPACT_ACCOUNT], "gap", [round(x, 1) for x in GAP], "A->I", round(math.hypot(*IMPACT)), "B->I", round(math.hypot(IMPACT[0] - B[0], IMPACT[1] - B[1])))
