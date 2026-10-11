"""
Derives the Cussac beings from a person the MakeHuman build already made.

François and Anne-Marie Delpeuch saw four beings of 1 to 1.20 m, "tout d'un noir soyeux, sans distinction de
vêtements ou de visage", whose head "semble avoir des proportions normales, mais le crâne et le menton semblent
plus accentués", with long thin arms and short thin legs (see the dossier). The build of Valensole's 2 July
man (build_people.py, BEING_PV_0702) is the closest thing the catalogue has: a small, stocky figure with an
ordinary head. What differs is that nothing of it may show but black, and a colour is a material factor, which
needs no Blender and no MakeHuman assets: this reads the committed .glb, multiplies every material's base
colour by near-black (skin, hair, eyes, suit, shoes: "sans distinction de vêtements ou de visage") with a silky,
slightly shiny finish, and writes the result next to it.

ASSUMED: the body, which is a man's and not the account's long arms and short legs; the exact black.

Run from the repository root:

    python3 scripts/people/derive_cussac_being.py
"""
import json
import struct
import sys
from pathlib import Path

PEOPLE = Path(__file__).resolve().parent.parent.parent / "public" / "models" / "makehuman-people"
SOURCE = PEOPLE / "valensole-being-pv-1965-07-02.glb"
OUTPUT = PEOPLE / "cussac-being.glb"
BLACK = [0.04, 0.04, 0.045, 1.0]
SILKY_ROUGHNESS = 0.45
JSON_CHUNK = 0x4E4F534A

data = SOURCE.read_bytes()
magic, version, _total = struct.unpack("<4sII", data[:12])
if magic != b"glTF" or version != 2:
    sys.exit(f"{SOURCE} is not a glTF 2 binary")
json_length, json_type = struct.unpack("<II", data[12:20])
assert json_type == JSON_CHUNK
gltf = json.loads(data[20:20 + json_length])
rest = data[20 + json_length:]
for material in gltf["materials"]:
    pbr = material.setdefault("pbrMetallicRoughness", {})
    pbr["baseColorFactor"] = BLACK
    pbr["metallicFactor"] = 0.0
    pbr["roughnessFactor"] = SILKY_ROUGHNESS
text = json.dumps(gltf, separators=(",", ":")).encode()
text += b" " * (-len(text) % 4)
total = 12 + 8 + len(text) + len(rest)
OUTPUT.write_bytes(struct.pack("<4sII", b"glTF", 2, total) + struct.pack("<II", len(text), JSON_CHUNK) + text + rest)
print(f"{OUTPUT.name}: {OUTPUT.stat().st_size} bytes, {len(gltf['materials'])} materials")
