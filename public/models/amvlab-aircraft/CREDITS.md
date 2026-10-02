# amvlab aircraft models

`A320_nologo.glb` and `B737_nologo.glb` are from https://github.com/amvlab/aircraft-models (commit 91d835e8e851b2317fe79af291c9fed6153fd525),
© 2026 amvlab, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): see `LICENSE` here and
https://creativecommons.org/licenses/by/4.0/.

Changes: none to the files. They are scaled at load time to the real length of the aircraft type they draw (so the A320 model draws
an A321 longer), turned to face the direction the scene calls forward (`headingOffsetDeg: -90`: the models face +X), and lit by the scene.
Their navigation lights and strobes are added by the renderer, not part of the files.

The A320 model is a single mesh of 5,229 triangles and the 737 of 2,670, each with one texture. Neither claims to be a particular
variant: the 737 is drawn for every 737 of the record, classic or next generation, and the A320 for every A318 to A321.
