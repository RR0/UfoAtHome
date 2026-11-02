#!/usr/bin/env python3
"""Packs "Peugeot Expert" (KOElkast1007, Sketchfab, Sketchfab Standard licence) into one GLB, in metres, simplified.

What a recording made from the driver's seat of a van needs is the cab around the eye: the dashboard, the steering wheel, the pillars,
the doors and their windows, the side windows behind, the outside mirrors. The download has them, at the real size already (4.93 m long,
1.92 m wide without its mirrors: an Expert's), its front towards -z, but in 951 000 triangles (54 MB): its wheels alone are 117 000
each. So each primitive is simplified (scripts/models/simplify-gltf.ts, meshoptimizer) to RATIO of its triangles, straying at most
ERROR of the model's size (a centimetre: the steering wheel is a metre from the eye), and its textures scaled to TEXTURE_PX.

What the file draws and does not say is said:
- its windows are glass (KHR_materials_transmission, which the renderer draws as GlassMaterial), not a black film a quarter opaque;
- the windows of its rear doors are not: "l'arrière du véhicule n'a pas de vitre" (GEIPAN 2015-05-09194, CR p.9), so they are panels
  of the body's paint (REAR_WINDOWS);
- the glass of the driver's mirror (MIRROR_MESH) is a mirror, of a material named "Mirror", set in its housing as a driver sets it;
- the body's paint is the material the catalogue lets a recording colour (see the model's "paintColor" parameter).
The box is centred on x = z = 0 with the wheels on y = 0. No other vertex is moved.

Run from the repository root (needs the standard library, node with the repository's packages, and ffmpeg):
    python3 scripts/extract-peugeot-expert.py ~/Downloads/peugeot_expert public/models/koelkast-peugeot-expert/van.glb
"""
import json
import math
import pathlib
import struct
import subprocess
import sys
import tempfile

RATIO = 0.15
ERROR = 0.002
TEXTURE_PX = 1024
# The glass of the driver's (left) door mirror: the whole of that primitive, light grey in the file.
MIRROR_MESH = "door_dside_f_black_0"
# The two windows of the rear doors.
REAR_WINDOWS = ("misc_r_glass_0", "windscreen_r_glass_0")
PAINT = "carpaint"
# How the glass is set in its housing, as a driver sets his: for his eye (DRIVER_EYE, in the frame of the output: x right, y up from the
# ground, front towards -z; see add_van.py for Silly-le-Long), the middle of what it shows is MIRROR_OUTWARD_DEG out from straight behind
# and level, which puts the van's own flank at the inner edge and the horizon across the middle. The model's own setting showed the
# ground elsewhere. SUPPOSED: nobody says how T1's was set.
DRIVER_EYE = (-0.40, 1.58, -0.25)
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


def glaze(gltf):
    """The windows are clear glass, but for those of the rear doors, which are the body's panels."""
    for material in gltf["materials"]:
        if material["name"] == "glass":
            material["extensions"] = {"KHR_materials_transmission": {"transmissionFactor": 1.0}, "KHR_materials_ior": {"ior": 1.5}}
            material["pbrMetallicRoughness"]["baseColorFactor"] = [1.0, 1.0, 1.0, 1.0]
            material.pop("alphaMode", None)
    gltf["extensionsUsed"] = sorted(set(gltf.get("extensionsUsed", [])) | {"KHR_materials_transmission", "KHR_materials_ior"})
    paint = next(index for index, material in enumerate(gltf["materials"]) if material["name"] == PAINT)
    for node in gltf["nodes"]:
        if node.get("name") in REAR_WINDOWS:
            for primitive in gltf["meshes"][node["mesh"]]["primitives"]:
                primitive["material"] = paint


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


def cut_mirror(gltf, binary, placed):
    """Gives the glass of the driver's mirror a material of its own, "Mirror", its vertices copied and turned about its middle as
    MIRROR_OUTWARD_DEG says (`placed` takes the scene to the output's frame)."""
    node_index = next(index for index, node in enumerate(gltf["nodes"]) if node.get("name") == MIRROR_MESH)
    node = gltf["nodes"][node_index]
    primitive = gltf["meshes"][node["mesh"]]["primitives"][0]
    uv = read(gltf, binary, primitive["attributes"]["TEXCOORD_0"]) if "TEXCOORD_0" in primitive["attributes"] else None
    mirror = [i[0] for i in read(gltf, binary, primitive["indices"])]
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
    print(f"mirror: turned {math.degrees(math.acos(max(-1, min(1, sum(x * y for x, y in zip(facing, wanted)))))):.1f} degrees")
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
    gltf["meshes"][node["mesh"]]["primitives"] = [{"attributes": attributes, "indices": index, "material": len(gltf["materials"]) - 1}]
    print(f"mirror: {len(mirror) // 3} triangles")


def strip(gltf):
    """Leaves out what draws nothing: the second and third texture coordinates, which no material reads, and vertex colours that are all
    white. They were half of what the simplified model weighed."""
    read_sets = {texture.get("texCoord", 0) for material in gltf["materials"]
                 for texture in list(material.values()) + list(material.get("pbrMetallicRoughness", {}).values())
                 if isinstance(texture, dict) and "index" in texture}
    for mesh in gltf["meshes"]:
        for primitive in mesh["primitives"]:
            attributes = primitive["attributes"]
            for name in [name for name in attributes if name.startswith("TEXCOORD_") and int(name[9:]) not in read_sets]:
                del attributes[name]
            colour = attributes.get("COLOR_0")
            if colour is not None and min(gltf["accessors"][colour].get("min", [0])) >= 1:
                del attributes["COLOR_0"]


def main(source, output):
    source, output = pathlib.Path(source), pathlib.Path(output)
    gltf = json.loads((source / "scene.gltf").read_text())
    binary = bytearray((source / gltf["buffers"][0]["uri"]).read_bytes())
    while len(binary) % 4:
        binary.append(0)

    # Moved so that its box is centred and its wheels on the ground: one node above the scene's roots.
    low, high = bounds(gltf)
    placed = [[1, 0, 0, -(low[0] + high[0]) / 2], [0, 1, 0, -low[1]], [0, 0, 1, -(low[2] + high[2]) / 2], [0, 0, 0, 1]]
    glaze(gltf)
    cut_mirror(gltf, binary, placed)
    strip(gltf)
    root = {"name": "van", "matrix": [placed[r][c] for c in range(4) for r in range(4)],
            "children": gltf["scenes"][gltf.get("scene", 0)]["nodes"]}
    gltf["nodes"].append(root)
    gltf["scenes"] = [{"nodes": [len(gltf["nodes"]) - 1]}]
    gltf["scene"] = 0
    gltf["buffers"] = [{"byteLength": len(binary), "uri": "scene.bin"}]
    gltf["asset"]["extras"] = {"author": "KOElkast1007 (https://sketchfab.com/koelkastasbers)", "license": "Sketchfab Standard",
                               "source": "https://sketchfab.com/3d-models/peugeot-expert-db5a6b979f4943ee9d596051a2702dec",
                               "title": "Peugeot Expert", "changes": "centred, simplified, windows glazed, rear windows panelled, driver's mirror set"}
    with tempfile.TemporaryDirectory() as folder:
        folder = pathlib.Path(folder)
        (folder / "scene.bin").write_bytes(bytes(binary))
        for image in gltf["images"]:
            target = folder / image["uri"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((source / image["uri"]).read_bytes())
        (folder / "scene.gltf").write_text(json.dumps(gltf))
        output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["node", "--import", "tsx", "scripts/models/simplify-gltf.ts", str(folder / "scene.gltf"), str(output), str(RATIO),
                        str(TEXTURE_PX), str(ERROR)], check=True)
    size = [high[k] - low[k] for k in range(3)]
    print(f"{output}: {output.stat().st_size / 1e6:.1f} MB, {size[0]:.3f} wide, {size[1]:.3f} high, {size[2]:.3f} long")


if __name__ == "__main__":
    main(*sys.argv[1:3])
