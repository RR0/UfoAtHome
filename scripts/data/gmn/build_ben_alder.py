"""Builds the Ben Alder fireball test sky: the meteorite fall over the Scottish Highlands, 3 July 2025,
00:15:51 UTC (01:15 local), as seen from Inverness.

Sources:
- The Global Meteor Network's trajectory 20250703001551_seJus (traj_summary_all.txt, CC BY 4.0), three
  stations: from 56.840864 N 4.518666 W at 82.1 km to 56.902783 N 4.309594 W at 63.5 km, in 1.65 s.
  It is the part of the flight those cameras resolved, and it runs west to east over Ben Alder.
- The UK Fireball Alliance (https://ukfall.org.uk/2025-scottish-highlands/ and the University of
  Glasgow's appeal of September 2025): early on 3 July 2025 a fireball that "quickly went viral",
  reconstructed from 14 cameras (GMN, UKMON, Global Fireball Observatory) and public videos; small
  fragments dropped to the west over Stob Coire Easain and Chno Dearg, chunks up to 10 kg over Ben
  Alder. Which is the same west-to-east direction as the GMN trajectory.

Not published, so ASSUMED, each with its reason in the file: the brightness (GMN's own peak, -0.14, is
a saturated camera's, as for every bolide that bright in its automatic summary), the tail, and the
clear sky. The visible flight began higher and ended lower than the segment GMN resolved; neither end
is published, so only the measured segment is drawn.

Writes ../../../public/demo-data/sky-test-ben-alder.json.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "demo-data", "sky-test-ben-alder.json"))

LAT, LNG = 57.4778, -4.2247  # Inverness
GMN = "Global Meteor Network trajectory 20250703001551_seJus (3 stations), CC BY 4.0"
# Recording starts at 00:15:30 UTC; the trajectory begins at 00:15:51.031.
START_S = 30
BEGIN_MS = (51.031 - START_S) * 1000
DURATION_MS = 1650


def derived(v, rationale):
    return {"value": v, "basis": "derived", "rationale": rationale}


def assumed(v, rationale):
    return {"value": v, "basis": "assumed", "rationale": rationale}


def main():
    begin, end = round(BEGIN_MS), round(BEGIN_MS + DURATION_MS)
    track = [
        {"t": begin, "lat": derived(56.840864, GMN), "lng": derived(-4.518666, GMN), "altitudeKm": derived(82.1, GMN)},
        {"t": end, "lat": derived(56.902783, GMN), "lng": derived(-4.309594, GMN), "altitudeKm": derived(63.5, GMN)},
    ]
    brightness = ("Not published. GMN's automatic summary gives -0.14, a saturated camera's value like every bolide that "
                  "bright in it; a fireball that dropped meteorites of up to 10 kg is among the brightest any network "
                  "records, so -10 is assumed, which from Inverness, 100 km off, is about -10 too.")
    title = {"en": "The Ben Alder fireball", "fr": "Le bolide du Ben Alder", "es": "El bólido del Ben Alder", "it": "Il bolide del Ben Alder"}
    fireball = {
        "id": "ben-alder",
        "title": title,
        "track": track,
        "fragments": [{
            "id": "meteoroid",
            "absoluteMagnitude": assumed(-10, brightness),
            "color": assumed("#eef2ff", "Not published: the bluish white of most fireballs."),
            "trainS": assumed(0.5, "Not published: a short glowing tail."),
        }],
    }
    clear = assumed(0, "It was filmed from across the Highlands: a clear sky over Inverness is assumed.")
    recording = {
        "version": 1,
        "id": "sky-test-ben-alder",
        "description": {
            "en": ("A test sky for a famous fireball: the meteorite fall of 3 July 2025 over the Scottish Highlands, at 01:15 "
                   "local time, seen from Inverness in the half-light of a Scottish summer night. Not an observer's account: "
                   "the fireball as the sources establish it. Its path is the Global Meteor Network's measured segment, from "
                   "82 km down to 63 km over Ben Alder in 1.65 s, west to east, where the UK Fireball Alliance places the "
                   "meteorites; its brightness was not published and is assumed, with its reason in the file."),
            "fr": ("Un ciel d'essai pour un bolide célèbre : la chute de météorites du 3 juillet 2025 sur les Highlands "
                   "écossais, à 1 h 15 heure locale, vue d'Inverness dans la pénombre d'une nuit d'été écossaise. Ce n'est pas "
                   "le compte rendu d'un observateur : c'est le bolide tel que les sources l'établissent. Son chemin est le "
                   "segment mesuré par le Global Meteor Network, de 82 à 63 km au-dessus du Ben Alder en 1,65 s, d'ouest en "
                   "est, là où l'UK Fireball Alliance situe les météorites ; son éclat n'a pas été publié et il est supposé, "
                   "avec sa raison dans le fichier."),
            "es": ("Un cielo de prueba para un bólido famoso: la caída de meteoritos del 3 de julio de 2025 sobre las Highlands "
                   "escocesas, a la 1:15 hora local, vista desde Inverness en la penumbra de una noche de verano escocesa. No es "
                   "el relato de un observador: es el bólido tal como lo establecen las fuentes. Su camino es el segmento "
                   "medido por la Global Meteor Network, de 82 a 63 km sobre el Ben Alder en 1,65 s, de oeste a este, donde la "
                   "UK Fireball Alliance sitúa los meteoritos; su brillo no se publicó y se supone, con su razón en el archivo."),
            "it": ("Un cielo di prova per un bolide celebre: la caduta di meteoriti del 3 luglio 2025 sulle Highlands scozzesi, "
                   "alle 1:15 ora locale, vista da Inverness nella penombra di una notte d'estate scozzese. Non è il resoconto "
                   "di un osservatore: è il bolide come lo stabiliscono le fonti. Il suo percorso è il segmento misurato dalla "
                   "Global Meteor Network, da 82 a 63 km sopra il Ben Alder in 1,65 s, da ovest a est, dove la UK Fireball "
                   "Alliance colloca le meteoriti; la sua luminosità non è stata pubblicata ed è supposta, con la sua ragione nel file."),
        },
        "time": {"year": 2025, "month": 7, "day": 3, "hour": 1, "minute": 15, "second": START_S},
        "utcOffsetHours": 1,
        "durationSeconds": 50,
        "place": [{"lat": LAT, "lng": LNG, "name": "Inverness, Scotland"}],
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudCover": clear, "cloudDarkness": 0, "cloudBaseM": 2000, "lowerCloudCover": 0, "highCloudCover": 0,
            "precipitationType": "none", "precipitationIntensity": 0, "windDirectionDeg": 0, "windSpeed": 0, "storm": False}}]},
        "timeline": {"keyframes": [{"t": 0, "shapes": []}], "order": [], "groups": []},
        "observerTrack": {"keyframes": [
            {"t": 0, "pose": {"lat": LAT, "lng": LNG, "elevationM": 20, "headingDeg": 189, "pitchDeg": 40, "fovDeg": 75}},
            {"t": 50000, "pose": {"lat": LAT, "lng": LNG, "elevationM": 20, "headingDeg": 189, "pitchDeg": 40, "fovDeg": 75}},
        ]},
        "soundTrack": {"keyframes": []},
        "decor": [],
        "interpretation": {"title": title, "bodies": [], "reentries": [fireball]},
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(recording, out, ensure_ascii=False, indent=2)
        out.write("\n")
    print("wrote", OUT, begin, end)


if __name__ == "__main__":
    main()
