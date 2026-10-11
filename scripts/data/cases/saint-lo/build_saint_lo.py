#!/usr/bin/env python3
"""Saint-Lô, 11 August 2026, about 02:30: a translucent white half-moon with trailing filaments
crossing the whole sky from the north, over the zenith, to the south in about 4 s, ending in a
720-degree spiral behind the trees.

Source: the witness's replies (2026-10-11) on the SCEAU mailing list, answering Jerome Beau's
questions (thread "Encore un.evenement"). Everything here is his account, nothing is measured.

Writes public/demo-data/observer-saint-lo.json. Run from the repository root:
    python3 scripts/data/cases/saint-lo/build_saint_lo.py
"""
import json
import math
import pathlib

OUT = pathlib.Path("public/demo-data/observer-saint-lo.json")

LAT, LNG = 49.1043877, -1.0777321    # Musée du Bocage normand, given by the investigator
DURATION_MS = 4000
STEP_MS = 50
SPIRAL_FROM_MS = 3000                  # the 720-degree turn is the last second
EYE_LAG_S = 0.15
HEAD_DEPTH, ACROSS = 1.5, 3.0          # degrees: along the motion, across it ("1.5 one-euro coins")


def stated(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def tr(fr, en):
    return {"fr": fr, "en": en}


# --- the path, a great circle through the zenith (north -> overhead -> south) ----------------
def path(t_ms):
    """Direction (azimuth, altitude) of the phenomenon's centre, without the spiral."""
    u = t_ms / DURATION_MS
    ZENITH_AT = 0.28                      # "more speed before the zenith, then rather constant"
    if u <= ZENITH_AT:
        k = u / ZENITH_AT
        return 0.0, 35.0 + 55.0 * k
    k = (u - ZENITH_AT) / (1 - ZENITH_AT)
    return 180.0, 90.0 - 85.0 * k       # ends at 5 degrees, in the tree tops


def unit(az, alt):
    a, h = math.radians(az), math.radians(alt)
    return (math.cos(h) * math.sin(a), math.cos(h) * math.cos(a), math.sin(h))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


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
    v = [c / n for c in v]
    return (math.degrees(math.atan2(v[0], v[1])) % 360.0, math.degrees(math.asin(v[2])))


# --- the eye: where he looks over time -------------------------------------------------------
def eye(t_ms):
    """Heading/pitch: first west-south-west, then swung to the thing, then following it."""
    if t_ms < 500:
        k = t_ms / 500
        k = k * k * (3 - 2 * k)
        a0, p0 = 250.0, 45.0
        a1, p1 = eye_follow(500)
        d = (a1 - a0 + 180) % 360 - 180
        return (a0 + d * k) % 360, p0 + (p1 - p0) * k
    return eye_follow(t_ms)


def eye_follow(t_ms):
    az, alt = path(max(0, t_ms - EYE_LAG_S * 1000))
    # Over the top the head goes back and the body turns half a circle: spread the turn.
    u = t_ms / DURATION_MS
    if u < 0.20:
        return 0.0, min(alt, 88.0)
    if u > 0.40:
        return 180.0, min(alt, 88.0)
    k = (u - 0.20) / 0.20
    k = k * k * (3 - 2 * k)
    return 180.0 * k, 88.0


# --- the phenomenon at a moment ---------------------------------------------------------------
def head_direction(t_ms, pose):
    """Direction of the head, with the spiral of the last second laid on the path (on screen)."""
    az, alt = path(t_ms)
    if t_ms < SPIRAL_FROM_MS:
        return az, alt
    k = (t_ms - SPIRAL_FROM_MS) / (DURATION_MS - SPIRAL_FROM_MS)
    sx, sy = to_screen(az, alt, pose)
    radius = math.tan(math.radians(4.5)) * math.sin(math.pi * min(1.0, k * 1.15)) ** 0.5
    phase = 2 * math.pi * 2 * k          # two turns = 720 degrees
    sx += radius * (math.cos(phase) - 1)
    sy += radius * math.sin(phase)
    return from_screen(sx, sy, pose)


def deg_tan(d):
    return math.tan(math.radians(d))


def frame(t_ms):
    pose = eye(t_ms)
    h_az, h_alt = head_direction(t_ms, pose)
    sh = to_screen(h_az, h_alt, pose)
    a_az, a_alt = head_direction(max(0, t_ms - STEP_MS), pose)
    b_az, b_alt = head_direction(min(DURATION_MS, t_ms + STEP_MS), pose)
    sa, sb = to_screen(a_az, a_alt, pose), to_screen(b_az, b_alt, pose)
    mx, my = sb[0] - sa[0], sb[1] - sa[1]
    n = math.hypot(mx, my) or 1.0
    mx, my = mx / n, my / n
    return pose, sh, (mx, my)


def place(sh, motion, behind, lateral, pose):
    """Direction of a point `behind` degrees back along the motion and `lateral` to its left."""
    mx, my = motion
    sx = sh[0] - deg_tan(behind) * mx + deg_tan(lateral) * (-my)
    sy = sh[1] - deg_tan(behind) * my + deg_tan(lateral) * mx
    return from_screen(sx, sy, pose)


# --- the shapes -------------------------------------------------------------------------------
# A polygon's points are fractions of its box (0 to 1): the loader stretches them to the box it computes.
HALF_DISC = [{"x": round(math.cos(math.radians(a)), 3), "y": round(0.5 - 0.5 * math.sin(math.radians(a)), 3)}
             for a in range(-90, 91, 15)]
RECT = [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 1}]
SPIKE = [{"x": 1, "y": 0}, {"x": 1, "y": 1}, {"x": 0, "y": 0.5}]

FILAMENTS = [(-1.2, 6.0), (-0.6, 4.5), (0.0, 6.8), (0.6, 4.2), (1.2, 5.6)]

SHAPES = [
    # id, kind, points, along, across, behind-of-head-centre, lateral, color, transp, bright, blur, halo, title
    ("head", "polygon", HALF_DISC, HEAD_DEPTH, ACROSS, 0.0, 0.0, "#fffdf4", 0.2, 0.05, 0.1, 0.0,
     tr("demi-lune blanche, bord avant net", "white half-moon, sharp front edge")),
    ("tail", "polygon", RECT, 5.0, ACROSS, HEAD_DEPTH / 2 + 2.5, 0.0, "#fff3d0", 0.75, 0, 0.7, 0.0,
     tr("queue qui s'estompe", "tail fading out")),
] + [
    (f"filament-{i + 1}", "polygon", SPIKE, length, 0.45, HEAD_DEPTH / 2 + length / 2, lat, "#fffaf0", 0.05, 0, 0.1, 0.0,
     tr(f"filament {i + 1}", f"filament {i + 1}"))
    for i, (lat, length) in enumerate(FILAMENTS)
] + [
    ("aura", "oval", None, 7.5, 4.2, HEAD_DEPTH / 2 + 3.2, 0.0, "#f2e08a", 0.95, 0, 0.8, 0.0,
     tr("nappe jaunâtre autour des filaments", "yellowish veil around the filaments")),
]
IDS = [s[0] for s in SHAPES]


def shape_full(spec, aim, angle):
    sid, kind, pts, along, across, _b, _l, color, transp, bright, blur, halo, title = spec
    body = {
        "kind": kind, "title": title,
        "color": color, "transparency": transp, "brightness": bright, "blur": blur, "haloScale": halo,
        "angular": {"widthDeg": along, "heightDeg": across},
        "aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)},
        "angle": round(angle, 4),
    }
    if pts:
        body["points"] = pts
    return {"sourceId": sid, "shape": body}


def shape_move(spec, aim, angle):
    return {"sourceId": spec[0], "shape": {"aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)},
                                           "angle": round(angle, 4)}}


def keyframes():
    out = []
    for step, t in enumerate(range(0, DURATION_MS + 1, STEP_MS)):
        if t >= SPIRAL_FROM_MS or t % 100 == 0:
            pass
        else:
            continue
        pose, sh, motion = frame(t)
        angle = math.atan2(-motion[1], motion[0])
        shapes = []
        for spec in SHAPES:
            aim = place(sh, motion, spec[5], spec[6], pose)
            shapes.append((shape_full if t == 0 else shape_move)(spec, aim, angle))
        out.append({"t": t, "shapes": shapes})
    last = out[-1]["shapes"]
    out.append({"t": DURATION_MS + 200,
                "shapes": [{"sourceId": s["sourceId"], "shape": {**s["shape"], "transparency": 1}} for s in last]})
    for s in out[-1]["shapes"]:
        s["shape"].pop("angular", None)
    return out


def observer_track():
    keys = []
    for t in list(range(0, 1000, 100)) + list(range(1000, DURATION_MS + 1, 100)):
        heading, pitch = eye(t)
        keys.append({"t": t, "pose": {"lat": LAT, "lng": LNG, "elevationM": 0,
                                      "headingDeg": round(heading, 2), "pitchDeg": round(pitch, 2), "fovDeg": 60}})
    keys[0]["pose"]["headingDeg"] = stated(250, "derived",
        "\"je regardais légèrement sur la gauche (Ouest Ouest-Sud-Ouest)\"")
    keys[0]["pose"]["pitchDeg"] = stated(45, "assumed",
        "he does not say how high he looked before; his eye was caught by a movement in the periphery")
    return {"keyframes": keys}


def trees():
    """A tree line to the south: \"derrière la cime des arbres bordant le Parc de ce côté\"."""
    out = []
    for i, az in enumerate(range(150, 211, 5)):
        r = 70.0 + (i % 3) * 6
        h = 12.0 + ((i * 7) % 5)
        out.append({
            "id": f"tree-{i}", "kind": "tree",
            "title": tr("Arbres du parc, côté sud", "park trees, south side"),
            "eastM": round(r * math.sin(math.radians(az)), 1), "northM": round(r * math.cos(math.radians(az)), 1),
            "sizeM": {"heightM": h},
            "occludesSourceIds": IDS,
        })
    return out


def build():
    return {
        "version": 1,
        "id": "2026-08-11-SaintLo",
        "tags": ["aerial observation"],
        "time": {"year": 2026, "month": 8, "day": 11, "hour": 2, "minute": 30, "raw": "2026-08-11T02:30~"},
        "utcOffsetHours": stated(2, "derived", "Central European Summer Time on 2026-08-11"),
        "timeZone": "Europe/Paris",
        "durationSeconds": stated(4, "stated", "\"les 4 secondes de temps d'apparition\"; \"en moins de 5 secondes je dirais\""),
        "place": [stated({"lat": LAT, "lng": LNG, "name": "Parc du Musée du Bocage normand (ferme de Boisjugan), Saint-Lô, Manche, France"},
                         "derived",
                         "the witness names the park of the Musée du Bocage normand; the coordinates of the museum "
                         "are those given by J. Beau. Where in the park he stood is not known")],
        "observer": {"title": "Q. B."},
        "account": {
            "source": stated("questionnaire", "stated", "he answered in writing, on the mailing list, the 19 questions put to him"),
            "followedUp": stated(True, "stated", "questions put by J. Beau and other list members; his drawing is still to come (promised for Wednesday)"),
        },
        "sources": [{
            "title": "Re: [sceau_archives_ovni] Encore un.evenement",
            "authors": ["Q. B."],
            "publication": {"publisher": "Liste de diffusion SCEAU (sceau_archives_ovni@framalistes.org)", "time": "2026-10-11"},
        }],
        "description": {
            "fr": (
                "Nuit du 11 août 2026, entre 1 h et 3 h (« vers 2 h 30 »), veillée d'observation avec un ami dans le parc du "
                "Musée du Bocage normand, à Saint-Lô. Ciel complètement dégagé, pas de Lune, quelques étoiles filantes, des "
                "satellites et des avions avant et après, rien dans les minutes qui entourent.\n\n"
                "Je regardais vers l'ouest-sud-ouest quand mon regard a capté un mouvement dans ma vision périphérique, venant "
                "du nord. Je l'ai suivi des yeux : il passait au zénith, puis a continué jusqu'à l'horizon plein sud, derrière "
                "la cime des arbres du parc, en environ 4 secondes, sans aucun bruit. Il a parcouru tout le ciel, plutôt plus "
                "vite avant le zénith, puis à une vitesse plus constante, en vibrant légèrement parfois. À la fin, une sorte de "
                "virage en spirale de 720 degrés, qui se terminait vers le bas.\n\n"
                "Une « demi-lune » blanche, translucide, au bord avant net, une pièce et demie de 1 € à bout de bras, beaucoup "
                "plus petite que la Lune mais plus grosse qu'une étoile, un peu moins lumineuse que la Lune. Derrière, une "
                "queue diffuse faite de filaments sur toute la largeur de l'objet, blanc puis jaune très pâle, entourée d'une "
                "nappe jaunâtre qui suivait les filaments sans les toucher. J'ai cru voir une étoile à travers la queue. Pas "
                "de feux, pas de clignotement.\n\n"
                "Mon ami, à 60 cm de moi, regardait la Voie lactée vers le nord-est : il n'a rien vu."
            ),
            "en": (
                "Night of 11 August 2026, between 1 and 3 a.m. (\"about 2:30\"), an observing evening with a friend in the "
                "park of the Musée du Bocage normand, in Saint-Lô. Completely clear sky, no Moon, a few shooting stars, "
                "satellites and aircraft before and after, nothing in the minutes around it.\n\n"
                "I was looking west-south-west when my eye caught a movement in my peripheral vision, coming from the north. "
                "I followed it: it went through the zenith, then on to the southern horizon, behind the tops of the park's "
                "trees, in about 4 seconds, without any sound. It crossed the whole sky, rather faster before the zenith, then "
                "at a steadier speed, sometimes vibrating slightly. At the end, a kind of 720-degree spiral turn, ending "
                "downward.\n\n"
                "A white, translucent \"half-moon\" with a sharp front edge, one and a half 1 euro coins at arm's length, much "
                "smaller than the Moon but larger than a star, a little less bright than the Moon. Behind it, a diffuse tail "
                "of filaments across the whole width of the object, white then very pale yellow, surrounded by a yellowish veil "
                "that followed the filaments without touching them. I think I saw a star through the tail. No lights, no "
                "flashing.\n\n"
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
        "decor": trees(),
        "milestones": [
            {"t": 0, "label": "A", "note": tr("Un mouvement dans la vision périphérique, venant du nord",
                                               "A movement in the peripheral vision, coming from the north")},
            {"t": int(DURATION_MS * 0.28), "label": "B", "note": tr("Au zénith, il garde sa vitesse", "At the zenith, it holds its speed")},
            {"t": SPIRAL_FROM_MS, "label": "C", "note": tr("Virage en spirale de 720°, vers le bas", "720-degree spiral turn, downward")},
            {"t": DURATION_MS, "label": "D", "note": tr("Il passe derrière la cime des arbres, plein sud", "It goes behind the tree tops, due south")},
        ],
    }


if __name__ == "__main__":
    OUT.write_text(json.dumps(build(), ensure_ascii=False, indent=1) + "\n")
    print("wrote", OUT, OUT.stat().st_size, "bytes")
