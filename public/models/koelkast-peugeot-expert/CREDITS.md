# Peugeot Expert van

`van.glb` is made from "Peugeot Expert" (https://sketchfab.com/3d-models/peugeot-expert-db5a6b979f4943ee9d596051a2702dec) by
KOElkast1007 (https://sketchfab.com/koelkastasbers), under the Sketchfab Standard licence (https://sketchfab.com/licenses): see `LICENSE`
here.

Changes (`scripts/extract-peugeot-expert.py`): centred on its box with the wheels on y = 0 (it is at the real size already, its front
towards -z); each primitive simplified to 15 % of its triangles at most a centimetre off (951 000 → 201 000), its textures scaled to
1024 px, the texture coordinates no material reads and the all-white vertex colours left out; its windows declared clear glass
(KHR_materials_transmission) instead of a black film a quarter opaque; the windows of its rear doors made panels of the body's paint (the
gendarmes' van had none, GEIPAN 2015-05-09194); the glass of the driver's mirror given a "Mirror" material (drawn as a mirror, see
src/render3d/MirrorSystem.ts) and turned 13.8 degrees in its housing so that, for the driver's eye below, it shows what is 12 degrees out
from straight behind and level, as a driver sets it (SUPPOSED).

The driver's eye, as `scripts/data/cases/geipan/silly-le-long-2015/add_van.py` seats it: 0.40 m left of the middle, 1.58 m above the
ground, 0.25 m ahead of the centre of the box.
