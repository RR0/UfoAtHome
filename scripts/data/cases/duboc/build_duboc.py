#!/usr/bin/env python3
"""Flight AF 3532 (Airbus A320 F-GFKG, Nice to London), 28 January 1994, about 13:14 GMT, near Coulommiers:
a dark red-brown disc, motionless below the airliner, seen to the left by the commander and the co-pilot,
that "dematerialises" once left behind.

Sources (all on rr0.org, dossier science/crypto/ufo/enquete/dossier/Duboc): the two reports the crew wrote for
Dominique Weinstein (copy to the SEPRA, in Velasco 2004), the UFOCom interview of 1999-11-22 and the SEPRA's
analysis. Nothing here is measured: it is what the two pilots said, placed on the sky of that day.

What the two accounts give, and what is borrowed:

- The commander (report): flight level 390 (11 700 m), heading 332, ground speed 350 kt (180 m/s), between the
  VORs BRY and CLM; object to the left at "10 h - 10 h 30" at the start, "8 h - 7 h 30" at the end, apparently
  motionless, dark red, 200 to 300 m, 25 NM away, 10 500 m high, "1 or 2 minutes"; it becomes transparent and
  vanishes once behind, without moving.
- The co-pilot (report): the same flight; object at 10 h, "a variable-geometry" disc / arrow with a sharp then
  blurred then sharp outline, dark brown, "large", a straight trajectory parallel to the airliner then "a sort of
  turn" just before disappearing, "2 to 5 minutes"; in the interview she saw it always about at 9 h.
- Clock positions are read as the SEPRA read them: 10 h is 30 degrees ahead of the left beam (so 60 degrees left of the
  nose), 8 h is 30 degrees behind it (120 degrees left of the nose). A motionless object seen from 60 to 120 degrees
  for the 11 nautical miles the airliner flew gives an equilateral triangle: it is at 10 NM abeam, not 25 (the SEPRA's
  own remark). The recording keeps the angles he gave and borrows that distance only to turn them into a position.
  Its altitude angle follows from his own 10 500 m against the 11 700 m of the airliner.
- The angular size is his 1999 one, 1000 m at 46 km (1.24 degrees, a thumb at arm's length): at the report's 200 to
  300 m, or the SEPRA's half Moon (0.26 degrees), the disc is under a pixel and cannot be seen at all.

Writes public/demo-data/observer-duboc.json and observer-duboc-copilot.json. Run from the repository root:
    python3 scripts/data/cases/duboc/build_duboc.py
"""
import json
import math
import pathlib

OUT = pathlib.Path("public/demo-data")

LAT_MID, LNG_MID = 48 + 50.7 / 60, 3 + 0.9 / 60      # "48°50'7 N / 003°00'9 E" in the report: degrees and decimal minutes
HEADING = 332.0
SPEED = 350 * 1852 / 3600                            # 350 kt, "VS" of the report: about 180 m/s
PLANE_M, OBJECT_M = 11700.0, 10500.0
DISC_M, DISC_THICKNESS_M = 1000.0, 100.0              # "1000 m de diamètre pour une épaisseur de 100 m" (interview of 1999)
BROWN_RED = "#a8421f"                               # "brun-rouge", "rouge brunâtre": a dark red-brown in the daylight reads as a black blot, so a rust red
SIZE_DEG = 1.24                                      # 1999 interview: 1000 m at 46 km, "the width of his thumb"; the report (200-300 m) and the SEPRA (half the Moon, 0.26) give far less
STEP_MS = 1000

# In the flight deck model, where the captain's eye is: 0.557 m left of the centre of its box and 0.146 m above it, 0.83 m above the model's
# origin, 0.79 m above the cushion of the seat: the height from which the sky ahead is seen up to 18 degrees above the horizon through the
# windscreen (rays from the eye against the model; at 0.95 the frame above cut the view at the horizon itself, at 0.80 it is 22 degrees); and 0.174 m AHEAD of it (the nose is towards -z), which is 0.25 m in front of the front of the seat's
# headrest, as a seated pilot's eye is (found by sitting the MakeHuman captain in the seat, see scripts/people/build_pilot.py).
COCKPIT_FORWARD_M, COCKPIT_LEFT_M, COCKPIT_BELOW_M = 0.174, 0.557, -0.146
# The two seats are 1.074 m apart (the flight deck is symmetrical about x = 0.02 in the model, the captain's eye at -0.537): the
# co-pilot's eye is that much to the right of the captain's, and 0.517 right of the middle of the box.
SEAT_SPACING_M = 1.074
COCKPIT_RIGHT_SEAT_LEFT_M = -0.517
# The captain seated, as scripts/people/build_pilot.py makes him (MakeHuman), slumped and reclined 24 degrees, his legs forward to the pedals:
# his eyes are 0.414 m behind the centre of his box, 0.053 m to the left of its middle, and 1.168 m above his feet, which are where the entity
# decor rests its model. Placed by rays against the flight deck model (scripts/people/README.md): the feet 4 cm above the floor, the
# buttocks on the cushion (0.1 cm), the back against the backrest at the middle of the spine (0.5 cm; the pelvis is 6 cm off it, as a slouching
# man's is), his eyes 0.83 m high as the observer's. The observer's eye is 0.234 m behind the centre of his box (the centre is 2.246 in the
# flight deck model's z, the eye 2.48), the co-pilot's 1.021 m to the right of it.
PILOT_FORWARD_M, PILOT_LEFT_M, PILOT_BELOW_M = -0.234, 0.053, -1.168


def stated(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def tr(fr, en):
    return {"fr": fr, "en": en}


def enu(az_deg, dist):
    a = math.radians(az_deg)
    return (dist * math.sin(a), dist * math.cos(a))


def geo(east, north, total_s=120.0):
    """Latitude and longitude of a point (east, north) metres from the middle of the track, in the engine's own flat projection
    (src/render3d/terrain/GeoProjection.ts: 111 320 m a degree of latitude, longitude shrunk by the cosine of the ORIGIN's latitude),
    whose origin is the first pose of the recording: the airliner decor is placed against the same origin, to the metre."""
    e0, n0 = enu(HEADING, -SPEED * total_s / 2)
    lat0 = LAT_MID + n0 / 111320.0
    lng0 = LNG_MID + e0 / (111320.0 * math.cos(math.radians(LAT_MID)))
    return (lat0 + (north - n0) / 111320.0, lng0 + (east - e0) / (111320.0 * math.cos(math.radians(lat0))))


def plane_at(t_s, total_s):
    e, n = enu(HEADING, SPEED * (t_s - total_s / 2))
    return e, n


def aim_of(target, plane):
    de, dn = target[0] - plane[0], target[1] - plane[1]
    horizontal = math.hypot(de, dn)
    return math.degrees(math.atan2(de, dn)) % 360.0, math.degrees(math.atan2(OBJECT_M - PLANE_M, horizontal))


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def track(total_s, aim_at, lag_s):
    """The airliner moves; the eye follows the object with a lag; the field is the usual 60 degrees."""
    keys = []
    for ms in range(0, int(total_s * 1000) + 1, 2000):
        t = ms / 1000.0
        e, n = plane_at(t, total_s)
        lat, lng = geo(e, n, total_s)
        az, alt = aim_at(max(0.0, t - lag_s))
        keys.append({"t": ms, "pose": {"lat": round(lat, 6), "lng": round(lng, 6), "elevationM": PLANE_M,
                                       "headingDeg": round(az, 2), "pitchDeg": round(alt, 2), "fovDeg": 60}})
    return {"keyframes": keys}


def airframe(total_s, ident, title, model, size, forward_m, left_m, below_m, extra):
    """A decor object whose track is the observer's own, shifted back by where the eye is in this object (forward_m ahead of its centre,
    left_m to the left of it, below_m under it), so that the eye is exactly where it should be in it, at every moment. A decor's
    altitude is counted from the ground (the schema says from the observer's elevation, the renderer does not), and the eye of a
    recording is 1.6 m above its elevation."""
    h = math.radians(HEADING)
    forward = (math.sin(h), math.cos(h))
    left = (-math.cos(h), math.sin(h))
    # Where the centre is, from the eye: behind it by the eye's distance from the middle, and to the right of it
    centre_e = -forward[0] * forward_m - left[0] * left_m
    centre_n = -forward[1] * forward_m - left[1] * left_m
    ref_lat, ref_lng = (round(v, 6) for v in geo(*plane_at(0.0, total_s), total_s))
    track = []
    for ms in range(0, int(total_s * 1000) + 1, 5000):
        lat, lng = (round(v, 6) for v in geo(*plane_at(ms / 1000.0, total_s), total_s))
        # The engine (SceneRenderer.updateDecorAnchoring) places a decor object at its own position plus where the first pose lies as
        # seen from the CURRENT one, with the longitude scaled by the cosine of the current latitude: 8 m of lateral drift after ten
        # kilometres if the track is simply the distance flown, which puts the eye 8 m off after ten kilometres, outside a flight deck 3.3 m wide.
        track.append({"t": ms,
                      "eastM": round((lng - ref_lng) * 111320.0 * math.cos(math.radians(lat)) + centre_e, 2),
                      "northM": round((lat - ref_lat) * 111320.0 + centre_n, 2),
                      "altitudeM": round(PLANE_M + 1.6 + below_m, 2), "headingDeg": HEADING})
    first = track[0]
    return {"id": ident, "kind": "aircraft", "title": title,
            "eastM": first["eastM"], "northM": first["northM"], "headingDeg": HEADING,
            "sizeM": size, "model": {"id": model}, "track": track, **extra}


def airliner(total_s, seat="left", seen=("disc",)):
    """The flight deck round the observer (the model cut from davidmarton1987's, scaled to the real size: scripts/extract-a320-cockpit.py), and,
    seen from the right seat, the captain seated at the left one, on the line of sight to the left window. No airframe: the A320 of the
    catalogue, kept for its wings, had a surface that came across the view of the flight deck, and its wings are behind the pilots anyway."""
    cockpit_title = (tr("Poste de pilotage de l'A320 (siège gauche : le commandant)", "A320 flight deck (left seat: the captain)") if seat == "left"
                     else tr("Poste de pilotage de l'A320 (siège droit : Valérie Chauffour)", "A320 flight deck (right seat: Valérie Chauffour, the co-pilot)"))
    return [
        airframe(total_s, "af3532-cockpit", cockpit_title,
                 "davidmarton-a320-cockpit", {"widthM": 3.257, "lengthM": 2.591, "heightM": 2.127}, COCKPIT_FORWARD_M,
                 COCKPIT_LEFT_M if seat == "left" else COCKPIT_RIGHT_SEAT_LEFT_M, COCKPIT_BELOW_M,
                 # The disc was seen through the windows: the frame, the pillars and the captain are in front of it
                 {"aircraftSound": "airliner-narrow", "occludesSourceIds": list(seen)}),
    ] + ([] if seat == "left" else [
        # An observer (a companion who was there), not an entity: an entity is a being seen, and the engine would class the case "with occupants"
        {**airframe(total_s, "af3532-captain", tr("Le commandant Duboc, au siège gauche", "Captain Duboc, at the left seat"),
                    "ufoathome-duboc-seated", {"heightM": 1.292}, PILOT_FORWARD_M, PILOT_LEFT_M - SEAT_SPACING_M, PILOT_BELOW_M, {"occludesSourceIds": list(seen)}),
         "kind": "observer"}])


def air(t_ms, wind_kt):
    return {"cloudLayers": [{"id": "altocumulus", "type": "unknown", "baseM": 9800, "thicknessM": 500, "coverage": 0.85,
                             "sizeM": 3000, "density": 1}],
            "cloudCover": 0.85, "lowerCloudCover": 0.85, "highCloudCover": 0, "cloudDarkness": 0.1,
            "relativeHumidity": 0.5, "precipitationType": "none", "precipitationIntensity": 0, "storm": False,
            "windDirectionDeg": (311 + 180) % 360, "windSpeed": round(wind_kt * 1852 / 3600, 1)}


def weather(total_s, wind_kt):
    return {"keyframes": [{"t": 0, "weather": air(0, wind_kt)}, {"t": int(total_s * 1000), "weather": air(0, wind_kt)}]}


def shape_full(sid, kind, title, color, transparency, blur, size, aim, angle=0.0, points=None):
    body = {"kind": kind, "title": title, "color": color, "transparency": transparency, "brightness": 0, "blur": blur,
            "haloScale": 0, "angular": {"widthDeg": round(size[0], 3), "heightDeg": round(size[1], 3)},
            "aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)}, "angle": angle}
    if points:
        body["points"] = points
    return {"sourceId": sid, "shape": body}


def shape_move(sid, size, aim, extra=None):
    body = {"angular": {"widthDeg": round(size[0], 3), "heightDeg": round(size[1], 3)},
            "aim": {"azimuthDeg": round(aim[0], 3), "altitudeDeg": round(aim[1], 3)}}
    body.update(extra or {})
    return {"sourceId": sid, "shape": body}


# --- the commander ------------------------------------------------------------------------------
def commander():
    total = 120.0                                    # "1 ou 2 mn" in the report: the two minutes, the 11 NM of the SEPRA
    lateral = SPEED * total * math.tan(math.radians(60)) / 2
    left = HEADING - 90.0
    target = enu(left, lateral)                      # motionless, abeam at 10 NM when the airliner is in the middle of the track

    def aim_at(t):
        return aim_of(target, plane_at(t, total))

    frames = []
    for ms in range(0, int(total * 1000) + 1, STEP_MS):
        t = ms / 1000.0
        aim = aim_at(t)
        # "sous plusieurs angles": the angle the airliner sees the disc under changes as it flies past, which is all the angles
        # the account states. A flat disc 1000 m across and 100 m thick, level, seen from `e` below the horizon, is as high as
        # 1000 sin(e) + 100 cos(e) metres: slowly changing, and never a beat.
        e = math.radians(-aim[1])
        height = SIZE_DEG * (DISC_M * math.sin(e) + DISC_THICKNESS_M * math.cos(e)) / DISC_M
        size = (SIZE_DEG, height)
        sid = "disc"
        frames.append({"t": ms, "shapes": [(shape_full(sid, "oval", tr("disque brun-rouge, bords légèrement flous", "red-brown disc, slightly blurred edges"),
                                                       BROWN_RED, 0, 0.09, size, aim) if ms == 0 else shape_move(sid, size, aim))]})
    # "je le vois soudain devenir transparent et disparaître sans bouger"
    last = frames[-1]["shapes"][0]
    fade = json.loads(json.dumps(last))
    fade["shape"]["transparency"] = 1
    frames.append({"t": int(total * 1000) + 1500, "shapes": [fade]})
    return total, frames, aim_at


def commander_recording():
    total, frames, aim_at = commander()
    start = aim_at(0)
    end = aim_at(total)
    return {
        "version": 1,
        "id": "1994-01-28-DubocJeanCharles",
        "tags": ["aerial observation", "airline pilot", "radar"],
        "time": {"year": 1994, "month": 1, "day": 28, "hour": 13, "minute": 14, "raw": "1994-01-28T13:14"},
        "utcOffsetHours": stated(0, "stated", "the report gives 13:14 GMT (Nice 12:06 GMT, London 14:01 GMT)"),
        "durationSeconds": stated(total, "stated", "\"1 ou 2 mn\" in the report he wrote for Weinstein; the SEPRA's calculations use two minutes (11 nautical miles at 330 kt)"),
        "place": [stated({"lat": round(LAT_MID, 6), "lng": round(LNG_MID, 6), "name": "Near Coulommiers, Seine-et-Marne, France (airway between the VORs BRY and CLM)"},
                         "stated", "\"48°50'7 N / 003°00'9 E\" in both reports, read as degrees and decimal minutes (48.845 N, 3.015 E): where the airliner was")],
        "observer": {"id": "DubocJeanCharles", "title": "Jean-Charles Duboc"},
        "account": {
            "observerOccupation": tr("commandant de bord, Air France", "captain, Air France"),
            "source": "interview",
            "followedUp": True,
        },
        "sources": [
            {"type": "article", "title": "Rapport du pilote Duboc pour Dominique Weinstein, copie au SEPRA", "authors": ["Jean-Charles Duboc"],
             "url": "https://rr0.org/science/crypto/ufo/enquete/dossier/Duboc/index.html",
             "publication": {"publisher": "Velasco 2004"}},
            {"type": "article", "title": "VOL AF-3532 : Interview avec le commandant de bord Jean-Charles Duboc", "authors": ["Thierry Wathelet"],
             "url": "https://www.finart.be/ufocomhq/interview_duboc.htm",
             "publication": {"publisher": "UFOCom", "time": "1999-11-22"}},
        ],
        "description": {
            "fr": (
                "Vendredi 28 janvier 1994, vers 13 h 14 GMT. L'Airbus A320 d'Air France, vol AF 3532 de Nice à Londres, croise "
                "à 11 700 m (FL390) au cap 332 entre les balises BRY et CLM, près de Coulommiers, pilote automatique engagé. "
                "Excellente visibilité au-dessus d'une couche d'altocumulus à 10 000 m, -59 °C. Un steward, dans le poste, voit le premier "
                "un objet et s'exclame : « Un ballon-sonde ! » La copilote le prend d'abord pour cela aussi. Le commandant est le "
                "troisième et le dernier à le voir : il croit à un avion en virage à 45° d'inclinaison, avant qu'il n'ait les ailes à l'horizontale.\n\n"
                "Il est alors vers 10 h (à 30° devant la gauche de l'avion). Puis, comme l'avion poursuit sa route, l'objet reste en place et "
                "est dépassé : un disque d'un rouge brunâtre, aux bords légèrement flous, sans détails apparents, ni aile, ni gouverne, ni "
                "moteur, vu sous plusieurs angles pendant une à deux minutes, d'une taille que la copilote et lui estiment « immense » "
                "(200 à 300 m dans le rapport, 1000 m sur 100 d'épaisseur, de la largeur de son pouce à bout de bras, dans l'interview de 1999), "
                "à 25 miles nautiques (46 km), vers 10 500 m. Lorsqu'il le laisse sur l'arrière gauche, vers 8 h, il le voit soudain devenir "
                "transparent et disparaître, sans bouger.\n\n"
                "Ici la taille est celle de l'interview de 1999 (1000 m à 46 km, 1,24°) ; le SEPRA la ramène à la moitié de la Lune (0,26°). Les relèvements, 10 h puis 8 h, "
                "pour les 11 miles nautiques parcourus, donnent un triangle équilatéral : l'objet immobile serait à 10 miles nautiques de "
                "la route, non 25. L'enregistrement garde les angles du pilote et emprunte cette distance seulement pour les situer."),
            "en": (
                "Friday 28 January 1994, about 13:14 GMT. The Air France Airbus A320, flight AF 3532 from Nice to London, cruises at "
                "11,700 m (FL390) on heading 332 between the beacons BRY and CLM, near Coulommiers, autopilot engaged. Excellent visibility "
                "above an altocumulus layer at 10,000 m, -59 C. A steward in the cockpit is the first to see an object and exclaims: \"A "
                "weather balloon!\" The co-pilot first takes it for one too. The captain is the third and last to see it: he takes it for "
                "an aircraft in a 45-degree bank, before its wings level.\n\n"
                "It is then at about 10 o'clock (30 degrees ahead of the left beam). As the airliner keeps its course the object stays "
                "where it is and is overtaken: a reddish-brown disc with slightly blurred edges, no visible detail, no wing, no control "
                "surface, no engine, seen from several angles for one to two minutes, of a size both he and the co-pilot call \"immense\" "
                "(200 to 300 m in the report, 1000 m by 100 thick, the width of his thumb at arm's length, in the 1999 interview), 25 "
                "nautical miles (46 km) away, at about 10,500 m. When he leaves it behind on the left, at about 8 o'clock, he sees it "
                "suddenly turn transparent and vanish, without moving.\n\n"
                "The size here is the one from the 1999 interview (1000 m at 46 km, 1.24 degrees); the SEPRA brings it down to half the Moon (0.26). The bearings, 10 o'clock then 8, over "
                "the 11 nautical miles flown make an equilateral triangle: a motionless object would be 10 nautical miles off the track, not "
                "25. The recording keeps the pilot's angles and borrows that distance only to place them."),
        },
        "instrument": "eye",
        "observerTrack": track(total, aim_at, 1.0),
        "timeline": {"order": ["disc"], "groups": [["disc"]], "keyframes": frames},
        "weatherTrack": weather(total, 101),
        "soundTrack": {"keyframes": [{"t": 0, "sound": {"kind": "none"}}]},
        "decor": airliner(total),
        "milestones": [
            {"t": 0, "label": "A", "note": tr("Il le voit le dernier, vers 10 h, et le prend pour un avion en virage à 45°", "He sees it last, at about 10 o'clock, and takes it for an aircraft banking 45 degrees")},
            {"t": 60000, "label": "B", "note": tr("Au travers de l'aile, un disque brun-rouge sans détails, vu sous plusieurs angles", "Abeam, a red-brown disc with no detail, seen from several angles")},
            {"t": int(total * 1000), "label": "C", "note": tr("Sur l'arrière gauche (8 h), il devient transparent et disparaît sans bouger", "Behind on the left (8 o'clock), it turns transparent and vanishes without moving")},
        ],
        "_aim": {"start": start, "end": end},
    }


# --- the co-pilot ------------------------------------------------------------------------------
CHEVRON = [{"x": 0, "y": 0}, {"x": 1, "y": 0.5}, {"x": 0, "y": 1}, {"x": 0.3, "y": 0.5}]


def copilot_recording():
    total = 180.0                                    # "2 à 5 mn" in her report: in the middle
    # She saw it "toujours à peu près à la même position à gauche": from 10 h to 9 h, then it keeps up with the airliner.
    def rel(t):
        return -60.0 - 30.0 * smooth(t / 30.0) + (9.0 * math.sin(math.pi * (t - total + 12.0) / 12.0) ** 2 if t > total - 12.0 else 0.0)

    def aim_at(t):
        return ((HEADING + rel(t)) % 360.0, math.degrees(math.atan2(OBJECT_M - PLANE_M, 46000.0)))

    lens, arrow = "lens", "chevron"
    frames = []
    for ms in range(0, int(total * 1000) + 1, STEP_MS):
        t = ms / 1000.0
        aim = aim_at(t)
        u = smooth((t - 65.0) / 10.0) - smooth((t - 125.0) / 10.0)   # 0 to 1: how much of a chevron
        blur = 0.09 + 0.1 * math.sin(math.pi * min(1.0, max(0.0, (t - 30.0) / 110.0))) ** 2   # sharp, then blurred, then sharp again
        lens_size = (SIZE_DEG, SIZE_DEG * 0.35)
        arrow_size = (SIZE_DEG * 1.1, SIZE_DEG * 0.75)
        if ms == 0:
            shapes = [shape_full(lens, "oval", tr("lentille brune", "brown lens"), BROWN_RED, 0, blur, lens_size, aim),
                      shape_full(arrow, "polygon", tr("chevron", "chevron"), BROWN_RED, 1, blur, arrow_size, aim, points=CHEVRON)]
        else:
            shapes = [shape_move(lens, lens_size, aim, {"transparency": round(u, 3), "blur": round(blur, 3)}),
                      shape_move(arrow, arrow_size, aim, {"transparency": round(1 - u, 3), "blur": round(blur, 3)})]
        frames.append({"t": ms, "shapes": shapes})
    fade = []
    for s in frames[-1]["shapes"]:
        f = json.loads(json.dumps(s))
        f["shape"]["transparency"] = 1
        fade.append(f)
    frames.append({"t": int(total * 1000) + 1500, "shapes": fade})
    return {
        "version": 1,
        "id": "1994-01-28-ChauffourValerie",
        "tags": ["aerial observation", "airline pilot", "radar"],
        "time": {"year": 1994, "month": 1, "day": 28, "hour": 13, "minute": 14, "raw": "1994-01-28T13:14"},
        "utcOffsetHours": stated(0, "stated", "the report gives 13:14 GMT"),
        "durationSeconds": stated(total, "stated", "\"2 à 5 mn\" in her report"),
        "place": [stated({"lat": round(LAT_MID, 6), "lng": round(LNG_MID, 6), "name": "Near Coulommiers, Seine-et-Marne, France (airway between the VORs BRY and CLM)"},
                         "stated", "\"48°50'7 N / 003°00'9 E\" in her report, read as degrees and decimal minutes")],
        "observer": {"id": "ChauffourValerie", "title": "Valérie Chauffour"},
        "account": {
            "observerOccupation": tr("copilote, Air France", "co-pilot, Air France"),
            "source": "interview",
            "followedUp": True,
        },
        "sources": [
            {"type": "article", "title": "Rapport de la copilote pour Dominique Weinstein, copie au SEPRA", "authors": ["Valérie Chauffour"],
             "url": "https://rr0.org/science/crypto/ufo/enquete/dossier/Duboc/index.html",
             "publication": {"publisher": "Velasco 2004"}},
        ],
        "description": {
            "fr": (
                "Même vol, même minute, vu du siège de droite, par la copilote Valérie Chauffour. Elle prend d'abord l'objet pour un ballon-sonde, comme le steward. "
                "Pour elle il ne reste pas en arrière : elle le voit constamment vers 9 h, à gauche, et se déplaçant à la vitesse de "
                "l'avion, sur une trajectoire rectiligne parallèle à la sienne, pendant 2 à 5 minutes. Sa forme change : une lentille "
                "à contour net, qui se floute, devient une forme de « chevron » (géométrie variable, disque évoluant dans les trois "
                "dimensions), puis le contour redevient net à la fin ; sombre, brun, de grande taille. Juste avant la disparition, "
                "« une sorte de virage ».\n\n"
                "Ni taille angulaire ni distance chiffrée dans son rapport (« grande taille », 25 à 50 miles nautiques) : la taille est "
                "celle de l'interview du commandant (empruntée), et le moment où l'objet quitte le 10 h pour le 9 h est choisi."),
            "en": (
                "Same flight, same minute, seen from the right-hand seat by the co-pilot, Valérie Chauffour. She first takes the object for a weather balloon, "
                "like the steward. For her it does not fall behind: she sees it constantly at about 9 o'clock, to the left, moving at the "
                "airliner's speed on a straight path parallel to its own, for 2 to 5 minutes. Its shape changes: a lens with a sharp "
                "outline that blurs becomes a \"chevron\" (variable geometry, a disc evolving in all three dimensions), then the outline "
                "is sharp again at the end; dark, brown, large. Just before it disappears, \"a sort of turn\".\n\n"
                "No angular size and no figure for the distance in her report (\"large\", 25 to 50 nautical miles): the size is the one "
                "the captain's 1999 interview gives (borrowed), and when the object moves from 10 o'clock to 9 is chosen."),
        },
        "instrument": "eye",
        "observerTrack": track(total, aim_at, 1.0),
        "timeline": {"order": [lens, arrow], "groups": [[lens, arrow]], "keyframes": frames},
        "weatherTrack": weather(total, 120),
        "soundTrack": {"keyframes": [{"t": 0, "sound": {"kind": "none"}}]},
        "decor": airliner(total, "right", ("lens", "chevron")),
        "milestones": [
            {"t": 0, "label": "A", "note": tr("Elle le voit vers 10 h et le prend pour un ballon-sonde", "She sees it at about 10 o'clock and takes it for a weather balloon")},
            {"t": 90000, "label": "B", "note": tr("Il reste à 9 h, à la vitesse de l'avion ; la lentille se floute, devient un chevron", "It stays at 9 o'clock, at the airliner's speed; the lens blurs and becomes a chevron")},
            {"t": int(total * 1000), "label": "C", "note": tr("Une sorte de virage, puis il disparaît", "A sort of turn, then it vanishes")},
        ],
    }


if __name__ == "__main__":
    for name, rec in (("observer-duboc.json", commander_recording()), ("observer-duboc-copilot.json", copilot_recording())):
        aim = rec.pop("_aim", None)
        (OUT / name).write_text(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")
        print(f"wrote {name} {(OUT / name).stat().st_size} bytes", aim or "")
