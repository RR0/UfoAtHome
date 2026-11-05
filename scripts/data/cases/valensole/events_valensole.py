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


def craft_events(variant):
    """The craft leaving, as Masse told it, from where it stood (and, in the statement to the gendarmes, its passenger going with it)."""
    if variant == "pv":
        return [
            {"type": "event", "eventType": "spin", "who": "craft", "t": 61000, "until": 63800, "params": {
                "motion": "legs-turn", "turnsPerS": wrap(0.5, "assumed", "The six legs turned as it left (PV n° 445); how fast, nobody said")}},
            {"type": "event", "eventType": "rise", "who": "craft", "t": 61000, "until": 63800, "params": {
                "distanceM": 11.77, "angleDeg": wrap(53.6, "stated", "\"L'engin part en oblique\" (PV n° 445); how steep, from where it was lost"),
                "headingDeg": 251.6, "stops": False}},
            {"type": "event", "eventType": "vanish", "who": "craft", "t": 64000},
            {"type": "event", "eventType": "ride", "who": "passager", "t": 0, "until": 64000, "params": {"in": "craft", "aboveM": 1.68}},
        ]
    return [
        {"type": "event", "eventType": "motion", "who": "craft", "t": 246000, "until": 248000, "params": {
            "motion": "pivot-retract", "to": wrap(1, "stated", "\"Le tube central rentre dans l'engin\" (account of 18 August 1965)")}},
        {"type": "event", "eventType": "spin", "who": "craft", "t": 248000, "until": 262000, "params": {
            "motion": "legs-turn", "turnsPerS": wrap(0.5, "assumed", "\"Ses 6 pieds se mettent à tourner\"; how fast, nobody said")}},
        {"type": "event", "eventType": "rise", "who": "craft", "t": 250000, "until": 254000, "params": {
            "distanceM": 0.79, "angleDeg": wrap(0, "stated", "\"Il s'élève\": straight up, before it goes off at a slant"), "stops": True}},
        {"type": "event", "eventType": "rise", "who": "craft", "t": 256000, "until": 262000, "params": {
            "distanceM": 37.89, "angleDeg": wrap(51, "stated", "\"Il part en oblique\"; how steep, from where he followed it to"), "headingDeg": 267.6, "stops": False}},
        {"type": "event", "eventType": "vanish", "who": "craft", "t": 262500},
    ]


def being_events(variant):
    """The two beings of the account of 18 August: crouched by the craft, then standing (the second turning round), until they go back in."""
    if variant == "pv":
        return []
    stood = wrap(0, "stated", "\"Ils étaient accroupis\", then stood up as he came near (account of 18 August 1965); when, from his account's order")
    return [
        {"type": "event", "eventType": "motion", "who": "etre-1", "t": 46000, "until": 48000, "params": {"motion": "crouch", "to": stood}},
        {"type": "event", "eventType": "motion", "who": "etre-2", "t": 46000, "until": 48000, "params": {"motion": "crouch", "to": stood}},
        {"type": "event", "eventType": "turn", "who": "etre-2", "t": 48000, "until": 50000, "params": {
            "headingDeg": wrap(0, "assumed", "Turned towards him, as the other was")}},
        {"type": "event", "eventType": "vanish", "who": "etre-1", "t": 60000},
        {"type": "event", "eventType": "vanish", "who": "etre-2", "t": 60000},
    ]


# What a being is to begin with, crouched: its standing size (the model crouches by its own movement, see build_people.py's postures).
BEING_START = {"sizeM": {"widthM": 0.34, "lengthM": 0.27, "heightM": 0.95}, "motions": {"crouch": 1}}


def events(variant, observer="MasseMaurice"):
    """`observer`: his id in the recording, whom his events are about."""
    look = {"type": "event", "eventType": "look", "who": observer, "t": 0, "params": {
        "headingDeg": wrap(180, "assumed", "Towards the craft, which is due south of him the whole time"), "pitchDeg": 2, "fovDeg": 60}}
    if variant == "pv":
        return [look, *craft_events(variant), {"type": "event", "eventType": "walk", "who": observer, "t": 0, "until": 20000, "params": {
            "from": wrap(START, "derived", "Behind the rabbit hutch, the craft some 90 m away"),
            "to": wrap({"lat": 43.84523940495868, "lng": 5.9632}, "stated", "\"Il voit l'engin de 60 m environ\" (PV n° 445): where he stopped"),
        }}]
    return [
        look,
        *craft_events(variant),
        *being_events(variant),
        {"type": "event", "eventType": "walk", "who": observer, "t": 0, "until": 55000, "params": {
            "from": wrap(START, "derived", "Behind the rabbit hutch, the craft some 90 m away"),
            "to": wrap({"lat": 43.844758, "lng": 5.9632}, "stated", "He came along the vine to within 6 m of it, where he was held motionless"),
        }},
        {"type": "event", "eventType": "follow", "who": observer, "t": 250000, "until": 262500, "params": {
            "target": wrap("craft", "stated", "He followed it with his eyes as it left (account of 18 August 1965)"),
        }},
    ]


def main(path, variant):
    """Replaces the poses by the events in the file's own text: the rest of it, written by hand, keeps its layout."""
    text = open(path, encoding="utf-8").read()
    observer = json.loads(text)["observer"]["id"]
    # Version 3 of the format: every event says whom it is about.
    text = text.replace('"version": 2,', '"version": 3,', 1)
    # Run again on a recording already stated as events: its events line goes, and is written again.
    text = "".join(line for line in text.splitlines(keepends=True) if not line.lstrip().startswith('"events": ['))
    key = '"observerTrack":'
    at = text.index(key)
    start = at + len(key)
    while text[start] in " \n":
        start += 1
    _, end = json.JSONDecoder().raw_decode(text, start)
    line_start = text.rindex("\n", 0, at) + 1
    indent = text[line_start:at]
    stated = json.dumps(events(variant, observer), ensure_ascii=False)
    text = text[:line_start] + f'{indent}"events": {stated},\n{indent}"observerTrack": {{"keyframes": []}}' + text[end:]
    # The bodies the events move keep only what they state before them: where they stand, their size, how they look.
    recording = json.loads(text)
    stated_events = events(variant, observer)
    moved = {event["who"]: min(e["t"] for e in stated_events if e.get("who") == event["who"]) for event in stated_events if event.get("who") != observer}
    key = '"interpretation":'
    at = text.index(key)
    start = at + len(key)
    while text[start] in " \n":
        start += 1
    interpretation, end = json.JSONDecoder().raw_decode(text, start)
    for body in interpretation["bodies"]:
        if body["id"] not in moved:
            continue
        track = body["track"]
        keys = track["value"] if isinstance(track, dict) and "value" in track else track
        kept = [k for k in keys if k["t"] <= moved[body["id"]] and not (k["t"] == moved[body["id"]] and k["t"] > 0)]
        if body["id"].startswith("etre-"):
            kept = [{**k, **BEING_START} if k["t"] == 0 else k for k in kept]
        if isinstance(track, dict) and "value" in track:
            track["value"] = kept
        else:
            body["track"] = kept
    line_start = text.rindex("\n", 0, at) + 1
    indent = text[line_start:at]
    step = len(text.split("\n", 2)[1]) - len(text.split("\n", 2)[1].lstrip())
    written = json.dumps(interpretation, ensure_ascii=False, indent=step).replace("\n", "\n" + indent)
    text = text[:start] + written + text[end:]
    json.loads(text)
    open(path, "w", encoding="utf-8").write(text)
    print(f"{path}: {len(stated_events)} events")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "--print":
        print(json.dumps(events(sys.argv[3])))
    else:
        main(sys.argv[1], sys.argv[2])
