"""
Builds the captain of flight AF 3532, Jean-Charles Duboc, seated at the left seat of an A320 flight deck, as one GLB
(public/models/makehuman-people/duboc-seated.glb), from MPFB and the MakeHuman system assets (CC0), like the other people of
build_people.py, whose helpers it uses.

What the portrait of his page on rr0.org (people/d/DubocJeanCharles/portrait.gif, taken in a cockpit) shows, and what is
therefore drawn: a stout man, balding with grey hair left on the sides and at the back, a pepper-and-salt beard, glasses, a white
shirt with the gold epaulettes of a captain (four stripes) and a black tie; he wears a headset, as the observer of the recording
is meant to. His age is that of 1994 (born 1951: 43 years). What is NOT from the portrait is ASSUMED: his height (1.78 m, the
portrait does not give it), his trousers (navy, as an airline's), his shoes.

The CC0 system assets have no beard, no glasses and no bald head, so these are made here, on the baked mesh: the beard is a shell of
the lower face's own faces pushed out by a few millimetres, the hair is the stock "short01" with its crown cut away, the glasses, the
headset, the epaulettes and the tie are small solids placed from the head's own measures.

Run, with Blender 4.2 or later (not inside a sandbox: Blender needs the GPU even in background mode):

    MH_ASSETS=/path/to/unzipped/makehuman_system_assets_cc0 \\
    BLENDER_USER_RESOURCES=/path/to/scratch/res \\
    blender -b --python scripts/people/build_pilot.py -- <output dir>

where MH_ASSETS also holds `clothes/male_pilotshirt01/`: the stock `male_casualsuit01` copied under that name (files renamed, the old
name replaced inside the .mhclo and .mhmat), whose diffuse texture has its shirt islands painted plain white (#e8e8e4) and its jeans island
plain navy (#171f33), with a little grain (see README.md beside this file).

The GLB is in metres, seated, facing +Z (headingOffsetDeg 180 in the catalogue, like the other people), feet on y = 0, geometry baked at
the pose (no skeleton). It prints where his eyes are, from the middle of its box, to place the figure on a seat.
"""
import json
import math
import os
import sys

import addon_utils
import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_people as people  # noqa: E402  (its main() only runs as a script)

_thing_of = people.thing_of
# build_people names what it drew "suit"; this garment is a shirt
people.thing_of = lambda obj: "clothes" if "shirt" in obj.name.lower() else _thing_of(obj)

PILOT = dict(id="duboc-seated", name="Captain Duboc, seated (after his portrait)", gender=1.0, age=0.638, weight=0.92, muscle=0.4,
             heightM=1.70, skin="middleage_caucasian_male", clothes=["male_pilotshirt01"], shoes="shoes03", hair="short01",
             eyebrows="eyebrow002", eyelashes=None)
GREY_HAIR = (0.52, 0.50, 0.49)
BEARD = (0.30, 0.29, 0.28)
NAVY_JACKET = (0.05, 0.07, 0.15)
GOLD = (0.72, 0.58, 0.14)
BLACK = (0.03, 0.03, 0.035)
# Flexion of the joints, in degrees: the hips and the knees at a right angle, the forearms forward on the thighs and the controls.
HIP_DEG, KNEE_DEG = 95, 62     # the legs go forward to the pedals: the knees a little above the hips, the shins slanting, feet on the floor of the flight deck
# He is not sitting bolt upright: the upper body leans back against the backrest, and a captain after hours of flight slumps a little
LEAN_BACK_DEG = 24
# ... and his head is brought back upright by the neck, so that he looks straight ahead
NECK_FORWARD_DEG, HEAD_FORWARD_DEG = 14, 10
# Where his hands are, from his eyes, in metres of a figure that stands 1.78 m (x to his left, y up, z forward): read in the flight deck model
# (scripts/extract-a320-cockpit.py's file, clicked from above): the grip of the captain's sidestick is 0.33 m to the left of his eye axis, 0.64 m
# under his eyes (0.28 above the floor of the flight deck, his eyes at 0.83: the height from which the sky ahead is seen up to 18 degrees, as through
# an A320's windscreen) and 0.47 m ahead; the left thrust lever of the pedestal 0.44 m to the right, 0.67 m under and 0.38 m ahead. The wrist is a little
# behind and above the grip.
LEFT_HAND_FROM_EYE = (0.328, -0.550, 0.466)
RIGHT_HAND_FROM_EYE = (-0.444, -0.670, 0.381)
WRIST_BEHIND_GRIP = (0.0, 0.0, -0.065)         # the wrist is this far from the grip, along (left, up, forward), when the hand holds it
ELBOW_POLE = (0.55, -0.45, -0.7)                # where the elbow points, along (outward, up, forward): out, down and back


def world_rotate(pose_bone, axis, degrees):
    """Turns a pose bone about a world axis through its own head (what drop_arms does for the arms)."""
    head = pose_bone.head.copy()
    rotation = Matrix.Translation(head) @ Matrix.Rotation(math.radians(degrees), 4, axis) @ Matrix.Translation(-head)
    pose_bone.matrix = rotation @ pose_bone.matrix
    bpy.context.view_layer.update()


def aim(rig, pose_bone, point):
    """Turns a pose bone, about its head, so that it points at `point` (armature space)."""
    head = pose_bone.head.copy()
    current = (pose_bone.tail - pose_bone.head).normalized()
    wanted = (point - head).normalized()
    rotation = Matrix.Translation(head) @ current.rotation_difference(wanted).to_matrix().to_4x4() @ Matrix.Translation(-head)
    pose_bone.matrix = rotation @ pose_bone.matrix
    bpy.context.view_layer.update()


def reach(rig, side, wrist_at, outward):
    """Two-bone inverse kinematics of an arm: the upper arm and the forearm are turned so that the wrist is at `wrist_at`, the elbow on the
    side the pole `outward` (a vector) points to."""
    upper = rig.pose.bones["upperarm01." + side]
    fore = rig.pose.bones["lowerarm01." + side]
    wrist = rig.pose.bones["wrist." + side]
    shoulder = upper.head.copy()
    a = (fore.head - upper.head).length
    b = (wrist.head - fore.head).length
    to_target = wrist_at - shoulder
    d = min(to_target.length, a + b - 1e-4)
    axis = to_target.normalized()
    x = (a * a - b * b + d * d) / (2 * d)
    h = math.sqrt(max(a * a - x * x, 0.0))
    pole = outward - axis * outward.dot(axis)
    elbow = shoulder + axis * x + pole.normalized() * h
    aim(rig, upper, elbow)
    aim(rig, rig.pose.bones["lowerarm01." + side], wrist_at)
    return a, b, (rig.pose.bones["wrist." + side].head - wrist_at).length


def sit(rig, scale):
    """Seated: the character faces -Y in Blender, so a leg that points down (-Z) is swung forward by a turn about X of -HIP_DEG, and
    the shin, then, brought back down by KNEE_DEG the other way. The hands are put on the sidestick and the thrust lever."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    print("BONES", [b.name for b in rig.pose.bones][:8], "rig matrix", [tuple(round(v, 3) for v in row) for row in rig.matrix_world])
    for side, sign in (("L", 1), ("R", -1)):
        world_rotate(rig.pose.bones["upperleg01." + side], "X", -HIP_DEG)
        world_rotate(rig.pose.bones["lowerleg01." + side], "X", KNEE_DEG)
    world_rotate(rig.pose.bones["spine05"], "X", -LEAN_BACK_DEG)
    world_rotate(rig.pose.bones["neck01"], "X", NECK_FORWARD_DEG)
    world_rotate(rig.pose.bones["head"], "X", HEAD_FORWARD_DEG)
    eyes = (rig.pose.bones["eye.L"].head + rig.pose.bones["eye.R"].head) / 2
    # his left is +X in Blender (he faces -Y), forward is -Y, up is +Z; the table above is in the metres of a 1.78 m figure
    def from_eye(offset, extra):
        left, up, forward = (offset[k] + extra[k] for k in range(3))
        return eyes + Vector((left, -forward, up)) / scale
    for side, hand, outward in (("L", LEFT_HAND_FROM_EYE, Vector((1, 0.45, -0.7))), ("R", RIGHT_HAND_FROM_EYE, Vector((-1, 0.45, -0.7)))):
        # the wrist is behind the grip: the grip is where the hand is, the wrist 6.5 cm back along the line from the elbow's side
        wrist_at = from_eye(hand, (0.0, 0.03, 0.065 * 0.0 - 0.065))
        print("REACH", side, [round(v, 3) for v in reach(rig, side, wrist_at, outward)])
    bpy.ops.object.mode_set(mode="OBJECT")


def recolour_hair():
    """The stock hair is brown: its texture's colour is made grey, its alpha (the strands) kept."""
    for image in bpy.data.images:
        name = image.name.lower()
        if any(word in name for word in ("short01", "hair", "eyebrow")) and "normal" not in name:
            pixels = list(image.pixels)
            for i in range(0, len(pixels), 4):
                luminance = 0.35 + 0.65 * (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2])
                pixels[i], pixels[i + 1], pixels[i + 2] = (GREY_HAIR[0] * luminance, GREY_HAIR[1] * luminance, GREY_HAIR[2] * luminance)
            image.pixels = pixels


def solid_material(name, colour, roughness=0.9):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*colour, 1)
    shader.inputs["Roughness"].default_value = roughness
    return material


def new_object(name, mesh, material, collection):
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def box_geometry(bm, centre, size):
    result = bmesh.ops.create_cube(bm, size=1.0)
    for v in result["verts"]:
        v.co = Vector((centre[0] + v.co.x * size[0], centre[1] + v.co.y * size[1], centre[2] + v.co.z * size[2]))


def segment_geometry(bm, a, b, thickness):
    """A thin bar from a to b."""
    a, b = Vector(a), Vector(b)
    length = (b - a).length
    result = bmesh.ops.create_cube(bm, size=1.0)
    direction = (b - a).normalized()
    rotation = Vector((1, 0, 0)).rotation_difference(direction).to_matrix().to_4x4()
    for v in result["verts"]:
        local = Vector((v.co.x * length, v.co.y * thickness[0], v.co.z * thickness[1]))
        v.co = (a + b) / 2 + rotation @ local


def bounds_of(obj):
    points = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points))), \
        Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))


def beard_shell(body, top, collection):
    """The lower face's own faces, duplicated and pushed out along their normals (more at the chin), grey: a short beard that follows the
    face. The lips are left bare."""
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.transform(body.matrix_world)
    bm.normal_update()
    head = 0.135 * people_height
    keep = []
    for face in bm.faces:
        c = face.calc_center_median()
        n = face.normal
        in_beard = (top - 1.06 * head < c.z < top - 0.72 * head and abs(c.x) < 0.085 * head / 0.24 and n.y < 0.45
                    and c.y < (top_y + 0.015))
        mouth = top - 0.80 * head - 0.02 * head < c.z < top - 0.80 * head + 0.016 * head and abs(c.x) < 0.028 * head / 0.24
        if in_beard and not mouth:
            keep.append(face)
    for face in bm.faces:
        face.select = face in keep
    drop = [f for f in bm.faces if f not in keep]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    for vert in bm.verts:
        depth = 0.004 + 0.009 * min(max((top - 0.86 * head - vert.co.z) / (0.20 * head), 0.0), 1.0)
        vert.co += vert.normal * depth
    mesh = bpy.data.meshes.new("beard")
    bm.to_mesh(mesh)
    bm.free()
    return new_object("beard", mesh, solid_material("beard", BEARD), collection)


def eye_centres(eyes):
    return [(bounds_of(e)[0] + bounds_of(e)[1]) / 2 for e in eyes]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    out_dir = argv[0]
    os.makedirs(out_dir, exist_ok=True)
    for package in people.MPFB_PACKAGES:
        try:
            if addon_utils.enable(package, default_set=True, persistent=False, handle_error=None):
                break
        except Exception:
            continue
    data = people.stage_assets(os.environ["MH_ASSETS"])
    people.clear_scene()
    basemesh, rig = people.create_person(PILOT, data)
    family = [basemesh] + [o for o in set(basemesh.children_recursive) | set(rig.children_recursive) if o is not basemesh]
    global people_height
    # His standing height, as MPFB made him (the rig is at rest here): measured on the body mesh as it is evaluated, since the
    # bounding box of the object carries the shape keys' range and the clothes' proxies
    rest = bpy.data.meshes.new_from_object(basemesh.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    standing = max(v.co.z for v in rest.vertices) - min(v.co.z for v in rest.vertices)
    bpy.data.meshes.remove(rest)
    people_height = standing
    sit(rig, PILOT["heightM"] / standing)
    people.make_opaque()
    recolour_hair()
    people.shrink_textures()
    baked = people.bake(family)
    collection = bpy.context.collection
    body = next(o for o in baked if people.thing_of(o) == "body")
    hair = next((o for o in baked if "short01" in o.name.lower()), None)
    eyes = [o for o in baked if "low-poly" in o.name.lower() or ("eye" in o.name.lower() and "brow" not in o.name.lower() and "lash" not in o.name.lower())]
    print("BAKED", [(o.name, people.thing_of(o)) for o in baked])
    body_points = [body.matrix_world @ v.co for v in body.data.vertices]
    top = max(p.z for p in body_points)
    global top_y
    head_pts = [p for p in body_points if p.z > top - 0.1 * standing]
    print("DEBUG", len(body_points), top, standing, len(head_pts), [o.name for o in eyes])
    top_y = sum(p.y for p in head_pts) / len(head_pts)
    head = 0.135 * standing
    if eyes:
        low_e, high_e = bounds_of(eyes[0])      # one object holds both eyes: each is a sphere of about 12 mm radius at either end
        mid = (low_e + high_e) / 2
        reach = (high_e.x - low_e.x) / 2 - 0.012 * standing / 1.74
        eyes_at = [Vector((mid.x - reach, mid.y, mid.z)), Vector((mid.x + reach, mid.y, mid.z))]
    else:
        eyes_at = [Vector((-0.032, top_y, top - 0.46 * head)), Vector((0.032, top_y, top - 0.46 * head))]
    eye_z = sum(e.z for e in eyes_at) / len(eyes_at)
    front_y = min(p.y for p in head_pts)
    print("DEBUG eye_z", eye_z, [ (round(e.x,3),round(e.y,3),round(e.z,3)) for e in eyes_at])
    half = max(abs(p.x) for p in head_pts if abs(p.z - eye_z) < 0.03)
    print("HEAD", dict(top=top, top_y=top_y, eye_z=eye_z, front_y=front_y, half=half, standing=standing))

    # the hair: only the sides and the back, the crown is bare
    if hair:
        bm = bmesh.new()
        bm.from_mesh(hair.data)
        bm.transform(hair.matrix_world)
        crown = [f for f in bm.faces if f.calc_center_median().z > eye_z + 0.035 + 0.05 * max(0.0, (f.calc_center_median().y - top_y) / 0.1)
                 or f.calc_center_median().y < front_y + 0.045]
        bmesh.ops.delete(bm, geom=crown, context="FACES")
        bm.transform(hair.matrix_world.inverted())
        bm.to_mesh(hair.data)
        bm.free()

    extras = []
    extras.append(beard_shell(body, top, collection))
    # glasses, resting on the nose: the lenses a few millimetres in front of the bridge of the nose (where the face is, at the eyes'
    # height, not the tip of the nose), the temples running back to the ears
    unit = standing / 1.74
    bridge = [p for p in head_pts if abs(p.x) < 0.012 * unit and abs(p.z - eye_z) < 0.015 * unit]
    nasion_y = min(p.y for p in bridge) if bridge else eyes_at[0].y - 0.02
    lens_y = nasion_y - 0.005 * unit
    ear_y = eyes_at[0].y + 0.085 * unit
    print("GLASSES", dict(nasion_y=nasion_y, lens_y=lens_y, ear_y=ear_y, eye_y=eyes_at[0].y, tip_y=front_y))
    bm = bmesh.new()
    for e in eyes_at:
        side = 1 if e.x > 0 else -1
        for dz in (-0.021, 0.021):
            box_geometry(bm, (e.x, lens_y, e.z + dz * unit), (0.056 * unit, 0.004, 0.004))
        for dx in (-0.028, 0.028):
            box_geometry(bm, (e.x + dx * unit, lens_y, e.z), (0.004, 0.004, 0.046 * unit))
        segment_geometry(bm, (e.x + side * 0.028 * unit, lens_y, e.z + 0.012 * unit), (side * half * 0.98, ear_y, e.z + 0.004 * unit), (0.004, 0.004))
        box_geometry(bm, (e.x - side * 0.024 * unit, lens_y + 0.006, e.z - 0.01 * unit), (0.004, 0.012, 0.014))      # the nose pads
    box_geometry(bm, (0, lens_y, eye_z + 0.008 * unit), (0.02 * unit, 0.004, 0.004))                                # the bridge
    mesh = bpy.data.meshes.new("glasses")
    bm.to_mesh(mesh)
    bm.free()
    extras.append(new_object("glasses", mesh, solid_material("glasses", BLACK, 0.4), collection))
    # headset
    bm = bmesh.new()
    ear_y = eyes_at[0].y + 0.085 * unit
    for side in (-1, 1):
        cup = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.048, radius2=0.048, depth=0.034)
        for v in cup["verts"]:
            v.co = Vector((side * (half + 0.026) + v.co.z, ear_y + v.co.y, eye_z - 0.02 + v.co.x))   # axis along X
    previous = None
    for k in range(0, 13):
        angle = math.pi * k / 12
        point = Vector((-math.cos(angle) * (half + 0.026), ear_y, eye_z - 0.02 + math.sin(angle) * (top + 0.016 - (eye_z - 0.02))))
        if previous is not None:
            segment_geometry(bm, previous, point, (0.012, 0.012))
        previous = point
    segment_geometry(bm, (-(half + 0.04), ear_y, eye_z - 0.03), (-0.022, front_y + 0.02, eye_z - 0.1 * head - 0.03), (0.004, 0.004))
    mesh = bpy.data.meshes.new("headset")
    bm.to_mesh(mesh)
    bm.free()
    extras.append(new_object("headset", mesh, solid_material("headset", BLACK, 0.6), collection))
    # epaulettes with their four stripes, on the shoulders: at the head of each upper arm's bone, on top of the shoulder
    bm_base, bm_gold = bmesh.new(), bmesh.new()
    for side in ("L", "R"):
        joint = rig.matrix_world @ rig.pose.bones["upperarm01." + side].head
        box_geometry(bm_base, (joint.x, joint.y, joint.z + 0.052 * standing / 1.74), (0.062, 0.115, 0.009))
        for stripe in range(4):
            box_geometry(bm_gold, (joint.x, joint.y - 0.045 + stripe * 0.03, joint.z + 0.058 * standing / 1.74), (0.062, 0.010, 0.004))
    for name, bm_part, colour in (("epaulettes", bm_base, NAVY_JACKET), ("stripes", bm_gold, GOLD)):
        mesh = bpy.data.meshes.new(name)
        bm_part.to_mesh(mesh)
        bm_part.free()
        extras.append(new_object(name, mesh, solid_material(name, colour, 0.5), collection))
    # the tie: the shirt's own faces down the front of the chest and belly, pushed out a few millimetres, black
    shirt = next((o for o in baked if people.thing_of(o) == "clothes"), None)
    if shirt:
        bm = bmesh.new()
        bm.from_mesh(shirt.data)
        bm.transform(shirt.matrix_world)
        bm.normal_update()
        chest_top = top - 1.12 * head
        belly = [f for f in bm.faces if abs(f.calc_center_median().x) < 0.024 and f.normal.y < -0.15
                 and chest_top - 0.40 < f.calc_center_median().z < chest_top]
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in belly], context="FACES")
        for vert in bm.verts:
            vert.co += vert.normal * 0.004
        mesh = bpy.data.meshes.new("tie")
        bm.to_mesh(mesh)
        bm.free()
        extras.append(new_object("tie", mesh, solid_material("tie", BLACK, 0.5), collection))

    empty = [o.name for o in extras if len(o.data.vertices) == 0]
    if empty:
        print("EMPTY", empty)
    extras = [o for o in extras if len(o.data.vertices) > 0]
    everything = baked + extras
    low, high = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for obj in everything:
        a, b = bounds_of(obj)
        low = Vector((min(low.x, a.x), min(low.y, a.y), min(low.z, a.z)))
        high = Vector((max(high.x, b.x), max(high.y, b.y), max(high.z, b.z)))
    scale = PILOT["heightM"] / standing
    for obj in everything:
        obj.scale = (scale, scale, scale)
        obj.location = Vector((obj.location.x * scale, obj.location.y * scale, (obj.location.z - low.z) * scale))
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in everything:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = everything[0]
    path = os.path.join(out_dir, PILOT["id"] + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_yup=True,
                              export_image_format="JPEG", export_jpeg_quality=85)
    # where his eyes are in the file's own frame (glTF: x right of the viewer, y up, z = -Y of Blender, so that he faces +z), from the
    # middle of the box across and along, and above his feet
    centre_x = (low.x + high.x) / 2 * scale
    centre_y = (low.y + high.y) / 2 * scale
    eye = sum(eyes_at, Vector()) / len(eyes_at)
    print("RESULT", json.dumps({
        "file": os.path.basename(path), "bytes": os.path.getsize(path),
        "sizeM": {"widthM": round((high.x - low.x) * scale, 3), "lengthM": round((high.y - low.y) * scale, 3),
                  "heightM": round((high.z - low.z) * scale, 3)},
        "eyeFromCentreAcross_x": round(eye.x * scale - centre_x, 3),
        "eyeFromCentreAlong_gltfZ": round(-(eye.y * scale - centre_y), 3),
        "eyeAboveFeet": round((eye.z - low.z) * scale, 3)}))


if __name__ == "__main__":
    main()
