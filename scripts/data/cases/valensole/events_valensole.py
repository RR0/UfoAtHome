#!/usr/bin/env python3
"""Writes Maurice Masse's events in the Valensole recordings: what he did, instead of his poses. The player works the poses out of them
(src/engine/events/FootExpansion): he looks towards the craft, walks along the vine to where he stopped, and, in the account, follows it with
his eyes as it leaves.

Every figure is the poses' the recordings held (written by hand, and by 7868ec62 for the look that follows the craft), with where it comes
from.

    python3 events_valensole.py ../../../../public/demo-data/observer-valensole.json account
    python3 events_valensole.py ../../../../public/demo-data/observer-valensole-pv-1965-07-02.json pv
"""
import json
import sys

# Where he came out from behind the rabbit hutch, the craft some 90 m south of him.
START = {"lat": 43.845508, "lng": 5.9632}


def wrap(value, basis, rationale):
    return {"value": value, "basis": basis, "rationale": rationale}


def events(variant):
    look = {"type": "event", "eventType": "look", "t": 0, "params": {
        "headingDeg": wrap(180, "assumed", "Towards the craft, which is due south of him the whole time"), "pitchDeg": 2, "fovDeg": 60}}
    if variant == "pv":
        return [look, {"type": "event", "eventType": "walk", "t": 0, "until": 20000, "params": {
            "from": wrap(START, "derived", "Behind the rabbit hutch, the craft some 90 m away"),
            "to": wrap({"lat": 43.84523940495868, "lng": 5.9632}, "stated", "\"Il voit l'engin de 60 m environ\" (PV n° 445): where he stopped"),
        }}]
    return [
        look,
        {"type": "event", "eventType": "walk", "t": 0, "until": 55000, "params": {
            "from": wrap(START, "derived", "Behind the rabbit hutch, the craft some 90 m away"),
            "to": wrap({"lat": 43.844758, "lng": 5.9632}, "stated", "He came along the vine to within 6 m of it, where he was held motionless"),
        }},
        {"type": "event", "eventType": "follow", "t": 250000, "until": 262500, "params": {
            "target": "craft",
            "share": wrap(0.85, "assumed", "He followed it with his eyes; a look trails a moving thing rather than holding it in the middle"),
        }},
    ]


def main(path, variant):
    """Replaces the poses by the events in the file's own text: the rest of it, written by hand, keeps its layout."""
    text = open(path, encoding="utf-8").read()
    key = '"observerTrack":'
    at = text.index(key)
    start = at + len(key)
    while text[start] in " \n":
        start += 1
    _, end = json.JSONDecoder().raw_decode(text, start)
    line_start = text.rindex("\n", 0, at) + 1
    indent = text[line_start:at]
    stated = json.dumps(events(variant), ensure_ascii=False)
    text = text[:line_start] + f'{indent}"events": {stated},\n{indent}"observerTrack": {{"keyframes": []}}' + text[end:]
    json.loads(text)
    open(path, "w", encoding="utf-8").write(text)
    print(f"{path}: {len(events(variant))} events")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "--print":
        print(json.dumps(events(sys.argv[3])))
    else:
        main(sys.argv[1], sys.argv[2])
