"""Builds the recorded-fireball test sky: Edinburgh, 27 December 2025 at 03:16 UTC.

The fireball itself is NOT in the file: the scene finds it in the Global Meteor Network's archive
(public/fireballs, see FireballArchive) for the recording's date and draws it where and when it
burned. This file only says where to stand and where to look.

The recording opens at 03:16:31 and lasts 5 s, so the bolide (03:16:31.844, 2.78 s) is seen 0.84 s
in: a test sky shows what it is about at once.

The event: trajectory 20251227031631_xiL2Z, triangulated by 13 stations, from 99.8 km over the
Scottish Borders down to 39 km over the Solway coast in 2.78 s, absolute magnitude -7.45 at its peak
(50 km up). From Edinburgh, 144 km away, about magnitude -6.7, 20 degrees up to the south-south-west.

Writes ../../../public/demo-data/sky-test-fireball.json.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public", "demo-data", "sky-test-fireball.json"))

LAT, LNG = 55.953, -3.189


def assumed(v, rationale):
    return {"value": v, "basis": "assumed", "rationale": rationale}


def main():
    clear = assumed(0, "A test sky: the cameras of 13 stations saw it, so the sky was clear over much of the region; "
                       "the cloud over Edinburgh that night is not known here.")
    recording = {
        "version": 1,
        "id": "sky-test-fireball",
        "description": {
            "en": ("A test sky for a recorded fireball: Edinburgh, 27 December 2025 at 03:16. Nothing in this file "
                   "draws it: the scene finds it in the Global Meteor Network's archive for that night, a bolide "
                   "13 stations triangulated from 100 km over the Scottish Borders down to 39 km over the Solway "
                   "coast in under three seconds, and draws it from here as it burned, about magnitude -6.7, "
                   "twenty degrees up to the south-south-west."),
            "fr": ("Un ciel d'essai pour un bolide enregistré : Édimbourg, 27 décembre 2025 à 3 h 16. Rien dans ce "
                   "fichier ne le dessine : la scène le trouve dans l'archive du Global Meteor Network pour cette "
                   "nuit-là, un bolide que 13 stations ont triangulé de 100 km au-dessus des Borders écossais jusqu'à "
                   "39 km au-dessus de la côte du Solway en moins de trois secondes, et le dessine d'ici tel qu'il a "
                   "brûlé, vers la magnitude -6,7, à vingt degrés de hauteur au sud-sud-ouest."),
            "es": ("Un cielo de prueba para un bólido registrado: Edimburgo, 27 de diciembre de 2025 a las 3:16. Nada "
                   "en este archivo lo dibuja: la escena lo encuentra en el archivo de la Global Meteor Network de esa "
                   "noche, un bólido que 13 estaciones triangularon desde 100 km sobre los Borders escoceses hasta "
                   "39 km sobre la costa del Solway en menos de tres segundos, y lo dibuja desde aquí tal como ardió, "
                   "hacia la magnitud -6,7, a veinte grados de altura al sur-suroeste."),
            "it": ("Un cielo di prova per un bolide registrato: Edimburgo, 27 dicembre 2025 alle 3:16. Niente in questo "
                   "file lo disegna: la scena lo trova nell'archivio della Global Meteor Network di quella notte, un "
                   "bolide che 13 stazioni hanno triangolato da 100 km sopra i Borders scozzesi fino a 39 km sopra la "
                   "costa del Solway in meno di tre secondi, e lo disegna da qui come è bruciato, verso la magnitudine "
                   "-6,7, a venti gradi di altezza a sud-sud-ovest."),
        },
        "time": {"year": 2025, "month": 12, "day": 27, "hour": 3, "minute": 16, "second": 31},
        "utcOffsetHours": 0,
        "durationSeconds": 5,
        "place": [{"lat": LAT, "lng": LNG, "name": "Edinburgh, Scotland"}],
        "weatherTrack": {"keyframes": [{"t": 0, "weather": {
            "cloudCover": clear, "cloudDarkness": 0, "cloudBaseM": 2000, "lowerCloudCover": 0, "highCloudCover": 0,
            "precipitationType": "none", "precipitationIntensity": 0, "windDirectionDeg": 0, "windSpeed": 0, "storm": False}}]},
        "timeline": {"keyframes": [{"t": 0, "shapes": []}], "order": [], "groups": []},
        "observerTrack": {"keyframes": [
            {"t": 0, "pose": {"lat": LAT, "lng": LNG, "elevationM": 50, "headingDeg": 195, "pitchDeg": 18, "fovDeg": 80}},
            {"t": 5000, "pose": {"lat": LAT, "lng": LNG, "elevationM": 50, "headingDeg": 195, "pitchDeg": 18, "fovDeg": 80}},
        ]},
        "soundTrack": {"keyframes": []},
        "decor": [],
    }
    with open(OUT, "w", encoding="utf-8") as out:
        json.dump(recording, out, ensure_ascii=False, indent=2)
        out.write("\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
