"""Builds the Zond IV re-entry test sky (3 March 1968, 21:45 EST) as seen from Owensboro, Kentucky.

What came down was not the Zond 4 probe itself (it was destroyed off Guinea on 7 March) but a piece
of its launcher's upper stage, 1968-013C (SSN 3136, "SL-12 R/B" in the satellite catalogue).

Sources:
- Hartmann, W. K., "Processes of perception, conception, and reporting", in the Condon report
  (1968), section VI, chapter 2: 78 reports, "a line from Kentucky to Pennsylvania", ~21:45 EST,
  most observers saw 2 or 3 main pieces and observers near the end of the path saw more,
  golden-orange tails, pieces of 3 to 4 minutes of arc, no sound.
  rr0.org: /time/1/9/6/8/CondonReport/s6/c02/3/index.html
- Molczan, T., "Visually Observed Natural Re-entries of Earth Satellites" (2025-09-07 draft),
  http://www.satobs.org/reentry/Visually_Observed_Natural_Re-entries_latest_draft.pdf : decay
  1968-03-04 02:48 UTC, 1968-013C, ~100 kg, and the places it was seen from (PLACES below).
- satcat.csv (CelesTrak, ../satcat.csv): 1968-013C, inclination 51.54 deg, 191 x 214 km.

The path is DERIVED: a circular orbit of the catalogue's inclination, northbound, whose ground
track passes nearest (least squares) to the places it was seen from. Its timing, height and the
pieces' brightness are ASSUMED, each with its reason below. Nothing is propagated from orbital
elements: no element set of 1968 is public, and none would hold to a minute in the last orbit.

Writes ../../../public/demo-data/sky-test-reentry.json.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "demo-data", "sky-test-reentry.json"))

HARTMANN = "Hartmann 1968, Condon report section VI chapter 2"
MOLCZAN = "Molczan, Visually Observed Natural Re-entries of Earth Satellites (2025)"

# Where Molczan's list says it was seen from, to the town (centre of the town).
PLACES = {
    "Florence, AL": (34.7998, -87.6773), "Hendersonville, TN": (36.3048, -86.6200), "Nashville, TN": (36.1627, -86.7816),
    "Oliver Springs, TN": (36.0445, -84.3444), "Elizabethtown, KY": (37.6940, -85.8591), "Lexington, KY": (38.0406, -84.5037),
    "London, KY": (37.1290, -84.0833), "Owensboro, KY": (37.7719, -87.1112), "Gary, IN": (41.5934, -87.3464),
    "Shoals, IN": (38.6664, -86.7911), "Bethany, WV": (40.2056, -80.5592), "Morgantown, WV": (39.6295, -79.9559),
    "Lynchburg, VA": (37.4138, -79.1422), "Wytheville, VA": (36.9485, -81.0848),
}
OBSERVER = "Owensboro, KY"
OBSERVER_ELEVATION_M = 120

INCLINATION_DEG = 51.54
R_KM = 6371.0
MU = 398600.4418
UTC_OFFSET = -5
# The recording starts at 21:45:50 EST = 02:45:50 UTC on 4 March, fifteen seconds after the first
# pieces began to glow: the three main ones are then burning some 15 degrees up with their tails, so a
# reader sees what this sky is about at once rather than after half a minute of an empty one. The
# track starts before the recording, at negative instants.
START = (1968, 3, 4, 2, 45, 50)
DURATION_S = 130
# The leading piece passes nearest Lexington at this many seconds into the recording; chosen so it
# goes out over south-western Pennsylvania at 02:48:00 UTC, Molczan's decay time (see TIMING).
LEXINGTON_PASS_S = 55
# The luminous phase, seconds from the Lexington passage: from over northern Alabama (Florence, the
# first place of the list) to past Bethany, into Pennsylvania where it was also seen.
FIRST_S, LAST_S = -70, 70
STEP_S = 10
# Heights at the two ends, km: where a decaying object breaks up and its pieces burn.
TOP_KM, BOTTOM_KM = 85.0, 68.0

TIMING = ("Hartmann gives about 21:45 EST (02:45 UTC); Molczan's list gives the decay at 02:48 UTC. "
          "The burning ends over south-western Pennsylvania at 02:48:00 UTC.")
HEIGHT = ("A decaying satellite or stage breaks up and its pieces burn at about 85 to 65 km: neither source "
          "gives a height, so it falls linearly from 85 km over Alabama to 68 km over Pennsylvania.")
PATH = (f"A circular orbit at the catalogue's inclination ({INCLINATION_DEG} deg), northbound, whose ground track passes "
        f"nearest (least squares) to the 14 places {MOLCZAN} lists: 10 km from Nashville, 21 km from Lexington, "
        f"6 km from Bethany WV, 'a line from Kentucky to Pennsylvania' ({HARTMANN}).")


def stated(v, rationale):
    return {"value": v, "basis": "stated", "rationale": rationale}


def derived(v, rationale):
    return {"value": v, "basis": "derived", "rationale": rationale}


def assumed(v, rationale):
    return {"value": v, "basis": "assumed", "rationale": rationale}


def julian(y, m, d, h, mi, s):
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5 + (h + mi / 60 + s / 3600) / 24


def gmst(jd):
    t = (jd - 2451545.0) / 36525
    return math.radians((280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t) % 360)


def distance_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    c = math.sin(la1) * math.sin(la2) + math.cos(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    return R_KM * math.acos(max(-1.0, min(1.0, c)))


class Orbit:
    """A circular orbit, northbound through latitude `lat0` at `jd0`, crossing it at longitude `lng0`."""

    def __init__(self, lng0, jd0, lat0=38.0, height_km=80.0):
        self.i = math.radians(INCLINATION_DEG)
        self.jd0 = jd0
        self.n = math.sqrt(MU / (R_KM + height_km) ** 3)
        self.u0 = math.asin(math.sin(math.radians(lat0)) / math.sin(self.i))
        right_ascension = math.atan2(math.cos(self.i) * math.sin(self.u0), math.cos(self.u0))
        self.node = math.radians(lng0) + gmst(jd0) - right_ascension

    def ground(self, dt):
        u = self.u0 + self.n * dt
        x = math.cos(self.node) * math.cos(u) - math.sin(self.node) * math.cos(self.i) * math.sin(u)
        y = math.sin(self.node) * math.cos(u) + math.cos(self.node) * math.cos(self.i) * math.sin(u)
        z = math.sin(self.i) * math.sin(u)
        lng = math.degrees(math.atan2(y, x) - gmst(self.jd0 + dt / 86400))
        return math.degrees(math.asin(z)), (lng + 540) % 360 - 180


def fit(jd0):
    """The orbit whose track runs nearest the places, by the longitude it crosses 38 N at."""
    def cost(lng0):
        orbit = Orbit(lng0, jd0)
        track = [orbit.ground(dt) for dt in range(-600, 601, 2)]
        return sum(min(distance_km(p, q) for q in track) ** 2 for p in PLACES.values())
    best = min((cost(l / 10), l / 10) for l in range(-900, -800))
    return Orbit(best[1], jd0)


def main():
    start_jd = julian(*START)
    pass_jd = start_jd + LEXINGTON_PASS_S / 86400
    orbit = fit(pass_jd)
    # The instant of the passage nearest Lexington, so the timing is stated against a place.
    lexington = PLACES["Lexington, KY"]
    nearest = min(range(-120, 121), key=lambda dt: distance_km(lexington, orbit.ground(dt)))
    track = []
    for s in range(FIRST_S, LAST_S + 1, STEP_S):
        lat, lng = orbit.ground(s + nearest)
        f = (s - FIRST_S) / (LAST_S - FIRST_S)
        track.append({
            "t": (LEXINGTON_PASS_S + s) * 1000,
            "lat": derived(round(lat, 4), PATH),
            "lng": derived(round(lng, 4), PATH),
            "altitudeKm": assumed(round(TOP_KM + (BOTTOM_KM - TOP_KM) * f, 1), HEIGHT),
        })
    first_t = track[0]["t"]
    last_t = track[-1]["t"]
    main_pieces = ("Hartmann: 'most observers saw 2 or 3 main pieces'. Their spacing and brightness are not given: "
                   "a few seconds apart along the path, and a fireball's magnitudes, are assumed.")
    late_pieces = ("Hartmann: 'observers near the end of the trajectory saw more'. When and how many are not given: "
                   "the leading piece is assumed to shed three more over West Virginia.")
    end = "Burned out over south-western Pennsylvania at 02:48 UTC, Molczan's decay time; the smaller pieces a little before."
    late_from = (LEXINGTON_PASS_S + 40) * 1000
    fragments = [
        {"id": "a", "lagS": assumed(0, main_pieces), "absoluteMagnitude": assumed(-3, main_pieces), "color": stated("#ffc070", HARTMANN + ": golden-orange"), "trainS": assumed(2, HARTMANN + ": glittering tails")},
        {"id": "b", "lagS": assumed(3, main_pieces), "absoluteMagnitude": assumed(-2.2, main_pieces), "color": "#ffb060", "trainS": 1.8},
        {"id": "c", "lagS": assumed(7, main_pieces), "absoluteMagnitude": assumed(-1.5, main_pieces), "color": "#ffa050", "trainS": 1.5,
         "untilT": assumed(last_t - 8000, end)},
        {"id": "d", "lagS": assumed(1.2, late_pieces), "fromT": assumed(late_from, late_pieces), "untilT": assumed(last_t - 4000, end), "absoluteMagnitude": assumed(-0.5, late_pieces), "color": "#ff9a40", "trainS": 1},
        {"id": "e", "lagS": assumed(2.0, late_pieces), "fromT": assumed(late_from + 6000, late_pieces), "untilT": assumed(last_t - 10000, end), "absoluteMagnitude": assumed(0, late_pieces), "color": "#ff9a40", "trainS": 1},
        {"id": "f", "lagS": assumed(5.0, late_pieces), "fromT": assumed(late_from + 12000, late_pieces), "untilT": assumed(last_t - 14000, end), "absoluteMagnitude": assumed(0.3, late_pieces), "color": "#ff9a40", "trainS": 0.8},
    ]
    for fragment in fragments[:2]:
        fragment["untilT"] = assumed(last_t, end)
    reentry = {
        "id": "zond-iv",
        "title": {"en": "Re-entry of a piece of Zond 4's launcher", "fr": "Rentrée d'une pièce du lanceur de Zond 4",
                  "es": "Reentrada de una pieza del lanzador de Zond 4", "it": "Rientro di un pezzo del lanciatore di Zond 4"},
        "object": {"name": "SL-12 R/B", "cosparId": "1968-013C", "norad": 3136},
        "track": track,
        "fragments": fragments,
    }

    lat, lng = PLACES[OBSERVER]
    # The view follows the leading piece across the sky, a little below it so the trailing ones and
    # their tails stay in the frame.
    observer_track = []
    for s in range(0, DURATION_S + 1, 10):
        t = s * 1000
        aim = max(first_t, min(last_t, t))
        k = min(range(len(track) - 1), key=lambda j: abs(track[j]["t"] - aim))
        a = track[k]
        az, el = look(lat, lng, a["lat"]["value"], a["lng"]["value"], a["altitudeKm"]["value"])
        observer_track.append({"t": t, "pose": {"lat": lat, "lng": lng, "elevationM": OBSERVER_ELEVATION_M,
                                                "headingDeg": round(az - 15, 1), "pitchDeg": round(max(8.0, el - 4), 1), "fovDeg": 80}})
    description = {
        "en": ("A test sky for a re-entry: Zond 4's launcher coming down over the eastern United States on 3 March 1968 "
               "at about 21:45 EST, seen from Owensboro, Kentucky, one of the places it was reported from. Not an observer's "
               "account: the re-entry as the sources establish it. Hundreds saw it; William Hartmann studied 78 reports for "
               "the Condon committee and found the pieces called a 'formation', a cigar with lit windows, or a craft passing "
               "low and silent. The path follows the orbit's inclination through the places it was seen from; its timing, "
               "height and the pieces' brightness are assumed, each with its reason in the file."),
        "fr": ("Un ciel d'essai pour une rentrée atmosphérique : le lanceur de Zond 4 retombant sur l'est des États-Unis le "
               "3 mars 1968 vers 21 h 45 heure de l'Est, vu d'Owensboro (Kentucky), l'un des lieux d'où il a été signalé. "
               "Ce n'est pas le compte rendu d'un observateur : c'est la rentrée telle que les sources l'établissent. Des "
               "centaines de personnes l'ont vue ; William Hartmann a étudié 78 signalements pour la commission Condon et y "
               "a trouvé une « formation », un cigare aux fenêtres éclairées, un appareil passant bas et en silence. La "
               "trajectoire suit l'inclinaison de l'orbite à travers les lieux d'observation ; son horaire, sa hauteur et "
               "l'éclat des morceaux sont supposés, chacun avec sa raison dans le fichier."),
        "es": ("Un cielo de prueba para una reentrada: el lanzador de Zond 4 cayendo sobre el este de Estados Unidos el "
               "3 de marzo de 1968 hacia las 21:45 hora del Este, visto desde Owensboro (Kentucky), uno de los lugares desde "
               "donde se informó. No es el relato de un observador: es la reentrada tal como la establecen las fuentes. "
               "Cientos de personas la vieron; William Hartmann estudió 78 informes para la comisión Condon y encontró una "
               "«formación», un cigarro con ventanas iluminadas, una nave que pasaba baja y en silencio. La trayectoria sigue "
               "la inclinación de la órbita a través de los lugares de observación; su horario, su altura y el brillo de los "
               "fragmentos se suponen, cada uno con su razón en el archivo."),
        "it": ("Un cielo di prova per un rientro atmosferico: il lanciatore di Zond 4 che ricade sugli Stati Uniti orientali "
               "il 3 marzo 1968 verso le 21:45 ora dell'Est, visto da Owensboro (Kentucky), uno dei luoghi da cui fu "
               "segnalato. Non è il resoconto di un osservatore: è il rientro come lo stabiliscono le fonti. Centinaia di "
               "persone lo videro; William Hartmann studiò 78 segnalazioni per la commissione Condon e vi trovò una "
               "«formazione», un sigaro con finestre illuminate, un velivolo che passava basso e in silenzio. La traiettoria "
               "segue l'inclinazione dell'orbita attraverso i luoghi di osservazione; orario, altezza e luminosità dei pezzi "
               "sono supposti, ciascuno con la sua ragione nel file."),
    }
    clear = assumed(0, "Seen by hundreds from Alabama to Pennsylvania: no cloud is stated, a clear sky is assumed.")
    recording = {
        "version": 1,
        "id": "sky-test-reentry",
        "description": description,
        "time": {"year": 1968, "month": 3, "day": 3, "hour": 21, "minute": 45, "second": 50},
        "utcOffsetHours": UTC_OFFSET,
        "durationSeconds": DURATION_S,
        "place": [{"lat": lat, "lng": lng, "name": "Owensboro, Kentucky"}],
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudCover": clear, "cloudDarkness": 0, "cloudBaseM": 2000, "lowerCloudCover": 0, "highCloudCover": 0,
            "precipitationType": "none", "precipitationIntensity": 0, "windDirectionDeg": 0, "windSpeed": 0, "storm": False}}]},
        "timeline": {"keyframes": [{"t": 0, "shapes": []}], "order": [], "groups": []},
        "observerTrack": {"keyframes": observer_track},
        "soundTrack": {"keyframes": []},
        "decor": [],
        "interpretation": {
            "title": reentry["title"],
            "bodies": [],
            "reentries": [reentry],
        },
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(recording, out, ensure_ascii=False, indent=2)
        out.write("\n")
    print("wrote", OUT, "nearest Lexington at", nearest, "s;", len(track), "keyframes")


def look(lat, lng, plat, plng, alt_km):
    """Azimuth and elevation of a point `alt_km` up over (plat, plng), from (lat, lng), on a sphere."""
    la1, lo1, la2, lo2 = map(math.radians, (lat, lng, plat, plng))
    d = distance_km((lat, lng), (plat, plng)) / R_KM
    az = math.degrees(math.atan2(math.sin(lo2 - lo1) * math.cos(la2),
                                 math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1))) % 360
    r = R_KM + alt_km
    el = math.degrees(math.atan2(r * math.cos(d) - R_KM, r * math.sin(d)))
    return az, el


if __name__ == "__main__":
    main()
