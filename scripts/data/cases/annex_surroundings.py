"""Moves the surveyed scenery of demo recordings (the decor objects with an `origin`) into an annex beside each, `<base>.decor.json`, which
`frozen.decor` names: the survey of a place is not the account, and is frozen as the roads and the relief are (see FrozenData.decor).

    python3 scripts/data/cases/annex_surroundings.py <surroundings.json> <recording.json>...

`surroundings.json` is the fetch the objects came from (scripts/fetch-surroundings.ts), which says the day and the attribution. Idempotent.
The generators that write a recording's decor (build_saint_lo.py, build_silly.py, add_surroundings.py) call it as they write.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from surroundings_common import annex_surveyed  # noqa: E402


def main(argv):
    surroundings, *recordings = argv
    for path in recordings:
        print(f"{path}: {annex_surveyed(path, surroundings)} surveyed objects in its annex")


if __name__ == "__main__":
    main(sys.argv[1:])
