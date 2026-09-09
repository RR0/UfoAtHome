<img src="doc/web/ufoathome/UFOAtHome.png" align=right alt="UFO@home logo">

# UFO@home

**UFO@home** lets a UFO witness record the shape, appearance and movement of what they saw — and replay it like a VCR —
instead of relying only on a written or spoken account. The approach follows [Roger Shepard's
recommendation](https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index_fr.html) that a visual reconstruction of a
testimony is more faithful than an oral or written one.

Originally a Java applet (2003), the project has been rewritten from scratch in TypeScript: a small,
dependency-light engine (keyframe timeline, recording, playback, a three.js scene) wrapped in three vanilla
[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) — no UI framework, no build step
required by the consuming page. All three pull in [Three.js](https://threejs.org/): the phenomenon itself stands in
the scene, so there is no lighter, sky-less variant — see [`<rr0-scene>`](#rr0-scene--the-scene-and-playback) below
for what that buys.

### Naming

`<rr0-scene>` is named without "ufo" on purpose: it renders a generic 3D scene (sky/horizon/stars/decor) from a
real-world time and place, and stands the witness's own phenomenon in it. Under it lives a playback layer —
`UfoElement`, the timeline, the controls, the canvas the pointer works on — reached as `scene.ufoElement`; it was a
component of its own (`<rr0-ufo>`, the shape painted on a bare background) until 0.54.0, when the phenomenon moved
into the scene and a shape with no sky stopped being a thing this project draws. Read-only playback needs no
"player" suffix, since it is every component's default behavior, and `<rr0-sighting-editor>` is the one that needs
a qualifier (it *adds* recording on top). `<rr0-sighting>` (renamed from `<rr0-ufo-witnesses>` — see below) is the
standard way to display any real sighting, whether it has one witness or several: a witness account always implies
a real place and time, so it always composes `<rr0-scene>`.

The project's own site is **[ufoathome.org](https://ufoathome.org)**: [the demos](https://ufoathome.org/demos/)
(every reconstruction running side by side, including the same sighting through three different instruments),
[the player](https://ufoathome.org/play/) for any recording you can give it an address for,
[the editor](https://ufoathome.org/edit/), and [the documentation](https://ufoathome.org/docs/) — which quotes a
whole recording file and hands out the two lines that embed one. See the
[Wiki](https://github.com/RR0/UfoAtHome/wiki) for the project's history.

## Install

```bash
npm install @rr0/ufoathome
```

Three self-contained, pre-built ES modules are published — each self-registers its custom element as soon as it's
imported, no explicit setup call needed:

```html
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-sighting-editor/rr0-sighting-editor.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-scene/rr0-scene.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-sighting/rr0-sighting.mjs"></script>
```

or, from a bundler:

```ts
import "@rr0/ufoathome/editor"   // registers <rr0-sighting-editor> (and <rr0-scene>, which it composes)
import "@rr0/ufoathome/scene"    // registers <rr0-scene>
import "@rr0/ufoathome/sighting" // registers <rr0-sighting> (and <rr0-scene>, which it composes)
```

Only load the one a given page actually needs: each is self-contained and each carries Three.js and a star
catalogue, which is what a real sky costs. A page that loaded the former `rr0-ufo.mjs` still works — ufoathome.org
forwards that address to `rr0-scene.mjs`, whose bundle registers the tag as its own inner layer.

## `<rr0-sighting-editor>` — full editor

The authoring component (~540KB gzip — see below for why): everything `<rr0-scene>` has, plus a shape/appearance
toolbar (oval/polygon presets, color, transparency, halo, and the object's real reported
size/distance — see [Apparent size](#apparent-size)) and drag-to-record. It composes a nested
`<rr0-scene>` internally, so the shape being drawn is always seen against the
sighting's own real sky, computed live from whatever latitude/longitude/heading/orientation/observation-time
fields the toolbar currently holds (see [Architecture](#architecture)). This absorbs `<rr0-scene>`'s own
Three.js/`astronomy-engine` weight on top of the authoring-only code this element already carried (Recorder
engine, SamplingClock, appearance toolbar) — a page that only needs to *play* a sighting (the common case: an
rr0.org case dossier) should embed `<rr0-sighting>` (or `<rr0-scene>` alone) directly, never
this heavier authoring component.

```html
<rr0-sighting-editor></rr0-sighting-editor>
<rr0-sighting-editor src="sighting.json"></rr0-sighting-editor>
```

With `src`, the editor opens on an existing recording instead of an empty canvas — the same
attribute the three other elements take. That is what makes an address per observation possible:
[ufoathome.org's editor](https://ufoathome.org/edit/) maps its own `?sighting=` parameter onto
this attribute, and [its player](https://ufoathome.org/play/) does the same for read-only replay.
Any path the site does not otherwise serve becomes that parameter, so

- `https://ufoathome.org/play/?sighting=/demo-data/witness-socorro.json`, or simply
- `https://ufoathome.org/Socorro`

open that observation. A bare name with no `/` is looked for among the site's own demos first, then
as an rr0.org case directory — the shape the links that predate that site were written in, kept
working. Either page also takes a full address of your own; the editor additionally has a
**Load from URL** field, which is an explicit gesture by whoever is sitting at the keyboard.

Usage: click **Record**, move the pointer over the canvas to draw the UFO's path, click **Stop**, then **Play** to
replay it. The playback layer's `enableClickToPlay` is set to `false` here — a completed recording drag also
fires a native "click" on the canvas, which would otherwise spuriously toggle playback right after recording.

All of the toolbar's own labels (shape presets, Color/Transparency/Halo, Add shape, Record/Stop, Export,
Duration) are translated (English/French) the same way the playback layer's own labels are — based on
the host page's own `lang` then `navigator.languages`, no picker UI.

| Member | Kind | Description |
|---|---|---|
| `src` | attribute | URL of a `SightingRecordingJson` to open in the editor, fetched on connect and whenever the attribute changes |
| `sightingData` | property (get/set) | Delegates to the nested scene's `sightingData` |
| `appearance` | property (get/set, accepts a partial object on set) | `{ presetId: "oval" \| "polygon", color: string, transparency: number, haloScale: number }` — the UFO's appearance used for the next recording |

## `<rr0-scene>` — the scene, and playback

The element the two others build on (~530KB gzip — [Three.js](https://threejs.org/) plus
[`astronomy-engine`](https://github.com/cosinekitty/astronomy)'s planetary/lunar position tables, which don't
tree-shake since they're one shared data table used internally for every body): the witness's own phenomenon
standing in a 3D sky/horizon/starfield/decor scene computed from the recording's real time and place, with the
playback controls under it. Its own members are `src`, `sightingData`, `loadFromSrc`, `enableClickToPlay` (forwarded
to the playback layer), `ufoElement` (that layer), `sceneRenderer`, and the attributes `show-compass`,
`show-witness-map` and `hide-milestones`. Click-to-play/pause works anywhere on the scene (the playback layer's
transparent canvas covers the whole stage), and the fullscreen button fullscreens the *whole* scene — it sets the
layer's `fullscreenTarget` to its own outer stage for this.

### Playback, on `ufoElement`

Everything about replaying a recording lives one property down, on the playback layer every component composes —
`scene.ufoElement.play()`, and `sighting.scene.ufoElement.play()` from the outermost. The layer is the former
`<rr0-ufo>` (see [Naming](#naming)): the timeline, the controls, the seek bar and the canvas the pointer works on,
which since 0.54.0 draws nothing but the editing handles — the shape itself stands in the scene.

| Member | Kind | Description |
|---|---|---|
| `src` | attribute | URL of a [`SightingRecordingJson`](#data-format) file, fetched automatically on connect and whenever the attribute changes |
| `sightingData` | property (get/set) | The current recording as a plain [`SightingRecordingJson`](#data-format) object |
| `sighting` | property (readonly) | The live `Sighting` model (real-world time/place + the recording's `Timeline`) |
| `canvasElement` | property (readonly) | The underlying `<canvas>` element |
| `renderer` | property (readonly) | The `CanvasRenderer` instance painting onto that canvas |
| `refresh()` | method | Re-reads the timeline's duration into the seek slider and repaints the current frame — call after externally mutating `sighting.timeline` |
| `loadFromSrc(url)` | method (async) | What the `src` attribute triggers internally; can be called directly too |
| `enableClickToPlay` | property (get/set, default `true`) | Whether clicking the canvas toggles Play/Pause (see below). Composing elements that need the canvas's own click for something else set this to `false` — see `<rr0-sighting-editor>`. |
| `fullscreenTarget` | property (get/set, default: the component's own stage) | The element the fullscreen button requests fullscreen on. Composing elements that need a *different* element fullscreened set this — see `<rr0-scene>`. |
| `play()` / `pause()` | method | Start or stop playback. Alongside `togglePlayPause()` because a caller sequencing several recordings needs to say which state it wants, not flip whatever the current one happens to be |
| `autoReplayEnabled` | property (get/set, default `true`) | Looping. A page playing recordings in turn has to turn it **off**, or the first one never ends |
| `playbackState` | property (readonly) | `"stopped"`, `"playing"` or `"paused"` |
| `currentTime` / `seekableDuration` | property | The playhead and its range, in the timeline's own units (see `positionLabel` for why those are not real milliseconds) |

Three events. `ended` fires once, when playback runs off the end of a recording **without** looping — not on a
pause, and not on a scrub to the end (`Player.onEnded` is the hook, precisely so that neither of those can be
mistaken for one: a single tick can carry the playhead from well inside the recording to past its end, so there is
no "last playing frame" to compare against). It is `bubbles`/`composed`, unlike `timeupdate`, so a page can listen
for it on the outermost element — that is how ufoathome.org's front page plays one reconstruction after another.
`timeupdate` fires on every playback tick and every seek, with `detail.time`, and is meant for the composing
elements. `timedisplaychange` fires when the counters switch between clock time and elapsed time.

Playback matches the observation's *real reported duration* when it's known: set `time`/`endTime`, or `time`/
`durationSeconds`, in the [data format](#data-format) (`durationSeconds` takes precedence over `endTime` if both are
given — but in the editor, editing either date clears an explicit `durationSeconds` the pair can replace, so the
more recent edit is the one that wins rather than being silently outranked). Watching a 5-minute sighting then takes 5 real minutes, not however long the recording itself took to
author (e.g. a quick mouse drag) — drag the seek bar directly to skip ahead. The start/end labels around the seek
bar show real clock times when `time` has an hour (e.g. `02:45` → `02:50`); otherwise they show `0:00` → the
duration actually available (the declared one if known, else the recording's own length). Playback loops by
default — click the loop button (pressed = looping) to play once and stop instead.

Clicking anywhere on the canvas also toggles Play/Pause (not just the button), and DOUBLE-clicking it toggles
fullscreen — both matching common video-player UX. A double-click is two clicks first, so click-to-play has
already fired twice by the time it arrives; playback is put back where it stood rather than left wherever that
pair happened to leave it (a recording stopped at its own end is restarted by the first of them). Both gestures
are governed by `enableClickToPlay`: where a composing element has taken the canvas over for something else — the
editor edits shapes on it — neither belongs to playback.
While playing, the toolbar and the fullscreen button (top-right, semi-transparent over the content) auto-hide and
only reappear on hover — always shown while paused/stopped. The fullscreen button uses the standard Fullscreen API
(`requestFullscreen`/`exitFullscreen`); exiting with Escape is native browser behavior, nothing custom.

Labels (Play/Pause, Auto-replay, Current position, Duration, Fullscreen) are translated (English/French) by
detection, falling back to English — there's no language-picker UI, and there deliberately isn't one. What is
detected is the **host page's own declared language first** (the nearest `lang` attribute, so `<html lang="fr">`
gets French labels), then `navigator.languages` — see `HostLocale.preferencesFor`. A page states what language its
reader is reading it in, and a bilingual site that serves the same article at two URLs states it per URL, which
`navigator.languages` cannot know. A page that declares nothing falls through to the browser's list exactly as
before.


```html
<rr0-scene src="sighting.json"></rr0-scene>
```

**What the sighting was made through.** An eye and a camera are not the same claim, and the difference
is geometric: a lens maps a direction as `tan θ` (a building 33 degrees off-centre comes out 42% wider
than the angle it subtends), while an eye perceives an angle as an angle wherever it falls — so the
scene renders a naked-eye sighting through an equidistant resampling pass and a photographed one
through the ordinary pinhole projection (`src/engine/instrument/`, `src/render3d/EquidistantProjectionPass.ts`).
A camera also has a FORMAT, which is part of what a photograph carries as evidence: an instrument
states the image it exposes and the lens in front of it, in millimetres, so the ratio is the shape of
the picture (a square 126 frame, a phone held upright) and `2·atan(h/2f)` is the field it takes in.
And it has SETTINGS, each read-only where the device fixed it (an Instamatic's owner had one aperture,
one shutter speed and one focal length). The aperture, the focal length and the focus sit on the POSE
beside the heading and the pitch — the same camera is set differently from one photograph to the next
— while the shutter belongs to the RECORDING as a whole (`Sighting.exposureSeconds`): one observation
was photographed one way, and a shutter speed that changed halfway through would be a second
photograph rather than a moment of this one. The four:
the focal length, which is the field written the way a photographer writes it; the aperture, which
decides both the depth of field and whether the diaphragm's blades throw a star at all; the shutter,
which accumulates a moving light into a STREAK and a blinking one into a dashed streak — and, once the pose is
long enough, turns every star into the arc the turning Earth draws (see [A pose long enough draws the
sky](#a-pose-long-enough-draws-the-sky)); and where the lens was focused. Two of them are drawn rather than merely stated — the blur (`DepthOfFieldPass.ts`,
from the thin-lens geometry in `DepthOfField.ts`) and the streak — because that is what makes them
evidence a reader can compare against a photograph: a sharp object bounds its own distance, and a
blurred one in a sharp frame was close.
The frame is letterboxed inside the widget's own box rather than resizing it, and the field it
implies becomes the recording's default — a recording that states its own (a zoom, binoculars) keeps
it. An eye has no rectangle and no format, and neither has a camera nobody identified: both fall back
to the scene's own 16:9 at the 60° vertical field this project draws an unaided witness through
(about the middle half of a real human field, which is where acuity actually is). The catalogue is
dated, so the picker offers what existed: no telephone in 1964.

**Real astronomy for misidentification spotting.** A recurring cause of UFO reports is a mundane astronomical
object or atmospheric optical effect — Venus (by far the most commonly misreported "UFO"), other planets, the
Moon, lens flare, or halo phenomena like sun dogs/moon dogs. `<rr0-scene>` renders the sky astronomically: real
Sun/Moon/Venus/Mars/Jupiter/Saturn positions and the Moon's phase via
[`astronomy-engine`](https://github.com/cosinekitty/astronomy) (see `src/engine/astronomy/CelestialPositions.ts`),
and a real star catalog (see below) instead of a randomized field. How deep it is drawn follows the
INSTRUMENT rather than a constant: magnitude 6.5 is what a dark-adapted human eye reaches, and a recording made
through a camera reaches somewhere else entirely — 4.2 through a box camera at a ninetieth of a second, 9.7
through a 50 mm at f/2 for twenty seconds (see `src/engine/instrument/LimitingMagnitude.ts`). The sky's
darkness/color follows the sun's altitude (day/twilight bands/night), and its dawn/dusk glow is anchored on the
sun's real compass direction, not spread uniformly around the horizon — see `src/render3d/skyColors.ts`.

The witness's own pose — geographic position, elevation, and viewing heading/pitch/field of view — can vary over
the sighting's timeline via `witnessTrack` in the sighting JSON (a keyframe array of `{ t, pose }` alongside
`timeline` — the model class is `ObserverTrack`, but the serialized key is `witnessTrack`, and writing the class's
name into a file is a mistake that costs an afternoon; same
hold-last/interpolated-lookup shape — see `src/engine/model/ObserverTrack.ts`), driving both the camera's own
orientation and which real-world instant the astronomy is computed for as playback advances. Older recordings
with no `witnessTrack` fall back to the legacy static `place[0]` (see `resolveObserverPoseAt` in
`src/engine/model/Sighting.ts`) — usable for sky darkness/color and camera pitch/fov, but with no compass heading
to orient the camera by.

`src/engine/astronomy/SunPosition.ts` (the original vanilla, dependency-free NOAA/Spencer solar position
approximation) stays in the repo, tested, and still backs `skyBrightness()`'s twilight-band classification — but
the live rendering path now uses `astronomy-engine` for the Sun too, for a single source of truth and to get the
Sun's azimuth from the same call used for the sky's directional glow.

`<rr0-sighting-editor>` has editor fields for the witness's latitude/longitude/heading and the observation's start
date/time (all optional) — filling in lat+lng writes both the legacy `place` and a single t=0 `witnessTrack`
keyframe (elevation/pitch/field of view stay at neutral defaults; there's no UI yet for authoring the observer
*moving* over time, only a single static pose per recording).

Not yet done: a mirage, the supernumerary arcs crowded inside a bright rainbow and the corona round a Sun seen
through a thin water cloud (all three are interference, and nothing here models the wave — see `WaterDrop.ts`),
and a multi-keyframe `witnessTrack` authoring UI (today the editor can only set
one static pose; an observer that moves/re-orients mid-recording still needs hand-authored or scripted JSON). The
Moon's phase currently only dims/brightens its disc's overall
color rather than rendering a geometrically accurate crescent shape — a natural follow-up.

**Regenerating the star catalog.** Two tiers, both compact binary assets of four concatenated `Float32Array`
sections (ra/dec/mag/ci — see `src/render3d/StarCatalog.ts` for the exact layout), both sorted brightest first,
both generated from the [HYG Database v4.1](https://github.com/astronexus/HYG-Database) (CC BY-SA):

- `src/assets/stars-mag7.5.bin` — 25 791 stars to magnitude 7.5, ~400KB, loaded by every scene;
- `src/assets/stars-mag7.5-9.bin` — the 57 688 *further* stars between 7.5 and 9, ~900KB, fetched only by a
  recording whose own optics reach past 7.5 (see `StarCatalogs.upTo`, and `deep-star-catalog-src` to host your
  own copy). A delta, not a second catalogue: no star is downloaded twice.

Nine is where HYG stops being a sky and starts being a catalogue running out — its counts multiply by 3.1 per
magnitude up to 7, then 2.7 to 8, 2.0 to 9 and 1.3 to 10. An observation that outran it is told so on the
editor's Sky line rather than quietly handed an emptier sky than it recorded; going deeper would mean Tycho-2 or
Gaia, which is a different order of download.

To regenerate them: download `hyg/CURRENT/hygdata_v41.csv` from that repo into `scripts/data/hygdata_v41.csv`
(gitignored — not checked in, ~34MB), then run `npm run build:stars`. The generated `.bin`/`.json` pairs *are*
checked in, since they don't need regenerating on every install.

**What else was in that sky.** Beside the Sun, Moon, planets and stars, the scene states — and where it can,
draws — the things that were genuinely up there and are genuinely mistaken for something else. Each is here
because its record is complete for every date this project can reconstruct, with no lookup, no key and no
coverage floor:

- **Meteor showers** (`src/engine/astronomy/MeteorShowers.ts`). A shower is a position in the Earth's own orbit,
  so the Perseids of 1948 are the Perseids of today. Rates are corrected for the radiant's real altitude, and the
  strongest statement is the negative one: a radiant below the horizon can have produced nothing.
- **Comets** (`src/engine/astronomy/Comets.ts`). Twenty-three naked-eye apparitions from Halley 1910 to
  Tsuchinshan-ATLAS 2024, each with the orbit it was actually on that year. Positions come from a universal-variable
  Kepler propagation (`Orbit.ts`) checked against JPL Horizons to about a thousandth of a degree; brightness is
  modelled from magnitudes recorded at the time, and the tail is a real length in space, projected — so it
  shortens when it points away from the observer instead of across their sky. Half the apparitions have no
  recorded tail length and are drawn with no tail at all.

- **Satellites** (`src/engine/astronomy/Satellites.ts`). Not which one — historical orbital elements
  cannot be obtained, and propagating today's back to 1965 would invent a precise, confident pass.
  What is complete is the ILLUMINATION: `h = R(sec B - 1)` gives how high the Earth's shadow stood
  above the witness, so deep in the night nothing in low orbit is lit and a light crossing the sky
  then was not a satellite. Being lit and being seen are kept apart — everything in orbit is sunlit
  by day, and an Iridium flare at magnitude -8 was genuinely watched at noon. Also complete, and
  from CelesTrak's SATCAT: how many tracked objects were in orbit that month, and when each named
  class existed (Echo balloons, Iridium flares, ISS, Starlink trains).

- **What the air itself did to the light** (`src/engine/atmosphere/`). Two families, and neither is drawn form by
  form. The ICE one traces sunlight through hexagonal prisms in a cirrus deck (`IceCrystal.ts`, `HaloSky.ts`) and
  the 22° ring, the 46° ring, the sundogs, the tangent arc, the parhelic circle, the circumzenithal arc and the
  pillar come out of the answer at whatever brightness the physics gives each — the one thing no record holds is
  how steadily the crystals were falling, so that stays a stated condition (`Weather.iceCrystalAlignment`). The
  WATER one sweeps a ray across a raindrop (`WaterDrop.ts`, `RainbowSky.ts`) and the primary bow at 42°, the
  reversed secondary at 51°, Alexander's dark band between them and the bright sky inside the first come out the
  same way. Nothing about a rainbow has to be assumed: a drop is a sphere, so there is no orientation to state,
  and both of its ingredients — falling water, and a source that reaches it — are in the weather record. Each
  family keeps a second, independent derivation in closed form (`IceHalos.ts`, `Rainbows.ts`) whose only job is to
  disagree with the trace; that check has already caught one shipped error.

All of them appear in the editor's read-only "Sky:" line, with a button to turn the witness toward
the meteor or the comet. The bow line is said only when rain was reported — everybody knows whether it was
raining, so the interesting answers are the negative ones: a Sun higher than 42° puts every bow below a ground
witness's horizon, and an unbroken deck between the Sun and the rain is the missing half of the famous
condition.

**Regenerating the satellite catalog.** `src/engine/astronomy/satelliteCatalog.ts` is generated by
`npm run build:satellites` from [CelesTrak's SATCAT](https://celestrak.org/pub/satcat.csv) (CC BY
4.0), cached under `scripts/data/` (gitignored). Only its LAUNCH_DATE and DECAY_DATE columns are
read: the orbital fields hold each object's *current* state, which for anything that has re-entered
is its state on the way down — Echo 1 is listed at 419 x 394 km and spent its life near 1500 — so
using them to describe a historical orbit would be quietly wrong. Which classes are worth naming,
and how bright they got, stay hand-entered in the script; every date is derived.

**Regenerating the comet catalog.** `src/engine/astronomy/cometCatalog.ts` is generated by
`npm run build:comets`, which asks [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) for osculating elements at
each apparition's own perihelion and caches the answers under `scripts/data/horizons/` (gitignored). The list of
apparitions, and the peak magnitudes and tail lengths recorded at the time, are hand-entered in
`scripts/build-comet-catalog.ts` — the orbits are looked up, the brightness is an observation, and the script's
own doc comment explains why the two cannot come from the same place. The generated file *is* checked in.

**The phenomenon stands in the scene, and is still only what the witness saw.** The shape used to be painted on a
2D canvas laid over the 3D scene, so that nothing about it could be read as a claim about a solid at a distance. It
is now a plane *in* the three.js scene (`src/render3d/PhenomenonSystem.ts`), facing the witness and scaled so that
it subtends exactly the angle the recording states — which makes it look the same from their eye at any distance
whatever, and is what keeps the claim where it was: the recording states angles and nothing else, and the distance
the plane is drawn at is a parameter of the picture (`src/engine/shape/PhenomenonDepth.ts`, see *Where the shape
is drawn* below). What the plane carries is the very picture the overlay painted — the same `CanvasRenderer` draws
the same halo, blur, veil and spikes into its texture. What changed is who decides what hides it: the decor's own
depth, per pixel, so a patrol car in front of it hides exactly the part of it a patrol car would, where the overlay
sampled nine points and hid the shape whole or not at all. The ground and the terrain are kept out of that on
purpose — the phenomena are drawn in a pass of their own, depth-tested against the decor alone — because a relief
patch at thirty-metre resolution deciding what a witness saw would not be a reconstruction (Socorro's craft, a
hundred feet away in the arroyo below the road, sank two metres under one). It also means the phenomenon goes
through the instrument's own projection like everything else in the scene, and through the same long-exposure
accumulation, instead of an approximation of each on a separate layer. The overlay keeps the pointer's business:
selection handles, outlines, hit-testing. A body in the round — an ovoid, a real model standing in for the shape
to test "was it a helicopter" — is a different statement, and a different object, for a recording that makes it.

## `<rr0-sighting>` — standard sighting view

The standard way to display any real sighting, whether it has one witness or several — renamed from
`<rr0-ufo-witnesses>` once it stopped being just a multi-witness selector (see [Naming](#naming)). It composes a
nested `<rr0-scene>` the same way `<rr0-sighting-editor>` does, since a witness recording is
always a real sighting and always needs the real sky/ground backdrop.

```html
<rr0-sighting src="sighting.json"></rr0-sighting>
```

`src` accepts either a single witness's `sighting.json` directly (the common case — no extra file needed) or, for
a case with several witnesses, a small manifest: a plain JSON array of each witness's own `SightingRecordingJson`
URL (typically relative to the case's own page, same as `<rr0-scene>`'s own `src`):

```json
["chiles-sighting.json", "whitted-sighting.json"]
```

The two shapes are told apart automatically — a fetched JSON array is a manifest, a plain object is one witness's
own recording. No labels or ids are duplicated in a manifest itself — each witness's display name and the shared
case id grouping them together are read from that witness's *own* file (`witness`/`caseId`, see
[Data format](#data-format)), so there's a single source of truth and nothing to drift out of sync. This means
every listed witness's recording is fetched upfront (to read its name), not lazily on selection — fine at the
scale a case's witness list actually has. If a witness has no `witness.title`, its `witness.id` is shown instead, or
the URL itself as a last resort. A mismatched `caseId` across the listed witnesses logs a console warning (doesn't
block) — likely means unrelated recordings got listed together by mistake.

**Where two witnesses described different things, the recordings have to show it.** Not that they
must differ — witnesses often agree, and two matching recordings are then simply true. But a
difference that exists in the record and not in the files makes the witness picker a control that
does nothing, and nothing *looks* broken. Chiles-Whitted shipped that way for months: one testimony
under two names. Its two pilots drew the object differently for Project Sign — the captain a slim
ribbed cigar with a pointed nose and no windows, the co-pilot a blunt cylinder with two rows of
lit windows — and only the co-pilot, in the right seat, saw the terminal phase (McDonald's 1968
cross-check). Each file now carries its own witness's account.

| Member | Kind | Description |
|---|---|---|
| `src` | attribute | URL of a single `sighting.json` or a witness manifest (above), fetched automatically on connect and whenever the attribute changes |
| `witnessUrls` | property (get/set) | The manifest as a plain array of URLs, for programmatic use instead of `src` |
| `sightingData` | property (get/set) | One witness's recording, set directly instead of fetched — for a page holding one in memory (text pasted into a form, a file the reader picked). Its entry carries no URL, so the info panel's editor link and embed lines fall back to the bare application, which is the honest answer for something published nowhere |
| `scene` | property (readonly) | The `<rr0-scene>` this composes — and through `scene.ufoElement`, the playback members above |
| `loadFromSrc(url)` | method (async) | What the `src` attribute triggers internally; can be called directly too |

A toolbar row sits above the scene: a "Testimony by &lt;witness&gt;" sentence on the left, and a round "?" info
button on the right. The witness portion is plain text for a single witness (a one-option `<select>` would be
pointless); once there's more than one, it becomes the live `<select>` instead — but the sentence itself, and the
info button, stay visible either way. The first witness loads automatically once the list is known; switching the
selector loads that witness's already-fetched recording into the nested `<rr0-scene>` (no re-fetch). Setting
`witnessUrls` again (e.g. a manifest refresh) keeps the current selection if that witness is still present, instead
of resetting back to the first.

Clicking "?" opens a panel anchored under the button (it never shifts the canvas below it). Where the browser has
the popover API the panel is a top-layer `popover="auto"` — the one placement a host page's own `overflow: hidden`
wrapper cannot clip, which is what rr0.org's layout was doing to it — kept under the button by CSS anchor
positioning, flipping above it or centring in the viewport when that side is too short, and closing on Escape or a
click outside. Browsers without the API get the plain absolutely-positioned overlay instead.

Its main content is the currently-selected witness's observation metadata (date, location, case id, description,
tags — whichever are actually present in that witness's own `sighting.json`; the witness's own name isn't repeated
here, since it's already in the toolbar's testimony line). The date is shown on the WITNESS's own clock, never
converted into the reader's time zone (see `utcOffsetHours` in [Data format](#data-format)).

A footer row holds the app's own name/version on the left — linking to that very observation in the editor (see
[`<rr0-sighting-editor>`](#rr0-sighting-editor--full-editor)'s own `src`), not to the application's home page — and two
fold-outs on the right, both closed until asked for:

- **Embed** hands out the two self-contained lines it takes to put this observation on any other page, either as a
  replay (`<rr0-sighting>`) or as the editor (`<rr0-sighting-editor>`), with absolute URLs and a copy button:

  ```html
  <script type="module" src="https://ufoathome.org/lib/rr0-sighting.mjs"></script>
  <rr0-sighting src="https://ufoathome.org/demo-data/witness-socorro.json"></rr0-sighting>
  ```

  The script URL is derived from where the running bundle was itself loaded from (`import.meta.url`), never
  hardcoded, so a snippet generated from a local or staging copy points back at that copy. Pasting it into a site
  of your own needs the bundle and the recording to be readable cross-origin (ufoathome.org serves `/lib/*` and
  `/demo-data/*` with `Access-Control-Allow-Origin: *` for exactly this). The four entry modules under `/lib` are
  revalidated on every visit rather than cached for a week, because their names carry no content hash: a page that
  kept last release's component in front of this release's recording is a page showing `[object Object]` where the
  account should be.
- **Credits** reveals third-party credits (the live terrain imagery attribution, once a real relief patch has
  resolved, plus the bundled thunder sound's own required attribution — see [`CREDITS.md`](CREDITS.md)).

All of this component's own labels (Testimony by, About, Close, Observation/Date/Location/Case, Credits) are
translated (English/French) the same way as the playback layer's own labels.

## Data format

Both components read/write a plain, JSON-serializable `SightingRecordingJson`:

```ts
interface SightingRecordingJson {
  version: 1
  time?: { year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number }
  endTime?: { year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number } // alternative to durationSeconds
  durationSeconds?: number // alternative to endTime; takes precedence if both are set
  utcOffsetHours?: number // the LEGAL time zone the witness's clock was on (+1 for France in 1965, -7 for New Mexico in April 1964). Absent = approximated from the longitude, which cannot know legal time or a daylight-saving switch
  place?: { lat: number, lng: number, name?: string }[] // `name` is the fully qualified place name the coordinates were resolved from — see Naming a place
  witness?: { id?: string, dirName?: string, title?: string, lastName?: string, firstNames?: string[] } // every field optional — supply whichever is known; omit entirely for an anonymous witness
  caseId?: string // shared by every witness's own sighting.json for the same case — see <rr0-sighting>
  description?: string
  tags?: string[]
  timeline: {
    keyframes: Array<{
      t: number // milliseconds since recording start
      shapes: Array<{
        sourceId: string // e.g. "ufo-1" — lets several shapes (a UFO, a landmark, a trailing flame...) share one timeline
        shape: {
          kind: "oval" | "polygon"
          bounds: { x: number, y: number, width: number, height: number }
          color: string   // CSS color
          angle: number   // radians
          transparency: number // 0 = opaque, 1 = fully transparent
          haloScale: number    // 0 = no glow
          selected: boolean
          title?: string       // shown as an on-canvas tooltip when hovered
          behindCloud?: boolean // the witness reported it behind cloud at this instant — stated, never deduced (see below)
          angular?: { widthDeg: number, heightDeg: number } // how big it LOOKED — the only size a testimony holds, see Apparent size
          points?: { x: number, y: number }[] // "polygon" shapes only
        }
      }>
    }>
    order?: string[]     // back-to-front paint/hit-test order; absent = first-appearance order
    groups?: string[][]  // each inner array is one group's member sourceIds
  }
  witnessTrack?: { keyframes: Array<{ t: number, pose: { lat?: number, lng?: number, elevationM: number, headingDeg?: number, pitchDeg: number, fovDeg: number } }> }
  weatherTrack?: { keyframes: Array<{ t: number, weather: Weather }> }
  weather?: Weather // legacy static fallback for recordings predating weatherTrack
  weatherSource?: { id: string, name: string, url: string } // the meteorological record weatherTrack was looked up from — see Weather is looked up, not remembered. Absent = the witness's own account
  instrument?: "eye" | "rectilinear-lens" // what it was observed THROUGH — see Instrument. Absent = the naked eye
  soundTrack?: { keyframes: Array<{ t: number, sound: { kind: "none" | "hum" | "whistle" | "rumble" | "crackle", volume: number, pitchHz: number, src?: string } }> } // what the witness heard — see What it sounded like
  decor?: DecorObject[] // buildings, trees, streetlights, vehicles, other witnesses — see src/engine/model/Decor.ts
}
```

A shape left out of a later keyframe is **held** at its last recorded state, not hidden — and one whose first
keyframe is at `t=5000` is already painted, in that state, from `t=0` (hold-first/hold-last at both ends of a
source's own range). To make something stop being visible, keyframe it with `transparency: 1`.

### What it sounded like

Half of what makes these accounts strange is the sound — most often its absence. `soundTrack` records it on the
same clock as the shapes, because a sound rarely starts when the object does: a craft sitting silently on the
ground and heard only as it lifts off is two keyframes, `kind: "none"` at the start and a hum at the instant it
took off.

`volume` (0..1, how loud the witness could describe it, never a dB figure) and `pitchHz` blend between keyframes;
`kind` and `src` are **held**, like every other discrete field in this format — so the example above really is
silent right up to that second keyframe. To record a sound emerging gradually instead, give it two keyframes of
its own kind (hum at volume 0, then hum at full).

`kind: "none"` is a statement — the witness reported hearing nothing. A recording with no `soundTrack` at all is
the different, weaker case: nobody was asked. Both replay as silence, and neither invents a noise.

Sounds are **synthesized** from that description (a drone, a whistle, a rumble, a crackle — `pitchHz` is the tone
itself for the pitched ones and where the noise sits for the others), exactly as a described shape is drawn from
its description, and at no cost in bundled assets. A recording that actually captured the sound can point `src` at
the audio file, which then plays instead — at the price of an embed that is no longer self-contained, and a URL
that must be CORS-readable.

Sound plays during playback only, and only after a real click somewhere in the player: browsers refuse to start
audio without one.

The same rule governs the whole scene, not just the object's own sound: **paused is paused**. Falling
precipitation and its splashes, twinkling stars, lightning flashes, the sun's lens flare and the weather's own
ambient beds all stop with the player and resume with it, leaving the frozen frame on screen. A paused replay is
one instant of a sighting — weather still going on over it would be the reader's own room, not the witness's
evening. (The cloud deck is not in that list because it does not move at all: its noise field is fixed, with no
time of its own. Real drifting cloud is part of the volumetric-cloud work still to come.)

### Naming a place

Testimony names a place. It says "on the Valensole plateau", "near Socorro", "over Montgomery" —
never 43.8379 / 5.9840. So the Location group leads with a **Place** field: type a name, press Enter
(or **Locate**), and the latitude and longitude below are filled from
[Nominatim](https://nominatim.openstreetmap.org/), OpenStreetMap's own geocoder — which, unlike the
gazetteer-style services, knows the hamlets, farms and airfields that cases actually happen at.
A name is often ambiguous, so every candidate stays listed in **Matches** and the best one is
applied straight away; picking another moves the witness. Results are named in the reader's own
language, and credited as their licence requires.

What gets stored is the *qualified* name the search resolved (`place[].name`), not the two words
typed — half the interesting cases happen near a village that shares its name with four others, and
a later reader needs to land on the same spot. A name no geocoder knows is kept as typed, so a
recording can still say "the lavender field east of the farm" beside coordinates entered by hand.

The field reads both ways: move the latitude or longitude by hand and a resolved name is re-derived
from the new coordinates, or cleared if there is no place there. A name left describing somewhere
the sighting is no longer at is worse than no name — the recording would state, in writing, that it
happened there. A name the witness typed themselves is never replaced.

**Altitude is above sea level**, and the ground at the location sets its floor: a witness in the
Alps is not at 0 m, and an editor that offers it invites a recording that says so. The ground's own
height is read from whichever elevation source is live and shown beside the field. What gets stored
is unchanged — `ObserverPose.elevationM` stays a height above the local ground, which is what the
terrain patch is built around.

### Time zones

An hour of `utcOffsetHours` is an hour of Earth's rotation *and* a different row of the weather
record. Pick the witness's own zone (`Europe/Paris`, `America/Denver`, …) and the offset is derived
from that zone's rules **at the observation's date**: Valensole in July 1965 resolves to UTC+1, not
the UTC+2 the same place gives today — France only reintroduced summer time in 1976. Change the date
and it is derived again. The recording stores both: `timeZone` is the rule, `utcOffsetHours` is the
number it produced, and every consumer keeps reading only the number.

The rules come from the platform's own IANA database. What it cannot fix is a zone whose
*boundaries* are coarse: Montgomery, Alabama is `America/Chicago`, which observed summer time in
1948 while Alabama did not. That is why the zone is chosen by the witness rather than derived from
the coordinates — and why the plain entered offset remains available for exactly those cases.

The search runs only when asked, never per keystroke: Nominatim's usage policy allows the first and
rules out the second.

### Who answered is part of the answer

Every kind of real-world data this editor pulls in — places, weather, ground relief, aerial imagery
— is chosen by a picker sitting **where that data is reported**, with the attribution its licence
requires next to it:

> 2 places found according to `[Nominatim ▾]` © OpenStreetMap
>
> From `[ERA5 (Open-Meteo) ▾]` © Copernicus/ECMWF, 2026-08-21 15:30 UTC

Those pickers *are* the credits. Naming who the data comes from and letting it be chosen are the
same act: a static "© OpenStreetMap" tucked beside a field says where today's answer came from but
hides that it is a choice, and a picker with no attribution credits nobody. Relief and imagery have
no sentence to sit in, so they get a row under the coordinates whose ground they describe.

Most registries hold a single entry today (imagery holds two, Esri and EOX Sentinel-2 cloudless) —
which is the point: the seam is visible before it is used, and adding an implementation means adding
one entry to a registry (`placeSources.ts`, `weatherSources.ts`, `terrainSources.ts`), not new
markup.

A stale offset renders midnight over Paris and gives no clue why, so an offset that cannot belong to
the declared longitude is flagged on the field, with the meridian's own solar time in the tooltip.

Deliberately a wide net rather than a precise one. Legal time genuinely departs from solar time,
sometimes by hours (all of China runs on UTC+8), and the historical rules are worse — the check must
never cry wolf at a correct "France on UTC+1 in 1965". It flags only what no country has ever done,
and only as a warning: the recording states the witness's clock, and nothing here knows better than
the witness.

### Weather is looked up, not remembered

The Circumstances group is the one part of this editor that isn't testimony. Weather is a
measurable fact about a place at an instant, and the recording already states both — so instead of
leaving a witness (or an author reconstructing a case decades later) to set a cloud-cover slider
from memory, the editor looks the conditions up from [ERA5](https://open-meteo.com/en/docs/historical-weather-api),
the ECMWF reanalysis, hourly and worldwide from 1940 on. The fields then show the record's own
values, **read-only**, above a line naming the dataset and the exact UTC instant they describe (a
wrong `utcOffsetHours` shows up there before it shows up in the rendered sky). The request that
produced them is kept in `weatherSource.url`, so the claim stays checkable years later.

Two of the fields have no direct counterpart in the record and are *derived* — `cloudDarkness`,
which is a look rather than a measurement (weighted by which layers hold the cloud, plus rain and
thunderstorm), and `cloudBaseM`, placed at the lowest deck holding a real share of the sky, from
Espy's temperature/dew-point spread for a low deck. Both are documented in
`src/engine/weather/providers/OpenMeteoWeatherProvider.ts`.

Unchecking **From weather records** hands the fields back to the witness: the looked-up values stay
as a starting point, `weatherSource` is dropped, and no later lookup may overwrite them — the same
"declared outranks deduced" rule [Behind a cloud](#behind-a-cloud) follows. A recording that names
a `weatherSource` is replayed exactly as authored and never looked up again, so a published case
file reads identically offline. Nothing is ever locked without a record to show for it: before 1940,
or with no network, the fields stay editable and the line says which of the two it is.

The `weatherTrack` follows the observation rather than flattening it: a keyframe at its start, one
at every whole hour it runs through, and one at its end. The record is read *between* its hourly
rows, not snapped to the nearest one — so Wilcox's two hours carry a cloud deck lifting from 800 m
to 913 m, and even a four-minute sighting gets a track that moves instead of one value repeated.
(For a short observation the record often genuinely says nothing changed. That is an answer, not a
missing feature.)

The keyframes are placed on the clock playback actually runs on — `timeline.duration` once
something has been recorded, and the observation's own declared length before that (the same rule
`Player.durationOverrideMs` implements). That clock *changes length as authoring proceeds*: the
first recorded shape turns a fifteen-hour span into a few seconds, so the track is re-derived
whenever it does. Getting either half wrong looks the same from outside — a sighting whose weather
never changes.

It follows the witness too, not just the clock. Half of aviation testimony is given from a cockpit,
and an aircraft under observation for an hour is a long way from where it started — so each sample
is looked up at the position the `witnessTrack` puts the witness at that instant. Positions inside
one ERA5 grid cell (~28 km) are one query, and several cells still travel in a single request, so
a stationary witness costs exactly what it always did.

`scripts/infer-case-weather.ts` runs the same lookup over case files on disk:

```bash
npx tsx scripts/infer-case-weather.ts --dry-run path/to/sighting.json
```

It rewrites only `weatherTrack` and `weatherSource`, splicing them into the file's own text so the
diff shows the weather and nothing else.

### Behind a cloud

`behindCloud` is how a recording says "it disappeared into a cloud" — keyframed like any other
appearance field, and held rather than blended. It is *stated*, for the same reason
`DecorObject.occludesSourceIds` is: this format describes an appearance on the witness's own field
of view, not where an object was in space, so nothing in it can deduce whether cloud came between
them. A recording holds no distance at all (see *Apparent size* below) — the distance a shape is
*drawn* at is a parameter of the picture, not a fact (see *Where the shape is drawn*) — and the
sky's own gaps are procedural noise: leaving the question to geometry means tuning the weather
until the reported disappearance happens to occur. So the witness's account is the whole answer: no
`behindCloud`, no cloud, and a shape declared behind cloud is not drawn while the deck is up.

There used to be a geometric fallback here, for a recording that stated a real distance and made no
claim about cloud. It went when stated distances did, and it had earned it: the one case it fired on
was Chiles-Whitted, where "it disappeared into the cloud deck" turned out to be an interrogator's
reconstruction that Whitted himself denied to McDonald in 1968.

### Apparent size — and why there is no real one

A witness never perceives meters. They perceive an angle: the thing covered a thumbnail at arm's length, or a fifth
of the windshield, or two full Moons. "About thirty meters long" is a conclusion they drew from a distance they
could not perceive either, and the two errors multiply. So a recording stores `angular` — how wide and how tall the
object *looked*, in degrees — and stores no real size and no real distance anywhere.

`bounds` is that angle projected onto the fixed 640x360 canvas at the pose's own field of view **and through the
recording's own instrument** (see below), which is what every editing gesture, hit-test and renderer keeps working
on. The angle is authoritative: `SightingShapes` (`src/engine/persistence/SightingShapes.ts`) re-derives `bounds`
from it on load and reads it back from `bounds` on save, so a file survives a change of canvas, of field of view or
of instrument, and if the two ever disagree the angle wins. `ImageProjection`
(`src/engine/instrument/ImageProjection.ts`) owns the conversion itself.

Through an eye at 60° across 360px, one degree is exactly 6px and the full Moon about 3.1px — so an object of 3.5m
at 90m is 13px wide, not the 90px an author reaches for unaided. That is why the editor shows the three readings of
that one relation side by side — **apparent width**, **real width**, **distance** — kept in step: edit any one and
one of the other two follows, and the one the **Hold** select pins never moves. With nothing held the real width
is what a thing keeps: moving it further makes it look smaller, and editing either width moves the other at the
distance it stands (the shape is resized on the canvas). Hold the apparent width instead and a distance edit
leaves the shape looking the same, stood elsewhere — which is what asking what the decor would hide of it needs.
Only the angle is kept; the metres are an authoring aid, never testimony, and the distance is where the scene
*draws* the shape (see *Where the shape is drawn*).

### Decor that moves, and lights that blink

`DecorObject` is scenery whose position is known, and two things it can now also be:

- **`track`** — where it is over time, altitude included. Scenery stays put; an aircraft crossing the sky or a car
  driving past states a few keyframes and `resolveDecorPlacementAt` interpolates between them (heading is *held*,
  not blended: nothing here knows which way round a turn was flown).
- **`lights`** — its individual lamps, each with a place on the body, a colour, and a **pattern**: steady, or
  flashing at `perMinute` with a `dutyCycle` and a `phase`. A square wave, never a fade.

The rates are real and regulated — aircraft anticollision lights flash 40–100 times a minute, road-vehicle hazard
flashers 60–120 — and `LIGHT_RIGS` (`src/engine/model/LightRig.ts`) holds ready-made sets: airliner, helicopter,
car headlights, car hazards, emergency beacons, streetlamp. A catalogue of specific aircraft is more entries there,
never more code. Nothing about this is aircraft-specific: what dots a long exposure for an airliner's beacon dots
it for a car's hazards too, at a different rate.

That rate is the point, and it is now DRAWN. On a long exposure the spacing of the dots along a streak is the flash
rate times the object's angular speed, which is exactly how a photograph of a passing airliner is told from a
photograph of something that does not blink — and it is why the model exposes `lightOnFractionBetween` rather than
only "is it on?". A wingtip strobe is lit for a hundredth of its cycle; sampled instant by instant it would be
missed almost every time, and the dots that did appear would be an artefact of the sampling rate. Integrating the
fraction of each interval is exact however coarsely it is sampled.

The photograph this reproduces is Gennevilliers, 5 November 1990 (`/science/crypto/ufo/enquete/meprise/aeronef/
avion/`): an airliner on a ten- or thirty-second pose, published as a monumental craft — its steady lamps drawing
LINES and its flashing ones DOTS AT REGULAR INTERVALS. Reconstructed here at 6.7 km on a 20 s pose through a 50 mm
lens, an aircraft leaves an 800 px streak carrying 21 dots a median 41 px apart, where 60 flashes a minute over
20 s across 800 px predicts one every 40. `ExposureSampling` is what makes that possible: the sky drifts a single
pixel in ten seconds and would ask for two instants, so the pose is sampled instead for what MOVES in the scene
(an instant per two pixels of travel) and for what FLASHES in it (two instants per flash, which is what tells one
dot from the next rather than dotting the line at the sampler's own rate). A lamp is also written in real units —
`LAMP_RADIANCE`, about twenty times white for a position light, and `DecorLight.intensity` as a ratio of peak
candela (a wingtip strobe really is some twenty times one) — because a pose spreads a lamp's light over hundreds
of pixels, and at white a whole aircraft trail came out at a thousandth of white, i.e. invisible.

An aircraft in a scene is a **hypothesis**, not testimony — "here is what a flight at that altitude and heading
would have looked like" — and belongs to the decor for that reason, next to the buildings and trees whose
positions are likewise known rather than reported.

### How big it was, and what it looked like

`DecorObject` used to have no size at all. Every building was a six-metre cube per storey, every vehicle the same
1.8 × 4.35 × 2.0 box, whatever the testimony said. In a project that will not store an angle nobody perceived (see
*Apparent size*, above), that was the last place a number was invented rather than stated: Zamora's Pontiac and a
delivery van were the same object, and "the dynamite shack" was a warehouse.

- **`sizeM`** — the object's real size in metres along its OWN axes: `widthM` across it, `lengthM` along the way its
  heading faces, `heightM` up. **Each axis is separately optional**, and an absent one means nobody measured it: the
  built-in shape keeps its own proportion there. Pacing out the length of a shed states one number, and must not
  oblige anyone to invent a width. The editor shows what the built-in shape measures as a grey **placeholder**, which
  is the honest way to say "this is what you are looking at, and it is not a measurement".
- **`model`** — which real 3D model stands in for the built-in shape, if one does. Named by catalogue **`id`** (see
  below), or by a direct **`url`** that wins over it — an escape hatch the editor keeps collapsed, since naming a
  glTF file by hand means also carrying the credit that has to travel with it.

A model **never decides how big the object is**. It is fitted to the stated size, uniformly, along the length: the
length is the axis heading is defined by and the one a vehicle, an airframe or a building is most reliably described
by, so it sets the scale and the model's own proportions decide the rest. A model whose proportions then disagree
with the measured width or height is the wrong model for the object — a curation problem, not something to hide by
squashing it. The measurement stays in the data and the model only says what shape fills it, so swapping the model
can never quietly change an angle a reader is measuring.

### Where the 3D models come from

`DecorModelProvider` (`src/render3d/decor/`) is a catalogue, in the same lineage as `ElevationProvider` and
`ImageryProvider` and registered the same way — the picker in **Data sources** *is* the credit. Its whole job is to
answer "what does this `id` mean today, and who has to be credited for it", which is the part that is allowed to
change under a recording that never does. A reconstruction saying a 1964 patrol car stood eight metres away should
not have to be edited when a better model of one turns up.

`UfoAtHomeModelCatalogue` is the one implementation, and it reads `/models/index.json` **beside the page first and
from ufoathome.org otherwise**: a host that mirrors the models serves its own, and every other page embedding
`<rr0-scene>` — an rr0.org case dossier above all — gets them from here, with no configuration.

They are hosted rather than linked because of what a survey of the alternatives found. The catalogues readable
cross-origin hold test objects and props: Khronos's sample assets exist to exercise glTF features (a toy car; a milk
truck carrying Cesium's trademark), and Poly Haven's 521 models are tools, bottles and food, with no vehicle and no
building among them. The CC0 kits that *do* contain a car, an airframe or a lamp post live mainly on third-party
mirrors whose permanence and stated licence vary. So the rule is the one this project already applies to data it did
not produce: when a source is not guaranteed to last, take a copy, keep the credit with it, and serve it from
somewhere that will. See `public/models/README.md` for the catalogue's own format and for what a model has to satisfy
to go in it.

What is in it today is at least one stylised low-poly model for every decor kind — two cars, a house, two trees and a
street lamp from Kenney's CC0 kits, and a narrow-body airliner from Google's Poly archive under CC BY 3.0 — each named
in the picker as the placeholder it is: right KIND, no particular model, make or year. That is the whole of the claim,
and it is worth making: a car-shaped silhouette at forty metres in evening light reads as a car, where a rectangular
prism reads as a building, which is where this started. Socorro's own patrol car uses one of them, at the real
Pontiac's dimensions and with the substitution stated in the recording's description.

One thing a model does NOT yet do is let the witness look out from inside it. A recording can place them inside a
building or a vehicle, and what they then look at is the room the built-in shape builds around them — walls, window
openings sized from the data, the pillar between two door windows. A downloaded model is a hull with none of that, so
while the witness is inside an object the built-in shape is kept. Looking out through a real model is the objective
(it is what makes "how much of the sky did the windscreen pillar hide?" answerable) and needs models with interiors,
glazing made genuinely transparent, and the viewpoint taken from the model rather than from the primitive's seat.

Three things follow, and all three are deliberate:

- **`GLTFLoader` is imported only when a recording actually names a model.** It is a hundred kilobytes of addon, and
  almost every recording has none.
- **A model with no credit is not drawn.** An unattributed model is not a licence, it is a hope. The credits that
  *are* complete appear in the info panel beside the recording's own sources.
- **Every failure ends with the built-in shape.** A catalogue that is offline, an address that has rotted, a file
  that is not valid glTF are all "no model today". Scenery that vanished because a CDN was down would be worse than
  scenery drawn as boxes.

### Instrument — an eye is not a lens

`instrument` says what the observation was made through, and it changes the geometry of every frame.

A camera lens maps a direction to its sensor as `r = f·tan θ`: straight lines stay straight, and everything away
from the axis is stretched by `sec²θ` — 42% at 33° off-centre, 105% at the corner of a 16:9 frame with a 60°
vertical field. That is *correct* for a photograph and only looks right from the projection centre, about half an
image-width from the screen. An eye does no such thing: it perceives an angle as an angle wherever it falls, so
`instrument: "eye"` renders `r = f·θ` — image distance proportional to angle, which is what lets a ruler held to
the screen mean something. (A slight tangential stretch of `θ/sin θ` remains, 6% at 33°; no flat image escapes
trading one distortion for another.)

three.js's camera can only do the pinhole, so `EquidistantProjectionPass` renders the scene into an offscreen
target with a deliberately wider field and resamples it in one fullscreen pass. Everything that *aims* at the scene
rather than drawing it — the decor raycasts behind `decorDistancesAt`, and the direction each phenomenon is stood
along — goes through `directionFor`, since a point on the visible image no longer means what the pinhole camera
thinks it means.

This is also why a change of instrument **moves** shapes and not just resizes them (`SightingShapes.reproject`): a
pixel only names a direction once a projection is named. Leaving positions alone is exactly how an object drawn in
several parts comes apart — the fuselage grows and its row of windows stays put.

Every case file here declares `eye`, because every one of them was watched rather than filmed. Until this existed
they were all rendered as photographs, which is what made Socorro's dynamite shack read as twice the size it
subtends.

One residual worth naming: an angular extent is stored as its *on-axis* value, and the plane that carries a
shape is sized by that same on-axis conversion wherever it stands. For an object 9° off-axis subtending 9°, that
is about 2.5% out; it is a fifth of the error it replaces, and it shrinks towards the centre of the frame.

#### A pose long enough draws the sky

The shutter accumulates the object (`UfoElement.exposureInstants`), and past a certain length it accumulates the
**sky** too: the Earth turns under it at 15.041° an hour — a sidereal day, not a solar one — so every star is drawn
out into the arc a tripod really records. A photograph of "lights that moved" is quite often exactly this, the
lights having held perfectly still while the camera did not.

`SkyDrift` (`src/engine/astronomy/SkyDrift.ts`) states what the SKY did, in pixels, and how many instants that
takes to draw — `ExposureSampling` (`src/engine/model/ExposureSampling.ts`) answers the same question for what
stands against it (see [Decor that moves](#decor-that-moves-and-lights-that-blink)), and the pose is drawn at
whichever asks for more: one per pixel of the longest trail, so the arc lands on touching pixels instead of dashing, and
**one** — no accumulation at all — whenever the sky moved less than a pixel, which is every ordinary frame (a
snapshot renders in a tenth of a millisecond and never comes near this). Each instant is a whole sky RECOMPUTED at
its own moment (`SceneElement.applySceneAt`, pushed through `SceneRenderer.setExposure`) rather than one sky nudged
sideways, so the arcs curve towards the pole exactly as they should and the Moon and the planets travel their own
way through the frame. `ExposureAccumulation` adds them on a half-float film in linear light and bends the sRGB
curve only once, at the end — the same rule `colorSpace.ts` states, and the reason both fullscreen passes can now
be told not to encode what they hand to it.

The pose itself is one setting for the whole recording (`Sighting.exposureSeconds`, held to the device's own range),
not a keyframed one: what the shutter did is how this observation was photographed, and a value that varied along
the timeline would make the same recording two different photographs at two instants. A file written while it lived
on each pose is read back through the first pose that stated one.

A pose is drawn in two moves, because a sky costs about 8 ms to rebuild and a five-minute pose is 37 of them: the
**viewfinder** immediately (one instant, a twentieth of a millisecond) and the **photograph** as the scene settles,
a dozen milliseconds of instants per animation frame, shown as the film fills and gained up to stay properly
exposed — so it goes from beady to smooth rather than from black to bright. Anything the witness does interrupts it
and starts it again, which is why the editor stays answerable while a long pose is on. Doing it all inside one call
is what made it crawl: the dozen setters a single tick touches would each rebuild the whole pose, and the per-frame
animation loop (twinkle, rain, lightning — none of which survives a pose of minutes anyway) restarted it sixty
times a second, so the picture never finished at all.

Each instant carries its share of the light rather than its whole, so the picture stays exposed as it was taken and
the movement shows as a trail. That has a consequence worth stating plainly, because it is the physics and not a
shortcoming: a trail is FAINT, and the longer it is the fainter it gets — one star's light spread over more and
more pixels. Measured against a night sky of 30.5: a first-magnitude star peaks at 181 as a point at 1/250 s, 52
after ten minutes, 39 after thirty, 35 after an hour. This project draws what the pose collected, not what would
read well.

Only the 35 mm SLRs offer poses like that, and they offer them because they really had them: **B**, where the
shutter stays open as long as it is held. An Instamatic had one shutter speed and a phone's night mode stops at ten
seconds — neither can draw a trail, and neither is offered one: a pose typed past what the device could do is
brought back inside its range rather than kept, since it would put a trail in the picture that the camera named on
the same recording could never have drawn.

Two consequences of drawing a pose rather than an instant, both of which cost an evening to find:

- **What is on screen is not where the object is at the playhead**, so that is what a pointer has to be aimed at.
  `UfoElement.shapeAt` hit-tests every instant of the pose, and without it an object with a ten-second pose became
  impossible to select at all — the click fell straight through the streak onto the landscape behind. The selection
  handles stay on the playhead's own instant: where they sit against the streak is the answer to "which moment am I
  editing".
- **How finely the pose is sampled is a distance, not a duration.** Counting time alone (a painting every fiftieth
  of a second) leaves a fast object visibly BEADED — 48 paintings across three hundred pixels land six apart, and a
  reader sees the paintings instead of the streak. The object's own travel decides it, one instant per two pixels.

#### Where meters do come back

The only real distance a testimony can support is an **inequality**, and only where the witness saw the object
cross something whose position is known: it passed *behind* that hangar (at least that far), or *in front of* that
tree (at most that far). `DecorObject.eastM/northM` give the decor its real position, `occludesSourceIds` says
which side of it the object was on, and `SceneRenderer.decorDistancesAt` raycasts the exact line of sight to
measure the crossing.

An angle plus a distance is a size, and a size does not change as the object flies — so every crossing narrows the
object's real width from one side, for the whole recording, and the narrowed width reads back as a distance at
every other instant. `SizeEstimate` (`src/engine/shape/SizeEstimate.ts`) accumulates that, reports a contradiction
rather than clamping one, and the editor prints the result under the apparent size.

#### Where the shape is drawn

A plane facing the witness, scaled to the stated angle, looks the same from their eye at any distance — so the
scene has to put it *somewhere*, and where is a parameter of the picture, never a fact the recording states.
`PhenomenonDepth` (`src/engine/shape/PhenomenonDepth.ts`) is the one place that decides it, from five sources in
the order they outrank each other: a distance the recording **states** (none does yet — the tier exists for the
day a close encounter is written as a body in metres); a **hypothesis** the reader is trying; what the witness's
own walk **derives** (`ShapeDistance`, see below); what the crossings **bound**, the geometric middle of the
interval they leave, since any distance in it draws every crossing correctly; and, for the majority that
establishes nothing, a **conventional** few metres — in front of everything that was not declared to hide it,
which is what "not declared" has always meant here, and near rather than far so a shape drawn low in the frame
does not go under a distant ground. A shape drawn wholly inside another stands where that one stands, a hair
nearer: Socorro's insignia is painted on its craft, and a craft tried at five hundred metres must take its
insignia with it.

The hypothesis is the editor's **Distance** field, and the slider under it — a metre to twenty kilometres,
logarithmic — and it outranks what the data establishes on purpose: a hypothesis is tested by watching it fail.
Hold the apparent width, drag the craft out to five hundred metres and it goes behind the patrol car it was drawn
in front of; slide it back and it comes out. It is never saved. The line under the slider says where the shape is drawn right now and on
what basis, and the cross withdraws the hypothesis.

Most sightings constrain nothing at all — a light in an empty night sky crosses nothing — and the readout then says
so. "Unknown" is the honest answer for a majority of cases, and saying it out loud is the entire point of not
storing a number instead.

This format is deliberately independent of [`@rr0/data`](https://github.com/RR0/data)'s `RR0Event`/`@rr0/time`'s
`Level2Date`/`@rr0/place`'s `Place` classes, even though its `time`/`place` fields are structurally aligned with
them — importing those classes into browser-bundled code pulls in Node-only file-scanning dependencies that break a
`vite build`. `src/engine/interop/rr0Data.ts` converts between the two for Node-side tooling (e.g. generating a
case's `sighting.json` from its `RR0Event`).

## Architecture

- `src/engine/` — framework-agnostic core: `model/` (`Shape`, `Timeline`, `Sighting`), `record/` (`Recorder`,
  `SamplingClock`), `playback/` (`Player`), `persistence/` (JSON (de)serialization), `astronomy/` (vanilla solar
  position), `interop/` (real `@rr0/data` conversion, Node-only).
- `src/render/CanvasRenderer.ts` — paints shapes onto a `<canvas>` 2D context: the texture of each plane the
  scene stands a shape on, the editing handles on the overlay, and the recording brush.
- `src/render3d/` — the Three.js decor renderer (`SceneRenderer`), the phenomena standing in it
  (`PhenomenonSystem.ts`, drawn in their own decor-depth-tested pass), and its pure, dependency-free color logic
  (`skyColors.ts`), kept separate so the latter is unit-testable without a WebGL context.
- `src/component/` — the three Web Components and the playback layer under them. `UfoElement` (registered as
  `rr0-ufo`, an inner layer and not a published component since 0.54.0) owns the timeline, the controls and the
  pointer's canvas; `SceneElement` (`<rr0-scene>`) composes it directly (via `document.createElement`, not an inline
  template tag — see the comment at that call site), standing the phenomena in its scene. `SightingEditorElement` and
  `SightingElement` (`<rr0-sighting>`) both compose a `SceneElement` in turn (not `UfoElement` directly) —
  the editor reaches through to its public `ufoElement` property for the actual canvas/timeline/appearance work
  (the toolbar edits the exact same `Sighting` instance the nested scene renders from, so an observer/time/
  appearance change needs no separate sync step to reach the sky), while `SightingElement` reaches through to
  its public `sightingData`/`currentTerrainAttribution` for its own toolbar (witness picker) and info panel.
- Playback linearly interpolates shapes between a source's surrounding keyframes for smooth motion
  (`Timeline.getInterpolatedShapeAt`/`Shape.lerpShape`), holding at the ends of its recorded range.
- Recording samples the pointer position at a configurable rate via `requestAnimationFrame`, not on every
  `pointermove` event.

## Development

```bash
npm install
npm run dev                  # local demo (record + play), Vite dev server
npm test                     # vitest
npm run build                 # type-check + build the demo
npm run build:embed            # build dist-embed/rr0-sighting-editor.mjs
npm run build:embed-scene       # build dist-embed-scene/rr0-scene.mjs
npm run build:embed-sighting  # build dist-embed-sighting/rr0-sighting.mjs
npm run build:all              # all three
npm run build:site             # ufoathome.org, into dist-site/
npm run build:comets           # regenerate the comet catalog from JPL Horizons
npm run build:satellites       # regenerate the satellite catalog from CelesTrak's SATCAT
```

## The site

[`ufoathome.org`](https://ufoathome.org) is built from `site/` in this repository, so the tool's documentation, its
demo catalogue and its roadmap stay in step with the version they describe. `npm run build:site` builds the four
embed bundles, then generates the pages into `dist-site/`, which is what Netlify deploys.

It is **not** a Vite build. Its pages import the bundles `build:embed*` already produces and have nothing else to
bundle; running them through Vite would re-emit those bundles under hashed names, which is the opposite of what a
page handing out a copy-pasteable `<script src>` needs. So `site/build.ts` generates the HTML, copies the bundles
as they are, and copies `public/demo-data/` alongside them. The one exception is `site/scripts/jsonEditor.ts` (the
Player page's paste panel, which pulls in CodeMirror): it gets its own Vite config, and the page loads it lazily.

Each page is one module under `site/content/` holding **both** languages, because they are translations of each
other and keeping a sentence next to its counterpart is what stops the two from drifting. English is at the root
and is the fallback; French lives under `/fr/` with its own slugs. Like the components, the site detects and never
offers a picker — Netlify's own `Language=` rules do the detection, and `hreflang` declares the pairing to search
engines.

## License

MIT
