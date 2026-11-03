#!/usr/bin/env python3
"""Puts the gendarmes' van around T1's eye in observer-silly-le-long.json (run after build_silly.py and the surroundings).

The van is a decor object whose track is the eye's own, shifted back by where the driver's eye is in the model (EYE, in the frame of
tonielpro-peugeot-expert-2012: x to the right, y up from the ground, the front towards -z), turned with the road. The decor's heading is HELD between
two keyframes (resolveDecorPlacementAt), so the track is sampled every STEP_S, and the observer's track with it: both are then the same
smooth curve (Catmull-Rom through the 2 s keyframes the generator wrote), which keeps the eye in the seat to the centimetre.

The van itself is SUPPOSED: the report says a "fourgon" of the gendarmerie with three rows of seats, no window at the back (CR p.4, 9),
and not which; its model (037) is not public. A Peugeot Expert of the time is a van of that size, with side windows behind the driver.

    python3 add_van.py ../../../../../public/demo-data/observer-silly-le-long.json
"""
import json
import math
import pathlib
import sys

R = 6371008.8
METERS_PER_DEGREE = 111320.0
STEP_S = 0.25
# The driver's eye in the model (m): left of the middle, above the ground, behind the centre of the box.
EYE = (-0.47, 1.50, -0.25)
# A standing observer's eye is 1.6 m above the ground (SceneRenderer): the seat's is EYE[1].
STANDING_EYE_M = 1.6
SIZE = {"widthM": 2.175, "lengthM": 4.838, "heightM": 1.908}
# The gendarmerie's dark blue (SUPPOSED: the report does not say), over the model's red.
PAINT = "#1f2f55"
# The centre of the glass of the driver's mirror in the model (m).
MIRROR = (-0.999, 1.227, -0.895)

# WHERE T1 LOOKS. A driver looks at the road, and keeps what he watches in the corner of his eye: while the phenomenon is within
# AHEAD_DEG of the van's axis, he turns only as far as keeps it within KEEP_DEG of where he looks ("watch"), which is straight ahead at
# first (it is 19 degrees off). Further off, he does not look away from the road for long: GLANCE_S glances at it, each followed by
# ROAD_S back on the road. From E he watches it in his mirror (CR p.9: "voulant le regarder dans son rétroviseur, il a
# dû au début se baisser légèrement pour réussir à le voir. Ensuite il regardait alternativement en direct et dans le rétroviseur, et
# pour finir, au loin, uniquement au rétroviseur"): first leaning towards it (LEAN, from the seat, for LEAN_S), then the mirror with a
# glance over his shoulder now and then for ALTERNATE_FOR_MS, then the mirror alone, the road between. SUPPOSED, all of it but its
# order: nobody timed his glances.
#
# NO JOLT, AND NO DEAD STOP. A head starts turning from still, and arrives as a person's look arrives, by the engine's own law (see
# HumanMotion.gaze, which cannot apply it here: it reads every channel over the same keyframes, and a moving observer's are dense): still
# moving, at ARRIVAL of its mean pace, it swings a little past and settles back as a critically damped spring of SETTLE_MS (a glance back of
# 150 degrees goes 4 past). A turn takes TURN_S plus TURN_S_PER_DEG for each degree (150 degrees, 0.9 s), and it and its settling are written
# in keyframes DENSE_MS apart, which the interpolation between them cannot spoil. "Watch" turns the head smoothly too (see target), and what is
# watched is followed along a smooth curve, not a broken line between the generator's keyframes two seconds apart.
AHEAD_DEG = 50
KEEP_DEG = 25
GLANCE_S = 1.25
ROAD_S = 2.5
# When he turns to his mirror: milestone E of the recording ("T1 se baisse un peu pour le voir dans le rétroviseur gauche"), set from main().
MIRROR_FROM_MS = 93800
LEAN = (-0.10, -0.05, -0.12)
LEAN_S = 5.0
LEAN_TURN_S = 0.8
MIRROR_S = 3.5
# How long after E he still glances over his shoulder.
ALTERNATE_FOR_MS = 56200
TURN_S = 0.4
TURN_S_PER_DEG = 0.5 / 150
DENSE_MS = 50
# HumanMotion.ARRIVAL and HumanMotion.SETTLE_MS, and how long after arriving the swing is written.
ARRIVAL = 0.5
SETTLE_MS = 120
SETTLED_MS = 700
# Looking back over his shoulder, a driver's head turns about his neck and his eyes come forward and towards his door, past the
# headrest: SHOULDER (m, in the model's frame) once he looks straight behind, none up to TWIST_FROM_DEG off the road. SUPPOSED.
SHOULDER = (-0.08, 0.0, -0.07)
TWIST_FROM_DEG = 60


def gaze_schedule(rel_at, end_ms):
    """Who is looked at from when: a list of (t ms, "watch" | "glance" | "road" | "mirror"). `rel_at(t)` is the phenomenon's angle off the
    van's axis at t, degrees."""
    schedule, t = [], 0
    while t < MIRROR_FROM_MS:
        if abs(rel_at(t)) <= AHEAD_DEG:
            if not schedule or schedule[-1][1] != "watch":
                schedule.append((t, "watch"))
            t += 250
            continue
        schedule.append((t, "glance"))
        t += GLANCE_S * 1000
        if t >= MIRROR_FROM_MS:
            break
        schedule.append((t, "road"))
        t += ROAD_S * 1000
    t = MIRROR_FROM_MS
    schedule.append((t, "mirror"))
    t += (LEAN_S + 1.5) * 1000
    cycle = 0
    while t < end_ms:
        # Over his shoulder every other time while he still alternates, the road the others.
        glance = "glance" if t < MIRROR_FROM_MS + ALTERNATE_FOR_MS and cycle % 2 == 0 else "road"
        schedule.append((t, glance))
        t += (GLANCE_S if glance == "glance" else 1.0) * 1000
        schedule.append((t, "mirror"))
        t += MIRROR_S * 1000
        cycle += 1
    return schedule


def lean_at(t):
    """How far into the lean towards the mirror the head is at t, 0 to 1."""
    since = (t - MIRROR_FROM_MS) / 1000
    if since < 0 or since > LEAN_S + LEAN_TURN_S:
        return 0.0
    return smooth(min(1.0, since / LEAN_TURN_S, (LEAN_S + LEAN_TURN_S - since) / LEAN_TURN_S))


def smooth(x):
    """The minimum-jerk profile from 0 to 1: speed and acceleration both nought at either end."""
    x = min(1.0, max(0.0, x))
    return x * x * x * (10 - 15 * x + 6 * x * x)


def eye_at(t, gaze_off_deg=0.0):
    """Where the eye is in the van at t, looking `gaze_off_deg` off the road."""
    lean = lean_at(t)
    twist = smooth((abs(gaze_off_deg) - TWIST_FROM_DEG) / (180 - TWIST_FROM_DEG))
    return tuple(EYE[k] + LEAN[k] * lean + SHOULDER[k] * twist for k in range(3))


def catmull(p0, p1, p2, p3, f):
    return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f ** 3)


def catmull_slope(p0, p1, p2, p3, f):
    return 0.5 * ((p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * f + 3 * (3 * p1 - p0 - 3 * p2 + p3) * f * f)


def short_way(a, b, f):
    return (a + ((b - a + 540) % 360 - 180) * f) % 360


def target(mode, sample):
    """Where T1 looks in `mode`, as (heading, pitch), in the state `sample` = (t, road heading, phenomenon heading, its pitch, eye)."""
    t, road, heading, pitch, eye = sample
    if mode == "glance":
        return heading, pitch
    if mode == "watch":
        # As far as keeps it within about KEEP_DEG of where he looks, eased in: no head stops at the road, then starts all at once.
        off = (heading - road + 540) % 360 - 180
        turn = off - KEEP_DEG * math.tanh(off / KEEP_DEG)
        share = turn / off if off else 0.0
        return (road + turn) % 360, -1.0 + (pitch + 1.0) * share
    if mode == "road":
        return road, -1.0
    toward = [MIRROR[k] - eye[k] for k in range(3)]
    left = math.degrees(math.atan2(-toward[0], -toward[2]))
    down = math.degrees(math.atan2(toward[1], math.hypot(toward[0], toward[2])))
    return (road - left) % 360, down


def turn_s(before, after):
    """How long a head takes to turn from one (heading, pitch) to another."""
    angle = math.hypot((after[0] - before[0] + 540) % 360 - 180, after[1] - before[1])
    return TURN_S + TURN_S_PER_DEG * angle


def gaze(schedule, durations, sample, k=None):
    """(heading, pitch) at the sample's instant: what the schedule says, eased over that turn's duration from where the head IS, which is
    still the previous turn if it has not ended (a glance at the road cut short by the mirror does not jump back to where it was going)."""
    t = sample[0]
    if k is None:
        k = max(index for index, (start, _) in enumerate(schedule) if start <= t) if t >= schedule[0][0] else 0
    heading, pitch = target(schedule[k][1], sample)
    if k == 0:
        return heading, pitch
    duration_ms = durations[k] * 1000
    elapsed = t - schedule[k][0]
    if elapsed > duration_ms + SETTLED_MS:
        return heading, pitch
    before_heading, before_pitch = gaze(schedule, durations, sample, k - 1)
    if elapsed < duration_ms:
        # From still, arriving at ARRIVAL of the mean pace: the Hermite curve HumanMotion.gaze draws, in shares of the turn.
        x = elapsed / duration_ms
        share = -2 * x ** 3 + 3 * x * x + (x ** 3 - x * x) * ARRIVAL
        return short_way(before_heading, heading, share), before_pitch + (pitch - before_pitch) * share
    # Arrived: the swing past and back, speed × τ × e^(−τ/T) (HumanMotion.settle), on what it turned to.
    turn = (heading - before_heading + 540) % 360 - 180
    tau = elapsed - duration_ms
    swing = ARRIVAL / duration_ms * tau * math.exp(-tau / min(SETTLE_MS, 0.4 * duration_ms))
    return (heading + turn * swing) % 360, pitch + (pitch - before_pitch) * swing


def main(path):
    recording = json.load(open(path))
    # Only the generator's own keyframes are interpolated: kept beside this script the first time, so that a second run starts from them
    # again and not from what the first one made of them.
    pristine = pathlib.Path(__file__).with_name(pathlib.Path(path).stem + ".keyframes.json")
    if not pristine.exists():
        pristine.write_text(json.dumps(recording["observerTrack"]["keyframes"]))
    keys = json.loads(pristine.read_text())
    global MIRROR_FROM_MS
    MIRROR_FROM_MS = next(milestone["t"] for milestone in recording["milestones"] if milestone["label"] == "E")
    lat0, lng0 = keys[0]["pose"]["lat"], keys[0]["pose"]["lng"]
    cos0 = math.cos(math.radians(lat0))
    east = [math.radians(k["pose"]["lng"] - lng0) * R * cos0 for k in keys]
    north = [math.radians(k["pose"]["lat"] - lat0) * R for k in keys]
    # The phenomenon's heading unwrapped, so that its curve does not jump at north.
    aimed = [keys[0]["pose"]["headingDeg"]]
    for key in keys[1:]:
        aimed.append(aimed[-1] + (key["pose"]["headingDeg"] - aimed[-1] + 540) % 360 - 180)
    pitched = [key["pose"]["pitchDeg"] for key in keys]

    def state_at(t):
        """(t, the road's heading, the phenomenon's heading, its pitch, the eye at rest), and the pose's own fields, at t: Catmull-Rom
        through the generator's keyframes."""
        i = max(0, min(len(keys) - 2, next((i for i in range(len(keys) - 1) if keys[i + 1]["t"] >= t), len(keys) - 2)))
        a, b = keys[i], keys[i + 1]
        f = (t - a["t"]) / (b["t"] - a["t"])
        # At either end the curve is carried on straight (a point mirrored past the last one), not stopped on a repeated point: that
        # put the van at 160 km/h for the first second, then back to its 138.
        def four(values):
            before = values[i - 1] if i > 0 else 2 * values[i] - values[i + 1]
            after = values[i + 2] if i + 2 < len(values) else 2 * values[i + 1] - values[i]
            return before, values[i], values[i + 1], after
        e = catmull(*four(east), f)
        n = catmull(*four(north), f)
        road = math.degrees(math.atan2(catmull_slope(*four(east), f), catmull_slope(*four(north), f))) % 360
        pose = dict(a["pose"])
        pose["lat"] = round(lat0 + math.degrees(n / R), 8)
        pose["lng"] = round(lng0 + math.degrees(e / (R * cos0)), 8)
        return (t, road, catmull(*four(aimed), f) % 360, catmull(*four(pitched), f), eye_at(t)), pose

    end_ms = keys[-1]["t"]
    grid = list(range(0, end_ms, round(STEP_S * 1000))) + [end_ms]
    rel = {t: (state[2] - state[1] + 540) % 360 - 180 for t in grid for state in [state_at(t)[0]]}
    schedule = gaze_schedule(lambda t: rel[min(grid, key=lambda each: abs(each - t))], end_ms)
    durations = [0.0] + [turn_s(target(schedule[k - 1][1], state_at(start)[0]), target(mode, state_at(start)[0]))
                         for k, (start, mode) in enumerate(schedule) if k > 0]
    durations = [LEAN_TURN_S if start == MIRROR_FROM_MS else d for (start, _), d in zip(schedule, durations)]
    # Dense where the head moves fast: each turn, and the lean towards the mirror and back.
    times = set(grid)
    ramps = [(start, d) for (start, _), d in zip(schedule, durations)] + [(MIRROR_FROM_MS, LEAN_TURN_S), (MIRROR_FROM_MS + LEAN_S * 1000, LEAN_TURN_S)]
    for start, d in ramps:
        times.update(t for t in range(round(start), round(start + d * 1000 + SETTLED_MS) + DENSE_MS, DENSE_MS) if 0 <= t <= end_ms)
    poses, track, samples = [], [], []
    for t in sorted(times):
        sample, pose = state_at(t)
        pose["headingDeg"], pose["pitchDeg"] = (round(v, 2) for v in gaze(schedule, durations, sample))
        samples.append(sample)
        poses.append({"t": t, "pose": pose})
    for keyframe, (t, heading, *_) in zip(poses, samples):
        pose = keyframe["pose"]
        eye = eye_at(t, (pose["headingDeg"] - heading + 540) % 360 - 180)
        pose["elevationM"] = round(eye[1] - STANDING_EYE_M, 3) + 0.0
        # The centre of the van, from the eye: the eye is eye[0] to the right and -eye[2] ahead of it, turned with the road.
        h = math.radians(heading)
        forward, right = -eye[2], eye[0]
        # The engine (SceneRenderer.updateDecorAnchoring) places a decor object at its own position plus where the first pose lies as
        # seen from the current one, at 111 320 m a degree and with the longitude scaled by the cosine of the CURRENT latitude: the
        # eye's own metres, counted otherwise, drift a metre a kilometre from the seat.
        ee = (pose["lng"] - lng0) * METERS_PER_DEGREE * math.cos(math.radians(pose["lat"]))
        en = (pose["lat"] - lat0) * METERS_PER_DEGREE
        ce = ee - forward * math.sin(h) - right * math.cos(h)
        cn = en - forward * math.cos(h) + right * math.sin(h)
        track.append({"t": t, "eastM": round(ce, 3), "northM": round(cn, 3), "altitudeM": 0, "headingDeg": round(heading, 2)})
    recording["observerTrack"]["keyframes"] = poses
    van = {
        "id": "van",
        "kind": "vehicle",
        "title": {"fr": "Le fourgon des gendarmes (modèle supposé : Peugeot Expert)", "en": "The gendarmes' van (model supposed: Peugeot Expert)",
                  "es": "La furgoneta de los gendarmes (modelo supuesto: Peugeot Expert)", "it": "Il furgone dei gendarmi (modello supposto: Peugeot Expert)"},
        "eastM": track[0]["eastM"], "northM": track[0]["northM"], "headingDeg": track[0]["headingDeg"],
        "lit": False,
        "sizeM": SIZE,
        "model": {"id": "tonielpro-peugeot-expert-2012"},
        "modelParameters": {"paintColor": PAINT},
        "track": track,
    }
    recording["decor"] = [d for d in recording["decor"] if d["id"] != "van"] + [van]
    with open(path, "w") as out:
        json.dump(recording, out, ensure_ascii=False, indent=1, separators=(",", ":"))
        out.write("\n")
    print(f"{len(poses)} poses, van track {len(track)} keyframes")


if __name__ == "__main__":
    main(sys.argv[1])
