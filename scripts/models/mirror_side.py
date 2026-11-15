"""
Replaces what a model has on one side, in a box, by the mirror of what it has on the other: a door the model was made with open, on a
fuselage whose other side is closed there. Every triangle of the given meshes lying wholly in the box on the +Y side is taken out, and every
triangle of the -Y side reaching into the mirrored box is added again, turned over to +Y (its positions and normals mirrored across Y = 0,
its winding reversed, its other attributes, texture coordinates among them, kept).

    python3 scripts/models/mirror_side.py <scene.gltf> <x low> <x high> <+Y from> <z low> <z high> <reach of the open door> <mesh index>...

The Piper PA-28 Cadet of public/models/helijah-piper-pa28-cadet has its right door open some sixty-five degrees, swung out up to 1.5 m from
the fuselage; its left side is closed:
    python3 scripts/models/mirror_side.py public/models/helijah-piper-pa28-cadet/scene.gltf -1.86 -0.80 0.55 -0.45 0.54 1.6 6 30 51
"""
import json
import struct
import sys

path = sys.argv[1]
x_low, x_high, y_from, z_low, z_high, reach = map(float, sys.argv[2:8])
meshes = [int(i) for i in sys.argv[8:]]
folder = path.rsplit("/", 1)[0]
gltf = json.load(open(path))
data = bytearray(open(f"{folder}/{gltf['buffers'][0]['uri']}", "rb").read())
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
FORMATS = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}


def read(index):
    accessor = gltf["accessors"][index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    components, fmt = COMPONENTS[accessor["type"]], FORMATS[accessor["componentType"]]
    stride = view.get("byteStride", struct.calcsize(fmt) * components)
    return [struct.unpack_from("<" + fmt * components, data, offset + i * stride) for i in range(accessor["count"])]


def append(values, accessor_type, component_type, target, minmax=False):
    global data
    while len(data) % 4:
        data.append(0)
    offset = len(data)
    fmt = FORMATS[component_type]
    flat = [x for v in values for x in v]
    data += struct.pack("<" + fmt * len(flat), *flat)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data) - offset}
    if target:
        view["target"] = target
    gltf["bufferViews"].append(view)
    accessor = {"bufferView": len(gltf["bufferViews"]) - 1, "componentType": component_type, "count": len(values), "type": accessor_type}
    if minmax:
        accessor["min"] = [min(v[k] for v in values) for k in range(len(values[0]))]
        accessor["max"] = [max(v[k] for v in values) for k in range(len(values[0]))]
    gltf["accessors"].append(accessor)
    return len(gltf["accessors"]) - 1


def right(p):
    # The door as it stands open: past the side, within the door's length and height, swung out as far as it reaches.
    return p[1] > y_from and z_low < p[2] < z_high and x_low < p[0] < x_high and p[1] < y_from + reach


def left(p):
    return -p[1] > y_from and z_low < p[2] < z_high and x_low < p[0] < x_high


for mesh in meshes:
    primitive = gltf["meshes"][mesh]["primitives"][0]
    attributes = {name: read(index) for name, index in primitive["attributes"].items()}
    positions = attributes["POSITION"]
    indices = [i[0] for i in read(primitive["indices"])]
    kept, mirrored = [], []
    for t in range(0, len(indices), 3):
        triangle = indices[t:t + 3]
        points = [positions[v] for v in triangle]
        if all(right(p) for p in points):
            continue
        kept += triangle
        # Those that only reach into the box too, all on the side: the corner of the door's frame, which the open door had in its place.
        if any(left(p) for p in points) and all(-p[1] > y_from for p in points):
            mirrored.append(triangle)
    # The mirrored triangles get vertices of their own, appended after the others.
    new = {name: list(values) for name, values in attributes.items()}
    for triangle in mirrored:
        for v in reversed(triangle):
            for name, values in attributes.items():
                value = values[v]
                if name in ("POSITION", "NORMAL"):
                    value = (value[0], -value[1], value[2])
                elif name == "TANGENT":
                    value = (value[0], -value[1], value[2], -value[3])
                new[name].append(value)
            kept.append(len(new["POSITION"]) - 1)
    for name, values in new.items():
        old = gltf["accessors"][primitive["attributes"][name]]
        primitive["attributes"][name] = append(values, old["type"], old["componentType"], 34962, name == "POSITION")
    primitive["indices"] = append([(i,) for i in kept], "SCALAR", 5125, 34963)
    print(f"mesh {mesh}: {(len(indices) - (len(kept) - 3 * len(mirrored))) // 3} triangles of the open door out, {len(mirrored)} mirrored in")

while len(data) % 4:
    data.append(0)
gltf["buffers"][0]["byteLength"] = len(data)
open(f"{folder}/{gltf['buffers'][0]['uri']}", "wb").write(data)
json.dump(gltf, open(path, "w"))
