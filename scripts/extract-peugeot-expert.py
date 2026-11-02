#!/usr/bin/env python3
"""Packs "2012 Peugeot Expert" (tonielpro520, Sketchfab, CC BY 4.0) into one GLB, in metres.

What a recording made from the driver's seat of a van needs is the cab around the eye: the dashboard, the seats, the pillars, the doors
and their windows, the side windows behind, the outside mirrors. This model has them, in 38 000 triangles and 2.9 MB.

It is about 0.92 of the real size: its wheelbase is 2.75 m where the Expert's of 2007-2016 is 3.00 m (its length 4.44 m where the short
one's is 4.81 m). It is scaled by SCALE, turned half round so that its front is towards -z (the catalogue's heading 0, see DecorSystem),
and moved so that its box is centred on x = z = 0 with the wheels on y = 0.

What the file draws and does not say is said:
- its windows (GLASS) are glass (KHR_materials_transmission, which the renderer draws as GlassMaterial), not a teal film half opaque;
- the windows of its rear doors are not: "l'arrière du véhicule n'a pas de vitre" (GEIPAN 2015-05-09194, CR p.9), so the glass behind
  REAR_Z is a panel of the body's paint (PAINT, the material the catalogue lets a recording colour: see its "paintColor" parameter);
- the glass of the driver's mirror (MIRROR_MATERIAL, on the driver's side of the file) is a mirror, of a material named "Mirror", set in
  its housing as a driver sets it.
No other vertex is moved.

Run from the repository root (needs the standard library):
    python3 scripts/extract-peugeot-expert.py ~/Downloads/2012_peugeot_expert public/models/tonielpro-peugeot-expert-2012/van.glb
"""
import json
import math
import pathlib
import struct
import sys

SCALE = 3.00 / 2.75
GLASS = "Material_3"
PAINT = "M_0021_DarkRed"
# Behind this (the file's z, metres, its rear towards -z), a window is in a rear door.
REAR_Z = -13.0
# The two outside mirrors' glasses are one primitive; the driver's (left) is the one on +x in the file, whose front is towards +z.
MIRROR_MATERIAL = "Color_001"
MIRROR_SIDE_X = 20.71
# How the glass is set in its housing, as a driver sets his: for his eye (DRIVER_EYE, in the frame of the output: x right, y up from the
# ground, front towards -z; see add_van.py for Silly-le-Long), the middle of what it shows is MIRROR_OUTWARD_DEG out from straight behind
# and level, which puts the van's own flank at the inner edge and the horizon across the middle. SUPPOSED: nobody says how T1's was set.
DRIVER_EYE = (-0.47, 1.50, -0.25)
MIRROR_OUTWARD_DEG = 12.0


def matrix_of(node):
    if "matrix" in node:
        m = node["matrix"]
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    result = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    for i, (t, s) in enumerate(zip(node.get("translation", [0, 0, 0]), node.get("scale", [1, 1, 1]))):
        result[i][i] = s
        result[i][3] = t
    return result


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def apply(m, p):
    return [sum(m[i][k] * p[k] for k in range(3)) + m[i][3] for i in range(3)]


def bounds(gltf):
    """The box of every mesh, in the frame of the scene."""
    low, high = [float("inf")] * 3, [float("-inf")] * 3

    def walk(index, parent):
        node = gltf["nodes"][index]
        m = multiply(parent, matrix_of(node))
        if "mesh" in node:
            for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
                accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
                for x in (accessor["min"][0], accessor["max"][0]):
                    for y in (accessor["min"][1], accessor["max"][1]):
                        for z in (accessor["min"][2], accessor["max"][2]):
                            p = apply(m, [x, y, z])
                            for k in range(3):
                                low[k], high[k] = min(low[k], p[k]), max(high[k], p[k])
        for child in node.get("children", []):
            walk(child, m)

    identity = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    for root in gltf["scenes"][gltf.get("scene", 0)]["nodes"]:
        walk(root, identity)
    return low, high


def read(gltf, binary, index):
    accessor = gltf["accessors"][index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    count = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[accessor["type"]]
    kind = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}[accessor["componentType"]]
    stride = view.get("byteStride", struct.calcsize(kind) * count)
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    return [struct.unpack_from("<" + kind * count, binary, start + i * stride) for i in range(accessor["count"])]


def append(gltf, binary, data, accessor):
    """Adds `data` to the buffer, with a view and an accessor on it; returns the accessor's index."""
    gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)})
    binary += data
    while len(binary) % 4:
        binary.append(0)
    gltf["accessors"].append({**accessor, "bufferView": len(gltf["bufferViews"]) - 1})
    return len(gltf["accessors"]) - 1


def world_of(gltf, target):
    """The matrix that takes `target`'s own frame to the scene's."""
    parents = {child: index for index, node in enumerate(gltf["nodes"]) for child in node.get("children", [])}
    m = [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
    index = target
    while index is not None:
        m = multiply(matrix_of(gltf["nodes"][index]), m)
        index = parents.get(index)
    return m


def invert3(m):
    a, b, c = m[0][:3], m[1][:3], m[2][:3]
    det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    cof = [[b[1] * c[2] - b[2] * c[1], a[2] * c[1] - a[1] * c[2], a[1] * b[2] - a[2] * b[1]],
           [b[2] * c[0] - b[0] * c[2], a[0] * c[2] - a[2] * c[0], a[2] * b[0] - a[0] * b[2]],
           [b[0] * c[1] - b[1] * c[0], a[1] * c[0] - a[0] * c[1], a[0] * b[1] - a[1] * b[0]]]
    return [[cof[i][j] / det for j in range(3)] for i in range(3)]


def linear(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def unit(v):
    length = sum(x * x for x in v) ** 0.5
    return [x / length for x in v]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def rotation(a, b):
    """The rotation (3 x 3) that turns the unit vector a onto the unit vector b (Rodrigues)."""
    axis = cross(a, b)
    sine, cosine = sum(x * x for x in axis) ** 0.5, sum(x * y for x, y in zip(a, b))
    if sine < 1e-9:
        return [[1.0 if i == j else 0.0 for j in range(3)] for i in range(3)]
    k = [x / sine for x in axis]
    skew = [[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]
    square = [[sum(skew[i][n] * skew[n][j] for n in range(3)) for j in range(3)] for i in range(3)]
    return [[(1.0 if i == j else 0.0) + sine * skew[i][j] + (1 - cosine) * square[i][j] for j in range(3)] for i in range(3)]


def primitives_of(gltf, material_name):
    """(node index, primitive) of every primitive drawn with the material named `material_name`."""
    material = next(index for index, each in enumerate(gltf["materials"]) if each["name"] == material_name)
    return [(index, primitive) for index, node in enumerate(gltf["nodes"]) if "mesh" in node
            for primitive in gltf["meshes"][node["mesh"]]["primitives"] if primitive.get("material") == material]


def split(gltf, binary, node_index, primitive, chosen):
    """Moves the triangles of `primitive` whose three corners `chosen(world point)` accepts into a primitive of their own, sharing its
    vertices, and returns it (None if there are none)."""
    world = world_of(gltf, node_index)
    points = [apply(world, p) for p in read(gltf, binary, primitive["attributes"]["POSITION"])]
    indices = [i[0] for i in read(gltf, binary, primitive["indices"])]
    kept, moved = [], []
    for k in range(0, len(indices), 3):
        triangle = indices[k:k + 3]
        (moved if all(chosen(points[v]) for v in triangle) else kept).extend(triangle)
    if not moved:
        return None
    primitive["indices"] = append(gltf, binary, struct.pack(f"<{len(kept)}I", *kept), {"componentType": 5125, "count": len(kept), "type": "SCALAR"})
    other = {"attributes": dict(primitive["attributes"]), "material": primitive.get("material"),
             "indices": append(gltf, binary, struct.pack(f"<{len(moved)}I", *moved), {"componentType": 5125, "count": len(moved), "type": "SCALAR"})}
    gltf["meshes"][gltf["nodes"][node_index]["mesh"]]["primitives"].append(other)
    return other


def glaze(gltf, binary):
    """The windows are clear glass, but for those of the rear doors, which are the body's panels."""
    paint = next(index for index, material in enumerate(gltf["materials"]) if material["name"] == PAINT)
    for node_index, primitive in primitives_of(gltf, GLASS):
        rear = split(gltf, binary, node_index, primitive, lambda p: p[2] < REAR_Z)
        if rear:
            rear["material"] = paint
            print(f"rear windows: {len(read(gltf, binary, rear['indices'])) // 3} triangles painted")
    for material in gltf["materials"]:
        if material["name"] == GLASS:
            material["extensions"] = {"KHR_materials_transmission": {"transmissionFactor": 1.0}, "KHR_materials_ior": {"ior": 1.5}}
            material["pbrMetallicRoughness"]["baseColorFactor"] = [1.0, 1.0, 1.0, 1.0]
            material.pop("alphaMode", None)
    gltf["extensionsUsed"] = sorted(set(gltf.get("extensionsUsed", [])) | {"KHR_materials_transmission", "KHR_materials_ior"})


def cut_mirror(gltf, binary, placed):
    """Gives the glass of the driver's mirror a material of its own, "Mirror", its vertices copied and turned about its middle as
    MIRROR_OUTWARD_DEG says (`placed` takes the scene to the output's frame)."""
    (node_index, both), = primitives_of(gltf, MIRROR_MATERIAL)
    primitive = split(gltf, binary, node_index, both, lambda p: p[0] > MIRROR_SIDE_X)
    if primitive is None:
        raise SystemExit("no glass of the driver's mirror found")
    node = gltf["nodes"][node_index]
    mirror = [i[0] for i in read(gltf, binary, primitive["indices"])]
    uv = read(gltf, binary, primitive["attributes"]["TEXCOORD_0"]) if "TEXCOORD_0" in primitive["attributes"] else None
    # The glass's own vertices, in the output's frame.
    used = sorted(set(mirror))
    renumber = {v: i for i, v in enumerate(used)}
    position = read(gltf, binary, primitive["attributes"]["POSITION"])
    normal = read(gltf, binary, primitive["attributes"]["NORMAL"])
    to_out = multiply(placed, world_of(gltf, node_index))
    points = [apply(to_out, position[v]) for v in used]
    # Its middle and the side it faces (towards the eye), weighted by area.
    facing, middle, area = [0.0] * 3, [0.0] * 3, 0.0
    for k in range(0, len(mirror), 3):
        a, b, c = (points[renumber[v]] for v in mirror[k:k + 3])
        n = cross([b[i] - a[i] for i in range(3)], [c[i] - a[i] for i in range(3)])
        twice = sum(x * x for x in n) ** 0.5
        if facing != [0.0] * 3 and sum(x * y for x, y in zip(n, facing)) < 0:
            n = [-x for x in n]
        facing = [facing[i] + n[i] for i in range(3)]
        middle = [middle[i] + (a[i] + b[i] + c[i]) * twice / 6 for i in range(3)]
        area += twice / 2
    middle = [x / area for x in middle]
    facing = unit(facing)
    incoming = unit([middle[i] - DRIVER_EYE[i] for i in range(3)])
    if sum(x * y for x, y in zip(facing, incoming)) > 0:
        facing = [-x for x in facing]
    # A mirror's normal halves the way in (reversed) and the way out.
    outward = math.radians(MIRROR_OUTWARD_DEG)
    out = [-math.sin(outward), 0.0, math.cos(outward)]
    wanted = unit([out[i] - incoming[i] for i in range(3)])
    turn = rotation(facing, wanted)
    print(f"mirror: middle {[round(x, 3) for x in middle]}, turned {math.degrees(math.acos(max(-1, min(1, sum(x * y for x, y in zip(facing, wanted)))))):.1f} degrees")
    back = invert3(to_out)
    shift = [to_out[i][3] for i in range(3)]
    moved = []
    for p in points:
        q = [middle[i] + x for i, x in enumerate(linear(turn, [p[i] - middle[i] for i in range(3)]))]
        moved.append(linear(back, [q[i] - shift[i] for i in range(3)]))
    local_turn = [[sum(back[i][a] * sum(turn[a][b] * to_out[b][j] for b in range(3)) for a in range(3)) for j in range(3)] for i in range(3)]
    normals = [unit(linear(local_turn, normal[v])) for v in used]
    attributes = {
        "POSITION": append(gltf, binary, struct.pack(f"<{3 * len(moved)}f", *[x for p in moved for x in p]),
                           {"componentType": 5126, "count": len(moved), "type": "VEC3",
                            "min": [min(p[i] for p in moved) for i in range(3)], "max": [max(p[i] for p in moved) for i in range(3)]}),
        "NORMAL": append(gltf, binary, struct.pack(f"<{3 * len(normals)}f", *[x for n in normals for x in n]),
                         {"componentType": 5126, "count": len(normals), "type": "VEC3"}),
    }
    if uv:
        attributes["TEXCOORD_0"] = append(gltf, binary, struct.pack(f"<{2 * len(used)}f", *[x for v in used for x in uv[v]]),
                                          {"componentType": 5126, "count": len(used), "type": "VEC2"})
    index = append(gltf, binary, struct.pack(f"<{len(mirror)}I", *[renumber[v] for v in mirror]),
                   {"componentType": 5125, "count": len(mirror), "type": "SCALAR"})
    gltf["materials"].append({"name": "Mirror", "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 1.0, "roughnessFactor": 0.0}})
    primitive.clear()
    primitive.update({"attributes": attributes, "indices": index, "material": len(gltf["materials"]) - 1})
    print(f"mirror: {len(mirror) // 3} triangles")



def main(source, output):
    source, output = pathlib.Path(source), pathlib.Path(output)
    gltf = json.loads((source / "scene.gltf").read_text())
    binary = bytearray((source / gltf["buffers"][0]["uri"]).read_bytes())
    while len(binary) % 4:
        binary.append(0)
    # Scaled, turned half round about y (x and z change sign) and moved: one node above the scene's roots.
    low, high = bounds(gltf)
    s = SCALE
    placed = [[-s, 0, 0, s * (low[0] + high[0]) / 2], [0, s, 0, -s * low[1]], [0, 0, -s, s * (low[2] + high[2]) / 2], [0, 0, 0, 1]]
    glaze(gltf, binary)
    cut_mirror(gltf, binary, placed)
    for index, image in enumerate(gltf["images"]):
        data = (source / image["uri"]).read_bytes()
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)})
        binary += data
        while len(binary) % 4:
            binary.append(0)
        gltf["images"][index] = {"bufferView": len(gltf["bufferViews"]) - 1, "mimeType": "image/png" if image["uri"].endswith(".png") else "image/jpeg"}
    root = {"name": "van", "matrix": [placed[r][c] for c in range(4) for r in range(4)],
            "children": gltf["scenes"][gltf.get("scene", 0)]["nodes"]}
    gltf["nodes"].append(root)
    gltf["scenes"] = [{"nodes": [len(gltf["nodes"]) - 1]}]
    gltf["scene"] = 0
    gltf["buffers"] = [{"byteLength": len(binary)}]
    gltf["asset"]["extras"] = {"author": "tonielpro520 (https://sketchfab.com/tonielpro520)", "license": "CC-BY-4.0",
                               "source": "https://sketchfab.com/3d-models/2012-peugeot-expert-685aadd153804845a8f022d3e9ea4a0f",
                               "title": "2012 Peugeot Expert", "changes": "scaled, turned, windows glazed, rear windows panelled, driver's mirror set"}
    text = json.dumps(gltf, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as out:
        out.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(text) + 8 + len(binary)))
        out.write(struct.pack("<II", len(text), 0x4E4F534A) + text)
        out.write(struct.pack("<II", len(binary), 0x004E4942) + bytes(binary))
    size = [(high[k] - low[k]) * s for k in range(3)]
    print(f"{output}: {output.stat().st_size / 1e6:.1f} MB, {size[0]:.3f} wide, {size[1]:.3f} high, {size[2]:.3f} long")


if __name__ == "__main__":
    main(*sys.argv[1:3])
