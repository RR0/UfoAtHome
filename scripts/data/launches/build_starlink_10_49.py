"""Builds the "space jellyfish" test sky: the exhaust of Starlink Group 10-49 (Falcon 9, 25 August 2026,
05:33 EDT, Cape Canaveral) as seen from Hoboken, New Jersey, in the twilight before sunrise.

Sources:
- AccuWeather, "Watch: SpaceX rocket creates dazzling 'jellyfish' cloud over East Coast" (26 August 2026):
  launch at 5:33 a.m. ET from Cape Canaveral Space Force Station, 29 Starlink satellites, first stage's 37th
  flight; seen from New York, Georgia, Washington and Philadelphia; the effect "is produced when sunlight
  strikes the rocket's exhaust plume in the pre-dawn sky".
  https://www.accuweather.com/en/space-news/watch-spacex-rocket-creates-dazzling-jellyfish-cloud-over-east-coast/1927108
- Space.com, "SpaceX's final Falcon 9 Starlink launch from Florida creates gorgeous 'jellyfish' over New York
  City (video)", 25 August 2026, and its video (Getty Images photographs of the plume over the Manhattan
  skyline, from the New Jersey shore).

The path is ASSUMED: neither source gives the stage's track. It starts from Launch Complex 40 along a
great circle at an azimuth of 47 degrees ("northeast along the East Coast"), with the downrange distance and
height a Falcon 9 second stage typically has by the second of its flight (a table below). The Sun, the
Earth's shadow, the plume's spreading and the scattering are computed by the engine, not stated.

Writes ../../../public/demo-data/sky-test-launch-plume.json.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "demo-data", "sky-test-launch-plume.json"))

R_KM = 6371.0
PAD = (28.5618, -80.5772)  # Space Launch Complex 40
AZIMUTH_DEG = 47.0
LIFTOFF_UTC = (2026, 8, 25, 9, 33, 0)  # 05:33 EDT
UTC_OFFSET = -4
OBSERVER = (40.7440, -74.0324)  # Hoboken, NJ
OBSERVER_ELEVATION_M = 5
# The recording starts six minutes after liftoff, when the second stage, climbing through 150 km, is high
# enough for the Sun to reach its exhaust over the Atlantic, and lasts three minutes: until the stage is
# over the Atlantic east of Virginia and its engine is about to stop.
START_AFTER_LIFTOFF_S = 360
DURATION_S = 180

# Seconds after liftoff, kilometres downrange, kilometres up: a typical Starlink ascent.
ASCENT = [
    (0, 0, 0), (30, 0.5, 3), (60, 5, 11), (90, 18, 27), (120, 42, 47), (155, 78, 68), (180, 110, 82),
    (240, 270, 112), (300, 470, 134), (360, 725, 154), (420, 1010, 169), (480, 1320, 180), (510, 1480, 185),
]
SECOND_STAGE_FROM_S = 155  # first stage's engines stop about T+2:35; the second stage lights
SECOND_STAGE_UNTIL_S = 510

ASCENT_RATIONALE = ("Neither source gives the stage's track: it is assumed to follow a great circle from Launch Complex 40 at "
                    "47 degrees ('northeast along the East Coast'), with the downrange distance and height a Falcon 9 second "
                    "stage typically has at that second after liftoff.")


def assumed(v, rationale):
    return {"value": v, "basis": "assumed", "rationale": rationale}


def stated(v, rationale):
    return {"value": v, "basis": "stated", "rationale": rationale}


def interpolate(s):
    for (t0, d0, h0), (t1, d1, h1) in zip(ASCENT, ASCENT[1:]):
        if t0 <= s <= t1:
            f = (s - t0) / (t1 - t0)
            return d0 + (d1 - d0) * f, h0 + (h1 - h0) * f
    raise ValueError(s)


def destination(point, azimuth_deg, distance_km):
    lat1, lon1, brg = map(math.radians, (point[0], point[1], azimuth_deg))
    d = distance_km / R_KM
    lat2 = math.asin(math.sin(lat1) * math.cos(d) + math.cos(lat1) * math.sin(d) * math.cos(brg))
    lon2 = lon1 + math.atan2(math.sin(brg) * math.sin(d) * math.cos(lat1), math.cos(d) - math.sin(lat1) * math.sin(lat2))
    return math.degrees(lat2), (math.degrees(lon2) + 540) % 360 - 180


def distance_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    c = math.sin(la1) * math.sin(la2) + math.cos(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    return R_KM * math.acos(max(-1.0, min(1.0, c)))


def look(lat, lng, plat, plng, alt_km):
    """Azimuth and elevation of a point `alt_km` up over (plat, plng), from (lat, lng), on a sphere."""
    la1, lo1, la2, lo2 = map(math.radians, (lat, lng, plat, plng))
    d = distance_km((lat, lng), (plat, plng)) / R_KM
    az = math.degrees(math.atan2(math.sin(lo2 - lo1) * math.cos(la2),
                                 math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1))) % 360
    r = R_KM + alt_km
    el = math.degrees(math.atan2(r * math.cos(d) - R_KM, r * math.sin(d)))
    return az, el


def main():
    track = []
    for s, downrange, height in ASCENT:
        lat, lng = destination(PAD, AZIMUTH_DEG, downrange)
        track.append({
            "t": (s - START_AFTER_LIFTOFF_S) * 1000,
            "lat": assumed(round(lat, 4), ASCENT_RATIONALE),
            "lng": assumed(round(lng, 4), ASCENT_RATIONALE),
            "altitudeKm": assumed(float(height), ASCENT_RATIONALE),
        })
    burn_from = (SECOND_STAGE_FROM_S - START_AFTER_LIFTOFF_S) * 1000
    burn_until = (SECOND_STAGE_UNTIL_S - START_AFTER_LIFTOFF_S) * 1000
    burn = ("The first stage's engines stop at about T+2:35, when the second stage's single vacuum engine lights, and it burns "
            "until orbit insertion at about T+8:30: typical of a Starlink mission, not stated by the sources. The first stage's own "
            "exhaust, low in the air, is in the Earth's shadow at this hour and is left out.")
    launch = {
        "id": "starlink-10-49",
        "title": {"en": "Exhaust plume of Starlink Group 10-49", "fr": "Panache d'échappement de Starlink Groupe 10-49",
                  "es": "Estela de escape de Starlink Grupo 10-49", "it": "Scia di scarico di Starlink Gruppo 10-49"},
        "vehicle": {"name": "Falcon 9", "mission": "Starlink Group 10-49",
                    "engine": {"thrustKN": stated(934, "SpaceX: a Merlin Vacuum's thrust in vacuum, 934 kN (the Falcon 9 second stage has one)."),
                               "specificImpulseS": stated(348, "SpaceX: a Merlin Vacuum's specific impulse in vacuum, 348 s."),
                               "propellant": stated("rp1-lox", "The Falcon 9 burns RP-1 kerosene and liquid oxygen.")}},
        "track": track,
        "burnFromT": assumed(burn_from, burn),
        "burnUntilT": assumed(burn_until, burn),
    }

    lat, lng = OBSERVER
    observer_track = []
    for s in range(0, DURATION_S + 1, 10):
        t = s * 1000
        after = START_AFTER_LIFTOFF_S + s
        downrange, height = interpolate(min(after, 510))
        plat, plng = destination(PAD, AZIMUTH_DEG, downrange)
        # The view follows the stage along the sky, slightly ahead so the plume it has left fills the frame behind it.
        az, el = look(lat, lng, plat, plng, height)
        observer_track.append({"t": t, "pose": {"lat": lat, "lng": lng, "elevationM": OBSERVER_ELEVATION_M,
                                                "headingDeg": round(az - 12, 1), "pitchDeg": round(max(5.0, el - 3), 1), "fovDeg": 70}})

    description = {
        "en": ("A test sky for a rocket plume: the 'space jellyfish' that Starlink Group 10-49, a Falcon 9 launched from Cape "
               "Canaveral at 05:33 EDT on 25 August 2026, left over the East Coast in the twilight before sunrise, seen from "
               "Hoboken, New Jersey, across the river from Manhattan. Not an observer's account: the plume as physics makes it. "
               "The Sun is below the horizon for the ground but not for the exhaust 100 to 200 km up, which scatters its light "
               "and spreads as it ages into the bell and trails people took for something else. The stage's path is assumed "
               "(typical of a Starlink ascent); the shadow of the Earth, the spreading and the light are computed."),
        "fr": ("Un ciel d'essai pour un panache de fusée : la « méduse spatiale » que Starlink Groupe 10-49, un Falcon 9 lancé "
               "de Cap Canaveral à 5 h 33 (heure d'été de l'Est) le 25 août 2026, a laissée sur la côte Est dans le crépuscule "
               "avant le lever du Soleil, vue de Hoboken (New Jersey), en face de Manhattan. Ce n'est pas le compte rendu d'un "
               "observateur : c'est le panache tel que la physique le fait. Le Soleil est sous l'horizon pour le sol mais pas "
               "pour l'échappement, 100 à 200 km plus haut, qui diffuse sa lumière et s'étale en vieillissant en la cloche et "
               "les traînées que l'on a prises pour autre chose. Le chemin de l'étage est supposé (typique d'une ascension de "
               "Starlink) ; l'ombre de la Terre, l'étalement et la lumière sont calculés."),
        "es": ("Un cielo de prueba para una estela de cohete: la «medusa espacial» que Starlink Grupo 10-49, un Falcon 9 "
               "lanzado desde Cabo Cañaveral a las 05:33 EDT del 25 de agosto de 2026, dejó sobre la costa Este en el "
               "crepúsculo previo al amanecer, vista desde Hoboken (Nueva Jersey), frente a Manhattan. No es el relato de un "
               "observador: es la estela tal como la hace la física. El Sol está bajo el horizonte para el suelo pero no para "
               "el escape, 100 a 200 km más arriba, que difunde su luz y se extiende al envejecer en la campana y las estelas "
               "que se tomaron por otra cosa. La trayectoria de la etapa se supone (típica de un ascenso de Starlink); la "
               "sombra de la Tierra, la expansión y la luz se calculan."),
        "it": ("Un cielo di prova per una scia di razzo: la «medusa spaziale» che Starlink Gruppo 10-49, un Falcon 9 lanciato "
               "da Cape Canaveral alle 05:33 EDT del 25 agosto 2026, lasciò sulla costa orientale nel crepuscolo prima "
               "dell'alba, vista da Hoboken (New Jersey), di fronte a Manhattan. Non è il resoconto di un osservatore: è la "
               "scia come la fa la fisica. Il Sole è sotto l'orizzonte per il suolo ma non per lo scarico, 100-200 km più in "
               "alto, che diffonde la sua luce e invecchiando si allarga nella campana e nelle scie che furono scambiate per "
               "altro. La traiettoria dello stadio è supposta (tipica di un'ascesa di Starlink); l'ombra della Terra, "
               "l'espansione e la luce sono calcolate."),
    }
    clear = assumed(0, "The photographs of the launch from New York, Philadelphia and Washington show a clear dawn sky: no cloud is stated, a clear sky is assumed.")
    liftoff = LIFTOFF_UTC
    start_total = liftoff[3] * 3600 + liftoff[4] * 60 + liftoff[5] + START_AFTER_LIFTOFF_S + UTC_OFFSET * 3600
    recording = {
        "version": 1,
        "id": "sky-test-launch-plume",
        "tags": ["rocket launch", "space jellyfish", "twilight phenomenon", "Falcon 9", "Starlink"],
        "description": description,
        "time": {"year": 2026, "month": 8, "day": 25, "hour": start_total // 3600, "minute": (start_total % 3600) // 60, "second": start_total % 60},
        "utcOffsetHours": UTC_OFFSET,
        "durationSeconds": DURATION_S,
        "place": [{"lat": lat, "lng": lng, "name": "Hoboken, New Jersey"}],
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudCover": clear, "cloudDarkness": 0, "cloudBaseM": 2000, "lowerCloudCover": 0, "highCloudCover": 0,
            "precipitationType": "none", "precipitationIntensity": 0, "windDirectionDeg": 0, "windSpeed": 0, "storm": False}}]},
        "timeline": {"keyframes": [{"t": 0, "shapes": []}], "order": [], "groups": []},
        "observerTrack": {"keyframes": observer_track},
        "soundTrack": {"keyframes": []},
        "decor": [],
        "interpretation": {
            "title": launch["title"],
            "bodies": [],
            "launches": [launch],
        },
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(recording, out, ensure_ascii=False, indent=2)
        out.write("\n")
    print("wrote", OUT, len(track), "keyframes; starts", recording["time"])


if __name__ == "__main__":
    main()
