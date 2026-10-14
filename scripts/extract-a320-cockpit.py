#!/usr/bin/env python3
"""Cuts the flight deck out of "A320 Cockpit 2" (davidmarton1987, Sketchfab, CC BY 4.0) into one GLB, in metres.

The downloaded file is a whole Lufthansa A320neo about a quarter of the real size, outside, cabin and flight deck, 45 MB. What the
observer of a recording aboard an airliner needs is the flight deck alone: the panels, the seats, the windscreen frames and the side
window openings, with the sky showing through them. The objects wanted are those whose box lies inside FLIGHT_DECK (in the
model's own units, where the nose is at z = 0 and the wingspan is 8.67): 64 of the 135.

The model is scaled by 4.12 (the real wingspan, 35.8 m, over the model's 8.67) and nothing else is changed: no vertex is moved, no
texture touched. Its frame is the original's: y up, the nose towards -z, +x to the right of the pilots.

Run from the repository root (needs only the standard library):
    python3 scripts/extract-a320-cockpit.py ~/Downloads/a320_cockpit_2 public/models/davidmarton-a320-cockpit/cockpit.glb
"""
import json
import struct
import sys
import pathlib

SCALE = 35.8 / 8.671
FLIGHT_DECK = ((-0.45, -0.12, 0.30), (0.45, 0.45, 1.0))
# The captain's eye, found by looking out of the model from the left seat (x, y, z in the model's own units): the left side window
# opens on the sky from here, the glareshield lies in the lower third of the view ahead.
EYE = (-0.13, 0.23, 0.76)
# The two headsets hanging on the window pillars (left and right, mirrored) are modelled in the big merged meshes Object_55 and
# Object_56, among the pillars and the panels. The observer is meant to be WEARING one, so they are left out: every piece (set of
# triangles sharing vertices) of those two meshes lying wholly inside one of these boxes is dropped. Pieces of the pillar are larger
# than the box and stay.
HEADSET_BOX = ((-0.34, 0.06, 0.55), (-0.17, 0.27, 0.70))
HEADSET_MESHES = ("Object_55", "Object_56")


def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


IDENTITY = [[1 if i == k else 0 for k in range(4)] for i in range(4)]


def local(node):
    if "matrix" in node:
        m = node["matrix"]
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    return IDENTITY


def read_vertices(gltf, binary, accessor_index):
    a = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][a["bufferView"]]
    start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = view.get("byteStride", 12)
    return [struct.unpack_from("<3f", binary, start + i * stride) for i in range(a["count"])]


def read_indices(gltf, binary, accessor_index):
    a = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][a["bufferView"]]
    start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
    code = {5121: "B", 5123: "H", 5125: "I"}[a["componentType"]]
    return list(struct.unpack_from("<" + code * a["count"], binary, start))


def without_headsets(gltf, binary, world, primitive):
    """The triangle indices of a primitive, minus the pieces that lie wholly inside a headset box."""
    positions = read_vertices(gltf, binary, primitive["attributes"]["POSITION"])
    indices = read_indices(gltf, binary, primitive["indices"])
    # The mesh is cut along its texture seams, so one surface is many "pieces": vertices at the same place are welded first
    parent = list(range(len(positions)))
    welded = {}
    for v in set(indices):
        parent[v] = welded.setdefault(tuple(round(x, 5) for x in positions[v]), v)

    def find(v):
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v

    for t in range(0, len(indices), 3):
        a, b, c = indices[t:t + 3]
        parent[find(b)] = find(a)
        parent[find(c)] = find(a)
    low, high = {}, {}
    for v in set(indices):
        w = [sum(world[r][c] * x for c, x in enumerate((*positions[v], 1))) for r in range(3)]
        root = find(v)
        low[root] = [min(a, b) for a, b in zip(low.get(root, w), w)]
        high[root] = [max(a, b) for a, b in zip(high.get(root, w), w)]

    def inside(root):
        for sign in (1, -1):
            lo = [HEADSET_BOX[0][0] * sign if sign < 0 else HEADSET_BOX[0][0], HEADSET_BOX[0][1], HEADSET_BOX[0][2]]
            hi = [HEADSET_BOX[1][0], HEADSET_BOX[1][1], HEADSET_BOX[1][2]]
            if sign < 0:
                lo[0], hi[0] = -HEADSET_BOX[1][0], -HEADSET_BOX[0][0]
            if all(low[root][k] >= lo[k] and high[root][k] <= hi[k] for k in range(3)):
                return True
        return False

    dropped = {root for root in low if inside(root)}
    kept = [i for t in range(0, len(indices), 3) if find(indices[t]) not in dropped for i in indices[t:t + 3]]
    return kept, len(dropped)


def main(source_dir, target):
    src = pathlib.Path(source_dir).expanduser()
    gltf = json.loads((src / "scene.gltf").read_text())
    binary = (src / "scene.bin").read_bytes()
    kept = []

    def walk(index, parent):
        node = gltf["nodes"][index]
        world = mm(parent, local(node))
        if "mesh" in node:
            for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
                a = gltf["accessors"][primitive["attributes"]["POSITION"]]
                corners = [[sum(world[r][c] * v for c, v in enumerate((x, y, z, 1))) for r in range(3)]
                           for x in (a["min"][0], a["max"][0]) for y in (a["min"][1], a["max"][1]) for z in (a["min"][2], a["max"][2])]
                low = [min(c[k] for c in corners) for k in range(3)]
                high = [max(c[k] for c in corners) for k in range(3)]
                if all(low[k] >= FLIGHT_DECK[0][k] and high[k] <= FLIGHT_DECK[1][k] for k in range(3)):
                    kept.append((world, primitive, node.get("name")))
        for child in node.get("children", []):
            walk(child, world)

    for root in gltf["scenes"][0]["nodes"]:
        walk(root, IDENTITY)

    out_json = {"asset": {"version": "2.0", "generator": "scripts/extract-a320-cockpit.py",
                          "copyright": "Based on \"A320 Cockpit 2\" by davidmarton1987 (https://sketchfab.com/3d-models/a320-cockpit-2-5fb0c671a91042c1a9d8f2cf3e2df021), CC BY 4.0"},
                "scene": 0, "scenes": [{"nodes": []}], "nodes": [], "meshes": [], "accessors": [], "bufferViews": [],
                "buffers": [], "materials": [], "textures": [], "images": [], "samplers": gltf.get("samplers", [])}
    out_bin = bytearray()

    def add_view(data, target_kind=None):
        while len(out_bin) % 4:
            out_bin.append(0)
        view = {"buffer": 0, "byteOffset": len(out_bin), "byteLength": len(data)}
        if target_kind:
            view["target"] = target_kind
        out_bin.extend(data)
        out_json["bufferViews"].append(view)
        return len(out_json["bufferViews"]) - 1

    accessor_map = {}

    def add_accessor(index):
        if index in accessor_map:
            return accessor_map[index]
        a = dict(gltf["accessors"][index])
        view = gltf["bufferViews"][a["bufferView"]]
        sizes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
        counts = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
        width = sizes[a["componentType"]] * counts[a["type"]]
        stride = view.get("byteStride", width)
        start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        data = b"".join(binary[start + i * stride:start + i * stride + width] for i in range(a["count"]))
        a["bufferView"] = add_view(data, 34963 if a["type"] == "SCALAR" else 34962)
        a.pop("byteOffset", None)
        out_json["accessors"].append(a)
        accessor_map[index] = len(out_json["accessors"]) - 1
        return accessor_map[index]

    image_map, texture_map, material_map = {}, {}, {}

    def add_image(index):
        if index not in image_map:
            image = gltf["images"][index]
            data = (src / image["uri"]).read_bytes()
            mime = "image/png" if image["uri"].lower().endswith(".png") else "image/jpeg"
            out_json["images"].append({"bufferView": add_view(data), "mimeType": mime})
            image_map[index] = len(out_json["images"]) - 1
        return image_map[index]

    def add_texture(index):
        if index not in texture_map:
            texture = dict(gltf["textures"][index])
            texture["source"] = add_image(texture["source"])
            out_json["textures"].append(texture)
            texture_map[index] = len(out_json["textures"]) - 1
        return texture_map[index]

    def add_material(index):
        if index not in material_map:
            material = json.loads(json.dumps(gltf["materials"][index]))
            for holder in (material.get("pbrMetallicRoughness", {}), material):
                for key, value in list(holder.items()):
                    if isinstance(value, dict) and "index" in value:
                        value["index"] = add_texture(value["index"])
            out_json["materials"].append(material)
            material_map[index] = len(out_json["materials"]) - 1
        return material_map[index]

    pieces = 0
    for world, primitive, name in kept:
        p = {"attributes": {name_: add_accessor(i) for name_, i in primitive["attributes"].items()}, "mode": primitive.get("mode", 4)}
        if name in HEADSET_MESHES:
            indices, dropped = without_headsets(gltf, binary, world, primitive)
            pieces += dropped
            out_json["accessors"].append({"bufferView": add_view(struct.pack("<" + "I" * len(indices), *indices), 34963),
                                          "componentType": 5125, "count": len(indices), "type": "SCALAR"})
            p["indices"] = len(out_json["accessors"]) - 1
        elif "indices" in primitive:
            p["indices"] = add_accessor(primitive["indices"])
        if "material" in primitive:
            p["material"] = add_material(primitive["material"])
        out_json["meshes"].append({"primitives": [p]})
        # The world matrix of the original (its own scale 0.01 x 24.24 and its axis swaps) times the real-size factor, column-major
        matrix = [[world[r][c] * SCALE if r < 3 else world[r][c] for c in range(4)] for r in range(4)]
        out_json["nodes"].append({"mesh": len(out_json["meshes"]) - 1, "matrix": [matrix[r][c] for c in range(4) for r in range(4)]})
        out_json["scenes"][0]["nodes"].append(len(out_json["nodes"]) - 1)

    while len(out_bin) % 4:
        out_bin.append(0)
    out_json["buffers"] = [{"byteLength": len(out_bin)}]
    json_bytes = json.dumps(out_json, separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(json_bytes) + 8 + len(out_bin))
    glb += struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
    glb += struct.pack("<II", len(out_bin), 0x004E4942) + bytes(out_bin)
    path = pathlib.Path(target)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(glb)
    print(f"{len(kept)} primitives, {pieces} headset pieces dropped, {len(glb) / 1e6:.1f} MB, eye at {[round(v * SCALE, 3) for v in EYE]} m in the model's frame")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
