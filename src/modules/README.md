# Modules

Every implementation UFO@home can be given a choice of lives here, one folder per kind:

| Folder | Extension point(s) | Interface |
|---|---|---|
| `providers/weather/` | `weather` | `engine/weather/WeatherProvider.ts` |
| `providers/place/` | `place` | `engine/place/PlaceProvider.ts` |
| `providers/time-zone/` | `timeZone` | `engine/time/TimeZoneProvider.ts` |
| `providers/narrative/` | `narrative` | `engine/narrative/NarrativeProvider.ts` |
| `providers/light-pollution/` | `lightPollution` | `engine/atmosphere/LightPollutionProvider.ts` |
| `providers/traffic/` | `aircraft`, `upperAir` | `engine/traffic/AircraftProvider.ts`, `UpperAirProvider.ts` |
| `providers/terrain/` | `elevation`, `imagery`, `surroundings` (and the roads, railways and water the surveys use) | `render3d/terrain/*Provider.ts` |
| `assessors/` | `assessment` | `engine/assessment/Assessor.ts` |
| `models/` | `decorModels` | `render3d/decor/DecorModelProvider.ts` |

Each folder has a `*Sources.ts` that lists its built-in implementations as `DataSource` entries (an id, a name, the credit its
licence requires, and a `create()` that builds it on demand), given to the extension point through
`ModuleRegistry.point("<point>").provide(ModuleRegistry.BUILT_IN, [...])`. The picker of the editor lists the point, the
first entry is the default.

## Adding an implementation to UFO@home (a pull request)

1. Write the class that implements the interface, in the folder of its kind.
2. Add its entry to that folder's `*Sources.ts`, with its credit and the link its licence asks for.
3. Add a row to the privacy page (`site/content/PrivacyPage.ts`) when it sends anything anywhere.

Keep heavy code out of the entry's module: `create()` may `import()` what it needs (see `assessors/assessmentSources.ts`), so
that a bundle which never uses it never loads it.

## Adding implementations from outside

A module is a set of entries for one or several points, installed together:

```ts
import { ModuleRegistry } from "./ModuleRegistry.js"

ModuleRegistry.install({
  id: "acme",
  name: "ACME surveys",
  credit: "© ACME",
  contributes: {
    imagery: [{ id: "acme-ortho", name: "ACME ortho", credit: "© ACME", creditUrl: "https://acme.example", create: () => new AcmeImagery() }]
  }
})
```

Its entries come after the built-in ones at every point. An id another module already gives at the same point is refused,
for the whole module. `ModuleRegistry.changes` fires `change` with the point's id whenever a point's list changes.

## Modules loaded from an address

A module published elsewhere is a manifest, `ufoathome-module.json` (see `ModuleManifest.ts`): tiles of imagery
(`contributes.imagery`) or relief (`contributes.elevation`, Terrarium PNG), models (`contributes.models`, entries of the same
shape as `public/models/index.json`) and, for what needs code, a `script` whose default export returns more contributions.

- `ModuleLoader` fetches and checks a manifest, and imports its script only when asked to.
- `ModuleSession.shared` is the page's set of modules: those the person added (kept by `ModuleConfig` in localStorage,
  exported and imported as a file) and those a recording names (`SightingRecordingJson.modules`). A script runs only for a
  module the person added and has on, never for one a recording names.
- `models/ModelCatalogues` resolves a model id in every catalogue, the one browsed first: a recording's models are drawn
  whichever module's catalogue they come from.
- In the editor: the **Modules** item of the Files group (`component/ModulesPanelElement.ts`). On the site:
  `/docs/modules/` (`site/content/DocsModulesPage.ts`).
