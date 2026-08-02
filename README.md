<img src="doc/web/ufoathome/UFOAtHome.png" align=right alt="UFO@home logo">

# UFO@home

**UFO@home** lets a UFO witness record the shape, appearance and movement of what they saw — and replay it like a VCR —
instead of relying only on a written or spoken account. The approach follows [Roger Shepard's
recommendation](https://rr0.org/time/1/9/6/8/07/29/Symposium/Shepard/index_fr.html) that a visual reconstruction of a
testimony is more faithful than an oral or written one.

Originally a Java applet (2003), the project has been rewritten from scratch in TypeScript: a small,
dependency-light engine (keyframe timeline, recording, playback, Canvas2D rendering) wrapped in three vanilla
[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) — no UI framework, no build step
required by the consuming page. One of the three (`<rr0-ufo-scene>`) does pull in [Three.js](https://threejs.org/)
for an optional 3D backdrop — see [`<rr0-ufo-scene>`](#rr0-ufo-scene--3d-decor) below for why that's an isolated,
opt-in bundle rather than a project-wide dependency.

See the [Wiki](https://github.com/RR0/UfoAtHome/wiki) for the project's history, and a live example embedded in
[rr0.org's UFO@home page](https://rr0.org/science/crypto/ufo/enquete/projet/UfoAtHome.html) and in its
[Chiles-Whitted case reconstruction](https://rr0.org/science/crypto/ufo/enquete/dossier/ChilesWhitted/index.html).

## Install

```bash
npm install @rr0/ufoathome
```

Three self-contained, pre-built ES modules are published — each self-registers its custom element as soon as it's
imported, no explicit setup call needed:

```html
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-player/rr0-ufo-player.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed/rr0-ufo-recorder.mjs"></script>
<script type="module" src="/node_modules/@rr0/ufoathome/dist-embed-scene/rr0-ufo-scene.mjs"></script>
```

or, from a bundler:

```ts
import "@rr0/ufoathome/player"   // registers <rr0-ufo-player>
import "@rr0/ufoathome/recorder" // registers <rr0-ufo-recorder> (and <rr0-ufo-player>, which it composes)
import "@rr0/ufoathome/scene"    // registers <rr0-ufo-scene> (and <rr0-ufo-player>, which it composes)
```

Only load the one(s) a given page actually needs — `rr0-ufo-scene.mjs` in particular pulls in Three.js and is far
heavier than the other two (see its section below), so pages that just need playback should stick to
`rr0-ufo-player.mjs`.

## `<rr0-ufo-player>` — read-only playback

The lightweight component (~9KB): a canvas plus Play/Pause/seek controls. Use it wherever a page only needs to
*replay* an already-recorded sighting — this is the one to embed in content pages.

```html
<rr0-ufo-player src="sighting.json"></rr0-ufo-player>
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

## `<rr0-ufo-recorder>` — full editor

The authoring component (~17KB): everything `<rr0-ufo-player>` has, plus a shape/appearance toolbar (oval/saucer/
triangle presets, color, transparency, halo) and drag-to-record. It composes a `<rr0-ufo-player>` internally rather
than duplicating the canvas/playback code — see [Architecture](#architecture).

```html
<rr0-ufo-recorder></rr0-ufo-recorder>
```

Usage: click **Record**, move the pointer over the canvas to draw the UFO's path, click **Stop**, then **Play** to
replay it.

| Member | Kind | Description |
|---|---|---|
| `sightingData` | property (get/set) | Delegates to the nested player's `sightingData` |
| `appearance` | property (get/set, accepts a partial object on set) | `{ presetId: "oval" \| "saucer" \| "triangle", color: string, transparency: number, haloScale: number }` — the UFO's appearance used for the next recording |

## `<rr0-ufo-scene>` — 3D decor

The environmental variant (~180KB gzip, dominated by [Three.js](https://threejs.org/) — this is by far the heaviest
of the three bundles, load it only on pages that want it): everything `<rr0-ufo-player>` has, composited over a 3D
sky/horizon/starfield backdrop instead of a plain background. Same markup and members as `<rr0-ufo-player>` (`src`,
`sightingData`, `loadFromSrc`) — it's a drop-in upgrade.

```html
<rr0-ufo-scene src="sighting.json"></rr0-ufo-scene>
```

Lighting (sky darkness/color, star visibility) is computed from the sighting's own recorded `time`/`place` via
`src/engine/astronomy/SunPosition.ts` — a vanilla (no dependency) implementation of the standard NOAA/Spencer
low-precision solar position approximation. Deliberately scoped down for this first pass: only the sun's *altitude*
drives the sky, not azimuth — positioning a sun/moon disc (or anything else) at a specific compass direction needs
the witness's viewing heading, which isn't part of the data model yet. Precipitation and optical effects (lens
flare, halos, mirage) are future work; see `src/render3d/SceneRenderer.ts`.

The UFO shape itself deliberately stays a 2D overlay on top of the 3D decor, never "upgraded" to a 3D object: it's
what the witness reported — possibly a misidentification or optical effect — not something to interpret as a real
3D shape. Only the surrounding environment, independently computable from real astronomy, is rendered in 3D.

## Data format

Both components read/write a plain, JSON-serializable `SightingRecordingJson`:

```ts
interface SightingRecordingJson {
  version: 1
  time?: { year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number }
  place?: { lat: number, lng: number }[]
  witnessId?: string
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
- `src/component/` — the three Web Components. `UfoPlayerElement` owns the canvas/playback; `UfoRecorderElement` and
  `UfoSceneElement` both compose it (via `document.createElement`, not an inline template tag — see the comment at
  that call site) rather than duplicating it, adding recording/appearance-editing or the 3D decor on top,
  respectively.
- Playback is deliberately discrete (hold-last-keyframe, no interpolation), matching the original applet's behavior.
- Recording samples the pointer position at a configurable rate via `requestAnimationFrame`, not on every
  `pointermove` event.

## Development

```bash
npm install
npm run dev             # local demo (record + play), Vite dev server
npm test                # vitest
npm run build            # type-check + build the demo
npm run build:embed       # build dist-embed/rr0-ufo-recorder.mjs
npm run build:embed-player # build dist-embed-player/rr0-ufo-player.mjs
npm run build:embed-scene  # build dist-embed-scene/rr0-ufo-scene.mjs
npm run build:all         # all four
```

## License

MIT
