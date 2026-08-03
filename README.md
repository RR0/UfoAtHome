<img src="doc/web/ufoathome/UFOAtHome.png" align=right alt="UFO@home logo">

# UFO@home

**UFO@home** lets a UFO witness record the shape, appearance and movement of what they saw — and replay it like a VCR —
instead of relying only on a written or spoken account. The approach follows [Roger Shepard's
recommendation](https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index_fr.html) that a visual reconstruction of a
testimony is more faithful than an oral or written one.

Originally a Java applet (2003), the project has been rewritten from scratch in TypeScript: a small,
dependency-light engine (keyframe timeline, recording, playback, Canvas2D rendering) wrapped in four vanilla
[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) — no UI framework, no build step
required by the consuming page. One of the four (`<rr0-scene>`) does pull in [Three.js](https://threejs.org/)
for an optional 3D backdrop — see [`<rr0-scene>`](#rr0-scene--3d-decor) below for why that's an isolated,
opt-in bundle rather than a project-wide dependency.

### Naming

`<rr0-ufo>` is the UFO's own 2D shape/appearance/movement layer — no "player" suffix, since read-only playback is
its default behavior and `<rr0-ufo-recorder>` is the one that needs a qualifier (it *adds* recording on top).
`<rr0-scene>` is named without "ufo" on purpose: it only renders a generic 3D decor (sky/horizon/stars) from a
real-world time and place, with no UFO-specific logic of its own — today it composes a nested `<rr0-ufo>` for the
common case (see its section below), but the decor itself could back other kinds of reconstructions later. A fully
generic version (accepting arbitrary overlay content instead of always creating its own `<rr0-ufo>`) is a natural
follow-up, not implemented yet. `<rr0-ufo-witnesses>` follows the same "adds a qualifier" logic as the recorder:
it *adds* a multi-witness selector on top of `<rr0-ufo>`, for cases that have more than one witness's own
recording of the same sighting.

See the [Wiki](https://github.com/RR0/UfoAtHome/wiki) for the project's history, and a live example embedded in
[rr0.org's UFO@home page](https://rr0.org/science/crypto/ufo/enquete/projet/UfoAtHome.html) and in its
[Chiles-Whitted case reconstruction](https://rr0.org/science/crypto/ufo/enquete/dossier/ChilesWhitted/index.html).

## Install

```bash
npm install @rr0/ufoathome
```

Four self-contained, pre-built ES modules are published — each self-registers its custom element as soon as it's
imported, no explicit setup call needed:

```html
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-ufo/rr0-ufo.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed/rr0-ufo-recorder.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-scene/rr0-scene.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-witnesses/rr0-ufo-witnesses.mjs"></script>
```

or, from a bundler:

```ts
import "@rr0/ufoathome/ufo"       // registers <rr0-ufo>
import "@rr0/ufoathome/recorder"  // registers <rr0-ufo-recorder> (and <rr0-ufo>, which it composes)
import "@rr0/ufoathome/scene"     // registers <rr0-scene> (and <rr0-ufo>, which it composes)
import "@rr0/ufoathome/witnesses" // registers <rr0-ufo-witnesses> (and <rr0-ufo>, which it composes)
```

Only load the one(s) a given page actually needs — `rr0-scene.mjs` in particular pulls in Three.js and is far
heavier than the others (see its section below), so pages that just need playback should stick to `rr0-ufo.mjs`.

## `<rr0-ufo>` — read-only playback

The lightweight component (~9KB): a canvas plus Play/Pause/Loop/seek controls. Use it wherever a page only needs to
*replay* an already-recorded sighting — this is the one to embed in content pages.

```html
<rr0-ufo src="sighting.json"></rr0-ufo>
```

| Member | Kind | Description |
|---|---|---|
| `src` | attribute | URL of a [`SightingRecordingJson`](#data-format) file, fetched automatically on connect and whenever the attribute changes |
| `sightingData` | property (get/set) | The current recording as a plain [`SightingRecordingJson`](#data-format) object |
| `sighting` | property (readonly) | The live `Sighting` model (real-world time/place + the recording's `Timeline`) |
| `canvasElement` | property (readonly) | The underlying `<canvas>` element |
| `renderer` | property (readonly) | The `CanvasRenderer` instance painting onto that canvas |
| `refresh()` | method | Re-reads the timeline's duration into the seek slider and repaints the current frame — call after externally mutating `sighting.timeline` |
| `loadFromSrc(url)` | method (async) | What the `src` attribute triggers internally; can be called directly too |
| `enableClickToPlay` | property (get/set, default `true`) | Whether clicking the canvas toggles Play/Pause (see below). Composing elements that need the canvas's own click for something else set this to `false` — see `<rr0-ufo-recorder>`. |
| `fullscreenTarget` | property (get/set, default: the component's own stage) | The element the fullscreen button requests fullscreen on. Composing elements that need a *different* element fullscreened set this — see `<rr0-scene>`. |

Playback matches the observation's *real reported duration* when it's known: set `time`/`endTime`, or `time`/
`durationSeconds`, in the [data format](#data-format) (`durationSeconds` takes precedence over `endTime` if both are
given). Watching a 5-minute sighting then takes 5 real minutes, not however long the recording itself took to
author (e.g. a quick mouse drag) — drag the seek bar directly to skip ahead. The start/end labels around the seek
bar show real clock times when `time` has an hour (e.g. `02:45` → `02:50`); otherwise they show `0:00` → the
duration actually available (the declared one if known, else the recording's own length). Playback loops by
default — click the loop button (pressed = looping) to play once and stop instead.

Clicking anywhere on the canvas also toggles Play/Pause (not just the button), matching common video-player UX.
While playing, the toolbar and the fullscreen button (top-right, semi-transparent over the content) auto-hide and
only reappear on hover — always shown while paused/stopped. The fullscreen button uses the standard Fullscreen API
(`requestFullscreen`/`exitFullscreen`); exiting with Escape is native browser behavior, nothing custom.

Labels (Play/Pause, Auto-replay, Current position, Duration, Fullscreen) are translated (English/French) based on
the visitor's `navigator.languages`, falling back to English — there's no language-picker UI, this is the only
mechanism.

## `<rr0-ufo-recorder>` — full editor

The authoring component (~17KB): everything `<rr0-ufo>` has, plus a shape/appearance toolbar (oval/saucer/
triangle presets, color, transparency, halo) and drag-to-record. It composes a `<rr0-ufo>` internally rather
than duplicating the canvas/playback code — see [Architecture](#architecture).

```html
<rr0-ufo-recorder></rr0-ufo-recorder>
```

Usage: click **Record**, move the pointer over the canvas to draw the UFO's path, click **Stop**, then **Play** to
replay it. The nested `<rr0-ufo>`'s `enableClickToPlay` is set to `false` here — a completed recording drag also
fires a native "click" on the canvas, which would otherwise spuriously toggle playback right after recording.

All of the toolbar's own labels (shape presets, Color/Transparency/Halo, Add shape, Record/Stop, Export JSON,
Duration) are translated (English/French) the same way `<rr0-ufo>`'s own labels are — based on
`navigator.languages`, no picker UI.

| Member | Kind | Description |
|---|---|---|
| `sightingData` | property (get/set) | Delegates to the nested `<rr0-ufo>`'s `sightingData` |
| `appearance` | property (get/set, accepts a partial object on set) | `{ presetId: "oval" \| "saucer" \| "triangle", color: string, transparency: number, haloScale: number }` — the UFO's appearance used for the next recording |

## `<rr0-scene>` — 3D decor

The environmental variant (~180KB gzip, dominated by [Three.js](https://threejs.org/) — this is by far the heaviest
of the four bundles, load it only on pages that want it): everything `<rr0-ufo>` has, composited over a 3D
sky/horizon/starfield backdrop instead of a plain background. Same markup and members as `<rr0-ufo>` (`src`,
`sightingData`, `loadFromSrc`, `enableClickToPlay`) — it's a drop-in upgrade, including click-to-play/pause
anywhere on the scene (the nested `<rr0-ufo>`'s transparent canvas covers the whole stage). The fullscreen button
fullscreens the *whole* scene (3D backdrop included), not just the nested `<rr0-ufo>`'s own overlay — it sets the
nested element's `fullscreenTarget` to its own outer stage for this.

```html
<rr0-scene src="sighting.json"></rr0-scene>
```

Lighting (sky darkness/color, star visibility) is computed from the sighting's own recorded `time`/`place` via
`src/engine/astronomy/SunPosition.ts` — a vanilla (no dependency) implementation of the standard NOAA/Spencer
low-precision solar position approximation. Deliberately scoped down for this first pass: only the sun's *altitude*
drives the sky, not azimuth — positioning a sun/moon disc (or anything else) at a specific compass direction needs
the witness's viewing heading, which isn't part of the data model yet. Star positions are randomized (not a real
catalog) and brightness follows a stylized statistical distribution, not real magnitudes — see
`src/render3d/skyColors.ts`.

**Planned: real astronomy for misidentification spotting.** A recurring cause of UFO reports is a mundane
astronomical object or atmospheric optical effect — Venus (by far the most commonly misreported "UFO"), other
planets, the Moon (including its phase), lens flare, or halo phenomena like sun dogs/moon dogs (22° halo, often
mistaken for a second light source or "controlled" object). Rendering these accurately enough to flag a likely
misidentification needs:
- Witness viewing heading/azimuth (and field of view) added to the data model — the current altitude-only lighting
  model can't place anything at a specific compass position, only judge overall sky darkness.
- Real star catalog positions + magnitudes (e.g. Yale Bright Star Catalog) instead of the current randomized field —
  filtered to naked-eye visibility (magnitude < 7.5) since these are human eyewitness observations, not
  instrument-assisted ones; no point carrying catalog entries no witness could ever have seen.
- Planetary position ephemeris (at least Venus/Mars/Jupiter/Saturn) and lunar position/phase — both computable
  without an external dependency the same way `SunPosition.ts` is, or via a small vetted library.
- Sun dog / moon dog / halo rendering, conditioned on the sun or moon's altitude and (loosely) on real halo
  formation conditions (cirrus/ice-crystal cloud, sun-observer angle).

Not started yet; see `src/render3d/SceneRenderer.ts`. Precipitation and other optical effects (lens flare, mirage)
remain future work too.

The UFO shape itself deliberately stays a 2D overlay on top of the 3D decor, never "upgraded" to a 3D object: it's
what the witness reported — possibly a misidentification or optical effect — not something to interpret as a real
3D shape. Only the surrounding environment, independently computable from real astronomy, is rendered in 3D.

## `<rr0-ufo-witnesses>` — multi-witness selector

A case can have more than one witness, each with their own recording (their own `sighting.json`) of the same
event. This component lets a page switch between them instead of only ever embedding one fixed `<rr0-ufo>` — it
composes a nested `<rr0-ufo>` the same way `<rr0-scene>` does, and is otherwise just as lightweight.

```html
<rr0-ufo-witnesses src="witnesses.json"></rr0-ufo-witnesses>
```

`src` points not at a `sighting.json` directly, but at a small manifest — a plain JSON array of each witness's own
`SightingRecordingJson` URL (typically relative to the case's own page, same as `<rr0-ufo>`'s own `src`):

```json
["chiles-sighting.json", "whitted-sighting.json"]
```

No labels or ids are duplicated in the manifest itself — each witness's display name and the shared case id
grouping them together are read from that witness's *own* file (`witnessName`/`caseId`, see
[Data format](#data-format)), so there's a single source of truth and nothing to drift out of sync. This means
every listed witness's recording is fetched upfront (to read its name), not lazily on selection — fine at the
scale a case's witness list actually has. If a witness has no `witnessName`, its `witnessId` is shown instead, or
the URL itself as a last resort. A mismatched `caseId` across the listed witnesses logs a console warning (doesn't
block) — likely means unrelated recordings got listed together by mistake.

| Member | Kind | Description |
|---|---|---|
| `src` | attribute | URL of a witness manifest (above), fetched automatically on connect and whenever the attribute changes |
| `witnessUrls` | property (get/set) | The manifest as a plain array of URLs, for programmatic use instead of `src` |
| `loadFromSrc(url)` | method (async) | What the `src` attribute triggers internally; can be called directly too |

The selector (a plain `<select>` of witness labels) is hidden entirely when there are 0 or 1 witnesses — no point
showing a dropdown with nothing to actually choose between. The first witness loads automatically once the list is
known; switching the selector loads that witness's already-fetched recording into the nested `<rr0-ufo>` (no
re-fetch). Setting `witnessUrls` again (e.g. a manifest refresh) keeps the current selection if that witness is
still present, instead of resetting back to the first.

The "Witness" label itself is translated (English/French) the same way as `<rr0-ufo>`'s own labels.

## Data format

Both components read/write a plain, JSON-serializable `SightingRecordingJson`:

```ts
interface SightingRecordingJson {
  version: 1
  time?: { year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number }
  endTime?: { year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number } // alternative to durationSeconds
  durationSeconds?: number // alternative to endTime; takes precedence if both are set
  place?: { lat: number, lng: number }[]
  witnessId?: string // opaque internal reference — no PII beyond a display name (see witnessName)
  witnessName?: string // for cases where the witness is already publicly named in the published material (e.g. Chiles-Whitted) — omit for anonymous witnesses
  caseId?: string // shared by every witness's own sighting.json for the same case — see <rr0-ufo-witnesses>
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
          points?: { x: number, y: number }[] // "polygon" shapes only
        }
      }>
    }>
  }
}
```

This format is deliberately independent of [`@rr0/data`](https://github.com/RR0/data)'s `RR0Event`/`@rr0/time`'s
`Level2Date`/`@rr0/place`'s `Place` classes, even though its `time`/`place` fields are structurally aligned with
them — importing those classes into browser-bundled code pulls in Node-only file-scanning dependencies that break a
`vite build`. `src/engine/interop/rr0Data.ts` converts between the two for Node-side tooling (e.g. generating a
case's `sighting.json` from its `RR0Event`).

## Architecture

- `src/engine/` — framework-agnostic core: `model/` (`Shape`, `Timeline`, `Sighting`), `record/` (`Recorder`,
  `SamplingClock`), `playback/` (`Player`), `persistence/` (JSON (de)serialization), `astronomy/` (vanilla solar
  position), `interop/` (real `@rr0/data` conversion, Node-only).
- `src/render/CanvasRenderer.ts` — paints shapes onto a `<canvas>` 2D context.
- `src/render3d/` — the Three.js decor renderer (`SceneRenderer`) and its pure, dependency-free color logic
  (`skyColors.ts`), kept separate so the latter is unit-testable without a WebGL context.
- `src/component/` — the four Web Components. `UfoElement` (`<rr0-ufo>`) owns the canvas/playback; `UfoRecorderElement`,
  `SceneElement` (`<rr0-scene>`) and `WitnessSelectorElement` (`<rr0-ufo-witnesses>`) all compose it (via
  `document.createElement`, not an inline template tag — see the comment at that call site) rather than duplicating
  it, adding recording/appearance-editing, the 3D decor, or the multi-witness selector on top, respectively.
- Playback linearly interpolates shapes between a source's surrounding keyframes for smooth motion
  (`Timeline.getInterpolatedShapeAt`/`Shape.lerpShape`), holding at the ends of its recorded range.
- Recording samples the pointer position at a configurable rate via `requestAnimationFrame`, not on every
  `pointermove` event.

## Development

```bash
npm install
npm run dev             # local demo (record + play), Vite dev server
npm test                # vitest
npm run build            # type-check + build the demo
npm run build:embed       # build dist-embed/rr0-ufo-recorder.mjs
npm run build:embed-ufo    # build dist-embed-ufo/rr0-ufo.mjs
npm run build:embed-scene  # build dist-embed-scene/rr0-scene.mjs
npm run build:all         # all four
```

## License

MIT
