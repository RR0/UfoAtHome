#!/usr/bin/env python3
"""Saint-Lô, 11 August 2026, about 02:30: a translucent white "half-moon" (a flying wing) crossing the
whole sky from the north, over the zenith, to the south, then a clockwise spiral just above the tree
tops.

Source: the witness's written replies on the SCEAU mailing list (2026-10-11 and 2026-10-12), answering
Jerome Beau's questions (thread "Encore un.evenement"). Everything here is his account, nothing is
measured. Versions 2 and 3 follow the corrections he sent after seeing the previous one:

- first caught in the corner of the eye at about 20 degrees, already at the zenith when his eyes got
  there (500 ms is his reaction time, not time added); 4 s directly seen from the zenith to the southern
  horizon, 1 to 2 s more before, 6 s at the very most; a speed more or less constant but fluctuating,
  perhaps faster before the zenith;
- small at first (a shooting star), biggest at the zenith (a coin and a half at arm's length), small
  again towards the horizon;
- wide and short: the rear part is a fifth of the width; a thin flying wing, convex edge in front;
- not a straight line after the zenith: a first turn to the left (about 15 degrees) ending as it leaves
  the zenith, a second, long one to the right (about 25) with the wing banking, a last one to the left,
  all seen FROM THE CRAFT (he is a drone pilot), not from where he stood;
- a slight sail-like vibration from the second turn on (stars seen through it then);
- near the horizon the wing is edge-on, a horizontal line of light, then a clockwise spiral, a bit
  bigger than the full Moon, ending head down behind the tree tops.

Writes public/demo-data/observer-saint-lo.json. Run from the repository root:
    python3 scripts/data/cases/saint-lo/build_saint_lo.py
"""
import json
import math
import os
import pathlib

# A variant for trying another start without touching the published file: START_AZ=300 OUT_NAME=observer-saint-lo-wnw.json (see the call sheet of 2026-10-13,
# where he says it came from the west-north-west rather than the north).
START_AZ = float(os.environ.get("START_AZ", "0"))
OUT = pathlib.Path("public/demo-data") / os.environ.get("OUT_NAME", "observer-saint-lo.json")
SURROUNDINGS = pathlib.Path(__file__).with_name("surroundings.json")

LAT, LNG = 49.104890, -1.075382       # the exact spot where he stood, a Google Maps link he sent (2026-10-12)
DURATION_MS = 5500
STEP_MS = 25
EYE_LAG_S = 0.15
SPIRAL_FROM_MS = 4800
ZENITH_MS = 1500                       # 4 s seen from the zenith to the south, "on peut ajouter une à 2 secondes" before, 6 s at most
START_ALT = 20.0                       # "mes yeux l'ont perçu aux alentours des 20 degrés"
UP_SPEED = 45.0                        # degrees per second up to the zenith: 67 degrees in 1.5 s
SPIRAL_ALT = 15.0                      # the spiral starts "juste au-dessus de l'horizon" (the tree tops)
HEAD_DEPTH, ACROSS = 1.5, 3.0          # degrees at the zenith: along the motion, across it
VIBRATION_FROM_MS = 2300
VIBRATION_HZ = 5.0

# Turns, as (from ms, to ms, degrees, +1 left / -1 right as seen on the sky).
# He gave them "par rapport à l'engin" (he is a drone pilot): the craft's left is, on the sky seen from below, to the right.
FROM_THE_CRAFT = -1
TURN_1 = (1700, 2300, 15.0, +FROM_THE_CRAFT)
TURN_2 = (2300, 4000, 25.0, -FROM_THE_CRAFT)
TURN_3_FROM, TURN_3_TO = 4200, 4800


def stated(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def tr(fr, en):
    return {"fr": fr, "en": en}


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


# --- vectors on the sky, (east, north, up) -----------------------------------------------------
def unit(az, alt):
    a, h = math.radians(az), math.radians(alt)
    return (math.cos(h) * math.sin(a), math.cos(h) * math.cos(a), math.sin(h))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def add(*vs):
    return tuple(sum(c) for c in zip(*vs))


def scale(v, k):
    return tuple(c * k for c in v)


def to_azalt(v):
    return math.degrees(math.atan2(v[0], v[1])) % 360.0, math.degrees(math.asin(max(-1.0, min(1.0, v[2]))))


# --- the path of the wing: a flight on the sphere of the sky, with turns -------------------------
def fly(down_speed, turn_3_deg, until_ms=DURATION_MS, dt_ms=5):
    """Directions (az, alt) of the wing every `dt_ms`, from the first sight to `until_ms`."""
    p = unit(START_AZ, START_ALT)
    h = math.radians(START_ALT)
    a = math.radians(START_AZ)
    t = (-math.sin(h) * math.sin(a), -math.sin(h) * math.cos(a), math.cos(h))     # towards the zenith, along the meridian of the start
    turns = [TURN_1, TURN_2, (TURN_3_FROM, TURN_3_TO, turn_3_deg, +FROM_THE_CRAFT)]
    out = []
    for ms in range(0, until_ms + 1, dt_ms):
        out.append(to_azalt(p))
        # speed: very fast to the zenith, then much slower
        blend = smooth((ms - ZENITH_MS) / 600.0)
        v = UP_SPEED + (down_speed - UP_SPEED) * blend
        if ms >= SPIRAL_FROM_MS:
            v = down_speed * 0.7
        for start, end, deg, sign in turns:
            d_angle = math.radians(deg) * sign * (smooth((ms + dt_ms - start) / (end - start)) - smooth((ms - start) / (end - start)))
            if d_angle:
                t = add(scale(t, math.cos(d_angle)), scale(cross(t, p), math.sin(d_angle)))   # to the left of the motion
        d = math.radians(v * dt_ms / 1000.0)
        p, t = (add(scale(p, math.cos(d)), scale(t, math.sin(d))), add(scale(t, math.cos(d)), scale(p, -math.sin(d))))
    return out


def solve_path():
    """The two numbers the account leaves open: how slow it went after the zenith, and how far the last
    turn went. Taken so that it is at the tree tops (SPIRAL_ALT) at the start of the spiral, and due south."""
    best = None
    for turn_3 in range(0, 91, 2):
        lo, hi = 5.0, 80.0
        for _ in range(24):
            mid = (lo + hi) / 2
            alt = fly(mid, turn_3, SPIRAL_FROM_MS, 10)[-1][1]
            lo, hi = (mid, hi) if alt > SPIRAL_ALT else (lo, mid)
        az, alt = fly((lo + hi) / 2, turn_3, SPIRAL_FROM_MS, 10)[-1]
        error = abs((az - 180 + 180) % 360 - 180)
        if best is None or error < best[0]:
            best = (error, (lo + hi) / 2, turn_3)
    return best[1], best[2]


DOWN_SPEED, TURN_3_DEG = solve_path()
PATH = fly(DOWN_SPEED, TURN_3_DEG)


def path(t_ms):
    i = max(0, min(len(PATH) - 1, int(round(t_ms / 5))))
    return PATH[i]


# --- the eye -----------------------------------------------------------------------------------
def _follow_series():
    """Heading and pitch of an eye that follows the wing with a short lag; over the zenith the head goes
    back and the body turns, so the heading is spread over the time the wing is above 78 degrees."""
    times = list(range(0, DURATION_MS + 1, STEP_MS))
    raw = [path(max(0, t - EYE_LAG_S * 1000)) for t in times]
    over = [i for i, (_a, alt) in enumerate(raw) if alt > 78.0]
    heading = [a for a, _alt in raw]
    if over:
        first, last = max(0, over[0] - 1), min(len(times) - 1, over[-1] + 1)
        h0, h1 = heading[first], heading[last]
        delta = (h1 - h0 + 180) % 360 - 180
        for i in range(first, last + 1):
            heading[i] = (h0 + delta * smooth((i - first) / (last - first))) % 360
    return {t: (heading[i], min(raw[i][1], 88.0)) for i, t in enumerate(times)}


FOLLOW = _follow_series()


def eye(t_ms):
    """At first west-south-west (his own words), then, after his 500 ms of reaction, swung to the thing."""
    t = int(round(t_ms / STEP_MS)) * STEP_MS
    follow = FOLLOW[min(t, DURATION_MS)]
    k = smooth((t_ms - 500) / 900.0)          # his reaction time, then the eyes catch up with it
    a0, p0 = 250.0, 45.0
    d = (follow[0] - a0 + 180) % 360 - 180
    return (a0 + d * k) % 360, p0 + (follow[1] - p0) * k


def basis_of(heading, pitch):
    h, p = math.radians(heading), math.radians(pitch)
    f = (math.cos(p) * math.sin(h), math.cos(p) * math.cos(h), math.sin(p))
    r = (math.cos(h), -math.sin(h), 0.0)
    u = (-math.sin(p) * math.sin(h), -math.sin(p) * math.cos(h), math.cos(p))
    return f, r, u


def to_screen(az, alt, pose):
    f, r, u = basis_of(*pose)
    d = unit(az, alt)
    z = dot(d, f)
    return dot(d, r) / z, dot(d, u) / z


def from_screen(sx, sy, pose):
    f, r, u = basis_of(*pose)
    v = [f[i] + sx * r[i] + sy * u[i] for i in range(3)]
    n = math.sqrt(sum(c * c for c in v))
    return to_azalt([c / n for c in v])


def deg_tan(d):
    return math.tan(math.radians(d))


# --- the wing at a moment ----------------------------------------------------------------------
def size_factor(alt):
    """It looked small as a shooting star, grew to its full width at the zenith and, losing height and moving
    away very fast, "beaucoup plus petit" near the horizon. No law is given: sin(altitude) is only a shape
    that has those three sizes (he says it did NOT fly at a constant height)."""
    return max(0.1, math.sin(math.radians(max(alt, 1.0))))


def roll_deg(t_ms):
    """How the wing was banked, which is what makes it look wide or thin."""
    if t_ms < TURN_1[0]:
        return 0.0
    if t_ms < TURN_2[0]:
        return 20.0 * math.sin(math.pi * smooth((t_ms - TURN_1[0]) / (TURN_1[1] - TURN_1[0])))
    if t_ms < TURN_3_FROM:
        return 20.0 * smooth((t_ms - TURN_2[0]) / 400.0)       # "environ 20 degrés sur la droite"
    if t_ms < SPIRAL_FROM_MS:
        return 20.0 + 70.0 * smooth((t_ms - TURN_3_FROM) / (SPIRAL_FROM_MS - TURN_3_FROM))   # edge-on: "une ligne lumineuse"
    k = (t_ms - SPIRAL_FROM_MS) / (DURATION_MS - SPIRAL_FROM_MS)
    return 90.0 + 450.0 * k                                      # barrel roll, ending head down


def spiral_offset(t_ms):
    """Screen offset of the spiral at a moment, clockwise, two turns, a little more than the full Moon across."""
    k = (t_ms - SPIRAL_FROM_MS) / (DURATION_MS - SPIRAL_FROM_MS)
    k = max(0.0, k)
    radius = deg_tan(0.35) * smooth(k * 4)
    phase = -2 * math.pi * 2 * k
    return radius * (math.cos(phase) - 1), radius * math.sin(phase)


def frame(t_ms):
    pose = eye(t_ms)
    az, alt = path(t_ms)
    sx, sy = to_screen(az, alt, pose)
    # the direction of the flight on the screen, from the path itself (not from its flutter)
    a0 = to_screen(*path(max(0, t_ms - 40)), pose)
    a1 = to_screen(*path(min(DURATION_MS, t_ms + 40)), pose)
    mx, my = a1[0] - a0[0], a1[1] - a0[1]
    n = math.hypot(mx, my) or 1.0
    mx, my = mx / n, my / n
    f = size_factor(alt)
    if VIBRATION_FROM_MS <= t_ms < SPIRAL_FROM_MS:
        ramp = smooth((t_ms - VIBRATION_FROM_MS) / 300.0)
        sideways = 0.35 * max(f, 0.4) * ramp * math.sin(2 * math.pi * VIBRATION_HZ * t_ms / 1000.0)
        sx += deg_tan(sideways) * (-my)
        sy += deg_tan(sideways) * mx
    if t_ms >= SPIRAL_FROM_MS:
        ox, oy = spiral_offset(t_ms)
        sx, sy = sx + ox, sy + oy
        # in the spiral the wing follows its own circle
        bx0, by0 = to_screen(*path(t_ms), pose)
        bx1, by1 = to_screen(*path(min(DURATION_MS, t_ms + 20)), pose)
        ox1, oy1 = spiral_offset(min(DURATION_MS, t_ms + 20))
        mx, my = (bx1 + ox1) - (bx0 + ox), (by1 + oy1) - (by0 + oy)
        n = math.hypot(mx, my) or 1.0
        mx, my = mx / n, my / n
    return pose, (sx, sy), (mx, my), f


def place(sh, motion, behind, lateral, pose):
    """Direction of a point `behind` degrees back along the motion and `lateral` to its left."""
    mx, my = motion
    sx = sh[0] - deg_tan(behind) * mx + deg_tan(lateral) * (-my)
    sy = sh[1] - deg_tan(behind) * my + deg_tan(lateral) * mx
    return from_screen(sx, sy, pose)


# --- the shapes --------------------------------------------------------------------------------
# A polygon's points are fractions of its box (0 to 1): the loader stretches them to the box it computes.
HALF_DISC = [{"x": round(math.cos(math.radians(a)), 3), "y": round(0.5 - 0.5 * math.sin(math.radians(a)), 3)}
             for a in range(-90, 91, 15)]
RECT = [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 1}]
SPIKE = [{"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 0.5}]

# The rear part is a fifth of the width ("1 pour 5") and the whole thing about half as long as wide.
TAIL_DEPTH = 0.6
FILAMENTS = [(-1.2, 0.9), (-0.6, 0.6), (0.0, 1.0), (0.6, 0.6), (1.2, 0.8)]

# id, kind, points, along (deg at the zenith), across, behind, lateral, color, transparency, brightness, blur, title
SHAPES = [
    ("head", "polygon", HALF_DISC, HEAD_DEPTH, ACROSS, 0.0, 0.0, "#fffdf4", 0.2, 0.05, 0.1,
     tr("demi-lune blanche, bord avant net", "white half-moon, sharp front edge")),
    ("tail", "polygon", RECT, TAIL_DEPTH, ACROSS, HEAD_DEPTH / 2 + TAIL_DEPTH / 2, 0.0, "#fff3d0", 0.75, 0, 0.7,
     tr("arrière qui s'estompe", "rear fading out")),
] + [
    (f"filament-{i + 1}", "polygon", SPIKE, length, 0.45, HEAD_DEPTH / 2 + length / 2, lat, "#fffaf0", 0.05, 0, 0.1,
     tr(f"filament {i + 1}", f"filament {i + 1}"))
    for i, (lat, length) in enumerate(FILAMENTS)
] + [
    ("aura", "oval", None, 1.8, 4.0, HEAD_DEPTH / 2 + 0.9, 0.0, "#f2e08a", 0.95, 0, 0.8,
     tr("nappe jaunâtre autour de l'arrière", "yellowish veil around the rear")),
]
IDS = [s[0] for s in SHAPES]


def dims(spec, f, c):
    """Angular width and height of a shape at a moment: scaled by the distance (f) and by how the wing is
    banked (c, which thins its span but not the thickness of a filament)."""
    along, across = spec[3], spec[4]
    thin = spec[0].startswith("filament")
    return max(0.03, along * f), max(0.03, across * f * (1.0 if thin else c))


def shape_full(spec, aim, angle, size):
    sid, kind, pts, _al, _ac, _b, _l, color, transp, bright, blur, title = spec
    body = {
        "kind": kind, "title": title,
        "color": color, "transparency": transp, "brightness": bright, "blur": blur, "haloScale": 0,
        "angular": {"widthDeg": round(size[0], 3), "heightDeg": round(size[1], 3)},
        "aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)},
        "angle": round(angle, 4),
    }
    if pts:
        body["points"] = pts
    return {"sourceId": sid, "shape": body}


def shape_move(spec, aim, angle, size):
    return {"sourceId": spec[0], "shape": {
        "angular": {"widthDeg": round(size[0], 3), "heightDeg": round(size[1], 3)},
        "aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)},
        "angle": round(angle, 4)}}


def keyframes():
    out = []
    previous = None
    for t in range(0, DURATION_MS + 1, STEP_MS):
        pose, sh, motion, f = frame(t)
        angle = math.atan2(-motion[1], motion[0])
        if previous is not None:
            # The player interpolates the angle linearly: a jump of 2 pi would turn the shape the long way round.
            angle += 2 * math.pi * round((previous - angle) / (2 * math.pi))
        previous = angle
        c = max(0.08, abs(math.cos(math.radians(roll_deg(t)))))
        shapes = []
        for spec in SHAPES:
            aim = place(sh, motion, spec[5] * f, spec[6] * f * c, pose)
            shapes.append((shape_full if t == 0 else shape_move)(spec, aim, angle, dims(spec, f, c)))
        out.append({"t": t, "shapes": shapes})
    last = out[-1]["shapes"]
    out.append({"t": DURATION_MS + 200,
                "shapes": [{"sourceId": s["sourceId"], "shape": {**s["shape"], "transparency": 1}} for s in last]})
    for s in out[-1]["shapes"]:
        s["shape"].pop("angular", None)
    return out


def observer_track():
    keys = []
    for t in range(0, DURATION_MS + 1, STEP_MS * 2):
        heading, pitch = eye(t)
        keys.append({"t": t, "pose": {"lat": LAT, "lng": LNG, "elevationM": 0,
                                      "headingDeg": round(heading, 2), "pitchDeg": round(pitch, 2), "fovDeg": 60}})
    keys[0]["pose"]["headingDeg"] = stated(250, "derived",
        "\"je regardais légèrement sur la gauche (Ouest Ouest-Sud-Ouest)\"")
    keys[0]["pose"]["pitchDeg"] = stated(45, "assumed",
        "he does not say how high he looked before; his eye was caught by a movement in the periphery")
    return {"keyframes": keys}


# What the generic names the survey gives (in English: see scripts/fetch-surroundings.ts) are called in French.
GENERIC_FR = {"Tree": "Arbre", "Building": "Bâtiment", "Bridge": "Pont", "Overhead line": "Ligne électrique"}


def titled(title):
    """A generic name ("Tree 12", "Bridge (Rue de Carentan)") in French and English; a name the survey gave ("Mairie de Saint-Lô") as it is."""
    for english, french in GENERIC_FR.items():
        if title == english or title.startswith(english + " "):
            return tr(french + title[len(english):], title)
    return title


def surroundings():
    """What stands round the spot he sent a map link to, as the IGN's surveys (LiDAR HD for the trees, BD TOPO for the buildings, the
    bridges and the lines) saw it, frozen by scripts/fetch-surroundings.ts: where each is, how high and how wide. The tops of the trees
    to the south are his horizon (\"ils dessinent l'horizon visible\"), and a big one 16 m to the north-north-east hides the sky up to 36
    degrees for azimuths 5 to 40."""
    found = json.loads(SURROUNDINGS.read_text())
    out = []
    for decor in found["decor"]:
        decor = dict(decor)
        decor["title"] = titled(decor["title"])
        decor["occludesSourceIds"] = IDS
        out.append(decor)
    return out


def surveys():
    """The surveys the scenery was taken from, as sources, each with the day the service says it was flown or drawn (the laser's flight, the
    aerial photograph's, the map's last edition): the scenery is of those days, which are after the night he describes, and says so."""
    found = json.loads(SURROUNDINGS.read_text())
    dates = found.get("dates", {})
    fetched = found["fetchedOn"]
    return [
        {"title": "LiDAR HD, canopy height model and classification (the trees, the heights and the roofs of what stands round the spot), flown "
                  + dates.get("laser", "on a day the service does not give"),
         "url": "https://geoservices.ign.fr/lidarhd", "publication": {"publisher": "IGN", "time": dates.get("laser", fetched)}},
        {"title": "BD TOPO (the buildings with their names, heights and materials, the bridges and the lines round the spot), edited "
                  + dates.get("map", "on a day the service does not give"),
         "url": "https://geoservices.ign.fr/bdtopo", "publication": {"publisher": "IGN", "time": dates.get("map", fetched)}},
        {"title": "Aerial photograph of the IGN (the colour of the roofs), flown " + dates.get("photo", "on a day the service does not give"),
         "url": "https://geoservices.ign.fr/bdortho", "publication": {"publisher": "IGN", "time": dates.get("photo", fetched)}},
    ]


def build():
    return {
        "version": 1,
        "id": "2026-08-11-SaintLo",
        "tags": ["aerial observation"],
        "time": {"year": 2026, "month": 8, "day": 11, "hour": 2, "minute": 30, "raw": "2026-08-11T02:30~"},
        "utcOffsetHours": stated(2, "derived", "Central European Summer Time on 2026-08-11"),
        "timeZone": "Europe/Paris",
        "durationSeconds": stated(5.5, "derived",
            "\"le phénomène a duré maximum 6 secondes. J'estime l'avoir observé directement pendant 4 secondes, on peut ajouter une à 2 secondes pour l'entrée dans mon champ de vision\": "
            "4 s from the zenith to the southern horizon plus about 1.5 s before, in the corner of his eye"),
        "place": [stated({"lat": LAT, "lng": LNG, "name": "Parc du Musée du Bocage normand (ferme de Boisjugan), Saint-Lô, Manche, France"},
                         "stated",
                         "the exact spot he stood on, from the Google Maps link he sent on 2026-10-12 "
                         "(the park of the Musée du Bocage normand, which is open day and night)")],
        "observer": {"title": "Q. B."},
        "account": {
            "source": stated("questionnaire", "stated", "he answered in writing, on the mailing list, the questions put to him"),
            "followedUp": stated(True, "stated", "questions put by J. Beau and other list members; he corrected the first two versions of this recording on 2026-10-12; his drawing is still to come"),
        },
        "sources": [
            {"title": "Re: [sceau_archives_ovni] Encore un.evenement", "authors": ["Q. B."],
             "publication": {"publisher": "Liste de diffusion SCEAU (sceau_archives_ovni@framalistes.org)", "time": "2026-10-11"}},
            {"title": "Re: [sceau_archives_ovni] Encore un.evenement (corrections to the first version)", "authors": ["Q. B."],
             "publication": {"publisher": "Liste de diffusion SCEAU (sceau_archives_ovni@framalistes.org)", "time": "2026-10-12"}},
            {"title": "Re: [sceau_archives_ovni] Encore un.evenement (the exact spot, and what he meant by left and right)", "authors": ["Q. B."],
             "publication": {"publisher": "Liste de diffusion SCEAU (sceau_archives_ovni@framalistes.org)", "time": "2026-10-12"}},
        ] + surveys(),
        "description": {
            "fr": (
                "Nuit du 11 août 2026, entre 1 h et 3 h (« vers 2 h 30 »), veillée d'observation avec un ami dans le parc du "
                "Musée du Bocage normand, à Saint-Lô. Ciel complètement dégagé, pas de Lune, quelques étoiles filantes, des "
                "satellites et des avions avant et après, rien dans les minutes qui entourent.\n\n"
                "Je regardais vers l'ouest-sud-ouest quand mon regard a capté un mouvement dans ma vision périphérique, venant "
                "du nord. Je l'ai aperçu vers 20° au-dessus de l'horizon, une petite lumière, comme une étoile filante qui "
                "grossissait ; le temps de bouger les yeux (environ 500 ms, mon temps de réaction), elle était déjà au zénith, "
                "avec sa forme large. Ensuite la trajectoire est devenue très erratique : un premier virage à gauche d'environ "
                "15°, qui finit en sortant du zénith, puis un long virage à droite d'environ 25°, l'engin se cambrant dans le "
                "virage, puis un dernier grand virage à gauche, moins visible car aligné avec ma vue (ces gauche et droite sont "
                "ceux de l'engin, pas les miens). Il perdait de l'altitude par ces virages en 3D. Dans le second, il "
                "s'est mis à vibrer légèrement, comme une voile dans le vent, et j'ai vu des étoiles au travers. Près de "
                "l'horizon, ce n'était plus qu'une ligne lumineuse horizontale ; il a alors amorcé une spirale dans le sens "
                "horaire, d'un rayon un peu plus grand que la pleine Lune, et est passé derrière la cime des arbres, la tête à "
                "l'envers, en tonneau. Le phénomène a duré 6 secondes au plus : environ 4 vues directement, du zénith à "
                "l'horizon sud, plus 1 à 2 pour son entrée dans mon champ de vision, sans aucun bruit.\n\n"
                "Une « demi-lune » blanche, translucide, au bord avant bombé et net, une aile volante assez fine : une pièce et "
                "demie de 1 € à bout de bras au plus près, beaucoup plus petite que la Lune, un peu moins lumineuse qu'elle. Large "
                "(20 à 30 m, estimait-il) mais courte (10 à 15 m) : la partie arrière ne fait qu'un cinquième de la largeur, "
                "diffuse, blanc puis jaune très pâle, entourée d'une nappe jaunâtre. Pas de feux, pas de clignotement.\n\n"
                "Mon ami, à 60 cm de moi, regardait la Voie lactée vers le nord-est : il n'a rien vu."
            ),
            "en": (
                "Night of 11 August 2026, between 1 and 3 a.m. (\"about 2:30\"), an observing evening with a friend in the "
                "park of the Musée du Bocage normand, in Saint-Lô. Completely clear sky, no Moon, a few shooting stars, "
                "satellites and aircraft before and after, nothing in the minutes around it.\n\n"
                "I was looking west-south-west when my eye caught a movement in my peripheral vision, coming from the north. "
                "I first caught it at about 20 degrees above the horizon, a small light like a shooting star that grew; by "
                "the time my eyes moved (about 500 ms, my reaction time) it was already at the zenith, with its wide shape. "
                "Then the trajectory became very erratic: a first turn to the left of about 15 degrees, ending as it left the "
                "zenith, then a long turn to the right of about 25 degrees, the craft arching into the turn, then a last big "
                "turn to the left, less visible as it lined up with my view (left and right being the craft's, not mine). It "
                "lost height through these turns, in 3D. In the second one it started "
                "to vibrate slightly, like a sail in the wind, and I saw stars through it. Near the horizon it was no more "
                "than a horizontal line of light; it then began a clockwise spiral, a little wider than the full Moon, and "
                "went behind the tops of the trees upside down, rolling. The phenomenon lasted 6 seconds at the very most: "
                "about 4 seen directly, from the zenith to the southern horizon, plus 1 to 2 for it entering my field of view, "
                "without any sound.\n\n"
                "A white, translucent \"half-moon\" with a convex, sharp front edge, a rather thin flying wing: one and a "
                "half 1 euro coins at arm's length at its closest, much smaller than the Moon, a little less bright than it. "
                "Wide (20 to 30 m, he estimated) but short (10 to 15 m): the rear part is only a fifth of the width, diffuse, "
                "white then very pale yellow, surrounded by a yellowish veil. No lights, no flashing.\n\n"
                "My friend, 60 cm from me, was looking at the Milky Way to the north-east: he saw nothing."
            ),
        },
        "instrument": "eye",
        "observerTrack": observer_track(),
        "timeline": {
            "order": IDS,
            "groups": [IDS],
            "keyframes": keyframes(),
        },
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudLayers": [], "cloudCover": 0, "precipitationType": "none", "precipitationIntensity": 0, "storm": False}}]},
        "soundTrack": {"keyframes": [{"t": 0, "sound": {"kind": "none"}}]},
        "decor": surroundings(),
        "milestones": [
            {"t": 0, "label": "A", "note": tr("Aperçu du coin de l'œil vers 20°, venant du nord : une petite lumière qui grossit",
                                               "Caught in the corner of the eye at about 20 degrees, from the north: a small light that grows")},
            {"t": ZENITH_MS, "label": "B", "note": tr("Il est au zénith quand il le fixe, avec sa forme large", "At the zenith when he fixes it, with its wide shape")},
            {"t": TURN_1[1], "label": "C", "note": tr("Premier virage à gauche de l'engin (15°), il sort du zénith", "First turn to the craft's left (15 degrees), it leaves the zenith")},
            {"t": TURN_2[1], "label": "D", "note": tr("Long virage à droite de l'engin (25°), il vibre, des étoiles au travers", "Long turn to the craft's right (25 degrees), it vibrates, stars seen through it")},
            {"t": SPIRAL_FROM_MS, "label": "E", "note": tr("Une ligne lumineuse, puis la spirale horaire", "A line of light, then the clockwise spiral")},
            {"t": DURATION_MS, "label": "F", "note": tr("Derrière la cime des arbres, la tête à l'envers", "Behind the tree tops, upside down")},
        ],
    }


if __name__ == "__main__":
    OUT.write_text(json.dumps(build(), ensure_ascii=False, indent=1) + "\n")
    az_end, alt_end = path(SPIRAL_FROM_MS)
    print(f"wrote {OUT} {OUT.stat().st_size} bytes; slow speed {DOWN_SPEED:.1f} deg/s, last turn {TURN_3_DEG} deg, "
          f"spiral starts at az {az_end:.0f} alt {alt_end:.0f}; t={ZENITH_MS}: alt {path(ZENITH_MS)[1]:.0f}")
