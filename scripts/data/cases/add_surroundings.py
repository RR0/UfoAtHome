"""Adds the fetched surroundings of a place (scripts/fetch-surroundings.ts) to published demo recordings, and the surveys they came from to their sources.

    python3 scripts/data/cases/add_surroundings.py <surroundings.json> <kinds, comma separated> <recording.json>...

For the recordings of cases whose own generator is not the one that last wrote them (other tools add their sources and their share image to the file the
generator wrote, and running it again would drop them). Idempotent: what an earlier run added (the objects that carry an `origin`, the IGN survey sources)
is taken out first, so running it again with a newer fetch replaces and does not pile up. What the case states of its own (its woods, its aircraft, its
bridge) is never touched.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from surroundings_common import fetched, survey_sources  # noqa: E402

SURVEY_URLS = {"https://geoservices.ign.fr/lidarhd", "https://geoservices.ign.fr/bdtopo", "https://geoservices.ign.fr/bdortho"}


def main(argv):
    surroundings, kinds, *recordings = argv
    wanted = set(kinds.split(","))
    added = fetched(surroundings, wanted)
    sources = survey_sources(surroundings)
    for path in recordings:
        file = pathlib.Path(path)
        recording = json.loads(file.read_text())
        own = [decor for decor in recording.get("decor", []) if "origin" not in decor]
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
