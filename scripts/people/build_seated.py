"""
Builds men seated on a garden chair, as one GLB each (public/models/makehuman-people/<id>.glb), from MPFB and the MakeHuman system assets (CC0),
like the other people of build_people.py, whose helpers it uses, and posed as the captain of build_pilot.py is.

They are the four Texas Tech professors of the Lubbock case (see scripts/data/cases/lubbock/build_lubbock.ts), sitting in a back yard over tea on
an August evening of 1951: nothing of their faces or builds is known, so none of this is anyone's likeness. ASSUMED: their ages, builds, hair, and
clothes, a shirt and plain trousers of the time (the stock `male_casualsuit01` repainted, see README.md beside this file), and the chair, a plain
wooden garden chair made here of boxes.

Run, with Blender 4.2 or later (not inside a sandbox: Blender needs the GPU even in background mode):

    MH_ASSETS=/path/to/makehuman_system_assets_cc0 BLENDER_USER_RESOURCES=/path/to/scratch/res \\
    blender -b --python scripts/people/build_seated.py -- <output dir> [<id> ...]

The GLB is in metres, seated, facing +Z (headingOffsetDeg 180 in the catalogue, like the other people), the chair's feet on y = 0, geometry
baked at the pose (no skeleton). It prints its size and where the eyes are, above the feet, to set a seated observer's eye height.
"""
import json
import math
import os
import sys

import addon_utils
import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_people as people  # noqa: E402  (its main() only runs as a script)
import build_pilot as pilot  # noqa: E402

_thing_of = people.thing_of
people.thing_of = lambda obj: "clothes" if "shirt" in obj.name.lower() else _thing_of(obj)

# The hips and the knees at a right angle, the back upright against the backrest, the head level: someone sitting talking.
HIP_DEG, KNEE_DEG, LEAN_BACK_DEG = 90, 88, 6
WOOD = (0.36, 0.25, 0.16)

SEATED = [
    dict(id="seated-man-1951-a", name="Man in his sixties seated on a garden chair, white shirt, grey trousers", gender=1.0, age=0.8, weight=0.55,
         muscle=0.4, heightM=1.76, skin="old_caucasian_male", clothes=["male_shirt1951a"], shoes="shoes03", hair="short02",
         eyebrows="eyebrow001", eyelashes=None, greyHair=True),
    dict(id="seated-man-1951-b", name="Man in his forties seated on a garden chair, pale blue shirt, khaki trousers", gender=1.0, age=0.62, weight=0.6,
         muscle=0.5, heightM=1.80, skin="middleage_caucasian_male", clothes=["male_shirt1951b"], shoes="shoes03", hair="short02",
         eyebrows="eyebrow001", eyelashes=None),
    dict(id="seated-man-1951-c", name="Man in his fifties seated on a garden chair, tan shirt, dark trousers", gender=1.0, age=0.7, weight=0.7,
         muscle=0.45, heightM=1.74, skin="middleage_caucasian_male", clothes=["male_shirt1951c"], shoes="shoes03", hair="short01",
         eyebrows="eyebrow002", eyelashes=None),
    dict(id="seated-man-1951-d", name="Man in his fifties seated on a garden chair, white shirt, brown trousers", gender=1.0, age=0.72, weight=0.45,
         muscle=0.4, heightM=1.78, skin="middleage_caucasian_male", clothes=["male_shirt1951d"], shoes="shoes03", hair="short02",
         eyebrows="eyebrow001", eyelashes=None, greyHair=True),
]


def sit(rig):
    """Seated: the character faces -Y in Blender, so the thighs swing forward by a turn about X of -HIP_DEG and the shins come back down by
    KNEE_DEG; the forearms rest on the thighs, the hands near the knees."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for side in ("L", "R"):
        pilot.world_rotate(rig.pose.bones["upperleg01." + side], "X", -HIP_DEG)
        pilot.world_rotate(rig.pose.bones["lowerleg01." + side], "X", KNEE_DEG)
    pilot.world_rotate(rig.pose.bones["spine05"], "X", -LEAN_BACK_DEG)
    pilot.world_rotate(rig.pose.bones["neck01"], "X", LEAN_BACK_DEG)
    for side, sign in (("L", 1), ("R", -1)):
        knee = rig.pose.bones["lowerleg01." + side].head.copy()
        hip = rig.pose.bones["upperleg01." + side].head.copy()
        # the wrist two thirds of the way from the hip to the knee, on top of the thigh, a little outside it
        wrist_at = hip + (knee - hip) * 0.62 + Vector((sign * 0.03, 0, 0.11))
        pilot.reach(rig, side, wrist_at, Vector((sign * 1.0, 0.6, -0.3)))
    bpy.ops.object.mode_set(mode="OBJECT")


def chair(seat_z, front_y, back_y, half_x, collection):
    """A plain wooden garden chair under him: a seat at `seat_z`, four legs, a backrest behind his back."""
    bm = bmesh.new()
    depth = front_y - back_y
    pilot.box_geometry(bm, (0, (front_y + back_y) / 2, seat_z - 0.02), (2 * half_x, depth, 0.04))
    for x in (-half_x + 0.025, half_x - 0.025):
        for y in (front_y - 0.025, back_y + 0.025):
            pilot.box_geometry(bm, (x, y, (seat_z - 0.04) / 2), (0.04, 0.04, seat_z - 0.04))
        # the back legs go up into the backrest's posts, leaning back
        pilot.segment_geometry(bm, (x, back_y + 0.025, seat_z), (x, back_y + 0.12, seat_z + 0.48), (0.04, 0.04))
    for k in range(3):
        z = seat_z + 0.2 + 0.12 * k
        y = back_y + 0.025 + 0.095 * (z - seat_z) / 0.48
        pilot.box_geometry(bm, (0, y + 0.01, z), (2 * half_x, 0.02, 0.07))
    mesh = bpy.data.meshes.new("chair")
    bm.to_mesh(mesh)
    bm.free()
    return pilot.new_object("chair", mesh, pilot.solid_material("chair", WOOD, 0.8), collection)


def grey_hair():
    for image in bpy.data.images:
        name = image.name.lower()
        if any(word in name for word in ("short0", "hair", "eyebrow")) and "normal" not in name:
            pixels = list(image.pixels)
            for i in range(0, len(pixels), 4):
                luminance = 0.35 + 0.65 * (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
                pixels[i], pixels[i + 1], pixels[i + 2] = (0.55 * luminance, 0.53 * luminance, 0.52 * luminance)
            image.pixels = pixels


def build(spec, data, out_dir):
    people.clear_scene()
    basemesh, rig = people.create_person(spec, data)
    family = [basemesh] + [o for o in set(basemesh.children_recursive) | set(rig.children_recursive) if o is not basemesh]
    rest = bpy.data.meshes.new_from_object(basemesh.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    standing = max(v.co.z for v in rest.vertices) - min(v.co.z for v in rest.vertices)
    bpy.data.meshes.remove(rest)
    sit(rig)
    eyes_at = (rig.matrix_world @ rig.pose.bones["eye.L"].head + rig.matrix_world @ rig.pose.bones["eye.R"].head) / 2
    people.make_opaque()
    if spec.get("greyHair"):
        grey_hair()
    people.shrink_textures()
    baked = people.bake(family)
    body = next(o for o in baked if people.thing_of(o) == "body")
    points = [body.matrix_world @ v.co for v in body.data.vertices]
    feet_z = min(p.z for p in points)
    # The seat: the underside of the thighs, between the hips and the knees.
    hip_y = (rig.matrix_world @ rig.pose.bones["upperleg01.L"].head).y
    knee_y = (rig.matrix_world @ rig.pose.bones["lowerleg01.L"].head).y
    under = [p.z for p in points if min(hip_y, knee_y) + 0.05 < p.y < max(hip_y, knee_y) - 0.05 and abs(p.x) < 0.2]
    seat_z = min(under) + 0.005
    back_y = max(p.y for p in points if seat_z < p.z < seat_z + 0.5) + 0.01
    front_y = knee_y + 0.06
    seat = chair(seat_z - feet_z, front_y, back_y, 0.24, bpy.context.collection)
    seat.location.z = feet_z
    bpy.context.view_layer.update()
    everything = baked + [seat]
    low, high = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for obj in everything:
        a, b = pilot.bounds_of(obj)
        low = Vector((min(low.x, a.x), min(low.y, a.y), min(low.z, a.z)))
        high = Vector((max(high.x, b.x), max(high.y, b.y), max(high.z, b.z)))
    scale = spec["heightM"] / standing
    for obj in everything:
        obj.scale = (scale, scale, scale)
        obj.location = Vector((obj.location.x * scale, obj.location.y * scale, (obj.location.z - low.z) * scale))
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in everything:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = everything[0]
    path = os.path.join(out_dir, spec["id"] + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_yup=True,
                              export_image_format="JPEG", export_jpeg_quality=85)
    centre_y = (low.y + high.y) / 2 * scale
    return {"file": os.path.basename(path), "bytes": os.path.getsize(path),
            "sizeM": {"widthM": round((high.x - low.x) * scale, 3), "lengthM": round((high.y - low.y) * scale, 3), "heightM": round((high.z - low.z) * scale, 3)},
            "eyeAboveFeet": round((eyes_at.z - low.z) * scale, 3), "eyeFromCentreAlong_gltfZ": round(-(eyes_at.y * scale - centre_y), 3)}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    out_dir, only = argv[0], argv[1:]
    os.makedirs(out_dir, exist_ok=True)
    for package in people.MPFB_PACKAGES:
        try:
            if addon_utils.enable(package, default_set=True, persistent=False, handle_error=None):
                break
        except Exception:
            continue
    data = people.stage_assets(os.environ["MH_ASSETS"])
    for spec in SEATED:
        if only and spec["id"] not in only:
            continue
        print("RESULT", spec["id"], json.dumps(build(spec, data, out_dir)))


if __name__ == "__main__":
    main()
