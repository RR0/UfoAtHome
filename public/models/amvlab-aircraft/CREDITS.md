# amvlab aircraft models

`A320_nologo.glb`, `B737_nologo.glb`, `A350_nologo.glb`, `A380_nologo.glb` and `B787_nologo.glb` are from https://github.com/amvlab/aircraft-models (commit 91d835e8e851b2317fe79af291c9fed6153fd525),
© 2026 amvlab, licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): see `LICENSE` here and
https://creativecommons.org/licenses/by/4.0/.

Changes: none to the files. They are scaled at load time to the real length of the aircraft type they draw (so the A320 model draws
an A321 longer), turned to face the direction the scene calls forward (`headingOffsetDeg: -90`: the models face +X), and lit by the scene.
Their navigation lights and strobes are added by the renderer, not part of the files.

Each is a single mesh with one texture: 5,229 triangles for the A320, 2,670 for the 737, 3,710 for the A350, 3,338 for the A380 and 3,378
for the 787. None claims to be a particular variant: the 737 is drawn for every 737 of the record, classic or next generation, the A320
for every A318 to A321, the A350 for the -900 and the -1000, the 787 for the -8, -9 and -10. The A380 file is in an arbitrary unit (it is
about 176 units long): only its proportions are used, the scene scales it to 72.7 m.
