"""Generates public/demo-data/observer-silly-le-long.json and case-silly-le-long.json.

GEIPAN case 2015-05-09194. Sources: compte rendu d'enquête (CR), PV 1064 (PV), OSM (osm.json
beside this file). See scratchpad/silly-le-long-data.md for every figure and its page.

Clock: the aircraft extract's (Tavion, s after 22:49:46 UTC, CR p.23). The recording starts at
Tavion 48 = 22:50:34 UTC, the GEIPAN's best start (CR p.39).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "../../../../../public/demo-data"))
R = 6371008.8
osm = json.load(open(os.path.join(HERE, "osm.json")))
ways = {e["id"]: e for e in osm["elements"]}


# --- The north-east-bound carriageway of the RN2, chained end to end from OSM.
CHAIN = [407462461, 1306007374, 1306007373, 386593458, 147925061, 10313918, 147925062, 8279892,
         1306008472, 1306008473, 1306008477, 1306008476]
road = []
for wid in CHAIN:
    g = [(p["lat"], p["lon"]) for p in ways[wid]["geometry"]]
    if road and road[-1] != g[0]:
        raise SystemExit(f"way {wid} does not continue the chain: {road[-1]} vs {g[0]}")
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
            return e0 + (e1 - e0) * f, n0 + (n1 - n0) * f, math.degrees(math.atan2(e1 - e0, n1 - n0)) % 360
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


# The bridge of the RD548 over the RN2 (OSM way 188333869), the observer's "closest point".
BRIDGE = enu(49.1140315, 2.7724948)
S_BRIDGE = project(*BRIDGE)

# --- The van's speed, from the GEIPAN simulation (CR p.49-53: displayed speed = reconstitution
# speed x the correction factor). (Tavion s, km/h). After Tavion 202 the extract stops and the
# simulation's clock is the observer's again (factor 1): 285.7 - 230.5 s later.
SPEEDS = [(48.0, 138.0), (56.2, 135.72), (84.6, 73.23), (119.2, 48.56), (125.4, 47.02), (128.9, 42.59),
          (161.7, 48.11), (202.0, 57.52), (257.2, 77.25)]
T_END = 250.0  # T1 loses it at Ttemoin 277 = Tavion 202 + 46.5 (CR p.54)


def speed(tau):
    for (t0, v0), (t1, v1) in zip(SPEEDS, SPEEDS[1:]):
        if t0 <= tau <= t1:
            return (v0 + (v1 - v0) * (tau - t0) / (t1 - t0)) / 3.6
    return SPEEDS[-1][1] / 3.6


# Distance along the road, anchored at "just after passing under the bridge" at Tavion 119.2
# (Ttemoin 141.8, CR p.50): 15 m past it.
DT = 0.1
s_of = {}
s = 0.0
taus = [round(48 + i * DT, 1) for i in range(int((T_END + 5 - 48) / DT) + 1)]
for tau in taus:
    s_of[tau] = s
    s += speed(tau) * DT
shift = S_BRIDGE + 15 - s_of[119.2]
van = lambda tau: at(s_of[round(tau, 1)] + shift)

# --- The runway (OSM 96594549, "07/25", asphalt, 698 m): threshold 25 at its east end.
rwy = ways[96594549]["geometry"]
THR = enu(rwy[0]["lat"], rwy[0]["lon"])
END = enu(rwy[-1]["lat"], rwy[-1]["lon"])
LAND_HDG = math.degrees(math.atan2(END[0] - THR[0], END[1] - THR[1])) % 360
UX, UY = math.sin(math.radians(LAND_HDG)), math.cos(math.radians(LAND_HDG))  # towards the landing

# The simulation's aircraft, seen from the van (CR p.49-54): (Tavion, distance m, elevation deg).
SIM = [(56.2, 3492, 3.0), (84.6, 1924, 3.9), (119.2, 626, 10.9), (125.4, 631, 10.0), (128.9, 684, 8.6),
       (161.7, 1868, 1.3), (202.0, 3978, 0.0)]


def on_axis(x):
    """A point x metres BEFORE the threshold, on the extended centreline (x < 0 past it)."""
    return THR[0] - UX * x, THR[1] - UY * x


def solve_x(tau, dist, elev):
    """Where on the approach the aircraft must be for the van to see it at that distance."""
    ve, vn, _ = van(tau)
    dh = dist * math.cos(math.radians(elev))
    # |on_axis(x) - V|^2 = dh^2, a quadratic in x.
    ax, ay = THR[0] - ve, THR[1] - vn
    b = -2 * (ax * UX + ay * UY)
    c = ax * ax + ay * ay - dh * dh
    disc = b * b - 4 * c
    if disc < 0:
        return None
    r = math.sqrt(disc)
    return ((-b + r) / 2, (-b - r) / 2), dist * math.sin(math.radians(elev))


fit = []
for tau, dist, elev in SIM:
    sol = solve_x(tau, dist, elev)
    fit.append((tau, sol))
    print(f"Tavion {tau:6.1f}: x = {sol[0] if sol else None}, height above eye {sol[1] if sol else '-':}")

# The root that keeps the aircraft moving towards the runway (the other is the mirror point).
CHOSEN = [0, 0, 1, 1, 1, 1, 1]
xs = [(tau, sol[0][k], sol[1]) for (tau, sol), k in zip(fit, CHOSEN)]
n = len(xs)
mt = sum(t for t, _, _ in xs) / n
mx = sum(x for _, x, _ in xs) / n
slope = sum((t - mt) * (x - mx) for t, x, _ in xs) / sum((t - mt) ** 2 for t, _, _ in xs)
x0 = mx - slope * mt
GROUND_SPEED = -slope
print(f"uniform approach: {GROUND_SPEED:.1f} m/s = {GROUND_SPEED * 3.6:.0f} km/h, threshold crossed at Tavion {x0 / GROUND_SPEED:.1f}")
HEIGHTS = [(tau, h) for tau, _, h in xs]


def aircraft_x(tau):
    return x0 + slope * tau


def aircraft_h(tau):
    """Height above the observer's eye: the simulation's own, between its instants."""
    if tau <= HEIGHTS[0][0]:
        return HEIGHTS[0][1] + (HEIGHTS[0][0] - tau) * (HEIGHTS[1][1] - HEIGHTS[0][1]) / (HEIGHTS[0][0] - HEIGHTS[1][0])
    for (t0, h0), (t1, h1) in zip(HEIGHTS, HEIGHTS[1:]):
        if t0 <= tau <= t1:
            return h0 + (h1 - h0) * (tau - t0) / (t1 - t0)
    return 0.0


print("check against the GEIPAN's table:")
for tau, dist, elev in SIM:
    ve, vn, _ = van(tau)
    ae, an = on_axis(aircraft_x(tau))
    h = aircraft_h(tau)
    dh = math.hypot(ae - ve, an - vn)
    d = math.hypot(dh, h)
    print(f"  Tavion {tau:6.1f}: distance {d:6.0f} m (GEIPAN {dist}), elevation {math.degrees(math.atan2(h, dh)):5.1f} (GEIPAN {elev}), size {math.degrees(2 * math.atan(5.85 / d)):.2f} deg")

# ======================================================================================
# The recording. Its origin is where the van is at its start (Tavion 48): decor and bodies are
# stated from there.
T0 = 48.0
E0, N0, _ = van(T0)
ORIGIN = geo(E0, N0)


def rel(e, n):
    return round(e - E0, 1), round(n - N0, 1)


def ms(tau):
    return int(round((tau - T0) * 1000))


# T1 places the phenomenon at "RN2 PK 5+500", 49 deg 06'51.20"N 2 deg 46'19.35"E (PV p.7), stationary
# the whole time (CR p.5, 33): its direction from the van is read from that point.
PHEN = enu(49.114222, 2.772042)
# The simulation's phenomenon, fitted to T1's pointings (CR p.49-54): (Tavion, size deg, elevation deg).
PHEN_SIM = [(48.0, 1.2, 0.9), (56.2, 1.45, 1.1), (84.6, 3.23, 2.0), (119.2, 21.13, 16.6), (125.4, 19.18, 14.2),
            (128.9, 21.68, 9.9), (161.7, 5.31, 2.1), (202.0, 1.88, 1.2), (257.2, 1.01, 0.7)]


def interp(table, tau, col):
    for a, b in zip(table, table[1:]):
        if a[0] <= tau <= b[0]:
            f = (tau - a[0]) / (b[0] - a[0])
            return a[col] + (b[col] - a[col]) * f
    return table[-1][col]


def phen_distance(tau):
    ve, vn, _ = van(tau)
    return math.hypot(PHEN[0] - ve, PHEN[1] - vn)


# Between the reconstitution's instants the phenomenon is held still, so it is its height and its
# width in METRES that are blended, and the angles follow from the distance at each instant:
# blending the angles themselves drew it 3.5 degrees too high halfway to the bridge, where a still
# object's elevation grows as the inverse of its distance, not in a straight line.
PHEN_METRES = [(tau, 2 * phen_distance(min(tau, taus[-1])) * math.tan(math.radians(size / 2)),
                phen_distance(min(tau, taus[-1])) * math.tan(math.radians(elev))) for tau, size, elev in PHEN_SIM]


def phen(tau):
    ve, vn, hdg = van(tau)
    az = math.degrees(math.atan2(PHEN[0] - ve, PHEN[1] - vn)) % 360
    d = phen_distance(tau)
    width, height = interp(PHEN_METRES, tau, 1), interp(PHEN_METRES, tau, 2)
    return az, math.degrees(math.atan2(height, d)), math.degrees(2 * math.atan(width / (2 * d))), hdg


# The change happens AT the bridge: "Juste avant le pont, on voyait encore les trois lumières", then
# "Juste après le passage sous le pont, T1 a pu voir le PAN de près" and "Dès après le passage sous
# le pont, les lumières à l'avant du PAN n'étaient plus visibles" (CR p.5-8). So the deck hides the
# lights as the van runs under it, and the rear shows as it comes out. When: from where the deck
# actually is on the road (OSM 188333869, 9 m wide) and the van's own speed there.
_deck = ways[188333869]["geometry"]
_de0, _dn0 = enu(_deck[0]["lat"], _deck[0]["lon"])
_de1, _dn1 = enu(_deck[-1]["lat"], _deck[-1]["lon"])
S_DECK = project((_de0 + _de1) / 2, (_dn0 + _dn1) / 2)


def tau_at(s_road):
    """When the van is at `s_road` along the road."""
    for tau in taus:
        if s_of[tau] + shift >= s_road:
            return tau
    return taus[-1]


# The deck covers him from where its edge meets his line of sight, about 16 degrees up (CR p.49-50),
# until he is out from under it. The one object changes what it shows him in between: it is under
# the deck that the lights at its front go (see T_SWITCH).
T_HIDDEN = tau_at(S_DECK - 4.5 - 15)
T_BRIDGE = tau_at(S_DECK + 4.5 + 5)     # out from under the bridge
T_SWITCH = round((T_HIDDEN + T_BRIDGE) / 2, 1)


def offset_aim(az, alt, along_deg):
    """A point `along_deg` along the phenomenon's horizontal axis from its centre."""
    return {"azimuthDeg": round((az + along_deg / math.cos(math.radians(alt))) % 360, 3), "altitudeDeg": round(alt, 3)}


def poly(source, title, aim, w, h, points, color, transparency=0.0, brightness=None, halo=0):
    shape = {"kind": "polygon", "bounds": {"x": 300, "y": 170, "width": 100, "height": 100 * h / w if w else 1},
             "points": [{"x": round(x * 100, 2), "y": round(y * 100 * h / w, 2)} for x, y in points],
             "color": color, "angle": 0, "transparency": transparency, "haloScale": halo, "selected": False,
             "title": title, "angular": {"widthDeg": round(w, 4), "heightDeg": round(h, 4)}, "aim": aim}
    if brightness is not None:
        shape["brightness"] = brightness
    return {"sourceId": source, "shape": shape}


def oval(source, title, aim, d, color, transparency=0.0, brightness=0.6, halo=1.2):
    return {"sourceId": source, "shape": {"kind": "oval", "bounds": {"x": 320, "y": 180, "width": 2, "height": 2},
            "color": color, "angle": 0, "transparency": transparency, "haloScale": halo, "brightness": brightness,
            "selected": False, "title": title, "angular": {"widthDeg": round(d, 4), "heightDeg": round(d, 4)}, "aim": aim}}


BAR = [(0, 0), (1, 0), (1, 1), (0, 1)]
# Drawing 005 (CR p.8, "représente correctement la forme"): a very flat V, apex down, cut square at
# both ends.
VEE = [(0, 0), (1, 0), (1, 0.45), (0.5, 1), (0, 0.45)]
# ONE phenomenon, drawn as he drew it each time: from the front, low and far, the dark flat bar of
# drawing 004 (CR p.4-6); past the bridge, close and from behind, the grey V of drawing 005.
L = {
    "pan": {"fr": "Le phénomène", "en": "The phenomenon", "es": "El fenómeno", "it": "Il fenomeno"},
    "blanc-g": {"fr": "Feu blanc fixe (gauche)", "en": "Steady white light (left)", "es": "Luz blanca fija (izquierda)", "it": "Luce bianca fissa (sinistra)"},
    "blanc-d": {"fr": "Feu blanc fixe (droite)", "en": "Steady white light (right)", "es": "Luz blanca fija (derecha)", "it": "Luce bianca fissa (destra)"},
    "rouge": {"fr": "Feu rouge clignotant", "en": "Flashing red light", "es": "Luz roja intermitente", "it": "Luce rossa lampeggiante"},
    "rect-g": {"fr": "Rectangle blanc (gauche)", "en": "White rectangle (left)", "es": "Rectángulo blanco (izquierda)", "it": "Rettangolo bianco (sinistro)"},
    "rect-d": {"fr": "Rectangle blanc (droite)", "en": "White rectangle (right)", "es": "Rectángulo blanco (derecha)", "it": "Rettangolo bianco (destro)"},
}
WHITE = "#f4f7ff"
OFF = "#0b0c0e"   # "plus sombres que les surfaces grises" when off (CR p.8)


def front_shapes(tau, red_on):
    az, alt, size, _ = phen(tau)
    h = max(0.12, size * 0.07)
    light = max(0.18, size * 0.035)
    return [
        poly("pan", L["pan"], {"azimuthDeg": round(az, 3), "altitudeDeg": round(alt, 3)}, size, h, BAR, "#1d1f22"),
        oval("blanc-g", L["blanc-g"], offset_aim(az, alt, -size / 2), light, WHITE, brightness=0.8),
        oval("blanc-d", L["blanc-d"], offset_aim(az, alt, size / 2), light, WHITE, brightness=0.8),
        # Drawing 004: the red light about 11.5 % of the span right of the left white one.
        oval("rouge", L["rouge"], offset_aim(az, alt, -size / 2 + size * 0.115), light, "#ff2a1f",
             transparency=0.0 if red_on else 1.0, brightness=0.8 if red_on else 0),
    ]


def rear_shapes(tau, rect_on):
    az, alt, size, _ = phen(tau)
    h = size * 0.2
    rw, rh = size * 0.095, size * 0.06
    y_rect = alt + h / 2 - rh / 2 - 0.05 * h
    gone = [oval(s, L[s], {"azimuthDeg": round(az, 3), "altitudeDeg": round(alt, 3)}, 0.2, WHITE, transparency=1.0, brightness=0)
            for s in ("blanc-g", "blanc-d", "rouge")]
    return gone + [
        poly("pan", L["pan"], {"azimuthDeg": round(az, 3), "altitudeDeg": round(alt, 3)}, size, h, VEE, "#8e9194"),
        poly("rect-g", L["rect-g"], offset_aim(az, y_rect, -size / 2 + rw / 2), rw, rh, BAR,
             WHITE if rect_on else OFF, brightness=0.5 if rect_on else None),
        poly("rect-d", L["rect-d"], offset_aim(az, y_rect, size / 2 - rw / 2), rw, rh, BAR,
             WHITE if rect_on else OFF, brightness=0.5 if rect_on else None),
    ]


# Every source is interpolated on its own (Timeline.getInterpolatedShapeAt): the steady shapes get
# a keyframe every 2 s; the blinking ones get their own, a millisecond apart where they switch.
frames = {}


def put(t_ms, shapes, only=None):
    for shape in shapes:
        if only is None or shape["sourceId"] in only:
            frames.setdefault(t_ms, {})[shape["sourceId"]] = shape


STEADY_FRONT = {"pan", "blanc-g", "blanc-d"}
REAR = {"rect-g", "rect-d"}


def hidden(shapes):
    for shape in shapes:
        shape["shape"]["transparency"] = 1.0
    return shapes


# The rectangles are not seen before the bridge: hidden from the start (or they would be held at
# their first keyframe all along the approach). Under the deck the bridge hides everything (it
# occludes every shape, see its decor object), and it is there that the bar becomes the V.
put(ms(T0), hidden(rear_shapes(T0, False)), REAR)
# Still hidden a millisecond before they show, or they would fade in, drifting, all along the way.
put(ms(T_SWITCH) - 1, hidden(rear_shapes(T_SWITCH - 0.001, False)), REAR)
tau = T0
while tau < T_SWITCH:
    put(ms(tau), front_shapes(tau, True), STEADY_FRONT)
    tau += 2.0
put(ms(T_SWITCH) - 1, front_shapes(T_SWITCH - 0.001, True), STEADY_FRONT)
put(ms(T_SWITCH), rear_shapes(T_SWITCH, True), {"pan", "blanc-g", "blanc-d", "rouge"})
tau = T_SWITCH + 2.0
while tau <= T_END:
    put(ms(tau), rear_shapes(tau, True), {"pan", "blanc-g", "blanc-d", "rouge"})
    tau += 2.0
# The red light, 0.5 s on / 0.5 s off (CR p.5), until then.
tau, on = T0, True
while tau < T_SWITCH:
    put(ms(tau), front_shapes(tau, on), {"rouge"})
    nxt = min(tau + 0.5, T_SWITCH)
    put(ms(nxt) - 1, front_shapes(nxt - 0.001, on), {"rouge"})
    tau += 0.5
    on = not on
# The rectangles, 2 s on / 2 s off, together (CR p.8), from then on.
RECT_PHASES = []
tau, on = T_SWITCH, True
while tau <= T_END:
    RECT_PHASES.append((tau, on))
    put(ms(tau), rear_shapes(tau, on), REAR)
    nxt = min(tau + 2.0, T_END)
    put(ms(nxt) - 1, rear_shapes(nxt - 0.001, on), REAR)
    tau += 2.0
    on = not on
# Lost behind the dip of the road (CR p.4, 9).
last = rear_shapes(T_END + 0.5, False)
for shape in last:
    shape["shape"]["transparency"] = 1.0
put(ms(T_END + 0.5), last)
keyframes = [{"t": t, "shapes": list(frames[t].values())} for t in sorted(frames)]

# Where T1 was looking: at it — through the windscreen, then the left window, then the mirror.
poses = []
tau = T0
while tau <= T_END + 0.5:
    ve, vn, hdg = van(tau)
    az, alt, size, _ = phen(tau)
    lat, lng = geo(ve, vn)
    poses.append({"t": ms(tau), "pose": {"lat": round(lat, 7), "lng": round(lng, 7), "elevationM": 0,
                  "headingDeg": round(az, 2), "pitchDeg": round(alt * 0.6, 2), "fovDeg": 60}})
    tau += 2.0

# --- Cirrus SR20 G3 F-HOBS, its lights as Annex B lists them (CR p.57-60; diagram 071).
# Span 11.68 m, length 7.92 m, height 2.71 m: the manufacturer's figures, NOT in the report (file 025
# unpublished). The model is the catalogue's airframe at that span.
SPAN = 11.68
aircraft_track = []
tau = T0
while tau <= T_END + 0.5:
    if tau <= 202:
        x, h = aircraft_x(tau), aircraft_h(tau)
    else:
        # Touch-and-go: the roll, then the climb-out along the runway (CR p.54: still in line 45 s
        # climbing). The climb rate is ASSUMED, 3 m/s.
        x = aircraft_x(tau)
        h = max(0.0, (tau - 210) * 3.0)
    ae, an = on_axis(x)
    e, n = rel(ae, an)
    aircraft_track.append({"t": ms(tau), "eastM": e, "northM": n, "altitudeM": round(h, 1), "headingDeg": round(LAND_HDG, 1)})
    tau += 2.0
half = SPAN / 2
aircraft = {
    "id": "f-hobs",
    "kind": "aircraft",
    "title": {"fr": "Cirrus SR20 F-HOBS en finale (tours de piste de nuit)", "en": "Cirrus SR20 F-HOBS on final (night circuits)", "es": "Cirrus SR20 F-HOBS en final (circuitos nocturnos)", "it": "Cirrus SR20 F-HOBS in finale (circuiti notturni)"},
    "eastM": aircraft_track[0]["eastM"], "northM": aircraft_track[0]["northM"], "headingDeg": round(LAND_HDG, 1),
    "sizeM": {"widthM": SPAN, "lengthM": 7.92, "heightM": 2.71},
    "model": {"id": "poly-google-airliner"},
    "track": aircraft_track,
    "lights": [
        {"id": "nav-port", "offsetM": {"x": -half, "y": 0, "z": 0.2}, "color": "#ff2200", "pattern": {"kind": "steady"}},
        {"id": "nav-starboard", "offsetM": {"x": half, "y": 0, "z": 0.2}, "color": "#00ff44", "pattern": {"kind": "steady"}},
        {"id": "position-port", "offsetM": {"x": -half, "y": 0, "z": -0.2}, "color": "#ffffff", "pattern": {"kind": "steady"}},
        {"id": "position-starboard", "offsetM": {"x": half, "y": 0, "z": -0.2}, "color": "#ffffff", "pattern": {"kind": "steady"}},
        {"id": "recognition-port", "offsetM": {"x": -half + 0.3, "y": 0, "z": 0.3}, "color": "#ffffff", "intensity": 3, "pattern": {"kind": "steady"}},
        {"id": "recognition-starboard", "offsetM": {"x": half - 0.3, "y": 0, "z": 0.3}, "color": "#ffffff", "intensity": 3, "pattern": {"kind": "steady"}},
        {"id": "landing-nose", "offsetM": {"x": 0, "y": -0.3, "z": 3.8}, "color": "#fff6e8", "intensity": 6, "pattern": {"kind": "steady"}},
        {"id": "strobe-port", "offsetM": {"x": -half, "y": 0, "z": 0}, "color": "#ffffff", "intensity": 20, "pattern": {"kind": "flash", "perMinute": 40, "dutyCycle": 0.01}},
        {"id": "strobe-starboard", "offsetM": {"x": half, "y": 0, "z": 0}, "color": "#ffffff", "intensity": 20, "pattern": {"kind": "flash", "perMinute": 40, "dutyCycle": 0.01, "phase": 0.5}},
    ],
}

# Holcim's site and its buildings, from OSM (the report's BAT1/BAT2 are among them; heights ASSUMED 10 m).
decor = [aircraft]
for el in osm["elements"]:
    if "building" not in el.get("tags", {}):
        continue
    g = [enu(p["lat"], p["lon"]) for p in el["geometry"]]
    ce, cn = sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)
    # The longest side gives the heading; the footprint's extent along/across it the size.
    best = max(zip(g, g[1:]), key=lambda s: math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]))
    hd = math.degrees(math.atan2(best[1][0] - best[0][0], best[1][1] - best[0][1])) % 360
    ux, uy = math.sin(math.radians(hd)), math.cos(math.radians(hd))
    along = [((p[0] - ce) * ux + (p[1] - cn) * uy) for p in g]
    across = [((p[0] - ce) * uy - (p[1] - cn) * ux) for p in g]
    e, n = rel(ce, cn)
    decor.append({"id": f"osm-{el['id']}", "kind": "building", "title": {"fr": "Bâtiment (OSM)", "en": "Building (OSM)", "es": "Edificio (OSM)", "it": "Edificio (OSM)"},
                  "eastM": e, "northM": n, "headingDeg": round(hd, 1), "floors": 1,
                  "sizeM": {"widthM": round(max(across) - min(across), 1), "lengthM": round(max(along) - min(along), 1), "heightM": 10}})

# The RD548 bridge over the RN2: its deck is OSM way 188333869 (42 m, heading 144.8), and the
# RD548 runs straight on in the same line for about 90 m to the north-west and 110 m to the
# south-east before it bends — its embankments, taken as 100 m each side. The deck's width (9 m),
# the road's height over the ground (6.5 m: the 4.75 m clearance a national road requires, a deck
# and a margin) and the railing are ASSUMED: nothing in the file measures them. The photographs
# (PV p.22, 24) show a grassed bank, a slab and a railing of posts and two rails.
b0 = ways[188333869]["geometry"]
be0, bn0 = enu(b0[0]["lat"], b0[0]["lon"])
be1, bn1 = enu(b0[-1]["lat"], b0[-1]["lon"])
span = math.hypot(be1 - be0, bn1 - bn0)
bridge_heading = math.degrees(math.atan2(be1 - be0, bn1 - bn0)) % 360
e, n = rel((be0 + be1) / 2, (bn0 + bn1) / 2)
decor.append({
    "id": "pont-rd548",
    "kind": "bridge",
    "title": {"fr": "Pont de la RD548 sur la RN2 (largeur, hauteur et garde-corps supposés)",
              "en": "The RD548 bridge over the RN2 (width, height and railing assumed)", "es": "El puente de la RD548 sobre la RN2 (anchura, altura y barandilla supuestas)", "it": "Il ponte della RD548 sulla RN2 (larghezza, altezza e parapetto ipotizzati)"},
    "eastM": e, "northM": n, "headingDeg": round(bridge_heading, 1),
    "sizeM": {"widthM": 9, "lengthM": round(span + 200, 1), "heightM": 6.5},
    "bridge": {"spanM": round(span, 1), "deckThicknessM": 1.2,
               "railing": {"heightM": 1.05, "postSpacingM": 1.5, "rails": 2}},
    # Driving under it, the deck hides the lights ("Juste avant le pont, on voyait encore les trois
    # lumières", CR p.8); the phenomenon was beyond it, a gap between them (CR p.8).
    "occludesSourceIds": ["pan", "blanc-g", "blanc-d", "rouge", "rect-g", "rect-d"],
})

rec = {
    "version": 1,
    "id": "2015-05-31-SillyLeLong-T1",
    "time": {"year": 2015, "month": 5, "day": 31, "hour": 0, "minute": 50, "second": 34},
    "durationSeconds": int(T_END + 2 - T0),
    "utcOffsetHours": 2,
    "timeZone": "Europe/Paris",
    "place": [{"lat": round(ORIGIN[0], 7), "lng": round(ORIGIN[1], 7), "name": "RN2, Le Plessis-Belleville / Silly-le-Long, Oise, France"}],
    "observer": {"id": "SillyLeLong-2015-T1", "title": "T1 (GEIPAN 2015-05-09194)"},
    # A service van, "moteur très bruyant", no radio, seen through the closed side window and the
    # mirror (CR p.4, 8, 32): heard from inside, windows shut, louder than an ordinary van.
    "vehicle": {"kind": "van", "windowsOpen": False, "noise": 1.5},
    "account": {"observerOccupation": {"fr": "gendarme, conducteur du fourgon", "en": "gendarme, driving the van", "es": "gendarme, al volante de la furgoneta", "it": "gendarme, alla guida del furgone"},
                "source": "questionnaire", "followedUp": True},
    "description": {
        "fr": "Nous roulions sur la RN2 vers Nanteuil, vers 0 h 50, en patrouille. Devant nous, sur la gauche, "
              "bas sur l'horizon, deux lumières blanches très intenses, fixes, une à chaque bout, et près de "
              "celle de gauche une lumière rouge qui clignotait, allumée une demi-seconde, éteinte une "
              "demi-seconde. Ça restait sur place. En approchant, une masse sombre et plate est apparue autour "
              "des lumières, d'une largeur impressionnante. J'ai ralenti ; juste après le pont, elle était là, "
              "immobile, à gauche, un peu plus haut que le pont, au-dessus de la bordure opposée. Vue de côté puis "
              "de derrière : un V très aplati, gris, lisse comme du béton, aux arêtes nettes, et à l'arrière deux "
              "rectangles blancs éclairés uniformément qui s'allumaient et s'éteignaient ensemble, deux secondes "
              "allumés, deux secondes éteints ; éteints, ils étaient plus sombres que le reste. Je l'ai suivie dans "
              "le rétroviseur jusqu'à la perdre, près de Nanteuil, quand la route descend. Aucun bruit, mais le "
              "fourgon est très bruyant. La Lune, presque pleine, était dans notre dos.",
        "en": "We were driving on the RN2 towards Nanteuil, around 0:50, on patrol. Ahead, on the left, low on the "
              "horizon, two very intense white lights, steady, one at each end, and near the left one a red light "
              "that blinked, on for half a second, off for half a second. It stayed where it was. As we got closer "
              "a dark, flat mass appeared around the lights, impressively wide. I slowed down; just past the "
              "bridge it was there, motionless, on the left, a little higher than the bridge, above the far edge "
              "of the road. Seen from the side and then from behind: a very flattened V, grey, smooth like "
              "concrete, sharp-edged, and at the rear two evenly lit white rectangles that went on and off "
              "together, two seconds on, two seconds off; off, they were darker than the rest. I followed it in "
              "the mirror until I lost it near Nanteuil, where the road dips. No sound, but the van is very noisy. "
              "The Moon, almost full, was behind us."
    , "es": "Circulábamos por la RN2 hacia Nanteuil, hacia las 0:50, de patrulla. Delante, a la izquierda, bajas sobre el horizonte, dos luces blancas muy intensas, fijas, una en cada extremo, y cerca de la de la izquierda una luz roja que parpadeaba, encendida medio segundo, apagada medio segundo. Se quedaba donde estaba. Al acercarnos apareció alrededor de las luces una masa oscura y plana, de una anchura impresionante. Reduje la velocidad; justo pasado el puente estaba allí, inmóvil, a la izquierda, un poco más alta que el puente, sobre el borde opuesto de la carretera. Vista de lado y luego desde atrás: una V muy aplanada, gris, lisa como el hormigón, de aristas vivas, y en la parte trasera dos rectángulos blancos iluminados uniformemente que se encendían y se apagaban a la vez, dos segundos encendidos, dos segundos apagados; apagados, eran más oscuros que el resto. La seguí por el retrovisor hasta perderla cerca de Nanteuil, donde la carretera baja. Ningún ruido, pero la furgoneta es muy ruidosa. La Luna, casi llena, estaba detrás de nosotros.", "it": "Percorrevamo la RN2 verso Nanteuil, verso le 0:50, in pattuglia. Davanti, a sinistra, basse sull'orizzonte, due luci bianche molto intense, fisse, una a ciascuna estremità, e vicino a quella di sinistra una luce rossa che lampeggiava, accesa mezzo secondo, spenta mezzo secondo. Restava dov'era. Avvicinandoci, attorno alle luci apparve una massa scura e piatta, impressionante per larghezza. Rallentai; appena dopo il ponte era lì, immobile, a sinistra, un po' più in alto del ponte, sopra il bordo opposto della strada. Vista di lato e poi da dietro: una V molto appiattita, grigia, liscia come il cemento, dai bordi netti, e sul retro due rettangoli bianchi illuminati in modo uniforme che si accendevano e spegnevano insieme, due secondi accesi, due secondi spenti; spenti, erano più scuri del resto. La seguii nello specchietto finché la persi vicino a Nanteuil, dove la strada scende. Nessun rumore, ma il furgone è molto rumoroso. La Luna, quasi piena, era dietro di noi."},
    "tags": ["NL"],
    "timeline": {"keyframes": keyframes, "order": ["pan", "blanc-g", "blanc-d", "rouge", "rect-g", "rect-d"], "groups": []},
    "observerTrack": {"keyframes": poses},
    # The observers' own sky, which the GEIPAN retains (CR p.12, 27): clear, bright moonlight. Roissy
    # reported 7/8 (CR p.24-26).
    "weatherTrack": {"keyframes": [{"t": 0, "weather": {
        "cloudCover": 0.05, "cloudDarkness": 0.3, "cloudBaseM": 2500, "lowerCloudCover": 0, "highCloudCover": 0.05,
        "relativeHumidity": 0.55, "precipitationType": "none", "precipitationIntensity": 0,
        "windDirectionDeg": 180, "windSpeed": 2.5, "storm": False}}]},
    "decor": decor,
    "instrument": "eye",
    "soundTrack": {"keyframes": []},
    "milestones": [
        {"t": 0, "label": "A", "note": {"fr": "Premier aperçu vers le PR4 : deux feux blancs fixes et un rouge clignotant, bas, devant à gauche.",
                                         "en": "First sight near PR4: two steady white lights and a flashing red one, low, ahead left.", "es": "Primer avistamiento cerca del PR4: dos luces blancas fijas y una roja intermitente, bajas, delante a la izquierda.", "it": "Primo avvistamento vicino al PR4: due luci bianche fisse e una rossa lampeggiante, basse, davanti a sinistra."}},
        {"t": ms(84.6), "label": "B", "note": {"fr": "Une masse sombre et plate apparaît autour des feux ; le fourgon ralentit sous 50 km/h.",
                                               "en": "A dark flat mass appears around the lights; the van slows below 50 km/h.", "es": "Una masa oscura y plana aparece alrededor de las luces; la furgoneta baja de 50 km/h.", "it": "Una massa scura e piatta appare attorno alle luci; il furgone rallenta sotto i 50 km/h."}},
        {"t": ms(T_BRIDGE), "label": "C", "note": {"fr": "Juste après le pont : immobile à gauche, un peu plus haut que le pont.",
                                                    "en": "Just past the bridge: still, on the left, a little higher than the bridge.", "es": "Justo pasado el puente: inmóvil, a la izquierda, un poco más alta que el puente.", "it": "Appena dopo il ponte: ferma, a sinistra, un po' più in alto del ponte."}},
        {"t": ms(T_BRIDGE + 2.0), "label": "D", "note": {"fr": "Vu de côté puis de derrière : V aplati gris béton, deux rectangles blancs, 2 s allumés, 2 s éteints.",
                                                  "en": "Seen from the side then behind: a flattened concrete-grey V, two white rectangles, 2 s on, 2 s off.", "es": "Vista de lado y luego desde atrás: una V aplanada gris hormigón, dos rectángulos blancos, 2 s encendidos, 2 s apagados.", "it": "Vista di lato poi da dietro: una V appiattita grigio cemento, due rettangoli bianchi, 2 s accesi, 2 s spenti."}},
        {"t": ms(141.8), "label": "E", "note": {"fr": "T1 se baisse un peu pour le voir dans le rétroviseur gauche.",
                                                 "en": "T1 crouches a little to see it in the left mirror.", "es": "T1 se agacha un poco para verla en el retrovisor izquierdo.", "it": "T1 si abbassa un po' per vederla nello specchietto sinistro."}},
        {"t": ms(T_END), "label": "F", "note": {"fr": "Perdu dans le rétroviseur, 1,8 km après le pont, là où la route descend.",
                                                 "en": "Lost in the mirror, 1.8 km past the bridge, where the road dips.", "es": "Perdida en el retrovisor, 1,8 km pasado el puente, donde la carretera baja.", "it": "Persa nello specchietto, 1,8 km dopo il ponte, dove la strada scende."}},
    ],
}

# What T1 himself describes, as one body (scripts/build-silly-le-long-craft.ts): held still where
# he placed it, at the height and heading below, its lights switched as he told them.
CRAFT_HEADING = 194.5       # its nose towards the van's approach, see the rationale
EYE_HEIGHT_M = 1.6          # the renderer's eye above the ground (BodyPlacement.EYE_HEIGHT_M)
# The reconstitution's elevations are read from his EYE, so the 22 m are above it, not above the ground:
# 22 m above the ground put the body 1.6 m (0.2 degree at the bridge) under the outline of his account.
CRAFT_BASE_M = 22.0 + EYE_HEIGHT_M   # its underside above the ground there
# Nothing measured the lights: these are ASSUMED from his words. The whites very bright, "comme des
# phares d'avion" (CR p.3, 5), a car's high beam more than a landing light, or they would have
# drowned the dark mass he saw round them as he came near (CR p.5-6); the red as bright as the
# whites (CR p.5), so the same luminance; the rectangles evenly lit, like white LEDs (CR p.8).
FRONT_WHITE_CDM2 = 500
FRONT_RED_CDM2 = 500
REAR_CDM2 = 30
pe, pn = rel(*PHEN)
body_track = [{"t": 0, "eastM": pe, "northM": pn, "altitudeAboveGroundM": CRAFT_BASE_M,
               "sizeM": {"widthM": 34, "lengthM": 20.12, "heightM": 2.4},
               "attitude": {"headingDeg": CRAFT_HEADING}, "appearance": {"color": "#9a9da0", "albedo": 0.35},
               "lights": {"front-white-left": FRONT_WHITE_CDM2, "front-white-right": FRONT_WHITE_CDM2,
                          "front-red": FRONT_RED_CDM2, "rear-left": 0, "rear-right": 0}}]
tau, on = T0 + 0.5, False
while tau < T_SWITCH:
    body_track.append({"t": ms(tau) - 1, "lights": {"front-red": 0 if on else FRONT_RED_CDM2}})
    body_track.append({"t": ms(tau), "lights": {"front-red": FRONT_RED_CDM2 if on else 0}})
    tau += 0.5
    on = not on
# A light is blended between two keyframes that name it: held until a millisecond before it switches.
body_track.append({"t": ms(T_SWITCH) - 1, "lights": {"front-white-left": FRONT_WHITE_CDM2, "front-white-right": FRONT_WHITE_CDM2,
                                                   "rear-left": 0, "rear-right": 0}})
body_track.append({"t": ms(T_SWITCH), "lights": {"front-white-left": 0, "front-white-right": 0, "front-red": 0}})
for index, (tau, on) in enumerate(RECT_PHASES):
    level = REAR_CDM2 if on else 0
    if index > 0:
        body_track.append({"t": ms(tau) - 1, "lights": {"rear-left": REAR_CDM2 - level, "rear-right": REAR_CDM2 - level}})
    body_track.append({"t": ms(tau), "lights": {"rear-left": level, "rear-right": level}})
body_track.append({"t": ms(T_END + 0.5), "lights": {"rear-left": 0, "rear-right": 0}})
rec["interpretation"] = {
    "title": {"fr": "Un seul objet : un triangle plat gris béton et ses feux", "en": "One object: a flat concrete-grey triangle and its lights", "es": "Un solo objeto: un triángulo plano gris hormigón y sus luces", "it": "Un solo oggetto: un triangolo piatto grigio cemento e le sue luci"},
    "bodies": [{
        "id": "pan",
        "title": {"fr": "Le phénomène", "en": "The phenomenon", "es": "El fenómeno", "it": "Il fenomeno"},
        # Measured against the whole of it: the phenomenon. Its lights are parts of it, compared by eye
        # (their outlines), not each against the body's full size.
        "explains": ["pan"],
        "model": {"id": "ufoathome-silly-le-long-craft"},
        "outlineNode": "hull",
        "track": {"value": body_track, "basis": "derived", "rationale": (
            "One object, where T1 placed it (RN2 PK 5+500, PV p.7) and as still as he said it was (CR p.5, 33). "
            "Its sizes are his: 34 m across, which is the 30 m he gave and what it measures, 32 to 35 m, all along the approach "
            "at the sizes the GEIPAN's reconstitution fitted to his pointings (CR p.49-54); 2.4 m thick, what both his drawings give (the bar of drawing 004, the "
            "rectangles of drawing 005 that take its full thickness), rather than the 5 to 8 of his questionnaire; "
            "20 m front to back, ASSUMED between his 'plus large que longue, mais de très peu' and 'trois fois sa longueur'. "
            "A full triangle, not a chevron: its straight rear face carries the two rectangles parallel and alike, as he drew "
            "them, and the front, where a chevron would be hollow, he never saw. Its underside 22 m above his eye (so 23.6 above the ground, which his eye is 1.6 m over), the middle of it 23 m above, which is what his elevations "
            "give at those distances. Its nose faces 194.5°, ASSUMED, towards the road he came along: the one heading from which "
            "he sees both its front faces, and so all three lights, until a few seconds before the bridge, as he said he still "
            "saw them 'juste avant le pont'. "
            "Seen from the front and far, low over the horizon, a flat triangle is the dark bar of drawing 004; from behind and "
            "below, close, it is drawing 005: its straight rear face a band, its underside below running away to the point, "
            "further and so lower, a V point down. "
            "What no heading does is hide the front lights from where he was once past the bridge: 3 s after he last saw them "
            "he is 40° further round, and the same faces still look at him. So they go out while the deck hides it, which is "
            "ASSUMED; he said only that he no longer saw them. The luminances of the lights are ASSUMED too: nothing measured them.")},
    }],
}

# --- The case: T1's account, and the GEIPAN's reading of it — the aircraft, seen from the van.
body_track = []
for pt in aircraft_track:
    tau = T0 + pt["t"] / 1000
    ve, vn, _ = van(tau)
    ae, an = pt["eastM"] + E0, pt["northM"] + N0
    dh = math.hypot(ae - ve, an - vn)
    body_track.append({"t": pt["t"], "azimuthDeg": round(math.degrees(math.atan2(ae - ve, an - vn)) % 360, 3),
                       "altitudeDeg": round(math.degrees(math.atan2(pt["altitudeM"], dh)), 3),
                       "distanceM": round(math.hypot(dh, pt["altitudeM"]), 1)})
body_track[0].update({"sizeM": {"widthM": SPAN, "lengthM": 7.92, "heightM": 2.71},
                      "attitude": {"headingDeg": round(LAND_HDG, 1)},
                      "appearance": {"color": "#d8dadc", "albedo": 0.6}})
# Where the account can be read (RecordingSource): added to the recording after it was first generated,
# and kept here so that generating it again does not lose them.
rec["sources"] = json.loads('[{"title": "SILLY-LE-LONG (60) 31.05.2015", "url": "https://www.cnes-geipan.fr/fr/cas/2015-05-09194", "publication": {"publisher": "GEIPAN"}}, {"title": "Procès-verbal n° 00516/01064/2015", "publication": {"publisher": "Gendarmerie nationale", "time": "2015"}, "index": "pp. 2, 10-11"}]')

# The GEIPAN's reading of it is another observation (see InterpretationEventJson): a recording of its
# own, with the place, the time and the pose of the account it reads, and the aircraft, seen from the
# van, in its `interpretation`; and an event of type `sighting` in the case marked `interpretationOf`
# it, dated when the GEIPAN's report was written.
READING_TITLE = {"fr": "Méprise avec un avion : le Cirrus SR20 F-HOBS en finale, « effet pivot » (classé A)",
                 "en": "Misidentified aircraft: Cirrus SR20 F-HOBS on final, the \"pivot effect\" (class A)", "es": "Confusión con un avión: el Cirrus SR20 F-HOBS en final, el \"efecto pivote\" (clase A)", "it": "Aereo scambiato per altro: Cirrus SR20 F-HOBS in finale, l'\"effetto perno\" (classe A)"}
reading = {"version": 1, "id": f"{rec['id']}-interpretation-1"}
# The whole scene of the account (a reading edited without its decor, weather and pose shows bodies over
# bare ground), not its words, its observer, its sources or its shapes.
for key, value in rec.items():
    if key not in ("version", "id", "observer", "account", "description", "sources", "tags", "timeline", "milestones", "interpretation"):
        reading[key] = value
reading["tags"] = ["interpretation"]
reading["timeline"] = {"keyframes": [], "order": [], "groups": []}
reading["interpretation"] = {
    "title": READING_TITLE,
    "bodies": [{"id": "sr20", "title": {"fr": "Cirrus SR20 F-HOBS", "en": "Cirrus SR20 F-HOBS", "es": "Cirrus SR20 F-HOBS", "it": "Cirrus SR20 F-HOBS"},
                "explains": ["pan"],
                "model": {"id": "poly-google-airliner"}, "track": body_track}]}
with open(os.path.join(OUT, "interpretation-silly-le-long-1.json"), "w", encoding="utf-8") as f:
    json.dump(reading, f, ensure_ascii=False, indent=1)
    f.write("\n")
with open(os.path.join(OUT, "observer-silly-le-long.json"), "w", encoding="utf-8") as f:
    json.dump(rec, f, ensure_ascii=False, indent=1, separators=(",", ":"))
    f.write("\n")

# The case lists the recordings: the account's, and the reading of it.
case = {
    "id": "SillyLeLong2015",
    "title": "Silly-le-Long",
    "time": "2015-05-31 00:50",
    "events": [
        {"type": "event", "eventType": "sighting", "id": "t1", "time": "2015-05-31 00:50", "title": "T1", "url": "observer-silly-le-long.json"},
        {"type": "event", "eventType": "sighting", "interpretationOf": "t1", "time": "2017-02-08", "by": [{"org": "GEIPAN"}],
         "title": READING_TITLE, "url": "interpretation-silly-le-long-1.json"},
    ],
}
case_path = os.path.join(OUT, "case-silly-le-long.json")
if os.path.exists(case_path):  # what a shared link says of the case is written by hand: keep it
    previous = json.load(open(case_path, encoding="utf-8"))
    case = {**{k: previous[k] for k in ("summary", "image") if k in previous}, **case}
    case = {k: case[k] for k in ("id", "title", "summary", "image", "time", "events") if k in case}
with open(case_path, "w", encoding="utf-8") as f:
    json.dump(case, f, ensure_ascii=False, indent=1)
    f.write("\n")

az, alt, size, hdg = phen(T0)
print(f"start: phenomenon az {az:.1f} (T1 said 55, T2 40), van heading {hdg:.1f}; keyframes {len(keyframes)}")
print(f"road: PR4..bridge {S_BRIDGE - (s_of[T0] + shift):.0f} m; bridge..end {s_of[T_END] + shift - S_BRIDGE:.0f} m")
