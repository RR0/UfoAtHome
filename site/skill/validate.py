#!/usr/bin/env python3
"""Checks a UFO@home recording against sighting.schema.json.

Usage: python3 validate.py recording.json [sighting.schema.json]
       python3 validate.py case.json

A case file (an object with "events" and no "timeline") is checked for its references instead: each
"interpretationOf" has to name the "id" of an event of the case, or (the older form) the "id" of a
recording the case lists and that sits beside it; and no two events may bear the same "id".

Needs nothing but Python: it understands exactly the part of JSON Schema the published schema uses
(type, enum, properties, additionalProperties, items, anyOf, $ref), so it runs in any assistant's
sandbox without installing a package. Prints one line per problem, with the path to it, and exits
with 1 when there is any.
"""
import json
import os
import sys

TYPES = {
    "string": lambda v: isinstance(v, str),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
}


class Validator:
    def __init__(self, schema):
        self.schema = schema

    def resolve(self, node):
        ref = node.get("$ref")
        if ref and ref.startswith("#/"):
            target = self.schema
            for part in ref[2:].split("/"):
                target = target[part]
            return target
        return node

    def errors(self, value, node, path):
        node = self.resolve(node)
        if "anyOf" in node:
            branches = [self.errors(value, branch, path) for branch in node["anyOf"]]
            if any(len(found) == 0 for found in branches):
                return []
            # The bare value's own errors say more than "matches no branch", and the provenance
            # wrapper is always the last branch.
            return branches[0]
        kind = node.get("type")
        if kind and not TYPES[kind](value):
            return [f"{path or '/'}: expected {kind}, found {type(value).__name__}"]
        if "enum" in node and value not in node["enum"]:
            return [f"{path or '/'}: {json.dumps(value)} is not one of {', '.join(map(json.dumps, node['enum']))}"]
        found = []
        if isinstance(value, dict) and "properties" in node:
            for key, inner in value.items():
                if key in node["properties"]:
                    found += self.errors(inner, node["properties"][key], f"{path}/{key}")
                elif node.get("additionalProperties") is False:
                    found.append(f"{path}/{key}: unknown key")
        if isinstance(value, list) and "items" in node:
            for index, inner in enumerate(value):
                found += self.errors(inner, node["items"], f"{path}/{index}")
        return found


def check_case(case, directory):
    """What a case gets wrong about its own references; one line per problem."""
    events = [e for e in case.get("events", []) if isinstance(e, dict)]
    problems = []
    seen = set()
    for event in events:
        ident = event.get("id")
        if ident is None:
            continue
        if ident in seen:
            problems.append(f"/events: the id {ident!r} is borne by more than one event")
        seen.add(ident)
    recording_ids = set()
    for event in events:
        url = event.get("url")
        if event.get("eventType") == "sighting" and isinstance(url, str) and not url.startswith(("http:", "https:", "/")):
            try:
                with open(os.path.join(directory, url), encoding="utf-8") as f:
                    recording_ids.add(json.load(f).get("id"))
            except (OSError, ValueError):
                pass
    for index, event in enumerate(events):
        references = event.get("interpretationOf")
        if references is None:
            continue
        for reference in references if isinstance(references, list) else [references]:
            if reference not in seen and reference not in recording_ids:
                problems.append(f"/events/{index}/interpretationOf: {reference!r} is neither the id of an event of the case nor of a recording it lists")
    return problems


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as f:
        recording = json.load(f)
    if isinstance(recording, dict) and "events" in recording and "timeline" not in recording:
        problems = check_case(recording, os.path.dirname(os.path.abspath(sys.argv[1])))
    else:
        schema_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "references", "sighting.schema.json")
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
        problems = Validator(schema).errors(recording, schema, "")
    for problem in problems:
        print(problem)
    print(f"{len(problems)} problem(s)" if problems else "valid")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
