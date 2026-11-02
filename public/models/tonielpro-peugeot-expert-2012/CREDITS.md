# Peugeot Expert van, 2012

`van.glb` is made from "2012 Peugeot Expert" (https://sketchfab.com/3d-models/2012-peugeot-expert-685aadd153804845a8f022d3e9ea4a0f) by
tonielpro520 (https://sketchfab.com/tonielpro520), licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): see `LICENSE`
here and https://creativecommons.org/licenses/by/4.0/.

Changes (`scripts/extract-peugeot-expert.py`): scaled by 3.00/2.75 (the original's wheelbase is 2.75 m where the Expert's of 2007-2016 is
3.00 m), turned so that its front is towards -z, centred on its box with the wheels on y = 0; its windows declared clear glass
(KHR_materials_transmission) instead of a teal film half opaque; the windows of its rear doors made panels of the body's paint (the
gendarmes' van had none, GEIPAN 2015-05-09194); the glass of the driver's mirror given a "Mirror" material (drawn as a mirror, see
src/render3d/MirrorSystem.ts) and turned 12.6 degrees in its housing so that, for the driver's eye below, it shows what is 12 degrees out
from straight behind and level, as a driver sets it (SUPPOSED). No other vertex is moved.

The driver's eye, as `scripts/data/cases/geipan/silly-le-long-2015/add_van.py` seats it: 0.47 m left of the middle, 1.50 m above the
ground, 0.25 m ahead of the centre of the box.
