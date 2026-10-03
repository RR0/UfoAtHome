"""
Builds the anonymous, realistic people UFO@home offers as decor (public/models/makehuman-people/),
with MPFB (the MakeHuman add-on for Blender) and the MakeHuman system assets (CC0).

UFO@home does not design models (see public/models/README.md): it references and places them. These
people are what a recording means by "a man who was there" or "a being that looked human" when
nothing more is known, so they are deliberately ordinary: plain country clothes, no insignia, no
brand. Their body proportions come from MPFB's macro targets (gender, age, height, weight, muscle);
what is chosen here, and therefore ASSUMED, is their age, build and clothes, never anyone's likeness.

Run, with Blender 4.0 or later (background mode needs the GPU, so not inside a sandbox):

    MH_ASSETS=/path/to/unzipped/makehuman_system_assets_cc0 \
    MPFB_ADDONS=/path/to/dir/containing/mpfb \
    BLENDER_USER_RESOURCES=/path/to/scratch/res \
    BLENDER_USER_SCRIPTS=/path/to/scratch/scripts \
    blender -b --python scripts/people/build_people.py -- <output dir> [<id> ...]

MPFB 2.0.6 is an "extension": for Blender 4.0 it needs `bl_info` added to its __init__.py, and
LOWEST_FUNCTIONAL_BLENDER_VERSION exported by services/__init__.py (see README.md beside this file).

What comes out of it: one GLB per person, standing, arms down, geometry baked at that pose (no
skeleton: a static decor object does not need one, and it is most of a rigged file's weight),
textures reduced to 512 px.
"""
import os
import sys
import shutil
import json
import math

import bpy
import addon_utils
from mathutils import Matrix, Vector

TEXTURE_PX = 512
ARM_DROP_RAD = math.radians(38)
# What to keep of each mesh's triangles. People are seen from three to ninety metres, so the clothes
# and the body, whose surfaces are smooth, give up half of them; the head's features and the hair,
# which are small, give up none.
DECIMATION = {"body": 0.6, "clothes": 0.5, "shoes": 0.5}

# id, label, macros (gender 0 female 1 male; age 0.5 = 25 y, 1.0 = 90 y; 0.615 ≈ 40 y, 0.77 ≈ 60 y),
# heightM, skin, clothes, shoes, hair, eyebrows, eyelashes
PEOPLE = [
    dict(id="farmer-40s", name="Man in his forties, denim shirt and jeans", gender=1.0, age=0.615, weight=0.55, muscle=0.55,
         heightM=1.74, skin="middleage_caucasian_male", clothes=["male_casualsuit01"], shoes="shoes03", hair="short02",
         eyebrows="eyebrow001", eyelashes=None),
    dict(id="man-overalls", name="Man in overalls", gender=1.0, age=0.58, weight=0.6, muscle=0.6,
         heightM=1.78, skin="young_caucasian_male", clothes=["male_worksuit01"], shoes="shoes03", hair="short03",
         eyebrows="eyebrow003", eyelashes=None),
    dict(id="man-jacket", name="Man in a green jacket and jeans", gender=1.0, age=0.55, weight=0.5, muscle=0.5,
         heightM=1.80, skin="young_caucasian_male2", clothes=["male_casualsuit05"], shoes="shoes01", hair="short04",
         eyebrows="eyebrow005", eyelashes=None),
    dict(id="old-man", name="Old man, striped shirt", gender=1.0, age=0.88, weight=0.5, muscle=0.35,
         heightM=1.70, skin="old_caucasian_male", clothes=["male_casualsuit03"], shoes="shoes04", hair="short01",
         eyebrows="eyebrow002", eyelashes=None),
    dict(id="woman", name="Woman, plain top and jeans", gender=0.0, age=0.6, weight=0.5, muscle=0.4,
         heightM=1.65, skin="middleage_caucasian_female", clothes=["female_countrysuit01"], shoes="shoes02", hair="ponytail01",
         eyebrows="eyebrow004", eyelashes="eyelashes01"),
]

# The beings seen at Valensole, after Maurice Masse's account (the dossier page on rr0.org): "1 m
# environ", "morphologie générale proche de la nôtre", a head "anormalement grosse par rapport au
# corps (3 fois celle d'un humain)", bald, white skin, long ears, prominent fleshy cheekbones, a small
# round mouth, "presque pas de cou tant leur tête était rentrée dans les épaules", eyes that move,
# one-piece grey-green suits. Nothing on the head: no helmet is reported in any version (the only
# helmet is the "American helicopter pilot" hypothesis, which is an interpretation of its own).
# Later precisions (from a statement of his, source to be cited): "environ un mètre" or "1 m à 1,10 m", faces
# without hair, an unusual, unwrinkled skin, a globular head he later compared to a pumpkin, large black eyes
# and no ordinary human features. "Tanned" is a later journalistic image, not his word, so the skin stays pale.
# The 2 July 1965 gendarmerie summary says "taille 1 m environ, de forte corpulence, vêtu d'une combinaison,
# tête nue": stocky, in a suit, bare-headed.
# ASSUMED: a child's body at about 8 years (the account gives no build), eye size, the exact grey-green,
# and a standing pose (he first saw them crouched).
HEAD_VOLUME_RATIO = 3.0
BEING = dict(id="valensole-being", name="Valensole being, after Maurice Masse's account", gender=1.0, age=0.15,
             weight=0.8, muscle=0.4, heightM=1.0, skin="young_caucasian_male",
             clothes=["male_coverall01"], shoes="shoes03", hair=None, eyebrows=None, eyelashes=None,
             targets={"ears/l-ear-scale-vert-incr": 1.0, "ears/r-ear-scale-vert-incr": 1.0,
                      "ears/l-ear-scale-incr": 1.0, "ears/r-ear-scale-incr": 1.0,
                      "ears/l-ear-wing-incr": 1.0, "ears/r-ear-wing-incr": 1.0,
                      "ears/l-ear-shape-pointed": 0.8, "ears/r-ear-shape-pointed": 0.8,
                      "cheek/l-cheek-bones-incr": 1.0, "cheek/r-cheek-bones-incr": 1.0,
                      "cheek/l-cheek-volume-incr": 1.0, "cheek/r-cheek-volume-incr": 1.0,
                      "mouth/mouth-scale-horiz-decr": 1.0, "mouth/mouth-scale-vert-decr": 1.0,
                      "mouth/mouth-lowerlip-volume-decr": 0.6, "mouth/mouth-upperlip-volume-decr": 0.6,
                      "eyes/l-eye-scale-incr": 2.0, "eyes/r-eye-scale-incr": 2.0,
                      "eyes/l-eye-trans-out": 0.6, "eyes/r-eye-trans-out": 0.6,
                      "eyes/l-eye-height1-incr": 1.0, "eyes/r-eye-height1-incr": 1.0,
                      "eyes/l-eye-height2-incr": 1.0, "eyes/r-eye-height2-incr": 1.0,
                      "nose/nose-scale-vert-decr": 0.4, "nose/nose-scale-horiz-decr": 0.4,
                      "nose/nose-scale-depth-decr": 0.4, "nose/nose-volume-decr": 0.3,
                      "head/head-round": 1.0, "head/head-scale-horiz-incr": 0.6,
                      "chin/chin-width-decr": 1.0, "chin/chin-height-decr": 0.5},
             black_eyes=True,
             head=dict(volumeRatio=HEAD_VOLUME_RATIO, sinkShare=0.4, girth=(1.3, 1.2)))
PEOPLE.append(BEING)


def mhclo(assets, kind, name):
    return os.path.join(assets, kind, name, name + ".mhclo")


def stage_assets(assets):
    """Copies the system assets to where MPFB looks, with the plain woman's suit made from the
    stock one: the same garment, its logo painted out and its colours muted (see recolor_suit)."""
    from mpfb.services.locationservice import LocationService
    data = LocationService.get_user_data()
    for sub in os.listdir(assets):
        src = os.path.join(assets, sub)
        if not os.path.isdir(src):
            continue
        for asset in os.listdir(src):
            target = os.path.join(data, sub, asset)
            if not os.path.exists(target):
                if os.path.isdir(os.path.join(src, asset)):
                    shutil.copytree(os.path.join(src, asset), target)
                else:
                    os.makedirs(os.path.dirname(target), exist_ok=True)
                    shutil.copy2(os.path.join(src, asset), target)
    return data


def stripped(name):
    return name.rsplit(".", 1)[0]


def load_targets(basemesh, targets):
    """Face and body targets MPFB offers beyond the macros (ears, cheeks, mouth, eyes), by name.
    A weight above 1 is allowed (a slider's range is only a convention), but MPFB's own
    reapply_all_details clamps every key back to 1, so the weights are written AFTER it."""
    from mpfb.services.targetservice import TargetService
    for name, weight in targets.items():
        path = TargetService.target_full_path(name.split("/")[-1])
        if not path:
            raise ValueError("No such target: " + name)
        TargetService.load_target(basemesh, path, weight=min(weight, 1.0), name=name.split("/")[-1])
    if targets:
        TargetService.reapply_all_details(basemesh)
        keys = basemesh.data.shape_keys.key_blocks
        for name, weight in targets.items():
            key = keys.get(name.split("/")[-1])
            if key is not None:
                key.slider_max = max(1.0, weight)
                key.value = weight


def create_person(spec, data):
    from mpfb.services.humanservice import HumanService
    macros = {"gender": spec["gender"], "age": spec["age"], "muscle": spec["muscle"], "weight": spec["weight"],
              "proportions": 0.5, "height": 0.5, "cupsize": 0.5, "firmness": 0.5,
              "race": {"caucasian": 1.0, "african": 0.0, "asian": 0.0}}
    basemesh = HumanService.create_human(macro_detail_dict=macros)
    load_targets(basemesh, spec.get("targets", {}))
    rig = HumanService.add_builtin_rig(basemesh, "default_no_toes")
    skin = os.path.join(data, "skins", spec["skin"], spec["skin"] + ".mhmat")
    HumanService.set_character_skin(skin, basemesh, skin_type="GAMEENGINE")
    parts = []
    for kind, name, asset_type in (
            [("eyes", "low-poly", "Eyes")]
            + ([("eyebrows", spec["eyebrows"], "Eyebrows")] if spec["eyebrows"] else [])
            + ([("eyelashes", spec["eyelashes"], "Eyelashes")] if spec["eyelashes"] else [])
            + ([("hair", spec["hair"], "Hair")] if spec["hair"] else [])
            + [("clothes", c, "Clothes") for c in spec["clothes"]]
            + [("clothes", spec["shoes"], "Clothes")]):
        path = mhclo(data, kind, name)
        asset = HumanService.add_mhclo_asset(path, basemesh, asset_type=asset_type, subdiv_levels=0,
                                             material_type="GAMEENGINE")
        parts.append(asset)
    return basemesh, rig


def drop_arms(rig):
    """The rig's rest pose has the arms out at about 45 degrees; a person standing has them down."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for side, sign in (("L", 1), ("R", -1)):
        pb = rig.pose.bones["upperarm01." + side]
        head = pb.head.copy()
        rot = Matrix.Translation(head) @ Matrix.Rotation(sign * ARM_DROP_RAD, 4, "Y") @ Matrix.Translation(-head)
        pb.matrix = rot @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")


def thing_of(obj):
    name = obj.name.lower()
    if "shoes" in name:
        return "shoes"
    if "suit" in name:
        return "clothes"
    if name.startswith("human") and name.count(".") <= 1 and not any(w in name for w in ("eye", "low-poly", "short", "ponytail", "lash", "brow")):
        return "body"
    return "other"


def bake(objects):
    """Each mesh as evaluated now (armature at its pose, masks and modifiers applied), as a plain
    new object keeping its materials: what the glTF exporter would otherwise leave at the bind pose."""
    for obj in objects:
        if obj.type == "MESH" and not obj.hide_viewport:
            ratio = DECIMATION.get(thing_of(obj))
            if ratio:
                modifier = obj.modifiers.new("Lighter", "DECIMATE")
                modifier.ratio = ratio
    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked = []
    for obj in objects:
        if obj.type != "MESH" or obj.hide_viewport:
            continue
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        if len(mesh.vertices) == 0:
            continue
        copy = bpy.data.objects.new(obj.name, mesh)
        copy.matrix_world = obj.matrix_world
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        bpy.context.collection.objects.link(copy)
        baked.append(copy)
    return baked


def make_opaque():
    """MPFB's game-engine materials come out as alpha BLEND, which sorts badly and lets the skin and
    the trousers show through each other. Only hair, eyebrows and eyelashes have an edge worth
    cutting (alpha clip); everything else is a solid surface with no alpha at all."""
    for material in bpy.data.materials:
        if not material.node_tree:
            continue
        cut = any(word in material.name.lower() for word in ("hair", "eyebrow", "eyelash", "short0", "ponytail", "bob0", "long0", "afro", "braid"))
        material.blend_method = "CLIP" if cut else "OPAQUE"
        material.alpha_threshold = 0.5
        if not cut:
            for link in list(material.node_tree.links):
                if link.to_socket.name == "Alpha":
                    material.node_tree.links.remove(link)
    for image in bpy.data.images:
        if image.name.lower().find("hair") < 0 and image.name.lower().find("eyebrow") < 0 and image.name.lower().find("eyelash") < 0:
            image.alpha_mode = "NONE"


def reshape_head(baked, head):
    """A head of `volumeRatio` times the volume (a linear factor of its cube root) set into the
    shoulders: every vertex above the neck is scaled about the neck's base and drawn down by
    `sinkShare` of the head's height, smoothly across the neck so that nothing tears. Done on the
    baked vertices of EVERY mesh, so the skin, eyes and clothes move together."""
    height, low = height_of(baked)
    top = low + height
    scale = head["volumeRatio"] ** (1.0 / 3.0)
    neck_z = top - 0.19 * height
    head_height = top - neck_z
    margin = 0.05 * head_height
    sink = head["sinkShare"] * head_height * scale
    above = [o.matrix_world @ v.co for o in baked for v in o.data.vertices if (o.matrix_world @ v.co).z > neck_z + margin]
    centre_x = sum(p.x for p in above) / len(above)
    centre_y = sum(p.y for p in above) / len(above)
    below = [o.matrix_world @ v.co for o in baked for v in o.data.vertices if (o.matrix_world @ v.co).z < neck_z - margin]
    body_centre_y = sum(p.y for p in below) / len(below)
    for obj in baked:
        mesh = obj.data
        for vertex in mesh.vertices:
            world = obj.matrix_world @ vertex.co
            weight = min(max((world.z - (neck_z - margin)) / (2 * margin), 0.0), 1.0)
            weight = weight * weight * (3 - 2 * weight)
            if weight <= 0.0:
                # Below the head: the body is made stockier about its own axis ("de forte corpulence").
                girth = head.get("girth")
                if girth:
                    body_x = 1.0 + (girth[0] - 1.0) * (1.0 - weight)
                    body_y = 1.0 + (girth[1] - 1.0) * (1.0 - weight)
                    world.x = centre_x + (world.x - centre_x) * body_x
                    world.y = body_centre_y + (world.y - body_centre_y) * body_y
                    vertex.co = obj.matrix_world.inverted() @ world
                continue
            factor = 1.0 + (scale - 1.0) * weight
            world.x = centre_x + (world.x - centre_x) * factor
            world.y = centre_y + (world.y - centre_y) * factor
            world.z = neck_z + (world.z - neck_z) * factor - sink * weight
            vertex.co = obj.matrix_world.inverted() @ world
        mesh.update()
    return scale


def blacken_eyes():
    """\"De grands yeux noirs\": the eye asset's material is a textured eyeball (white, iris, pupil);
    its colour is cut loose from the texture and set to black, glossy like a wet surface."""
    for material in bpy.data.materials:
        if "low-poly" not in material.name.lower() or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                for link in list(node.inputs["Base Color"].links):
                    material.node_tree.links.remove(link)
                node.inputs["Base Color"].default_value = (0.01, 0.01, 0.012, 1.0)
                node.inputs["Roughness"].default_value = 0.15


def shrink_textures():
    for image in bpy.data.images:
        if image.size[0] > TEXTURE_PX or image.size[1] > TEXTURE_PX:
            image.scale(TEXTURE_PX, TEXTURE_PX)


def height_of(objects):
    low, high = 1e9, -1e9
    for obj in objects:
        for corner in obj.bound_box:
            z = (obj.matrix_world @ Vector(corner)).z
            low, high = min(low, z), max(high, z)
    return high - low, low


def export(spec, baked, out_dir):
    height, low = height_of(baked)
    scale = spec["heightM"] / height
    for obj in baked:
        obj.scale = (scale, scale, scale)
        obj.location.z = -low * scale
        obj.location.x *= scale
        obj.location.y *= scale
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in baked:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    path = os.path.join(out_dir, spec["id"] + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=False,
                              export_yup=True, export_image_format="JPEG", export_jpeg_quality=85)
    return path, os.path.getsize(path), scale


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for item in list(coll):
            coll.remove(item)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    out_dir, only = argv[0], argv[1:]
    os.makedirs(out_dir, exist_ok=True)
    addon_utils.enable("mpfb", default_set=True, persistent=False, handle_error=None)
    data = stage_assets(os.environ["MH_ASSETS"])
    report = {}
    for spec in PEOPLE:
        if only and spec["id"] not in only:
            continue
        clear_scene()
        basemesh, rig = create_person(spec, data)
        drop_arms(rig)
        family = [basemesh] + [o for o in set(basemesh.children_recursive) | set(rig.children_recursive) if o is not basemesh]
        make_opaque()
        if spec.get("black_eyes"):
            blacken_eyes()
        shrink_textures()
        baked = bake(family)
        if spec.get("head"):
            reshape_head(baked, spec["head"])
        path, size, scale = export(spec, baked, out_dir)
        report[spec["id"]] = {"file": os.path.basename(path), "bytes": size, "scaleApplied": round(scale, 3),
                              "meshes": len(baked)}
        print("PERSON", spec["id"], report[spec["id"]])
    print("REPORT", json.dumps(report))


main()
