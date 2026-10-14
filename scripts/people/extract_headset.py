"""
Cuts the original headset out of "A320 Cockpit 2" (davidmarton1987, Sketchfab, CC BY 4.0): the one that hangs on the captain's window pillar, which
scripts/extract-a320-cockpit.py leaves out of the flight deck so that the observer, who wears one, does not see a second.

It is part of the big merged meshes Object_55 and Object_56, among the pillars and the panels: they are welded (vertices at the same place merged)
and cut into loose pieces, and the pieces that lie wholly inside the box the headset hangs in are kept and joined. The model's units are those of
a plane a quarter of the real size (see scripts/extract-a320-cockpit.py): the headset is scaled by the same 4.12, then centred on the middle of its box.

    COCKPIT_SRC=~/Downloads/a320_cockpit_2 blender -b --python scripts/people/extract_headset.py -- <out.glb>

Used by build_pilot.py (which imports `headset_object`) and runnable alone, to look at it.
"""
import os
import sys

import bpy
import bmesh
from mathutils import Vector

SCALE = 35.8 / 8.671
# The box the captain's headset hangs in, in the glTF's own axes (x right, y up, z towards the tail) in the model's units; Blender's are (x, -z, y)
BOX_GLTF = ((-0.34, 0.06, 0.55), (-0.17, 0.27, 0.70))
# What is kept of the pieces in that box: those wholly inside this one, in metres, in Blender's axes (x across the cups, y towards the back
# of the headset as it hangs, z up) from the middle of the first box. It leaves out the hook's plate, the cables that hang down to the pedestal and
# the handset, and keeps the band, the two cups and the microphone boom.
KEEP = ((-0.12, -0.23, -0.075), (0.12, 0.04, 0.20))


def headset_object(source):
    """The headset as one object, in metres, centred on the middle of its box, as it hangs (nothing turned)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(os.path.expanduser(source), "scene.gltf"))
    imported = [o for o in bpy.data.objects if o not in before]
    lo = Vector((BOX_GLTF[0][0], -BOX_GLTF[1][2], BOX_GLTF[0][1]))
    hi = Vector((BOX_GLTF[1][0], -BOX_GLTF[0][2], BOX_GLTF[1][1]))
    parts = []
    for obj in [o for o in imported if o.type == "MESH" and o.name.split(".")[0] in ("Object_55", "Object_56")]:
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.transform(obj.matrix_world)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        # connected pieces: walk the faces
        seen = set()
        for face in bm.faces:
            if face.index in seen:
                continue
            stack, island = [face], []
            seen.add(face.index)
            while stack:
                f = stack.pop()
                island.append(f)
                for edge in f.edges:
                    for other in edge.link_faces:
                        if other.index not in seen:
                            seen.add(other.index)
                            stack.append(other)
            points = [v.co for f in island for v in f.verts]
            low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
            high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
            if all(low[k] >= lo[k] and high[k] <= hi[k] for k in range(3)):
                centre0 = (lo + hi) / 2
                low_m, high_m = (low - centre0) * SCALE, (high - centre0) * SCALE
                size_m = high_m - low_m
                middle_m = (low_m + high_m) / 2
                # the hook's plate: a small flat piece at the top, in the middle, between the two sides of the band
                hook = size_m.length < 0.09 and middle_m.z > 0.10 and abs(middle_m.x - 0.045) < 0.05
                if not hook and all(low_m[k] >= KEEP[0][k] and high_m[k] <= KEEP[1][k] for k in range(3)):
                    parts.append((obj, [f.index for f in island]))
        bm.free()
    # one new mesh per source object with the kept faces
    made = []
    for obj in {o for o, _ in parts}:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.transform(obj.matrix_world)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bm.faces.ensure_lookup_table()
        kept = {i for o, ids in parts if o is obj for i in ids}
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in kept], context="FACES")
        mesh = bpy.data.meshes.new("headset-" + obj.name)
        bm.to_mesh(mesh)
        bm.free()
        for material in obj.data.materials:
            mesh.materials.append(material)
        new = bpy.data.objects.new("headset-" + obj.name, mesh)
        bpy.context.collection.objects.link(new)
        made.append(new)
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    centre = (lo + hi) / 2
    for obj in made:
        obj.data.transform(__import__("mathutils").Matrix.Translation(-centre))
        obj.data.transform(__import__("mathutils").Matrix.Scale(SCALE, 4))
    return made


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--") + 1]
    made = headset_object(os.environ["COCKPIT_SRC"])
    pts = [v.co for o in made for v in o.data.vertices]
    print("HEADSET", len(made), "objects", sum(len(o.data.vertices) for o in made), "vertices; box (m)",
          [round(min(p[k] for p in pts), 3) for k in range(3)], [round(max(p[k] for p in pts), 3) for k in range(3)])
    bpy.ops.object.select_all(action="DESELECT")
    for o in made:
        o.select_set(True)
    bpy.context.view_layer.objects.active = made[0]
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True)
