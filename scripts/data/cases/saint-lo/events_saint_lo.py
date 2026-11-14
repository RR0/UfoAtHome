#!/usr/bin/env python3
"""Q. B.'s account at Saint-Lô as events, from what build_saint_lo.py draws it with: where he looked, how his eyes followed it, its way across
the sky and its turns, how it looked. The player works the shapes and the poses out of them (src/engine/events: SkyPath, PhenomenonExpansion,
FootExpansion), by the same laws as the generator.

    python3 events_saint_lo.py [recording]   writes them into it (public/demo-data/observer-saint-lo.json), after build_saint_lo.py
    python3 events_saint_lo.py --print       the events and the groups, as JSON
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build_saint_lo as b  # noqa: E402

PHENOMENON = "phenomenon"
END_MS = b.DURATION_MS
GONE_MS = b.DURATION_MS + 200


def wrap(value, basis, rationale, source=None):
    entry = {"value": value, "basis": basis, "rationale": rationale}
    if source is not None:
        entry["source"] = source
    return entry


def side(sign):
    """His side, said from the craft (FROM_THE_CRAFT: its left is the sky's right seen from below)."""
    return "left" if sign == +b.FROM_THE_CRAFT else "right"


def part(spec):
    sid, kind, points, along, across, behind, lateral, color, transparency, brightness, blur, title = spec
    out = {"sourceId": sid, "title": title, "kind": kind, "color": color, "transparency": transparency, "brightness": brightness, "blur": blur,
           "halo": 0, "widthShare": round(along / b.ACROSS, 6), "heightShare": round(across / b.ACROSS, 6), "minWidthDeg": 0.03, "minHeightDeg": 0.03}
    if points:
        out["points"] = points
    if behind:
        out["alongShare"] = round(-behind / b.ACROSS, 6)
    if lateral:
        out["upShare"] = round(lateral / b.ACROSS, 6)
    return out


def events(observer):
    t1, t2 = b.TURN_1, b.TURN_2
    down = round(b.DOWN_SPEED, 4)
    return [
        {"type": "event", "eventType": "look", "who": observer, "t": 0, "params": {
            "headingDeg": wrap(b.GAZE_AZ, "stated", "call of 2026-10-13: \"je regardais [...] est, sud-est, mais légèrement\" (the written reply said "
                                                     "west-south-west; his friend was the one looking west)", b.said(33, 271, 307)),
            "pitchDeg": wrap(b.GAZE_PITCH, "stated", "call of 2026-10-13: he looked at the horizon, \"10 degrés\"; it was the movement that took his eyes up"),
            "fovDeg": b.FOV}},
        {"type": "event", "eventType": "follow", "who": observer, "t": 0, "until": END_MS, "params": {
            "target": PHENOMENON,
            "reactionS": wrap(b.REACTION_MS / 1000, "stated", "\"environ 500 ms, mon temps de réaction\""),
            "lagS": wrap(b.EYE_LAG_S, "assumed", "Eyes that follow something fast are a little behind it")}},
        {"type": "event", "eventType": "travel", "who": PHENOMENON, "t": 0, "until": END_MS, "params": {
            "from": wrap({"azimuthDeg": b.START_AZ, "altitudeDeg": b.START_ALT}, "stated",
                         "call of 2026-10-13: from the north-north-east, about 25 degrees east of north, at \"20-30 degrés\" when first caught",
                         b.said(51, 277, 323)),
            "towards": wrap({"azimuthDeg": b.START_AZ, "altitudeDeg": 90}, "stated", "Straight to the zenith, where it was when his eyes got there"),
            "speeds": wrap([{"t": 0, "degPerS": b.UP_SPEED}, {"t": b.ZENITH_MS, "degPerS": b.UP_SPEED}, {"t": b.ZENITH_MS + 600, "degPerS": down},
                            {"t": b.SPIRAL_FROM_MS, "degPerS": round(down * 0.7, 4), "step": True}], "derived",
                           "60 degrees in 0.5 s to the zenith (\"dans les 500 millisecondes\"), then much slower: how much slower, so that it is at the tree "
                           "tops due south when the spiral starts; slower at once as it starts spiralling"),
            "sizeDeg": wrap(b.ACROSS, "stated", "One and a half 1 euro coins at arm's length at its closest, across"),
            "sizeBy": wrap("altitude", "assumed", "Small as a shooting star, whole at the zenith, \"beaucoup plus petit\" near the horizon: he said it did "
                                                  "not fly at a constant height, and no law; the sine of its altitude has those three sizes")}},
        {"type": "event", "eventType": "turn", "who": PHENOMENON, "t": t1[0], "until": t1[1], "params": {
            "byDeg": wrap(t1[2], "stated", "A first turn to the left, about 15 degrees, about a second, from about 500 ms after the zenith"),
            "side": side(t1[3]), "seenFrom": "craft"}},
        {"type": "event", "eventType": "turn", "who": PHENOMENON, "t": t2[0], "until": t2[1], "params": {
            "byDeg": wrap(t2[2], "stated", "Then, after a short straight line, a long turn to the right of about 25 degrees"),
            "side": side(t2[3]), "seenFrom": "craft"}},
        {"type": "event", "eventType": "turn", "who": PHENOMENON, "t": b.TURN_3_FROM, "until": b.TURN_3_TO, "params": {
            "byDeg": wrap(b.TURN_3_DEG, "derived", "The last, to the left, \"5 degrés, 5-10 max\": as much as ends it due south"),
            "side": b.TURN_3_SIDE, "seenFrom": "craft"}},
        {"type": "event", "eventType": "roll", "who": PHENOMENON, "t": t1[0], "until": t1[1], "params": {
            "toDeg": wrap(b.BANK_DEG, "assumed", "Banked into its first turn and out of it, as the second (\"environ 20 degrés\")"), "andBack": True}},
        {"type": "event", "eventType": "roll", "who": PHENOMENON, "t": t2[0], "until": t2[0] + 400, "params": {
            "toDeg": wrap(b.BANK_DEG, "stated", "\"L'engin se cambrant dans le virage\", \"environ 20 degrés sur la droite\"")}},
        {"type": "event", "eventType": "roll", "who": PHENOMENON, "t": b.TURN_3_FROM, "until": b.SPIRAL_FROM_MS, "params": {
            "toDeg": wrap(90, "stated", "Near the horizon, \"une ligne lumineuse horizontale\": edge on")}},
        {"type": "event", "eventType": "vibrate", "who": PHENOMENON, "t": b.VIBRATION_FROM_MS, "until": b.VIBRATION_FROM_MS + b.VIBRATION_LASTS_MS, "params": {
            "hz": wrap(b.VIBRATION_HZ, "stated", "\"Au moins une dizaine de fois\" a second, \"comme une voile dans le vent\""),
            "amplitudeShare": wrap(round(b.VIBRATION_AMP_DEG / b.ACROSS, 6), "assumed", "Slightly: nobody measured how far"),
            "riseS": wrap(0.3, "stated", "About a second, strong at the start, gradually less visible")}},
        {"type": "event", "eventType": "spiral", "who": PHENOMENON, "t": b.SPIRAL_FROM_MS, "until": END_MS, "params": {
            "turns": wrap(b.SPIRAL_TURNS, "stated", "\"340 degrés, et les 20 degrés qui manquent, je ne les ai pas vus\" (behind the trees)"),
            "radiusDeg": wrap(b.SPIRAL_RADIUS_DEG, "stated", "\"4-5 degrés max\" across"),
            "shrink": wrap(b.SPIRAL_SHRINK, "stated", "\"Large puis se rétrécit\"; by how much, SUPPOSED"),
            "clockwise": wrap(b.SPIRAL_SIGN == 1, "stated", "Clockwise, as he says"),
            "rollDeg": wrap(b.SPIRAL_ROLL_DEG, "stated", "A barrel roll of 340 degrees, the last 20 behind the trees")}},
        {"type": "event", "eventType": "appearance", "who": PHENOMENON, "t": 0, "until": GONE_MS, "params": {
            "parts": wrap([part(spec) for spec in b.SHAPES], "stated", "His drawing of the wing seen flat (call-2026-10-13/vue-a-plat-4k.png)")}},
        {"type": "event", "eventType": "vanish", "who": PHENOMENON, "t": GONE_MS},
    ]


GROUPS = [{"id": PHENOMENON, "title": {"fr": "L'aile", "en": "The wing"}, "members": b.IDS}]


def main(path):
    """Writes the events into the recording, in place of the shapes and the poses they give; the rest of it as it is."""
    recording = json.loads(path.read_text())
    observer = (recording.get("observer") or {}).get("id", "observer")
    recording["events"] = events(observer)
    recording["timeline"] = {"keyframes": [], "groups": GROUPS}
    recording["observerTrack"] = {"keyframes": []}
    path.write_text(json.dumps(recording, ensure_ascii=False, indent=1) + "\n")
    print(f"{path}: {len(recording['events'])} events, {path.stat().st_size} bytes")


if __name__ == "__main__":
    if "--print" in sys.argv:
        print(json.dumps({"events": events("observer"), "groups": GROUPS}, ensure_ascii=False, indent=1))
    else:
        main(pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else b.OUT)
