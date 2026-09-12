# Performance audit, September 2026

The front page and the catalogue of ufoathome.org stuttered under an ordinary scroll on a recent
laptop. This is what was measured, what was changed, and what is left. Everything here was
measured on a real Chromium with a real graphics card (Apple M3 Pro, Metal) at a 1440 × 900
viewport with a Retina pixel ratio of 2, using the two harnesses under `scripts/perf/`.

## How to measure

```sh
npm run build:site
python3 -m http.server 5182 --directory dist-site
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/perf/page-scroll.mjs http://localhost:5182/ home 12
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node scripts/perf/demo-table.mjs
```

`page-scroll.mjs` loads a page, lets it settle, samples three seconds at rest, then wheel-scrolls
it top to bottom like a reader while recording frame intervals, long tasks, the scenes' loads and
a CPU profile. `demo-table.mjs` mounts each demo recording alone at the front page's stage size,
plays it, and reports frames per second, drawings per frame, main-thread and card time per
drawing, sky restatements and the pixel ratio the scene settled at. Both need a Playwright
installation with its Chromium (not a dependency of this package) and run headed on purpose: a
headless Chromium draws with a software renderer and says nothing about the card. Compare runs
on the same machine only.

## What was found

Before any change, the front page ran at 13 frames a second at rest and 17 while scrolling
(median frame 58 ms); the catalogue scrolled at 38 with 160 long tasks of up to 230 ms. Five
causes, in order of weight:

1. **Every setter drew the scene.** One tick of playback touches a dozen renderer setters and each
   called `render()`, which drew on the spot; the renderer's own animation loop drew again. Two to
   three full drawings per frame, and with the volumetric clouds one drawing is most of what the
   card can do in a sixtieth of a second.
2. **Pixels.** At the display's ratio the front page's stage is 2.7 million pixels, and the cloud
   volume is walked per pixel per deck. Chiles-Whitted and Valensole drew at 15–16 fps at that
   size and at 61–63 at a quarter of the pixels, whatever the main thread did.
3. **A restated sky rebuilt what had not changed.** `Astronomy.Horizon` rebuilt the observer's
   frame for every star (10 ms per restatement, 36 ms per instant of a long pose); the Sun, Moon,
   planets and comet were disposed and rebuilt with new materials — a shader compilation per
   frame on the comet demo, a third of the main thread; the Moon's phase texture was redrawn and
   re-uploaded; the fog was a new object each time.
4. **Raycasts against the relief patch.** The Sun's nine disc samples per frame, and every hover,
   raycast the patch's 8 192 triangles (a third of the main thread on Socorro); the ground under
   each decor object's footprint was read 441 times per frame (a tenth of every Valensole frame).
5. **Mounting a scene froze the page**: a dozen programs compiled on the first frame, and every
   scene walked its own Milky Way and zodiacal light maps — nine million line-of-sight steps that
   depend on nothing the scene knows, done a dozen times over on the catalogue (eight of its
   fourteen seconds of scroll). A removed scene kept its graphics context until the garbage
   collector found it, so the catalogue's budget of live contexts was not one. And the site's own
   pages loaded every module twice: the entry with a `?v=` query, its lazy chunks importing the
   same file without one — a megabyte parsed twice and two copies of three.js.

## What was changed

- **One drawing per animation frame** (`SceneRenderer.render`, `frame`, `drawIfDirty`). A setter
  marks the frame dirty; the player's tick draws it once at the end of the tick while playing
  (`setAnimationsRunning(running, driven)`), the renderer's own loop draws it while the editor
  keeps the weather moving over a paused recording, and a one-shot frame request draws a paused
  scene that was resized, hovered or sought. Exposures keep their own machinery.
- **Adaptive resolution** (`AdaptiveResolution`, `<rr0-scene max-pixel-ratio>`). The pixel ratio
  follows what the frames cost: where the card can be timed (`EXT_disjoint_timer_query_webgl2`)
  it follows the card's time per drawing up and down; elsewhere it comes down on late frame
  intervals and probes back up now and then. Between 1 and the display's ratio (at most 2) in
  quarter steps, only while animations run. A page may lower the maximum for small or many scenes.
- **A cheaper restatement**: `HorizontalFrame` builds the frame once per catalogue (same
  arithmetic as `Horizon` to the nanoarcsecond, tested); bodies are kept, moved and scaled; the
  Moon's disc is redrawn only when its lit part moves a quarter of a texel; the fog is reused;
  the cloud transmission towards a body is memoised per tenth of a degree.
- **The ground read from its grid** (`SceneRenderer.groundBlocks`): the flat disc answers as a
  plane, the relief is walked half a cell at a time over the same height grid the decor already
  stands on. Only the decor is still raycast. The ground under a footprint is read once per
  resting place on the patch (the patch moves with the walking witness, so a still object keeps
  its answer).
- **A long pose adds at most three instants of a Retina-size picture per frame** (thirty of a
  small card's): the main-thread budget let sixty through, each a full drawing queued for the
  card — a second of its time per frame.
- **Shaders compiled off the thread before a recording's first frame**
  (`SceneRenderer.compileNextFrameOffThread`), also when the star catalogue or the relief
  arrive. three.js's own `compileAsync` throws and hangs on a material disposed meanwhile, so the
  polling is done here with a bounded wait.
- **The sky glow maps walked once per page** (`SkyGlowMaps`), each scene keeping its own textures
  over the shared arrays.
- **Contexts given back on removal** (`SceneRenderer.releaseContext`, `restoreContext`; the
  element releases after a microtask so that a move in the DOM is not a release), and the
  catalogue keeps twelve alive instead of eight, since at eight a wide window mounted and took
  down the same cards over and over.
- **The site**: no `?v=` on module URLs (the headers already revalidate); the front page's scene
  plays only while on screen and the carousel holds meanwhile.

## Measured

Front page, same machine, same harness:

| | at rest | scrolling |
|---|---|---|
| before | 13 fps, median 75 ms | 17 fps, median 58 ms, 203 long tasks |
| after | 120 fps (ratio adapted) | 101 fps, median 8 ms, 2 long tasks |

Catalogue page, scrolling top to bottom in 14 s: 38 fps and 160 long tasks (longest 230 ms)
before; 107 fps and 15 long tasks (the mounts, longest 160 ms) after.

Single demos at the stage size, played (`demo-table.mjs`): Chiles-Whitted 16 → 120 fps,
Valensole 15 → 120, Socorro 44 → 120 with a quarter of the main-thread time per drawing, the
airliner's twenty-second pose 7 → 119, the halo sky 23 → 120, the comet 120 → 120 with the
shader compilation per frame gone. The clear-sky demos were already at the display's rate.

## What is left

- **The long pose during playback.** The picture at instant *t* is the pose [*t*, *t* + *E*],
  so every tick starts a new film that a few frames later is discarded for the next; while
  playing, the airliner demo shows a film that never completes. That is the design, not a leak;
  it is now cheap enough not to stall the page, but a sliding-window accumulation or a different
  reading of playback for a pose would be the real answer.
- **Twinkle on the main thread.** `updateTwinkle` rewrites every star's colour per frame — about
  a millisecond per frame on a deep catalogue. A vertex-shader twinkle (phase and speed as
  attributes, time as a uniform) would move it off the thread; the intensity function has to be
  ported exactly.
- **Clouds at a lower resolution than the rest.** Adaptive resolution lowers everything when the
  clouds are expensive; drawing the decks into a half-size target with a depth-aware upsample
  would keep the stars and the decor sharp at the display's ratio. It changes the compositing
  order (the decks are meshes between the decor and the phenomena today), so it is a real change
  of the rendering pipeline.
- **The halo texture** (`HaloSky.trace`, `IceCrystal.trace`) is traced per scene and per Sun
  position, in frame-budgeted chunks; a quarter of a second of main thread per mount on a cirrus
  sky. It depends on the Sun's altitude, so it cannot be shared like the glow maps, but it could
  be cached across nearby altitudes.
- **The relief tiles** are decoded through `getImageData` on the main thread (about 15 ms per
  tile); `createImageBitmap` in a worker would take that off it.
- **`three.core`** is 555 KB of the 970 KB scene module; the rest of the module is small.
  Nothing to gain from splitting our own code; a smaller three.js build is the only lever.
- **rr0.org's case pages** still load `rr0-sighting.mjs?v=0.46.0`, with the same double load
  the site's own pages had; that is a change to rr0.org, not to this package.
