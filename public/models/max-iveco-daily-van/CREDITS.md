# Iveco Daily van

`van.glb` is packed from "Iveco Daily Van 2014" (https://sketchfab.com/3d-models/iveco-daily-van-2014-30003fba5b074d6eb7bc74fd5e1e7d19) by
Max (https://sketchfab.com/Max-5532), licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): see `LICENSE` here and
https://creativecommons.org/licenses/by/4.0/.

Changes (`scripts/extract-iveco-daily-van.py`): scaled by 3.52/4.61 (the original is about 1.32 times the real size: its wheelbase is 4.61 m
where the Daily's 3520 mm version is 3.52 m), turned so that the front is towards -z, centred on its box with the wheels on y = 0; its 35
textures of 4096 px scaled to 1024 px (colour) and 512 px (the others); its windows declared clear glass (KHR_materials_transmission)
instead of a half-opaque grey film; the two glasses of the driver's mirror cut out of the door into a primitive of material "Mirror".
No vertex is moved.

The driver's eye, as `scripts/data/cases/geipan/silly-le-long-2015/add_van.py` seats it: 0.45 m left of the middle, 1.65 m above the
ground, 0.75 m ahead of the centre of the box.
