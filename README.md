<img src="doc/web/ufoathome/UFOAtHome.png" align=right alt="UFO@home logo">

# UFO@home

**UFO@home** lets a UFO observer record the shape, appearance and movement of what they saw, and replay it
against the real sky, weather and place of the observation, instead of relying only on a written or spoken account.

Everything about **using** it lives on **[ufoathome.org](https://ufoathome.org)**, which is built from this
repository (see [The site](#the-site)) so that it always describes the version it ships with:

- [Demos](https://ufoathome.org/demos/): every published reconstruction, running.
- [Player](https://ufoathome.org/play/) and [editor](https://ufoathome.org/edit/).
- [Documentation](https://ufoathome.org/docs/): embedding the components (`<rr0-sighting>`, `<rr0-scene>`,
  `<rr0-sighting-editor>`), the recording format, the data sources, sharing a recording.
- [Roadmap](https://ufoathome.org/roadmap/) and [FAQ](https://ufoathome.org/faq/).

The components are published on npm as [`@rr0/ufoathome`](https://www.npmjs.com/package/@rr0/ufoathome).
This README only covers what a **contributor** needs: installing, fetching the data, testing, debugging, releasing.
The project's history is in the [Wiki](https://github.com/RR0/UfoAtHome/wiki).

## Setup

Node ≥ 20 (the site is built on Node 22, pinned in [`netlify.toml`](netlify.toml)).

```bash
git clone https://github.com/RR0/UfoAtHome.git
cd UfoAtHome
npm install
npm test
```

Nothing else is needed to develop, test or build: every catalogue the browser uses is committed (see
[Data](#data)). No `.env` either: the only keys the project knows of are the ones a reader types into the
editor themselves (e.g. an Anthropic key to draft a recording from its description), which never leave their
browser.

## Layout

| Path | What |
|---|---|
| `src/engine/` | Framework-agnostic core: model (`Shape`, `Timeline`, `Sighting`), recording, playback, persistence, astronomy, atmosphere, weather, place, assessment. No DOM, no three.js. |
| `src/render/` | 2D canvas drawing: the texture of each phenomenon plane, editing handles, the observer map. |
| `src/render3d/` | The three.js scene (`SceneRenderer`) and its systems: sky, terrain, decor, bodies, clouds, optics, phenomena. |
| `src/component/` | The Web Components. `SceneElement` (`<rr0-scene>`) composes the playback layer `UfoElement`; `SightingElement` and `SightingEditorElement` compose a `SceneElement`. Vanilla custom elements, no framework. |
| `src/assets/` | The star catalogue tiers (generated) and sounds. The other catalogues are generated modules in `src/engine/astronomy/`. |
| `src/generated/` | Derived from the TypeScript by `npm run build:schema`; gitignored, never edited. |
| `public/demo-data/` | The published recordings (`observer-*.json`, `case-*.json`) and the examples the docs quote. |
| `public/models/`, `public/roads/`, `public/tle/` | Archived glTF models, road networks and orbital elements, served next to the bundles (see [`public/models/README.md`](public/models/README.md)). |
| `site/` | The ufoathome.org generator (see [The site](#the-site)). |
| `scripts/` | One-off data builds, case maintenance, GPU checks and performance harnesses. |
| `test/` | Vitest suites mirroring `src/` (`engine`, `render`, `render3d`, `component`, `site`). |
| `checks/` | Pages that must run on a real GPU (see [Debugging](#debugging)). |
| `docs/` | Developer notes: [performance](docs/performance.md), past audits. |
| `doc/web/` | The 2003 Java applet's documentation, kept for history. |

## Data

Every data build is a **one-off** step: its output is committed, and neither `build`, `test` nor `prepublishOnly`
runs it. Re-run one only when its source or its script changes, and commit the result. Raw inputs go under
`scripts/data/`, which is gitignored (except `scripts/data/novae/`, kept so that catalogue stays reproducible).
Each script's header comment says what it takes, what it deliberately leaves out, and why.

| Command | Source | Input | Output |
|---|---|---|---|
| `npm run build:stars` | [HYG Database v4.1](https://github.com/astronexus/HYG-Database) | download `hyg/CURRENT/hygdata_v41.csv` to `scripts/data/` | `src/assets/stars-mag7.5*` |
| `npm run build:comets` | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) (network) | cached in `scripts/data/horizons/` | `src/engine/astronomy/cometCatalog.ts` |
| `npm run build:novae` | AAVSO/Strope 2010 curves, SN 1987A | committed in `scripts/data/novae/` | `src/engine/astronomy/novaCatalog.ts` |
| `npm run build:satellites` | [CelesTrak SATCAT](https://celestrak.org/pub/satcat.csv) (network) | cached as `scripts/data/satcat.csv` | `src/engine/astronomy/satelliteCatalog.ts` |
| `npm run build:tle` | [Laurent Chabin's TLE archive](https://ufowaves.org/gp/my_tles/) | a local copy in `scripts/data/tle/<year>/`, plus `qs.mag` and Stellarium's `satellites.json` | `public/tle/` |
| `npm run build:roads` | OpenStreetMap via Overpass (network) | one query per recording, cached in `scripts/data/roads/` | `public/roads/` |
| `npm run build:sky-reference` | Monte Carlo (a few minutes) | none | `test/engine/atmosphere/sky-reference.json` |
| `npm run build:schema` | the recording's TypeScript types | none | `src/generated/sightingSchema.json` (run automatically before tests and builds) |

`build:novae` and `build:tle` run on plain `node` (it strips the types), the others on `tsx`.

The stand-in 3D models of the Socorro, Valensole and Chiles-Whitted crafts are also built from the accounts,
by scripts with no npm alias:

```bash
npx tsx scripts/build-socorro-craft.ts
```

### Case recordings

The recordings under `public/demo-data/` are also served by rr0.org's case pages, which embed them by a relative
address. Keep both copies identical with:

```bash
npm run sync:cases              # copy into ../rr0.org's case dossiers, reporting what changed
npm run sync:cases -- --check   # change nothing, fail if anything drifted
```

A recording keeps the weather record's answer rather than a link to it. To ask again:

```bash
npx tsx scripts/infer-case-weather.ts public/demo-data/observer-socorro.json --dry-run
npx tsx scripts/refresh-case-weather.ts   # every recording whose weather came from a record
```

Only `weatherTrack` and `weatherSource` are rewritten, spliced into the file's text so the diff shows nothing
else. Run `sync:cases` afterwards.

## Testing

```bash
npm test                                          # vitest, jsdom, test/**/*.test.ts
npm run test:watch
npx vitest run test/engine/Timeline.test.ts       # one file
npx vitest run -t "interpolates"                  # tests whose name matches
```

jsdom has no WebGL: `render3d` tests exercise three.js objects, shaders' inputs and pure logic, not pixels.
What only a real graphics card can tell is checked by the pages under `checks/` (see below). A test that passes
both with and without the change it guards protects nothing: check it fails first.

## Debugging

```bash
npm run dev
```

opens the **engine demo** (`index.html`, Vite on 5173, or `PORT` if set): an editor wired to the sources with hot
reload, a sample recording, and a synthetic cloud scenario with the volume/surface renderer switch. Pages under
`checks/` are served by the same server:

- `/checks/atmosphere.html`: the sky's GPU tables against the CPU reference and the Monte Carlo skies. Run it after
  any change to `AtmosphereProfile`, `SkyScattering` or `AtmosphereTables`, or from a terminal with
  `node scripts/checks/atmosphere-gpu.mjs`.

To debug a published recording in the real site rather than in the demo page:

```bash
npm run build:site
npm run site:serve      # dist-site on http://localhost:5181
```

and open `/play/?sighting=/demo-data/<file>.json` (or `/edit/?sighting=…`). `npm run site:watch` rebuilds the pages
when `site/` or `public/demo-data/` change.

Tips:

- WebGL screenshots of a browser tab are unreliable (the drawing buffer is cleared after compositing); read pixels
  with `gl.readPixels()` right after a frame instead.

### Performance

The harnesses under `scripts/perf/` drive a real Chromium through Playwright, which is **not** a dependency:
point `PLAYWRIGHT_MODULE` at an installation. They run headed, since a headless Chromium renders on the CPU and
measures nothing about the card.

| Script | Measures |
|---|---|
| `scripts/perf/profile-scene.mjs <recording> <out>` | a CPU profile of one scene playing (dev server) |
| `scripts/perf/demo-table.mjs [recordings…]` | fps, draws, CPU/GPU time per recording (built site) |
| `scripts/perf/gpu-breakdown.mjs <recordings…>` | GPU time of a still frame, one scene part switched off at a time |
| `scripts/perf/page-scroll.mjs <url> <label> <seconds>` | frame intervals and long tasks while scrolling a page |

Output goes to `perf-out/` (gitignored). Each script's header lists its variables. Measure before and after any
rendering change, on the same scene, size and pixel ratio. See [`docs/performance.md`](docs/performance.md) for the
render contract and past findings.

## Building

```bash
npm run build:all        # schema, engine demo, and the three embeds
npm run build:site       # the embeds, then ufoathome.org into dist-site/
```

| Bundle | Config | Output | Registers |
|---|---|---|---|
| `@rr0/ufoathome/sighting` | `vite.embed-sighting.config.ts` | `dist-embed-sighting/rr0-sighting.mjs` | `<rr0-sighting>` (+ `<rr0-scene>`) |
| `@rr0/ufoathome/scene` | `vite.embed-scene.config.ts` | `dist-embed-scene/rr0-scene.mjs` | `<rr0-scene>` |
| `@rr0/ufoathome/editor` | `vite.embed-sighting-editor.config.ts` | `dist-embed-sighting-editor/rr0-sighting-editor.mjs` | `<rr0-sighting-editor>` (+ `<rr0-scene>`) |

Each is self-contained (three.js and a star catalogue each) and self-registers on import. Heavy optional parts
(the body editor, the JSON editor) are dynamic imports: check they stay separate chunks.

### The site

[ufoathome.org](https://ufoathome.org) is generated by `site/build.ts` from `site/content/`, one module per page
holding **both** languages side by side (English at the root, French under `/fr/`), so a sentence and its
translation cannot drift apart. It is not a Vite build: pages load the embed bundles as they are, under stable
names under `/lib/`, because they hand out copy-pasteable `<script src>` lines. The one Vite-built piece is the
Player's JSON editor (`site/scripts/jsonEditor.ts`, CodeMirror, loaded lazily). `_redirects` and `_headers` are
generated into `dist-site/` too; do not add them to `netlify.toml`.

A change to the components' API or to the recording format is documented **there**, in `DocsComponentPage.ts`,
`DocsFormatPage.ts` and friends, in the same commit.

## Releasing

1. `npm test`, then `npm run build:site` and check the result with `npm run site:serve`.
2. `npm version <patch|minor> --no-git-tag-version`, commit the bump as `<version>`.
3. `npm publish` (`prepublishOnly` rebuilds the schema and the three embeds, and runs the tests).
4. `git push`: Netlify rebuilds ufoathome.org from `master` ([`netlify.toml`](netlify.toml)).
5. If demo recordings changed, `npm run sync:cases` and deploy rr0.org.

## License

MIT. Third-party data and models keep their own licences: see [CREDITS.md](CREDITS.md) and
[ufoathome.org/docs/sources](https://ufoathome.org/docs/sources/).
