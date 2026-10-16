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
- The angular size is the width of his thumb at arm's length from the 1999 interview, about 2 degrees (1000 m at 46 km would be
  1.24): at the report's 200 to 300 m, or the SEPRA's half Moon (0.26 degrees), the disc is under a pixel and cannot be seen at all.

Writes public/demo-data/observer-duboc.json and observer-duboc-copilot.json. Run from the repository root:
    python3 scripts/data/cases/duboc/build_duboc.py
"""
import json
import math
import pathlib
import struct

OUT = pathlib.Path("public/demo-data")

LAT_MID, LNG_MID = 48 + 50.7 / 60, 3 + 0.9 / 60      # "48°50'7 N / 003°00'9 E" in the report: degrees and decimal minutes
HEADING = 332.0
SPEED = 350 * 1852 / 3600                            # 350 kt, "VS" of the report: about 180 m/s
PLANE_M, OBJECT_M = 11700.0, 10500.0
DISC_M, DISC_THICKNESS_M = 1000.0, 100.0              # "1000 m de diamètre pour une épaisseur de 100 m" (interview of 1999)
BROWN_RED = "#a8421f"                               # "brun-rouge", "rouge brunâtre": a dark red-brown in the daylight reads as a black blot, so a rust red
SIZE_DEG = 2.0                                       # 1999 interview: "the width of his thumb" at arm's length, about 2 degrees (1000 m at 46 km would be 1.24); the report (200-300 m) and the SEPRA (half the Moon, 0.26) give far less
# Hers: no angle in her report, but a distance (25 to 50 NM) and "large": the 1000 m of the captain's interview at her 25 NM (46 km), not his thumb
COPILOT_SIZE_DEG = 1.24
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


def eye_at(t_s, total_s, eye_back_m=0.0):
    """Where the eye is at `t_s`: the pilots' (the reference of the whole flight deck), or one `eye_back_m` behind them."""
    e, n = plane_at(t_s, total_s)
    h = math.radians(HEADING)
    return e - math.sin(h) * eye_back_m, n - math.cos(h) * eye_back_m


def track(total_s, aim_at, lag_s, eye_back_m=0.0, eye_up_m=0.0):
    """The airliner moves; the eye follows the object with a lag; the field is the usual 60 degrees."""
    keys = []
    for ms in range(0, int(total_s * 1000) + 1, 2000):
        t = ms / 1000.0
        e, n = eye_at(t, total_s, eye_back_m)
        lat, lng = geo(e, n, total_s)
        az, alt = aim_at(max(0.0, t - lag_s))
        keys.append({"t": ms, "pose": {"lat": round(lat, 6), "lng": round(lng, 6), "elevationM": PLANE_M + eye_up_m,
                                       "headingDeg": round(az, 2), "pitchDeg": round(alt, 2), "fovDeg": 60}})
    return {"keyframes": keys}


def airframe(total_s, ident, title, model, size, forward_m, left_m, below_m, extra, eye_back_m=0.0, eye_up_m=0.0):
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
    ref_lat, ref_lng = (round(v, 6) for v in geo(*eye_at(0.0, total_s, eye_back_m), total_s))
    track = []
    for ms in range(0, int(total_s * 1000) + 1, 5000):
        lat, lng = (round(v, 6) for v in geo(*eye_at(ms / 1000.0, total_s, eye_back_m), total_s))
        # The engine (SceneRenderer.updateDecorAnchoring) places a decor object at its own position plus where the first pose lies as
        # seen from the CURRENT one, with the longitude scaled by the cosine of the current latitude: 8 m of lateral drift after ten
        # kilometres if the track is simply the distance flown, which puts the eye 8 m off after ten kilometres, outside a flight deck 3.3 m wide.
        track.append({"t": ms,
                      "eastM": round((lng - ref_lng) * 111320.0 * math.cos(math.radians(lat)) + centre_e, 2),
                      "northM": round((lat - ref_lat) * 111320.0 + centre_n, 2),
                      "altitudeM": round(PLANE_M + eye_up_m + 1.6 + below_m, 2), "headingDeg": HEADING})
    first = track[0]
    return {"id": ident, "kind": "aircraft", "title": title,
            "eastM": first["eastM"], "northM": first["northM"], "headingDeg": HEADING,
            "sizeM": size, "model": {"id": model}, "track": track, **extra}


# Where things stand in the flight deck model's own frame (x to the right, y up, z towards the tail): the origin of the model of the flight deck
# (the middle of its box), of the captain (his feet, in his seat), of the chief steward (his feet, behind the captain), and each one's eyes. A decor
# object is placed by where the OBSERVER's eye is in it (forward_m ahead of its origin, left_m to the left of it, below_m under it): the difference
# of two of these points.
COCKPIT_AT = (0.02, 0.684, 2.654)
CAPTAIN_AT = (-0.484, -0.338, 2.246)
STEWARD_AT = (-0.537, -0.378, 3.12)                   # standing against the rear bulkhead, right behind the captain, 0.64 m behind his eyes
EYE_CAPTAIN, EYE_COPILOT = (-0.537, 0.83, 2.48), (0.537, 0.83, 2.48)
# The chief steward, standing against the rear bulkhead (where the observer's seat is folded away) right behind the captain, stooping
# a little under the overhead panel: he sees the captain from behind, and the left window beyond his shoulder.
EYE_STEWARD = (-0.537, 1.0, 3.07)
# He cannot stand straight under the ceiling of the rear of the flight deck (1.7 m above the floor there): a man of 1.62 m, in an Air France uniform
# (navy), his back to the rear bulkhead where the observer's seat is folded away.
STEWARD_HEIGHT_M = 1.62
STEWARD_UNIFORM = {"costumeColor": "#1c2b5e"}
EYES = {"left": EYE_CAPTAIN, "right": EYE_COPILOT, "steward": EYE_STEWARD}


def around(eye, at):
    """(forward_m, left_m, below_m) of an object whose origin is `at`, for an observer whose eye is `eye`: how far the eye is ahead of the object,
    to the left of it, and below it (negative: the object is under the eye)."""
    return at[2] - eye[2], at[0] - eye[0], at[1] - eye[1]


def airliner(total_s, seat="left", seen=("disc",)):
    """The flight deck round the observer (the model cut from davidmarton1987's, scaled to the real size: scripts/extract-a320-cockpit.py), the
    captain at the left seat, the co-pilot's eye at the right one, and the chief steward standing behind the captain: whoever the eye is, the others are
    placed round it, each by its own point of the model's frame. No airframe: the A320 of the catalogue, kept for its wings, had a surface that came
    across the view of the flight deck, and its wings are behind the pilots anyway."""
    eye = EYES[seat]
    cockpit_title = {"left": tr("Poste de pilotage de l'A320 (siège gauche : le commandant)", "A320 flight deck (left seat: the captain)"),
                     "right": tr("Poste de pilotage de l'A320 (siège droit : Valérie Chauffour)", "A320 flight deck (right seat: Valérie Chauffour, the co-pilot)"),
                     "steward": tr("Poste de pilotage de l'A320 (adossé à la cloison du fond : le chef steward)", "A320 flight deck (back to the rear bulkhead: the chief steward)")}[seat]
    objects = [airframe(total_s, "af3532-cockpit", cockpit_title,
                        "davidmarton-a320-cockpit", {"widthM": 3.257, "lengthM": 2.591, "heightM": 2.127}, *around(eye, COCKPIT_AT),
                        # The disc was seen through the windows: the frame, the pillars and the captain are in front of it
                        {"aircraftSound": "airliner-narrow", "occludesSourceIds": list(seen)})]
    # An observer (a companion who was there), not an entity: an entity is a being seen, and the engine would class the case "with occupants"
    if seat != "left":
        objects.append({**airframe(total_s, "af3532-captain", tr("Le commandant Duboc, au siège gauche", "Captain Duboc, at the left seat"),
                                   "ufoathome-duboc-seated", {"heightM": 1.292}, *around(eye, CAPTAIN_AT), {"occludesSourceIds": list(seen)}), "kind": "observer"})
    if seat != "steward":
        objects.append({**airframe(total_s, "af3532-chief-steward", tr("Le chef steward, en uniforme, adossé à la cloison du fond derrière le commandant", "The chief steward, in uniform, his back to the rear bulkhead behind the captain"),
                                   "makehuman-man-jacket", {"heightM": STEWARD_HEIGHT_M}, *around(eye, STEWARD_AT), {"modelParameters": STEWARD_UNIFORM}), "kind": "observer"})
    return objects


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
def disc_frames(total, aim_at, vanishes=True):
    """The disc of the captain's account, one picture a second, at `aim_at(t)` (compass azimuth and altitude); turning transparent at the end if it `vanishes`."""
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
    if vanishes:
        # "je le vois soudain devenir transparent et disparaître sans bouger"
        last = frames[-1]["shapes"][0]
        fade = json.loads(json.dumps(last))
        fade["shape"]["transparency"] = 1
        frames.append({"t": int(total * 1000) + 1500, "shapes": [fade]})
    return frames


def commander():
    total = 120.0                                    # "1 ou 2 mn" in the report: the two minutes, the 11 NM of the SEPRA
    lateral = SPEED * total * math.tan(math.radians(60)) / 2
    left = HEADING - 90.0
    target = enu(left, lateral)                      # motionless, abeam at 10 NM when the airliner is in the middle of the track

    def aim_at(t):
        return aim_of(target, plane_at(t, total))

    frames = disc_frames(total, aim_at)
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
                "Ici la taille est celle de l'interview de 1999, la largeur d'un pouce à bout de bras (environ 2° ; 1000 m à 46 km feraient 1,24°) ; le SEPRA la ramène à la moitié de la Lune (0,26°). Les relèvements, 10 h puis 8 h, "
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
                "The size here is the one from the 1999 interview, the width of a thumb at arm's length (about 2 degrees; 1000 m at 46 km would be 1.24); the SEPRA brings it down to half the Moon (0.26). The bearings, 10 o'clock then 8, over "
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
        blur = 0.12 + 0.12 * math.sin(math.pi * min(1.0, max(0.0, (t - 30.0) / 110.0))) ** 2   # sharp, then blurred, then sharp again
        lens_size = (COPILOT_SIZE_DEG, COPILOT_SIZE_DEG * 0.35)
        arrow_size = (COPILOT_SIZE_DEG * 1.1, COPILOT_SIZE_DEG * 0.75)
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
                "celle de l'interview du commandant, 1000 m à ses 25 miles nautiques à elle (empruntée), et le moment où l'objet quitte le 10 h pour le 9 h est choisi."),
            "en": (
                "Same flight, same minute, seen from the right-hand seat by the co-pilot, Valérie Chauffour. She first takes the object for a weather balloon, "
                "like the steward. For her it does not fall behind: she sees it constantly at about 9 o'clock, to the left, moving at the "
                "airliner's speed on a straight path parallel to its own, for 2 to 5 minutes. Its shape changes: a lens with a sharp "
                "outline that blurs becomes a \"chevron\" (variable geometry, a disc evolving in all three dimensions), then the outline "
                "is sharp again at the end; dark, brown, large. Just before it disappears, \"a sort of turn\".\n\n"
                "No angular size and no figure for the distance in her report (\"large\", 25 to 50 nautical miles): the size is the one "
                "the captain's 1999 interview gives, 1000 m at her 25 nautical miles (borrowed), and when the object moves from 10 o'clock to 9 is chosen."),
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


# --- the hoax reading ---------------------------------------------------------------------------------------------------------------------
# Jérôme Beau's reading (2026-10-16): the chief steward, who was behind Duboc and was the first to point the shape out, shone a small light (a key-ring
# torch or laser pointer) from behind them on the glass of the flight deck, and what the crew saw was its spot. The spot is wherever the
# line of sight of each pilot to the shape crosses the glass (the model's panes: scripts/extract-a320-cockpit.py), so it follows what each of
# them said, and its SHAPE is what the glass makes of the beam: a round beam striking the glass at an angle makes an oval stretched by 1/cos
# of the angle between the beam and the normal of the pane, long where the beam is nearly grazing it.
HOAX_AUTHOR = {"people": "BeauJerome"}
HOAX_TIME = "2026-10-16"
GLB = pathlib.Path("public/models/davidmarton-a320-cockpit/cockpit.glb")
# In the model's own frame (see COCKPIT_AT): the chief steward's hand.
STEWARD_HAND = (-0.537, 1.2, 2.95)                  # his hand, held out beside his head, behind the captain
SPOT_M = 0.02                                        # a key-ring torch's spot on the glass: about 2 cm, which is 2 degrees from half a metre
SPOT_COLOR = "#b5301a"                               # a red one, the account says "rouge brunâtre"


class Glass:
    """The panes of the flight deck model (its blended material), as triangles in the model's frame."""
    def __init__(self):
        raw = GLB.read_bytes()
        length = struct.unpack("<I", raw[12:16])[0]
        self.gltf = json.loads(raw[20:20 + length])
        self.blob = raw[20 + length + 8:]
        self.triangles = []
        for mesh in self.gltf["meshes"]:
            for primitive in mesh["primitives"]:
                if self.gltf["materials"][primitive["material"]].get("alphaMode") != "BLEND":
                    continue
                positions = self.read(primitive["attributes"]["POSITION"])
                indices = self.read(primitive["indices"]) if "indices" in primitive else list(range(len(positions)))
                for k in range(0, len(indices), 3):
                    self.triangles.append(tuple(positions[indices[k + i]] for i in range(3)))

    def read(self, index):
        accessor = self.gltf["accessors"][index]
        view = self.gltf["bufferViews"][accessor["bufferView"]]
        start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        if accessor["componentType"] == 5126:
            width = {"VEC3": 3, "SCALAR": 1}[accessor["type"]]
            return list(struct.iter_unpack("<" + "f" * width, self.blob[start:start + accessor["count"] * 4 * width]))
        code = {5123: "H", 5125: "I", 5121: "B"}[accessor["componentType"]]
        return [v[0] for v in struct.iter_unpack("<" + code, self.blob[start:start + accessor["count"] * struct.calcsize(code)])]

    @staticmethod
    def sub(a, b):
        return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

    @staticmethod
    def cross(a, b):
        return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])

    @staticmethod
    def dot(a, b):
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

    def hit(self, origin, direction):
        """The nearest pane the ray from `origin` along `direction` meets: (distance, unit normal), or None."""
        best = None
        for a, b, c in self.triangles:
            e1, e2 = self.sub(b, a), self.sub(c, a)
            p = self.cross(direction, e2)
            det = self.dot(e1, p)
            if abs(det) < 1e-9:
                continue
            s = self.sub(origin, a)
            u = self.dot(s, p) / det
            if u < 0 or u > 1:
                continue
            q = self.cross(s, e1)
            v = self.dot(direction, q) / det
            if v < 0 or u + v > 1:
                continue
            t = self.dot(e2, q) / det
            if t > 0 and (best is None or t < best[0]):
                n = self.cross(e1, e2)
                size = math.sqrt(self.dot(n, n))
                best = (t, (n[0] / size, n[1] / size, n[2] / size))
        return best


def model_to_world(v):
    """A vector of the flight deck model (x right, y up, z towards the tail) as the scene's (east, up, south), the aircraft flying on HEADING."""
    h = math.radians(HEADING)
    east = v[0] * math.cos(h) + (-v[2]) * math.sin(h)
    north = v[0] * (-math.sin(h)) + (-v[2]) * math.cos(h)
    return (east, v[1], -north)


def unit(v):
    size = math.sqrt(sum(c * c for c in v))
    return tuple(c / size for c in v)


def attitude_of(long_axis, normal):
    """The heading, pitch and roll (BodyAttitude: three's YXZ euler, heading clockwise from north) that stand a primitive with its x on `long_axis` and its
    y on `normal`, both in the scene's frame (east, up, south)."""
    x = unit(long_axis)
    y = unit(normal)
    z = Glass.cross(x, y)
    # R = [x y z] as columns; R = Ry(a) Rx(b) Rz(c)
    b = math.asin(max(-1.0, min(1.0, -z[1])))
    a = math.atan2(z[0], z[2])
    c = math.atan2(x[1], y[1])
    return {"headingDeg": round(-math.degrees(a) % 360.0, 2), "pitchDeg": round(math.degrees(b), 2), "rollDeg": round(-math.degrees(c), 2)}


def hoax_spots(account):
    """The spot of the steward's light on the glass, as a point of the flight deck at each instant of the captain's account: where HIS line of sight to the
    shape crosses the glass. One physical thing, which the co-pilot and the steward then see from where they are (and which their own accounts are
    then measured against): (t, point, normal, beam stretch, long axis), in the model's frame."""
    glass = hoax_spots.glass = getattr(hoax_spots, "glass", None) or Glass()
    spots = []
    for frame in account["timeline"]["keyframes"]:
        if frame["t"] > account["durationSeconds"]["value"] * 1000:
            continue
        aim = frame["shapes"][0]["shape"]["aim"]
        rel = math.radians(aim["azimuthDeg"] - HEADING)
        alt = math.radians(aim["altitudeDeg"])
        d = (math.sin(rel) * math.cos(alt), math.sin(alt), -math.cos(rel) * math.cos(alt))
        found = glass.hit(EYE_CAPTAIN, d)
        if not found:
            continue
        distance, normal = found
        spot = tuple(EYE_CAPTAIN[i] + d[i] * distance for i in range(3))
        beam = unit(Glass.sub(spot, STEWARD_HAND))
        cosine = max(0.2, abs(Glass.dot(beam, normal)))
        # the beam's direction along the pane: where the oval is stretched, by 1/cos of the angle between the beam and the normal of the pane
        along = unit(tuple(beam[i] - Glass.dot(beam, normal) * normal[i] for i in range(3)))
        spots.append((frame["t"], spot, normal, 1.0 / cosine, along))
    return spots


def hoax_reading(account, eye, spots, explains, title_fr, title_en):
    """The reading of `account` in which what its observer saw is the spot of the steward's light on the glass, seen from `eye`: the spots are the
    captain's (see hoax_spots), carried with the observer (BodyJson.withObserver) because they are on the glass he is sitting behind."""
    keys = []
    last = max(frame["t"] for frame in account["timeline"]["keyframes"])
    times = [frame["t"] for frame in account["timeline"]["keyframes"] if frame["t"] <= account["durationSeconds"]["value"] * 1000]
    for t in times:
        # beyond the captain's account (his lasts less than hers), the spot stays where it was last
        found = [spot for spot in spots if spot[0] <= t]
        spot = found[-1] if found else spots[0]
        _, point, normal, stretch, along = spot
        v = Glass.sub(point, eye)
        distance = math.sqrt(Glass.dot(v, v))
        rel = math.degrees(math.atan2(v[0], -v[2]))
        altitude = math.degrees(math.asin(v[1] / distance))
        keys.append({"t": t, "azimuthDeg": round((HEADING + rel) % 360.0, 3), "altitudeDeg": round(altitude, 3), "distanceM": round(distance, 3),
                     "sizeM": {"widthM": round(SPOT_M * stretch, 4), "lengthM": SPOT_M, "heightM": 0.001},
                     "attitude": attitude_of(model_to_world(along), model_to_world(normal)),
                     "appearance": {"color": SPOT_COLOR, "albedo": 0.2, "luminanceCdM2": 9000, "haloScale": 0.2}})
    reading = {"version": 1, "id": account["id"] + "-hoax"}
    for key, value in account.items():
        if key not in ("version", "id", "observer", "account", "description", "sources", "tags", "timeline", "milestones", "interpretation", "_aim"):
            reading[key] = value
    reading["tags"] = ["interpretation"]
    reading["timeline"] = {"keyframes": [], "order": [], "groups": []}
    reading["interpretation"] = {
        "title": tr(title_fr, title_en),
        "bodies": [{"id": "spot", "explains": explains, "withObserver": True,
                    "title": tr("Le point lumineux de la lampe du chef steward sur la vitre", "The spot of the chief steward's light on the glass"),
                    "model": {"id": "disc"}, "track": keys}]}
    return reading


# --- the chief steward ----------------------------------------------------------------------------------------------------------------------
def steward_recording():
    """The chief steward's account: he was behind the captain, and was the first to see the object and to say what it was (\"un ballon-sonde\"). Nothing
    he said gives a bearing, a size or a shape: he is given the captain's (the same object, seen from half a metre behind and 0.44 m above his
    eyes, which is no parallax at all at that distance), the only reason this recording has an object in it. Nobody gives his name."""
    total = 120.0
    # He looks at it as the co-pilot does, from 10 h and then 9 h (from where he stands, behind the captain), and nothing says it vanishes for him.
    def aim_at(t):
        return ((HEADING - 60.0 - 30.0 * smooth(t / 30.0)) % 360.0, math.degrees(math.atan2(OBJECT_M - PLANE_M, 46000.0)))
    frames = disc_frames(total, aim_at, vanishes=False)
    rec = commander_recording()
    rec.pop("_aim", None)
    rec["timeline"] = {"order": ["disc"], "groups": [["disc"]], "keyframes": frames}
    rec["id"] = "1994-01-28-ChiefSteward"
    rec["observer"] = {"id": "ChiefStewardAF3532", "title": "Le chef steward"}
    rec["account"] = {"observerOccupation": tr("chef steward, Air France", "chief steward, Air France")}
    rec["durationSeconds"] = stated(total, "derived", "his own duration is not given: the captain's")
    rec["observerTrack"] = track(total, aim_at, 1.0)
    rec["decor"] = airliner(total, "steward")
    rec["sources"] = [{"type": "article", "title": "Rapport du pilote Duboc pour Dominique Weinstein, copie au SEPRA", "authors": ["Jean-Charles Duboc"],
                       "url": "https://rr0.org/science/crypto/ufo/enquete/dossier/Duboc/index.html", "publication": {"publisher": "Velasco 2004"}}]
    rec["description"] = {
        "fr": ("Le chef steward, dans le poste de pilotage, en uniforme, derrière le commandant Duboc (peut-être à la place du siège observateur, mais rien ne dit "
               "qu'il était assis), est le premier à voir l'objet et à s'exclamer : « Un ballon-sonde ! » On ne sait de lui que cela, par le "
               "récit des deux pilotes : aucun relèvement, aucune taille, aucune forme qui soit de lui. Pour que sa vue puisse être jouée, "
               "l'objet est placé comme les pilotes le disent : à 10 h, puis à 9 h comme chez la copilote, de la forme du disque du commandant. "
               "Il se tient adossé à la cloison du fond, là où le siège observateur est replié, juste derrière le commandant, et le voit de dos, la vitre de gauche au-delà de son épaule."),
        "en": ("The chief steward, in the cockpit, standing behind Captain Duboc (perhaps where the observer's seat is, but nothing says he was "
               "seated), is the first to see the object and to exclaim: \"A weather balloon!\" That is all that is known of him, through the two "
               "pilots' accounts: no bearing, no size, no shape that is his. So that his view can be played, the object is placed as the pilots say: at 10 o'clock, then at 9 "
               "as for the co-pilot, in the shape of the captain's disc. He stands with his back to the rear bulkhead, where the observer's seat is folded away, "
               "right behind the captain, and sees him from behind, the left window beyond his shoulder.")}
    rec["milestones"] = [
        {"t": 0, "label": "A", "note": tr("Il le voit le premier, vers 10 h : « Un ballon-sonde ! »", "He sees it first, at about 10 o'clock: \"A weather balloon!\"")},
        {"t": 30000, "label": "B", "note": tr("Puis à 9 h, à gauche", "Then at 9 o'clock, to the left")}]
    return rec


if __name__ == "__main__":
    commander_rec, copilot_rec, steward_rec = commander_recording(), copilot_recording(), steward_recording()
    spots = hoax_spots(commander_rec)
    readings = (
        ("interpretation-duboc-hoax.json", hoax_reading(commander_rec, EYE_CAPTAIN, spots, ["disc"],
            "Canular : le point d'une lampe du chef steward, sur la vitre, vu par le commandant", "Hoax: the spot of the chief steward's light on the glass, as the captain saw it")),
        ("interpretation-duboc-copilot-hoax.json", hoax_reading(copilot_rec, EYE_COPILOT, spots, ["lens", "chevron"],
            "Canular : le point d'une lampe du chef steward, sur la vitre, vu par la copilote", "Hoax: the spot of the chief steward's light on the glass, as the co-pilot saw it")),
        ("interpretation-duboc-steward-hoax.json", hoax_reading(steward_rec, EYE_STEWARD, spots, ["disc"],
            "Canular : le point de sa propre lampe, sur la vitre, vu par le chef steward", "Hoax: the spot of his own light on the glass, as the chief steward saw it")),
    )
    for name, rec in (("observer-duboc.json", commander_rec), ("observer-duboc-copilot.json", copilot_rec), ("observer-duboc-steward.json", steward_rec)):
        aim = rec.pop("_aim", None)
        (OUT / name).write_text(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")
        print(f"wrote {name} {(OUT / name).stat().st_size} bytes", aim or "")
    for name, rec in readings:
        (OUT / name).write_text(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")
        print(f"wrote {name} {(OUT / name).stat().st_size} bytes, {len(rec['interpretation']['bodies'][0]['track'])} keyframes")
