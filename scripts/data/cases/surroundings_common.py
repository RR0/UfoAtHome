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


def write_like(file, data, text):
    """Writes a recording in the shape its generator gave it (compact or indented), so that a change shows as the change it is."""
    compact = '"version":' in text[:60] and '"version": ' not in text[:60]
    indent = 2 if text.startswith('{\n  "') else 1
    file.write_text(json.dumps(data, ensure_ascii=False, indent=indent, separators=(",", ":") if compact else None) + ("\n" if text.endswith("\n") else ""))


def annex_surveyed(path, surroundings):
    """Moves what a survey gave a recording's scenery (the objects with an `origin`) into its annex `<base>.decor.json`, named by
    `frozen.decor`, where the players put it back as they load the recording (see RecordingSections in FrozenData.ts). What the case states
    of its own stays in the recording. Idempotent: an annex already there is put back first (unless the recording was just given surveyed objects, which replace it), so
    running it again rewrites the same files.

    `surroundings` is the fetch (scripts/fetch-surroundings.ts) the objects came from: the day it was taken, and whom from."""
    file = pathlib.Path(path)
    text = file.read_text()
    recording = json.loads(text)
    frozen = recording.get("frozen") or {}
    group = frozen.get("decor") or {}
    annex_name = group.get("src") or file.name[:-len(".json")] + ".decor.json"
    annex_file = file.with_name(annex_name)
    # A recording that holds surveyed objects of its own was just given them (by its generator, or add_surroundings.py): they are the newer.
    if group.get("src") and annex_file.exists() and not any("origin" in one for one in recording.get("decor", [])):
        held = json.loads(annex_file.read_text()).get("decor", [])
        recording["decor"] = [decor for decor in recording.get("decor", []) if "origin" not in decor] + held
    decor = recording.get("decor", [])
    surveyed = [one for one in decor if "origin" in one]
    if not surveyed:
        return 0
    found = json.loads(pathlib.Path(surroundings).read_text())
    stated = [one for one in decor if "origin" not in one]
    if stated:
        recording["decor"] = stated
    else:
        recording.pop("decor", None)
    group = {**group, "src": annex_name, "takenOn": found["fetchedOn"], "attribution": found["provider"]["attribution"]}
    group.pop("live", None)
    recording["frozen"] = {**frozen, "decor": group}
    annex = {"version": recording.get("version", 1), "takenOn": group["takenOn"], "attribution": group["attribution"], "decor": surveyed}
    annex_file.write_text(json.dumps(annex, ensure_ascii=False, separators=(",", ":")) + "\n")
    write_like(file, recording, text)
    return len(surveyed)
