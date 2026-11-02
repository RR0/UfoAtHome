#!/usr/bin/env python3
"""Packs "Iveco Daily Van 2014" (Max, Sketchfab, CC BY 4.0) into one GLB, in metres, its textures scaled down.

What a recording made from the driver's seat of a van needs is the cab around the eye: the dashboard, the pillars, the doors and
their windows, the outside mirrors. The download has them, with 35 textures of 4096 x 4096 (245 MB): far more than anything seen
from a seat resolves. Each texture is scaled down (ImageMagick), the colour ones to TEXTURE_PX, the others (normals,
metalness and roughness) to DETAIL_PX; the colour of the windows keeps its alpha, as a PNG.

The model is about 1.32 times the real size: its wheelbase is 4.61 m where the Daily's (3520 mm version) is 3.52 m, and its body
2.64 m wide where the Daily's is 2.00 m. It is scaled by SCALE, turned so that its front is towards -z (the catalogue's heading 0,
see DecorSystem), and moved so that its box is centred on x = z = 0 with the wheels on y = 0. No vertex or texture is otherwise
changed.

Two things the file draws and does not say are said: its windows are glass (KHR_materials_transmission, which the renderer draws as
GlassMaterial), not a grey film half opaque, which veiled the whole night through the windscreen; and the two glasses of the
driver's mirror (the main one and the wide-angle one under it, the light grey islands MIRROR_UV of the door's texture) are a mirror,
cut out of the door into a primitive of their own whose material is named "Mirror".

Run from the repository root (needs the standard library and ImageMagick's `magick`):
    python3 scripts/extract-iveco-daily-van.py ~/Downloads/iveco_daily_van_2014 public/models/max-iveco-daily-van/van.glb
"""
import json
import pathlib
import struct
import subprocess
import sys
import tempfile

SCALE = 3.52 / 4.61
TEXTURE_PX = 1024
DETAIL_PX = 512
# The driver's (left) door, and the islands of its texture (u0, v0, u1, v1) that the two glasses of its mirror are mapped on.
MIRROR_MESH = "Front_door_L_Front door_0"
MIRROR_UV = ((0.118, 0.785, 0.170, 0.853), (0.018, 0.701, 0.070, 0.7385))


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
    """The windows are clear glass."""
    for material in gltf["materials"]:
        if material["name"] == "Window":
            material["extensions"] = {"KHR_materials_transmission": {"transmissionFactor": 1.0}, "KHR_materials_ior": {"ior": 1.5}}
    gltf["extensionsUsed"] = sorted(set(gltf.get("extensionsUsed", [])) | {"KHR_materials_transmission", "KHR_materials_ior"})


def cut_mirror(gltf, binary):
    """Moves the triangles of the driver's door whose three corners lie on MIRROR_UV into a primitive of their own, of material "Mirror"."""
    node = next(node for node in gltf["nodes"] if node.get("name") == MIRROR_MESH)
    primitive = gltf["meshes"][node["mesh"]]["primitives"][0]
    uv = read(gltf, binary, primitive["attributes"]["TEXCOORD_0"])
    indices = [i[0] for i in read(gltf, binary, primitive["indices"])]
    on_glass = lambda v: any(u0 <= uv[v][0] <= u1 and v0 <= uv[v][1] <= v1 for u0, v0, u1, v1 in MIRROR_UV)
    kept, mirror = [], []
    for k in range(0, len(indices), 3):
        triangle = indices[k:k + 3]
        (mirror if all(on_glass(v) for v in triangle) else kept).extend(triangle)
    if not mirror:
        raise SystemExit("no triangle of the mirror found")
    for target, triangles in ((primitive, kept), (None, mirror)):
        index = append(gltf, binary, struct.pack(f"<{len(triangles)}I", *triangles),
                       {"componentType": 5125, "count": len(triangles), "type": "SCALAR"})
        if target is not None:
            target["indices"] = index
        else:
            gltf["materials"].append({"name": "Mirror", "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 1.0,
                                                                                 "roughnessFactor": 0.0}})
            gltf["meshes"][node["mesh"]]["primitives"].append({"attributes": primitive["attributes"], "indices": index,
                                                               "material": len(gltf["materials"]) - 1})
    print(f"mirror: {len(mirror) // 3} triangles")


def main(source, output):
    source, output = pathlib.Path(source), pathlib.Path(output)
    gltf = json.loads((source / "scene.gltf").read_text())
    binary = bytearray((source / gltf["buffers"][0]["uri"]).read_bytes())
    while len(binary) % 4:
        binary.append(0)

    glaze(gltf)
    cut_mirror(gltf, binary)

    # Which images are colour: they are scaled less, and the windows' keeps its alpha.
    colour = {gltf["textures"][m["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
              for m in gltf["materials"] if "baseColorTexture" in m.get("pbrMetallicRoughness", {})}
    with tempfile.TemporaryDirectory() as folder:
        for index, image in enumerate(gltf["images"]):
            original = source / image["uri"]
            keeps_alpha = original.suffix == ".png" and "Window" in original.name
            scaled = pathlib.Path(folder) / f"{index}.{'png' if keeps_alpha else 'jpg'}"
            size = TEXTURE_PX if index in colour else DETAIL_PX
            subprocess.run(["magick", str(original), "-resize", f"{size}x{size}", "-quality", "85", str(scaled)], check=True, capture_output=True)
            data = scaled.read_bytes()
            gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)})
            binary += data
            while len(binary) % 4:
                binary.append(0)
            gltf["images"][index] = {"bufferView": len(gltf["bufferViews"]) - 1, "mimeType": "image/png" if keeps_alpha else "image/jpeg"}

    # Scaled, turned half round about y (x and z change sign) and moved: one node above the scene's roots.
    low, high = bounds(gltf)
    centre_x, centre_z = (low[0] + high[0]) / 2, (low[2] + high[2]) / 2
    s = SCALE
    root = {"name": "van", "matrix": [-s, 0, 0, 0, 0, s, 0, 0, 0, 0, -s, 0, s * centre_x, -s * low[1], s * centre_z, 1],
            "children": gltf["scenes"][gltf.get("scene", 0)]["nodes"]}
    gltf["nodes"].append(root)
    gltf["scenes"] = [{"nodes": [len(gltf["nodes"]) - 1]}]
    gltf["scene"] = 0
    gltf["buffers"] = [{"byteLength": len(binary)}]
    gltf["asset"]["extras"] = {"author": "Max (https://sketchfab.com/Max-5532)", "license": "CC-BY-4.0",
                               "source": "https://sketchfab.com/3d-models/iveco-daily-van-2014-30003fba5b074d6eb7bc74fd5e1e7d19",
                               "title": "Iveco Daily Van 2014", "changes": "scaled, turned, textures scaled down"}

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
