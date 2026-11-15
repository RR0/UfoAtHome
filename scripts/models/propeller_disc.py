"""
Replaces the blades of a model's propeller by the disc an eye sees when it turns: a light aircraft's propeller at some 2,400 rpm sweeps
eighty blades a second past the eye, which sees not a blade held still but a faint veil over the whole disc, the share of it the blades
cover (some 6 % for two slim blades). A camera at a short enough exposure would freeze them; that is not what a pilot sees.

The blades are the triangles of one mesh lying all forward of the cowling's lip, all within a blade's half-width of the plane they turn
through (the cowling is wider), and reaching farther from the propeller's axis than its hub: they are taken out of that mesh, and a disc of the propeller's diameter, of a material of its own ("propeller-disc", see-through)
is added in their place, in the same node.

    python3 scripts/models/propeller_disc.py <scene.gltf> <mesh index> <forward of x> <axis y> <axis z> <hub radius> <disc x> <coverage> <blade half-width>

The axis is the model's own X (nose towards -X), as the Piper PA-28 Cadet of public/models/helijah-piper-pa28-cadet has it:
    python3 scripts/models/propeller_disc.py public/models/helijah-piper-pa28-cadet/scene.gltf 6 -3.30 0 -0.235 0.25 -3.38 0.06 0.12
"""
import json
import math
import struct
import sys

path, mesh_index, forward_x, axis_y, axis_z, cowling, disc_x, coverage, half_width = sys.argv[1], int(sys.argv[2]), *map(float, sys.argv[3:10])
folder = path.rsplit("/", 1)[0]
gltf = json.load(open(path))
buffer_uri = gltf["buffers"][0]["uri"]
data = bytearray(open(f"{folder}/{buffer_uri}", "rb").read())


def read(accessor_index):
    accessor = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[accessor["type"]]
    fmt = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}[accessor["componentType"]]
    size = struct.calcsize(fmt)
    stride = view.get("byteStride", size * components)
    return [struct.unpack_from("<" + fmt * components, data, offset + i * stride) for i in range(accessor["count"])], accessor, fmt


def append(values, fmt, kind, target, minmax=False):
    global data
    while len(data) % 4:
        data.append(0)
    offset = len(data)
    flat = [x for v in values for x in (v if isinstance(v, tuple) else (v,))]
    data += struct.pack("<" + fmt * len(flat), *flat)
    gltf["bufferViews"].append({"buffer": 0, "byteOffset": offset, "byteLength": len(data) - offset, "target": target})
    accessor = {"bufferView": len(gltf["bufferViews"]) - 1, "componentType": {"f": 5126, "I": 5125}[fmt], "count": len(values), "type": kind}
    if minmax:
        accessor["min"] = [min(v[i] for v in values) for i in range(3)]
        accessor["max"] = [max(v[i] for v in values) for i in range(3)]
    gltf["accessors"].append(accessor)
    return len(gltf["accessors"]) - 1


primitive = gltf["meshes"][mesh_index]["primitives"][0]
positions, _, _ = read(primitive["attributes"]["POSITION"])
indices, index_accessor, _ = read(primitive["indices"])
indices = [i[0] for i in indices]


def forward(vertex):
    # Ahead of the cowling's lip and within a blade's half-width of the plane the blades turn through: what is wide is the cowling.
    return positions[vertex][0] < forward_x and abs(positions[vertex][1] - axis_y) < half_width


def beyond(vertex):
    return math.hypot(positions[vertex][1] - axis_y, positions[vertex][2] - axis_z) > cowling


kept, radius = [], 0.0
for t in range(0, len(indices), 3):
    triangle = indices[t:t + 3]
    # A blade is drawn in long triangles from its root, by the hub, to its tip: one that lies forward of the nose and reaches past the cowling.
    if all(forward(v) for v in triangle) and any(beyond(v) for v in triangle):
        for v in triangle:
            radius = max(radius, math.hypot(positions[v][1] - axis_y, positions[v][2] - axis_z))
    else:
        kept += triangle
removed = (len(indices) - len(kept)) // 3
print(f"{removed} triangles of blades taken out; the propeller's radius is {radius:.3f} m")
primitive["indices"] = append(kept, "I", "SCALAR", 34963)

# The disc: a fan in the plane x = disc_x, facing forward, of the radius the blades reached.
segments = 48
disc_positions = [(disc_x, axis_y, axis_z)] + [(disc_x, axis_y + radius * math.cos(2 * math.pi * k / segments), axis_z + radius * math.sin(2 * math.pi * k / segments)) for k in range(segments)]
disc_normals = [(-1.0, 0.0, 0.0)] * len(disc_positions)
disc_indices = [i for k in range(segments) for i in (0, 1 + k, 1 + (k + 1) % segments)]
gltf["materials"].append({
    "name": "propeller-disc", "alphaMode": "BLEND", "doubleSided": True,
    "pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.55, 0.55, coverage], "metallicFactor": 0.0, "roughnessFactor": 0.7}
})
gltf["meshes"].append({"name": "propeller-disc", "primitives": [{
    "attributes": {"POSITION": append(disc_positions, "f", "VEC3", 34962, True), "NORMAL": append(disc_normals, "f", "VEC3", 34962)},
    "indices": append(disc_indices, "I", "SCALAR", 34963), "material": len(gltf["materials"]) - 1
}]})
node_of_mesh = next(i for i, node in enumerate(gltf["nodes"]) if node.get("mesh") == mesh_index)
parent = next(node for node in gltf["nodes"] if node_of_mesh in node.get("children", []))
gltf["nodes"].append({"name": "propeller-disc", "mesh": len(gltf["meshes"]) - 1})
parent["children"].append(len(gltf["nodes"]) - 1)

while len(data) % 4:
    data.append(0)
gltf["buffers"][0]["byteLength"] = len(data)
open(f"{folder}/{buffer_uri}", "wb").write(data)
json.dump(gltf, open(path, "w"))
