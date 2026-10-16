#!/usr/bin/env python3
"""Gives a figure of the people catalogue a skeleton with a head that turns.

The figures are baked, rigid meshes (scripts/people/build_pilot.py, build_people.py): one body in one piece, with the hair, the eyebrows and whatever
else sits on the head beside it, and no skeleton. A figure that looks at something turns its head, so this gives it the smallest skeleton that can:
two joints, `neck` at the middle of the neck and `head` under it, which the engine turns (DecorPlacementKeyframe.gazeAzimuthDeg turns the joint
named "head"). The skin is weighted to them by height along the neck: below the cut it follows the body, above it the head, and over a short band
between (a few centimetres either side) it is blended, so that the neck twists as a neck does and nothing tears: a rigid cut leaves a seam, a jaw
behind, a hole. What is round the axis of the neck, within a head's radius, is weighted; shoulders and arms are not. Everything that sits on the head
(hair, eyebrows, eyelashes, glasses, beard, a headset) is carried by the head joint, rigid; clothes stay with the body.

    python3 -I scripts/people/split_head.py IN.glb OUT.glb --skin base.001 --head-meshes name,name --between 1.35,1.55 [--cut 1.45]

Run from the repository root; reads and writes plain glTF binaries, no Blender.
"""
import argparse
import json
import math
import struct


# the head and the neck lie within this distance of the axis, the shoulders and the arms beyond
HEAD_RADIUS_M = 0.14
# half the height over which the skin goes from following the body to following the head
BAND_M = 0.03


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


def lerp_vertex(attrs, a, b, f):
    """A new vertex of `attrs` (name -> list of tuples) at fraction `f` from vertex a to vertex b; normals renormalised. Returns its index."""
    for name, values in attrs.items():
        va, vb = values[a], values[b]
        v = tuple(x + (y - x) * f for x, y in zip(va, vb))
        if name == "NORMAL":
            size = math.sqrt(sum(c * c for c in v)) or 1.0
            v = tuple(c / size for c in v)
        values.append(v)
    return len(attrs["POSITION"]) - 1


def clip_triangles(attrs, triangles, plane_y):
    """Cuts the triangles at the plane y = plane_y: the vertices it needs are added to `attrs`; returns (triangles below, triangles above)."""
    pos = attrs["POSITION"]
    below, above = [], []
    for tri in triangles:
        sides = [pos[v][1] > plane_y for v in tri]
        if all(sides):
            above.append(tri)
        elif not any(sides):
            below.append(tri)
        else:
            # rotate so that the lone vertex (alone on its side) comes first
            lone = next(i for i in range(3) if sides[i] != sides[(i + 1) % 3] and sides[i] != sides[(i + 2) % 3])
            a, b, c = tri[lone], tri[(lone + 1) % 3], tri[(lone + 2) % 3]
            fb = (plane_y - pos[a][1]) / (pos[b][1] - pos[a][1])
            fc = (plane_y - pos[a][1]) / (pos[c][1] - pos[a][1])
            ab = lerp_vertex(attrs, a, b, fb)
            ac = lerp_vertex(attrs, a, c, fc)
            lone_side = above if sides[lone] else below
            other_side = below if sides[lone] else above
            lone_side.append((a, ab, ac))
            other_side.append((ab, b, c))
            other_side.append((ab, c, ac))
    return below, above


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--skin", required=True, help="the mesh name (without \"Human.\") of the skin, which is cut at the neck")
    parser.add_argument("--head-meshes", required=True, help="meshes that go whole with the head (hair, eyebrows, glasses...), by node name, comma separated")
    parser.add_argument("--between", required=True, help="two heights, in the mesh's own units, between which the neck is narrowest")
    parser.add_argument("--cut", type=float, help="cut at this height instead (a head bowed over its chest has a jaw that goes lower than the narrowest part of its neck)")
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
    # the neck: the horizontal section of the skin, between the two heights, that is narrowest AND whole (every point of it near its own middle: no jaw, no shoulder),
    # read where the triangles cross the plane rather than from the vertices near it, of which there are too few to give a middle
    idx = accessor(gltf, blob, skin["indices"])
    best = None
    heights = [args.cut] if args.cut is not None else [low + (high - low) * k / 59 for k in range(60)]
    for y in heights:
        points = []
        for t in range(0, len(idx), 3):
            tri = [positions[idx[t + i]] for i in range(3)]
            for a_, b_ in ((0, 1), (1, 2), (2, 0)):
                pa, pb = tri[a_], tri[b_]
                if (pa[1] - y) * (pb[1] - y) < 0:
                    f = (y - pa[1]) / (pb[1] - pa[1])
                    points.append((pa[0] + (pb[0] - pa[0]) * f, pa[2] + (pb[2] - pa[2]) * f))
        if len(points) < 8:
            continue
        mx = sorted(p[0] for p in points)[len(points) // 2]
        mz = sorted(p[1] for p in points)[len(points) // 2]
        near = [p for p in points if math.hypot(p[0] - mx, p[1] - mz) < 0.1]
        if (len(near) != len(points) and args.cut is None) or len(near) < 40:
            continue
        cx = sum(p[0] for p in near) / len(near)
        cz = sum(p[1] for p in near) / len(near)
        widest = max(math.hypot(p[0] - cx, p[1] - cz) for p in near)
        if best is None or widest < best[0]:
            best = (widest, y, cx, cz, len(near))
    widest, cut, cx, cz, count = best
    pivot = (cx, cut, cz)
    print(f"neck: cut at y={cut:.3f}, axis at x={cx:.3f} z={cz:.3f}, {count} points, widest radius {widest:.3f}")

    # geometry out
    chunks = []
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

    def add_accessor(data, component, count, kind, target=34962, extras=None):
        entry = {"bufferView": add_view(data, target), "componentType": component, "count": count, "type": kind}
        if extras:
            entry.update(extras)
        accessors.append(entry)
        return len(accessors) - 1

    # images keep their bytes
    for img in gltf.get("images", []):
        old = gltf["bufferViews"][img["bufferView"]]
        img["bufferView"] = add_view(blob[old.get("byteOffset", 0):old.get("byteOffset", 0) + old["byteLength"]])

    def copy_primitive(source, skinning=None):
        """The primitive again, its data repacked (the images' views have moved), with JOINTS_0 and WEIGHTS_0 when `skinning` gives them."""
        out = {"attributes": {}, "material": source.get("material")}
        for name, index in source["attributes"].items():
            values = accessor(gltf, blob, index)
            width = len(values[0])
            data = struct.pack("<" + "f" * (len(values) * width), *[c for v in values for c in v])
            extras = {"min": [min(v[i] for v in values) for i in range(3)], "max": [max(v[i] for v in values) for i in range(3)]} if name == "POSITION" else None
            out["attributes"][name] = add_accessor(data, 5126, len(values), {2: "VEC2", 3: "VEC3"}[width], 34962, extras)
        if "indices" in source:
            ids = accessor(gltf, blob, source["indices"])
            out["indices"] = add_accessor(struct.pack("<" + "I" * len(ids), *ids), 5125, len(ids), "SCALAR", 34963)
        if skinning:
            joints, weights = skinning
            out["attributes"]["JOINTS_0"] = add_accessor(struct.pack("<" + "B" * (4 * len(joints)), *[c for j in joints for c in j]), 5121, len(joints), "VEC4")
            out["attributes"]["WEIGHTS_0"] = add_accessor(struct.pack("<" + "f" * (4 * len(weights)), *[c for w in weights for c in w]), 5126, len(weights), "VEC4")
        return out

    def smoothstep(x):
        x = max(0.0, min(1.0, x))
        return x * x * (3 - 2 * x)

    # the skin's weights: by height over the band, and only round the axis of the neck
    joints, weights = [], []
    for x, y, z in positions:
        head = smoothstep((y - (cut - BAND_M)) / (2 * BAND_M)) if math.hypot(x - pivot[0], z - pivot[2]) < HEAD_RADIUS_M else 0.0
        joints.append((0, 1, 0, 0))
        weights.append((1.0 - head, head, 0.0, 0.0))

    # nodes: "figure" carries the transform every node of the original shared; under it the body parts (the skinned skin among them) and the joints
    figure_children, head_children = [], []
    new_nodes = [{"name": "figure", **shared, "children": []}]
    joint_neck = {"name": "neck", "translation": list(pivot), "children": []}
    joint_head = {"name": "head"}
    for node in nodes:
        mesh = gltf["meshes"][node["mesh"]]
        name = node.get("name", "")
        whole_head = node is not skin_node and any(h in name for h in head_names)
        primitives = [copy_primitive(prim, (joints, weights) if node is skin_node else None) for prim in mesh["primitives"]]
        meshes.append({"name": name, "primitives": primitives})
        entry = {"mesh": len(meshes) - 1, "name": name}
        if node is skin_node:
            entry["skin"] = 0
        if whole_head:
            # a child of the head joint: its vertices stay where they are, so it is moved back by the joint's own place
            entry["translation"] = [-c for c in pivot]
        new_nodes.append(entry)
        (head_children if whole_head else figure_children).append(len(new_nodes) - 1)
    new_nodes.append(joint_neck)
    neck_index = len(new_nodes) - 1
    new_nodes.append(joint_head)
    head_index = len(new_nodes) - 1
    joint_head["children"] = head_children
    joint_neck["children"] = [head_index]
    new_nodes[0]["children"] = figure_children + [neck_index]
    inverse = struct.pack("<32f", *([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -pivot[0], -pivot[1], -pivot[2], 1] * 2))
    gltf["skins"] = [{"joints": [neck_index, head_index], "skeleton": neck_index,
                      "inverseBindMatrices": add_accessor(inverse, 5126, 2, "MAT4", None)}]
    gltf["nodes"] = new_nodes
    gltf["meshes"] = meshes
    gltf["accessors"] = accessors
    gltf["bufferViews"] = views
    gltf["scenes"] = [{"nodes": [0]}]
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
    print(f"wrote {args.target}: {len(figure_children)} body parts, {len(head_children)} carried by the head joint, {total} bytes")


if __name__ == "__main__":
    main()
