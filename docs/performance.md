# Playback performance

## Reproducing a CPU profile

Start `npm run dev`. With Playwright available, run:

```sh
node scripts/perf/profile-scene.mjs witness-valensole /tmp/valensole
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright installation and `CHROME_PATH`
to an installed Chrome executable. `PROFILE_ORIGIN` defaults to `http://127.0.0.1:5173`.
The script opens one isolated scene at 1000 × 800, waits five seconds for resources,
starts playback, warms up for six seconds, then samples eight seconds. It writes a
Chrome `.cpuprofile`, a JSON report and a screenshot. Import the profile into Chrome
DevTools Performance. The report includes errors and whether real terrain loaded;
compare the same scene, dimensions and terrain availability across revisions.

This measures the main thread in headless Chrome. It does not measure GPU time or
guarantee the same frame rate on a user's device. Cold shader compilation and loading
are separate measurements. Run profiles sequentially to avoid competing for the GPU.

## September 2026 investigation (based on 0.57.9)

Valensole exposed three sources of redundant work:

- The astronomy cache limited time updates but used exact observer coordinates.
  Walking invalidated it on every frame, rebuilding the sky and shader materials.
  Geographic cache cells now span one tenth of a display pixel per angular axis;
  a cache miss computes the actual date and position, without rounding the recording.
  Terrain, scenery and weather motion still update every instant.
- Gait translated crops but not the terrain underneath them. Their terrain-relative
  cache consequently missed and refitted every plant, including bounding volumes.
  Both now share the horizontal translation. Crop fitting also inverts each mesh's
  matrix once instead of once per plant.
- Legacy surface cloud weather updates replaced geometry and materials despite only
  changing uniform values. Existing water and cirrus surfaces are now reused; zero
  coverage still removes them.

In the eight-second measurements, before the spatial astronomy cache fix the main
thread was occupied for nearly the entire sample, with 5.2–6.6 seconds attributed to
`getProgramInfoLog`. After it, two runs recorded 6.1–6.6 seconds idle and 82–109 ms in
that call. These are intermediate-to-final comparisons on the same local harness,
not a controlled production FPS benchmark. The final Valensole run loaded terrain
and reported no page errors.

Regression tests cover material identity across 60 weather updates, removal at zero
coverage, stable crop fitting across gait, refitting after a real move, and astronomy
refresh after a significant position change.

## Remaining measured work

### Aircraft / long exposure follow-up

Sky updates previously disposed the sky dome, ground disc and all star-tier materials.
The dome now retains its mesh and updates its colour buffer; the ground is rebuilt only
when its radius changes. Star tiers retain their Points objects and materials while
their positions, visibility and brightness are recomputed for each requested sky instant.
No exposure samples are removed by these changes.

Star conversion also shares one Astronomy Engine AstroTime and observer per catalogue
snapshot. A local warm microbenchmark of 20,000 conversions measured 6.08–6.31 ms
before and 5.11–5.24 ms after (three runs); numeric results were identical. Tests compare
480 positions across dates, latitudes and declinations using the original refracted
conversion, and check that star positions still move while materials retain identity.

The Chrome aircraft profile could not run: automatic approval reported an account usage
limit. These microbenchmark results do not establish a playback FPS improvement, and the
aircraft's visual trails and GPU cost still need browser verification.

### Multiple repaints

Compass hover previously called the general render path, restarting a long exposure even
when compass labels were disabled. Hover now does nothing if label visibility is unchanged.
For an exposure, captions are excluded from the film samples and drawn as a separate overlay
over the existing accumulated image. Hover preserves both the sample count and pending frame;
it does not restate astronomy or the aircraft/phenomenon trajectory. Regression tests cover
disabled/forced compass visibility, retained accumulation and exclusion from film samples.

The final run still called `renderOnce` three times per animation frame (855 calls for
285 frame callbacks). That was solved by the audit that followed (see
[performance-audit-2026-09.md](performance-audit-2026-09.md)): `render()` only marks the frame
dirty and it is drawn once per frame. Ground footprint sampling also remains around 1 ms per placement update in
this scene. Further cache work must invalidate for actual moving objects, changed
terrain and edited dimensions. Neither issue is solved by lowering cloud quality.

## Where a still frame's graphics time goes (2026-09-19, 0.63.5)

`scripts/perf/gpu-breakdown.mjs` loads a recording, draws one fixed instant repeatedly at a
pinned pixel ratio, and times the card per drawing with each part of the scene hidden in turn.
Headed Chrome, outside the sandbox, same requirements as the other harnesses. At 1100 × 620 CSS
pixels and a ratio of 2 (2.7 million pixels), medians of 40 drawings, noisy by ±3 ms:

| Recording | Whole frame | Cirrus deck | Volumetric decks | Halo mask |
|-----------|-------------|-------------|------------------|-----------|
| Valensole | 32–41 ms    | 11–13 ms    | 11 ms            | 3–9 ms    |
| Cussac    | 34 ms       | 14 ms       | 11.5 ms          | 9 ms      |
| clouds test | 27 ms     | –           | 25 ms            | –         |
| Socorro   | 6.5 ms      | –           | –                | –         |

Everything else (terrain, 91 decor groups, stars, the sky's glows, shadow maps) is within the
noise. The cost is the procedural cloud noise, evaluated per pixel of sky:

- The cirrus deck (CloudSystem) worked out the WATER field (two fbm and a 27-cell Worley) on
  every pixel and then mixed it away entirely, since an ice deck's shape is the fibre field alone.
  It is now skipped for a deck with no water. Pixel-identical on the deterministic scenes
  (Chiles/Whitted, halos test); whole-frame time down 15–20% where there is a cirrus deck.
- The halo (IceHaloEffect) evaluated the very same cirrus field again, as its mask
  (`cirrusCoverAt`, five fbm per pixel). The strongest cirrus deck now draws the display itself
  from the veil it has just worked out (`LayeredCloudSystem.hostHalo`, premultiplied blending);
  the effect's own sphere only draws for ice with no deck. Halos test 75 → 46 ms, Cussac −12 to
  18%. Not pixel-identical, by design: the stars and discs drawn between the two used to cover
  the display's light and now lie under it, as they lie behind the crystals. 48 pixels of 2.7
  million move by 3 to 5 levels of 255 on the halos test, the rest by at most 1.

Valensole is not deterministic from one load to the next (126 000 pixels of 2.7 million differ
between two runs of the same build), so it cannot be used for pixel comparisons.
