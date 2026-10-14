"""What the demo recordings of French cases take from scripts/fetch-surroundings.ts: the fetched decor, in the languages of a recording, and the
surveys it came from as sources, with the days the services say they were flown or drawn.

The fetched scenery is of those days and not of the case's: the editor warns where a day is after the observation, so a recording that carries
it says so on its own (see DecorObject.surveyedOn).
"""
import json
import pathlib

GENERIC = {
    "Tree": {"fr": "Arbre", "en": "Tree", "es": "Árbol", "it": "Albero"},
    "Building": {"fr": "Bâtiment", "en": "Building", "es": "Edificio", "it": "Edificio"},
    "Silo": {"fr": "Silo", "en": "Silo", "es": "Silo", "it": "Silo"},
    "Bridge": {"fr": "Pont", "en": "Bridge", "es": "Puente", "it": "Ponte"},
    "Overhead line": {"fr": "Ligne électrique", "en": "Overhead line", "es": "Línea eléctrica", "it": "Linea elettrica"},
}


def titled(title):
    """A generic name ("Tree 12", "Bridge (Rue de Carentan)") in the four languages; a name the survey gave ("Mairie de Saint-Lô") as it is."""
    for english, names in GENERIC.items():
        if title == english or title.startswith(english + " "):
            suffix = title[len(english):]
            return {language: name + suffix for language, name in names.items()}
    return title


def fetched(path, kinds=None, prefix=""):
    """The decor the survey of a place gave, as a recording states it; only these kinds where `kinds` says (the others are the case's own)."""
    found = json.loads(pathlib.Path(path).read_text())
    out = []
    for decor in found["decor"]:
        if kinds is not None and decor["kind"] not in kinds:
            continue
        decor = dict(decor)
        decor["id"] = prefix + decor["id"]
        decor["title"] = titled(decor["title"])
        out.append(decor)
    return out


def survey_sources(path):
    """The surveys as sources, each with the day the service says it was flown or drawn."""
    found = json.loads(pathlib.Path(path).read_text())
    dates = found.get("dates", {})
    fetched_on = found["fetchedOn"]
    unknown = "on a day the service does not give"
    return [
        {"title": "LiDAR HD, canopy height model and classification (the trees, the heights and the roofs of what stands round the spot), flown " + dates.get("laser", unknown),
         "url": "https://geoservices.ign.fr/lidarhd", "publication": {"publisher": "IGN", "time": dates.get("laser", fetched_on)}},
        {"title": "BD TOPO (the buildings with their heights and materials, the bridges and the lines round the spot), edited " + dates.get("map", unknown),
         "url": "https://geoservices.ign.fr/bdtopo", "publication": {"publisher": "IGN", "time": dates.get("map", fetched_on)}},
        {"title": "Aerial photograph of the IGN (the colour of the roofs), flown " + dates.get("photo", unknown),
         "url": "https://geoservices.ign.fr/bdortho", "publication": {"publisher": "IGN", "time": dates.get("photo", fetched_on)}},
    ]
