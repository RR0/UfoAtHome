# The United States Capitol

`capitol.glb` is simplified from "US_capitol_building" (https://sketchfab.com/3d-models/us-capitol-building-d4049804543d4d49813767d2e9b72664) by
ycpan3468 (https://sketchfab.com/ycpan3468), licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): see `LICENSE` here and
https://creativecommons.org/licenses/by/4.0/.

Changes: the download is a photogrammetric capture of the building and its grounds, 704 057 triangles and a 4K texture (38 MB).
`scripts/models/simplify-gltf.ts` (ratio 0.12, error 0.05, borders unlocked, `LOCK_BORDER=0`) brings it to 83 078 triangles and its texture
to 2048 px, which is 3.7 MB: scenery seen from a few hundred metres. No other edit. In the file, x is east, y north and z up (the root
node turns z up to y up), the dome's axis is at (3, 30), the long axis of the building at 52.7 degrees from x, and the statue's top 230
units above the east plaza, which is 88 m: 0.383 m a unit. Its daytime light is baked into the texture (an unlit material).
