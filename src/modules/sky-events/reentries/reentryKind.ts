import type { SkyEventKind } from "../SkyEventKind.js"
import type { ReentryFragmentView, ReentryJson } from "./Reentry.js"

/** What the tooltip of a piece says, in English: the scene's own words in another language (see SceneNames.reentryTooltip) replace it. */
const REENTRY_TOOLTIP = { name: "Re-entry", piece: "{name} — mag {mag}, {height} km up, {distance} km away", fragment: "{name}, a fragment — mag {mag}, {height} km up, {distance} km away" }

/**
 * Re-entries and fireballs, placed on the Earth and not round the observer (see ReentryJson). Its drawing (ReentrySimulation) and its
 * editor's part (ReentryEditor) are chunks of their own, loaded when first needed. The scene adds to the recording's own the fireballs a
 * camera network recorded while it runs (see FireballArchive).
 */
export const REENTRY_KIND: SkyEventKind<ReentryJson> = {
  key: "reentries",
  title: { en: "Fireballs", fr: "Bolides", es: "Bólidos", it: "Bolidi" },
  pickKind: "reentry",
  pickedAfterSatellites: true,
  simulation: () => import("./ReentrySimulation.js").then(({ ReentrySimulation }) => () => new ReentrySimulation()),
  editor: () => import("./ReentryEditor.js").then(({ ReentryEditor }) => (container, host, language) => new ReentryEditor(container, host, language)),
  describe: (reentry, hit, { said, names }) => {
    const picked = hit.detail as { view: ReentryFragmentView, magnitude: number }
    const texts = (names?.reentryTooltip as typeof REENTRY_TOOLTIP | undefined) ?? REENTRY_TOOLTIP
    const name = (reentry.title ? said.read(reentry.title) : "") || reentry.object?.name || texts.name
    const head = picked.view.head
    // Its height above the ground under it, through the Earth's curvature: a piece 500 km off at 5° is some 60 km up, not 40.
    const earthKm = 6371
    const heightKm = Math.sqrt(earthKm ** 2 + head.distanceKm ** 2 + 2 * earthKm * head.distanceKm * Math.sin((head.altitudeDeg * Math.PI) / 180)) - earthKm
    // A fragment shed by a piece is named after the re-entry it belongs to (see ReentrySighting.shedPieces, which numbers it under its piece).
    const shed = picked.view.fragmentId.includes(".")
    return {
      name: (shed ? texts.fragment : texts.piece)
        .replace("{name}", name)
        .replace("{mag}", picked.magnitude.toLocaleString(undefined, { maximumFractionDigits: 1 }))
        .replace("{height}", Math.round(heightKm).toLocaleString())
        .replace("{distance}", Math.round(head.distanceKm).toLocaleString())
    }
  }
}
