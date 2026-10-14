# People

`build_people.py` builds `public/models/makehuman-people/*.glb`: anonymous, realistic people in plain
country clothes, for decor objects of kind `observer` (a companion who was there) or `entity` (a being
that was seen, when nothing says it was not human). It is run in Blender and is NOT part of any build:
its output is committed, like the other models.

## Why MakeHuman

The base mesh, the targets, the skins, the clothes and the hair of the "MakeHuman system assets" are CC0,
so a person built from them can be re-hosted and redistributed with the rest of the catalogue. Community
asset packs are NOT all CC0: use none without checking its licence file by file.

## Setting it up

Blender 5.2 (4.2 or later works too), with the official MPFB extension: there is nothing to patch.

1. MPFB 2.0.17 from the extension repository (https://extensions.blender.org/add-ons/mpfb/; the `.zip`'s address
   is `archive_url` of `mpfb` in https://extensions.blender.org/api/v1/extensions/, with its sha256), installed
   in a scratch profile:

   ```
   BLENDER_USER_RESOURCES=/path/to/scratch/res /Applications/Blender.app/Contents/MacOS/Blender -b \
     --command extension install-file -r user_default --enable mpfb-2.0.17.zip
   ```
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

5. The Cussac children's clothes. `clothes/male_kidsuit01/` (`#34373d`) and `clothes/female_kidsuit01/` (`#5a4a3e`) are copies
   of `male_casualsuit01` and `female_casualsuit01` (files renamed, the old name replaced inside the `.mhclo` and `.mhmat`)
   whose diffuse texture is one plain colour with a little grain, made like the coveralls above, so that no logo shows.

## Running it

```
MH_ASSETS=/path/to/makehuman_system_assets_cc0 \
BLENDER_USER_RESOURCES=/path/to/scratch/res \
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

`derive_socorro_figure.py` is the exception that runs without Blender: the Socorro figure (two figures "in white
coveralls") is the man of 2 July 1965 with his suit's texture replaced by off-white cloth, written into the .glb
directly. Run it with `python3 scripts/people/derive_socorro_figure.py` (ImageMagick for the cloth).

## The captain of flight AF 3532

`build_pilot.py` builds `makehuman-people/duboc-seated.glb`, Captain Jean-Charles Duboc seated at the left seat of an A320 flight deck, after the
portrait on his rr0.org page (stout, balding, a pepper-and-salt beard, glasses, a white shirt with four-stripe epaulettes and a black tie, a headset).
It uses the helpers of `build_people.py` (which only runs as a script) and the same setup as above, plus:

- `clothes/male_pilotshirt01/` in the system assets: `male_casualsuit01` copied under that name (files renamed, `casualsuit01` replaced by
  `pilotshirt01` inside the `.mhclo` and `.mhmat`), its diffuse texture's shirt islands painted plain white and its jeans island plain navy:

  ```
  magick male_pilotshirt01_diffuse.png \
    \( -size 730x1408 xc:'#e8e8e4' -attenuate 0.15 +noise Gaussian -blur 0x0.8 \) -geometry +0+640 -composite \
    \( -size 420x550 xc:'#e8e8e4' -attenuate 0.15 +noise Gaussian -blur 0x0.8 \) -geometry +1480+430 -composite \
    \( -size 160x370 xc:'#e8e8e4' \) -geometry +1470+1070 -composite \
    \( -size 420x568 xc:'#e8e8e4' -attenuate 0.15 +noise Gaussian -blur 0x0.8 \) -geometry +1480+1480 -composite \
    \( -size 718x2048 xc:'#171f33' -attenuate 0.2 +noise Gaussian -blur 0x0.8 \) -geometry +742+0 -composite \
    -depth 8 -alpha off male_pilotshirt01_diffuse.png
  ```

- What the CC0 assets lack is made on the baked mesh: the beard is a shell of the lower face's own faces pushed out a few millimetres, the hair is
  `short01` with its crown cut away and its colour made grey, the glasses, the headset, the epaulettes and the tie are small solids placed from the
  head's and the shoulders' own measures.
- He is posed seated (hips and knees at a right angle, forearms forward) by turning the rig's bones about world axes, then baked like the others.

```
MH_ASSETS=/path/to/makehuman_system_assets_cc0 BLENDER_USER_RESOURCES=/path/to/scratch/res \
  /Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/people/build_pilot.py -- <output dir>
```

It prints where his eyes are from the middle of the file's box (see `scripts/data/cases/duboc/build_duboc.py`, which places him on the seat).
His height (1.78 m), his trousers and his shoes are ASSUMED: the portrait shows none of them.
