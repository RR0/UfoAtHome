"""Writes what a case generator built, without dropping what the rest of the pipeline added to the file it overwrites.

A generator states the account: who, when, where, what was seen. Other tools then add to that file what they alone know, each the last
step of making a recording: the share card photographed from the scene (scripts/share-cards/ShareCards.ts writes `image`), and the
surveys frozen beside it, the relief, the imagery, the map and the surveyed scenery (`snapshots`, see surroundings_common.py and
scripts/snapshot). Run the generator again and those were gone, which is one of the two reasons running one was unsafe (the other being
the format version: see scripts/migrate-recordings.ts).

Both are regenerable, and that is the point of keeping them rather than fetching them again on every build: the zip files they name are
beside the recording and have not changed, and the photograph is already taken (ShareCards' `--link` writes the `image` fields back from
the pictures without photographing). What is carried over here is only the naming of them; when the underlying data must really be
fetched again, the tool that fetches it writes the field itself and this carries the new one over next time.
"""
import json
import pathlib
import subprocess


class RecordingFiles:
    """Writes the recordings of a case, keeping what is not the generator's to state and bringing them to the current format version."""

    #: What other tools add to a recording after its generator wrote it, and what the generator must therefore not take away.
    KEPT = ("image", "snapshots")

    @staticmethod
    def write(path, recording):
        """Writes one recording, carrying over the fields of the file it replaces that a generator does not state."""
        path = pathlib.Path(path)
        if path.exists():
            previous = json.loads(path.read_text())
            kept = {key: previous[key] for key in RecordingFiles.KEPT if key in previous and key not in recording}
            if kept:
                recording = RecordingFiles.merged(recording, kept, list(previous))
        path.write_text(json.dumps(recording, ensure_ascii=False, indent=1) + "\n")
        return path

    @staticmethod
    def merged(recording, kept, order):
        """The recording with the kept fields put back where they stood among the others, so that rewriting a file moves no line of it."""
        out = {}
        for name in order:
            if name in kept:
                out[name] = kept[name]
            elif name in recording:
                out[name] = recording[name]
        for name, value in recording.items():
            if name not in out:
                out[name] = value
        for name, value in kept.items():
            if name not in out:
                out[name] = value
        return out

    @staticmethod
    def migrate(paths):
        """Brings what was written to the current version of the format, which does nothing while a generator states it itself.

        A safety net rather than a step: a generator that states the current version writes files this leaves untouched, and one left
        behind by a change of the format is carried forward instead of taking its case backwards (see scripts/migrate-recordings.ts).
        """
        subprocess.run(["npx", "tsx", "scripts/migrate-recordings.ts", *[str(path) for path in paths]], check=True)
