# People

`build_people.py` builds `public/models/makehuman-people/*.glb`: anonymous, realistic people in plain
country clothes, for decor objects of kind `observer` (a companion who was there) or `entity` (a being
that was seen, when nothing says it was not human). It is run in Blender and is NOT part of any build:
its output is committed, like the other models.

## Why MakeHuman

The base mesh, the targets, the skins, the clothes and the hair of the "MakeHuman system assets" are CC0,
so a person built from them can be re-hosted and redistributed with the rest of the catalogue. Community
asset packs are NOT all CC0: use none without checking its licence file by file.

## Setting it up (Blender 4.0, which is what this was done with)

1. MPFB: `mpfb-2.0.6-rc2.zip` from https://files.makehumancommunity.org/releases/ is the last release
   that is not tied to Blender 4.2's extension platform. Unzip it into a scripts directory, as
   `<scripts>/addons/mpfb/`, then apply two patches to it for Blender 4.0:
   - at the top of `mpfb/__init__.py`, a literal `bl_info = {"name": "mpfb", "version": (2, 0, 6), "blender": (3, 6, 0), "category": "MakeHuman"}`
   - in `mpfb/services/systemservice.py`, `LOWEST_FUNCTIONAL_BLENDER_VERSION = (4, 0, 0)`, and at the end of
     `mpfb/services/__init__.py`, `from .systemservice import LOWEST_FUNCTIONAL_BLENDER_VERSION`
   (MPFB 2.0.17 needs Blender 4.2 or later and needs none of this.)
2. The system assets: https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
   (281 MB), unzipped anywhere (`MH_ASSETS`).
3. The woman's top. The stock `female_casualsuit01` carries the MakeHuman logo, so a copy is made as
   `clothes/female_countrysuit01/` (every file renamed, and `casualsuit01` replaced by `countrysuit01` inside
   the `.mhclo` and `.mhmat`), its diffuse texture altered with ImageMagick (the 2048 px texture):

   ```
   magick female_casualsuit01_diffuse.png \
     \( +clone -crop 380x340+260+280 +repage \) -geometry +1440+320 -composite \
     \( -clone 0 -crop 2048x860+0+0 +repage -colorspace Gray -fill '#7b8340' -tint 110 \) -geometry +0+0 -composite \
     \( -clone 0 -crop 590x530+1458+1170 +repage -colorspace Gray -fill '#7b8340' -tint 110 \) -geometry +1458+1170 -composite \
     female_countrysuit01_diffuse.png
   ```

   (the first step paints the logo out with a patch of plain fabric, the others turn the top olive).

4. The Valensole beings' suits. `clothes/male_coverall01/` (grey-green, for 2 July) and `clothes/male_coverall02/` (darker, for 18 August: "assez foncée") are copies of `male_casualsuit01` (files renamed,
   `casualsuit01` replaced by `coverall01` in the `.mhclo` and `.mhmat`) whose diffuse texture is replaced by a
   plain colour with a little grain, so that no jeans, belt or logo shows (`#7d8574` for the first, `#4b5147`
   for the second):

   ```
   magick -size 2048x2048 xc:'#7d8574' -attenuate 0.35 +noise Gaussian -blur 0x0.8 -depth 8 -alpha off \
     male_coverall01_diffuse.png
   ```

## Running it

```
MH_ASSETS=/path/to/makehuman_system_assets_cc0 \
BLENDER_USER_RESOURCES=/path/to/scratch/res BLENDER_USER_SCRIPTS=/path/to/scratch/scripts \
/Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/people/build_people.py -- <output dir> [<id> ...]
```

Blender needs the GPU even in the background, so it does not start inside a sandbox that forbids Metal.
The output is one GLB per person: standing, arms down (the rig's arms are dropped 38 degrees), geometry
baked at that pose, no skeleton, 512 px textures, scaled to the height written in `PEOPLE`.

The beings (`BEING_PV_0702`, `BEING_PV_0818`, one per procès-verbal) add MPFB targets for the ears, mouth and chin, and
`reshape_head`, which scales every vertex above the neck by the cube root of the volume ratio and sinks
the head into the shoulders; see the comments above each for what the procès-verbal says and what is assumed.

What is chosen there is ASSUMED (ages, builds, clothes): these are nobody's likeness and say nothing
about any witness.
