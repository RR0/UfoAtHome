#!/usr/bin/env python3
"""Gives a figure of the people catalogue a head that can turn.

The figures are baked, rigid meshes (scripts/people/build_pilot.py, build_people.py): one body in one piece, with the hair, the eyebrows and whatever
else sits on the head beside it. A figure that looks at something turns its head, so this cuts the figure at the neck and hangs everything above the cut
from a node named "head", whose origin is the middle of the neck: the engine (DecorObject.track's gazeAzimuthDeg) turns that node about the vertical.

The cut is made where the skin is narrowest between two heights, so that the turned head swivels in its own collar: the vertices of the ring it cuts through
lie on a circle round the axis of rotation, which a turn about that axis leaves where it was, and no gap opens. Clothes stay with the body (a shirt's collar
is a collar, not the head), anything on the head goes with it.

    python3 -I scripts/people/split_head.py IN.glb OUT.glb --skin base.001 --head-meshes name,name --between 1.35,1.55

Run from the repository root; reads and writes plain glTF binaries, no Blender.
"""
import argparse
import json
import math
import struct


def read_glb(path):
    raw = open(path, "rb").read()
    length = struct.unpack("<I", raw[12:16])[0]
    return json.loads(raw[20:20 + length]), raw[20 + length + 8:]


def accessor(gltf, blob, index):
    a = gltf["accessors"][index]
    view = gltf["bufferViews"][a["bufferView"]]
    start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
    if a["componentType"] == 5126:
        width = {"VEC2": 2, "VEC3": 3, "SCALAR": 1}[a["type"]]
        flat = struct.unpack("<" + "f" * (a["count"] * width), blob[start:start + 4 * a["count"] * width])
        return [flat[i:i + width] for i in range(0, len(flat), width)] if width > 1 else list(flat)
    code, size = {5123: ("H", 2), 5125: ("I", 4), 5121: ("B", 1)}[a["componentType"]]
    return list(struct.unpack("<" + code * a["count"], blob[start:start + size * a["count"]]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--skin", required=True, help="the mesh name (without \"Human.\") of the skin, which is cut at the neck")
    parser.add_argument("--head-meshes", required=True, help="meshes that go whole with the head (hair, eyebrows, glasses...), by node name, comma separated")
    parser.add_argument("--between", required=True, help="two heights, in the mesh's own units, between which the neck is narrowest")
    args = parser.parse_args()
    gltf, blob = read_glb(args.source)
    head_names = set(args.head_meshes.split(","))
    low, high = (float(v) for v in args.between.split(","))

    # the shared transform of the nodes: every node carries the same scale and translation
    nodes = gltf["nodes"]
    shared = {k: nodes[0][k] for k in ("scale", "translation") if k in nodes[0]}
    skin_node = next(n for n in nodes if args.skin in n.get("name", "") or args.skin in gltf["meshes"][n["mesh"]].get("name", ""))
    skin_mesh = gltf["meshes"][skin_node["mesh"]]
    skin = skin_mesh["primitives"][0]
    positions = accessor(gltf, blob, skin["attributes"]["POSITION"])
    # the narrowest slice between the two heights
    best = None
    steps = 80
    for k in range(steps):
        y0 = low + (high - low) * k / steps
        y1 = y0 + (high - low) / steps
        ring = [p for p in positions if y0 <= p[1] < y1]
        if len(ring) < 8:
            continue
        spread = (max(p[0] for p in ring) - min(p[0] for p in ring)) + (max(p[2] for p in ring) - min(p[2] for p in ring))
        if best is None or spread < best[0]:
            best = (spread, (y0 + y1) / 2, ring)
    spread, cut, ring = best
    pivot = (sum(p[0] for p in ring) / len(ring), cut, sum(p[2] for p in ring) / len(ring))
    print(f"neck: cut at y={cut:.3f}, axis at x={pivot[0]:.3f} z={pivot[2]:.3f}, {len(ring)} vertices, spread {spread:.3f}")

    # geometry out
    chunks = []          # (bytes, target) in order
    views, accessors, meshes = [], [], []

    def add_view(data, target=None):
        while len(b"".join(c[0] for c in chunks)) % 4:
            chunks.append((b"\x00", None))
        offset = len(b"".join(c[0] for c in chunks))
        chunks.append((data, target))
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        return len(views) - 1

    # images keep their bytes
    for img in gltf.get("images", []):
        old = gltf["bufferViews"][img["bufferView"]]
        data = blob[old.get("byteOffset", 0):old.get("byteOffset", 0) + old["byteLength"]]
        img["bufferView"] = add_view(data)

    def add_primitive(source, wanted_triangles, shift):
        """A primitive made of the triangles `wanted_triangles` (vertex index triples) of `source`, positions moved by `shift`."""
        attrs = {name: accessor(gltf, blob, index) for name, index in source["attributes"].items()}
        remap, order = {}, []
        indices = []
        for tri in wanted_triangles:
            for v in tri:
                if v not in remap:
                    remap[v] = len(order)
                    order.append(v)
                indices.append(remap[v])
        out = {"attributes": {}, "material": source.get("material")}
        for name, values in attrs.items():
            picked = [values[v] for v in order]
            if name == "POSITION":
                picked = [(p[0] - shift[0], p[1] - shift[1], p[2] - shift[2]) for p in picked]
            width = len(picked[0])
            data = struct.pack("<" + "f" * (len(picked) * width), *[c for p in picked for c in p])
            a = {"bufferView": add_view(data, 34962), "componentType": 5126, "count": len(picked), "type": {2: "VEC2", 3: "VEC3"}[width]}
            if name == "POSITION":
                a["min"] = [min(p[i] for p in picked) for i in range(3)]
                a["max"] = [max(p[i] for p in picked) for i in range(3)]
            accessors.append(a)
            out["attributes"][name] = len(accessors) - 1
        accessors.append({"bufferView": add_view(struct.pack("<" + "I" * len(indices), *indices), 34963), "componentType": 5125, "count": len(indices), "type": "SCALAR"})
        out["indices"] = len(accessors) - 1
        return out

    new_nodes, body_nodes, head_children = [], [], []
    for node in nodes:
        mesh = gltf["meshes"][node["mesh"]]
        name = node.get("name", "")
        for primitive in mesh["primitives"]:
            pos = accessor(gltf, blob, primitive["attributes"]["POSITION"])
            idx = accessor(gltf, blob, primitive["indices"]) if "indices" in primitive else list(range(len(pos)))
            tris = [tuple(idx[k:k + 3]) for k in range(0, len(idx), 3)]
            whole_head = any(name.endswith(h) or h in name for h in head_names) and node is not skin_node
            if node is skin_node:
                above = [t for t in tris if sum(pos[v][1] for v in t) / 3 > cut]
                below = [t for t in tris if sum(pos[v][1] for v in t) / 3 <= cut]
                parts = [(below, (0, 0, 0), body_nodes, name), (above, pivot, head_children, name + "-head")]
            elif whole_head:
                parts = [(tris, pivot, head_children, name)]
            else:
                parts = [(tris, (0, 0, 0), body_nodes, name)]
            for triangles, shift, where, part_name in parts:
                if not triangles:
                    continue
                meshes.append({"name": part_name, "primitives": [add_primitive(primitive, triangles, shift)]})
                entry = {"mesh": len(meshes) - 1, "name": part_name}
                if where is body_nodes:
                    entry.update(shared)
                new_nodes.append(entry)
                where.append(len(new_nodes) - 1)
    # the head node: the shared transform composed with the pivot, its children at the identity
    scale = shared.get("scale", [1, 1, 1])
    translation = shared.get("translation", [0, 0, 0])
    head = {"name": "head", "scale": scale,
            "translation": [translation[i] + scale[i] * pivot[i] for i in range(3)], "children": head_children}
    new_nodes.append(head)
    gltf["nodes"] = new_nodes
    gltf["meshes"] = meshes
    gltf["accessors"] = accessors
    gltf["bufferViews"] = views
    gltf["scenes"] = [{"nodes": body_nodes + [len(new_nodes) - 1]}]
    gltf["scene"] = 0
    data = b"".join(c[0] for c in chunks)
    data += b"\x00" * (-len(data) % 4)
    gltf["buffers"] = [{"byteLength": len(data)}]
    text = json.dumps(gltf, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    total = 12 + 8 + len(text) + 8 + len(data)
    with open(args.target, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(text), b"JSON") + text)
        f.write(struct.pack("<I4s", len(data), b"BIN\x00") + data)
    print(f"wrote {args.target}: {len(body_nodes)} body parts, {len(head_children)} head parts, {total} bytes")


if __name__ == "__main__":
    main()
