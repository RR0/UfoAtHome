"""Adds the fetched surroundings of a place (scripts/fetch-surroundings.ts) to published demo recordings, and the surveys they came from to their sources.

    python3 scripts/data/cases/add_surroundings.py <surroundings.json> <kinds, comma separated> [--site <id prefix> <titles as JSON> [--whole-site]]
        [--occludes <eastM>,<northM> <source ids>]... <recording.json>...

With `--site`, the case's own buildings whose id starts with the prefix (the buildings of a site the account is about, drawn from OpenStreetMap with assumed
heights) are replaced by the fetched buildings that stand on them, which take the site's name (`titles`, one per language, numbered "(2)", "(3)"...). A
building of the site that no fetched one stands on is kept, unless `--whole-site` says the survey is the whole of it (the case's own were drawn with
assumed heights).

With `--occludes <eastM>,<northM> <source ids>` (as many as needed), the fetched object nearest that point (not a tree) hides those shapes of the
account from the observer, as the case's own object it replaces did: the bridge the witness drove under, which the account says hid the lights.

For the recordings of cases whose own generator is not the one that last wrote them (other tools add their sources and their share image to the file the
generator wrote, and running it again would drop them). Idempotent: what an earlier run added (the objects that carry an `origin`, the IGN survey sources)
is taken out first, so running it again with a newer fetch replaces and does not pile up. What the case states of its own (its woods, its aircraft, its
bridge) is never touched.
"""
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from surroundings_common import fetched, survey_sources  # noqa: E402

SURVEY_URLS = {"https://geoservices.ign.fr/lidarhd", "https://geoservices.ign.fr/bdtopo", "https://geoservices.ign.fr/bdortho"}


def stands_on(building, site):
    """Whether the middle of a fetched building is within the rectangle of one of the case's own, a few metres larger."""
    import math
    heading = math.radians(site.get("headingDeg", 0))
    dx, dy = building["eastM"] - site["eastM"], building["northM"] - site["northM"]
    # The size is stated across (width) and along (length) the heading: the along axis is the heading's own direction.
    along = dx * math.sin(heading) + dy * math.cos(heading)
    across = dx * math.cos(heading) - dy * math.sin(heading)
    return abs(across) <= site["sizeM"]["widthM"] / 2 + 5 and abs(along) <= site["sizeM"]["lengthM"] / 2 + 5


def named(titles, number):
    return {language: title + (f" ({number})" if number > 1 else "") for language, title in titles.items()}


def main(argv):
    site = None
    if "--site" in argv:
        at = argv.index("--site")
        site = (argv[at + 1], json.loads(argv[at + 2]))
        argv = argv[:at] + argv[at + 3:]
    whole_site = "--whole-site" in argv
    if whole_site:
        argv = [arg for arg in argv if arg != "--whole-site"]
    occludes = []
    while "--occludes" in argv:
        at = argv.index("--occludes")
        east, north = (float(value) for value in argv[at + 1].split(","))
        occludes.append((east, north, argv[at + 2].split(",")))
        argv = argv[:at] + argv[at + 3:]
    surroundings, kinds, *recordings = argv
    wanted = set(kinds.split(","))
    sources = survey_sources(surroundings)
    for path in recordings:
        file = pathlib.Path(path)
        recording = json.loads(file.read_text())
        own = [decor for decor in recording.get("decor", []) if "origin" not in decor]
        added = fetched(surroundings, wanted)
        # What the case draws itself is not drawn twice: the fetched bridge that is the case's own is dropped.
        own_bridges = [decor for decor in own if decor["kind"] == "bridge"]
        added = [decor for decor in added if decor["kind"] != "bridge" or not any(
            abs(decor["eastM"] - bridge["eastM"]) < 80 and abs(decor["northM"] - bridge["northM"]) < 80 for bridge in own_bridges)]
        if site:
            prefix, titles = site
            sites = [decor for decor in own if decor["id"].startswith(prefix) and decor["kind"] == "building"]
            on_site = 0
            replaced = set()
            for building in added:
                if building["kind"] == "building" and any(stands_on(building, one) for one in sites):
                    on_site += 1
                    building["title"] = named(titles, on_site)
                    replaced.update(one["id"] for one in sites if stands_on(building, one))
            own = [decor for decor in own if decor["id"] not in replaced and not (whole_site and decor in sites)]
        for east, north, ids in occludes:
            nearest = min((decor for decor in added if decor["kind"] != "tree"),
                          key=lambda decor: math.hypot(decor["eastM"] - east, decor["northM"] - north))
            nearest["occludesSourceIds"] = ids
        recording["decor"] = own + added
        recording["sources"] = [source for source in recording.get("sources", []) if source.get("url") not in SURVEY_URLS] + sources
        text = file.read_text()
        # The file keeps the shape its generator gave it, so that the change shows as the change it is.
        compact = '"version":1' in text[:60]
        indent = 2 if text.startswith('{\n  "') else 1
        file.write_text(json.dumps(recording, ensure_ascii=False, indent=indent, separators=(",", ":") if compact else None) + ("\n" if text.endswith("\n") else ""))
        print(f"{path}: {len(own)} of its own + {len(added)} fetched")


if __name__ == "__main__":
    main(sys.argv[1:])
