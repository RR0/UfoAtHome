"""
Derives the Socorro figure from a person the MakeHuman build already made.

Lonnie Zamora saw two figures "in white coveralls" beside the craft, small, "possibly small adults or large
children". That is a person in a one-piece suit, and the build of Valensole's 2 July man (see
build_people.py, BEING_PV_0702) already is one: an adult in a plain coverall, bare-headed. What differs is the
colour of the suit, and a colour is a texture, which needs no Blender and no MakeHuman assets: this reads the
committed .glb, replaces the suit's diffuse image with plain off-white cloth, and writes the result next to it.

The body, face, hair and shoes are untouched; they are MakeHuman's own CC0 assets, as in the file it is made from.
ASSUMED, as in the account's own wording: that the coverall was white cloth, its exact whiteness, the beings' age
and their build.

Run from the repository root; ImageMagick (`magick`) writes the cloth:

    python3 scripts/people/derive_socorro_figure.py
"""
import json
import struct
import subprocess
import sys
from pathlib import Path

PEOPLE = Path(__file__).resolve().parent.parent.parent / "public" / "models" / "makehuman-people"
SOURCE = PEOPLE / "valensole-being-pv-1965-07-02.glb"
OUTPUT = PEOPLE / "socorro-figure.glb"
SUIT_IMAGE = "male_coverall01_diffuse"
# Off-white rather than white: a pure 1.0 albedo is not a thing cloth is, and the scene's own light
# does the rest. A little grain, as in the Valensole suits, so that it reads as cloth and not as a decal.
CLOTH = "#e6e5de"


class GlbFile:
    """A binary glTF, read into its JSON and its buffer views, and written back."""

    JSON_CHUNK = 0x4E4F534A
    BIN_CHUNK = 0x004E4942

    def __init__(self, path: Path):
        data = path.read_bytes()
        magic, version, _length = struct.unpack("<4sII", data[:12])
        if magic != b"glTF" or version != 2:
            sys.exit(f"{path} is not a glTF 2 binary")
        json_length, json_type = struct.unpack("<II", data[12:20])
        assert json_type == self.JSON_CHUNK
        self.gltf = json.loads(data[20:20 + json_length])
        offset = 20 + json_length
        bin_length, bin_type = struct.unpack("<II", data[offset:offset + 8])
        assert bin_type == self.BIN_CHUNK
        binary = data[offset + 8:offset + 8 + bin_length]
        self.views = [binary[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
                      for v in self.gltf["bufferViews"]]

    def replace_image(self, name: str, image: bytes) -> None:
        for entry in self.gltf["images"]:
            if entry.get("name") == name:
                self.views[entry["bufferView"]] = image
                return
        sys.exit(f"no image named {name}")

    def write(self, path: Path) -> None:
        binary = b""
        for index, view in enumerate(self.views):
            binary += b"\0" * (-len(binary) % 4)
            self.gltf["bufferViews"][index]["byteOffset"] = len(binary)
            self.gltf["bufferViews"][index]["byteLength"] = len(view)
            binary += view
        binary += b"\0" * (-len(binary) % 4)
        self.gltf["buffers"] = [{"byteLength": len(binary)}]
        text = json.dumps(self.gltf, separators=(",", ":")).encode()
        text += b" " * (-len(text) % 4)
        total = 12 + 8 + len(text) + 8 + len(binary)
        path.write_bytes(
            struct.pack("<4sII", b"glTF", 2, total)
            + struct.pack("<II", len(text), self.JSON_CHUNK) + text
            + struct.pack("<II", len(binary), self.BIN_CHUNK) + binary
        )


def cloth() -> bytes:
    return subprocess.run(
        ["magick", "-size", "512x512", f"xc:{CLOTH}", "-attenuate", "0.25", "+noise", "Gaussian", "-blur", "0x0.8",
         "-depth", "8", "-alpha", "off", "-quality", "88", "jpg:-"],
        check=True, capture_output=True).stdout


glb = GlbFile(SOURCE)
glb.replace_image(SUIT_IMAGE, cloth())
glb.write(OUTPUT)
print(f"{OUTPUT.name}: {OUTPUT.stat().st_size} bytes")
