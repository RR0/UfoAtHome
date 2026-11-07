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
| `sky-events/<kind>/` | `skyEvents` | `sky-events/SkyEventKind.ts` |
| `interpretations/<kind>/` | `interpretations` | `interpretations/InterpretationKind.ts` |

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

## Kinds of events of the sky

A kind of event of the sky (`sky-events/SkyEventKind.ts`) is what a recording states under `skyEvents.<key>`: its code to draw
(`simulation`, a `SkyEventSimulation` the scene gives the events and the instant at every tick, never drawing itself), to edit
(`editor`, a part of the editor's Sky group made from the kind's `title`), how far it reaches (`reachM`, for the ground and the
depth of the scene) and what the tooltip says (`describe`). The scene (`SceneRenderer.setSkyEvents`), the editor
(`SightingEditorElement.syncSkyEventParts`) and the terrain freezer read the list in `sky-events/skyEventSources.ts`, and follow a
module that adds a kind.

Built in: the launches (`sky-events/launches/`), the beams (`sky-events/beams/`) and the fireballs and re-entries
(`sky-events/reentries/`, to which the scene adds the fireballs of the archive). The frame a simulation is given also says where the
observer really stands, the real instant, the magnitude limit, what the clouds and the air let through, and lets it light the ground
(`lightFrom`) and dazzle the eye (`glareFrom`); a simulation drawn on the sky's shell says `inSky`.

## Kinds of interpretation

A kind of interpretation (`interpretations/InterpretationKind.ts`) is a reading of an account stated as a few parameters under
`interpretation.<key>` (in a recording, or in a case's interpretation) and computed into bodies when shown (`bodiesOf`, synchronous):
the sky lanterns (`interpretations/lanterns/`) and the decoy flares (`interpretations/flares/`). Not a fact of the sky: what somebody
claims the account saw. Its editor, when it has one, is a part of the Sky group made from its `title`, before the events of the sky. A script gets the page's three.js classes as `context.three` (`sky-events/ModuleThree.ts`): a copy
of its own would be a second three.js. The list is explicit, since the whole namespace would keep all of three.js in every
bundle (+120 kB measured); a class a module needs is a line to add there.
