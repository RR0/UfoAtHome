import type { SkyEventKind } from "../SkyEventKind.js"
import { SearchlightSighting } from "./Searchlight.js"
import type { SearchlightJson } from "./Searchlight.js"
import { SEARCHLIGHT_KIND_MESSAGES } from "./messages/SearchlightKindMessages.js"
import type { SearchlightKindMessages } from "./messages/SearchlightKindMessages.js"

/**
 * Searchlights on the ground sending beams of white light up at the sky, and the patches they light on the base of the clouds (see
 * SearchlightJson): skytrackers, skyroses, an event's sky beams. The kind's whole declaration: its drawing (SearchlightSystem), its editor's
 * part (SearchlightEditor) and its texts are chunks of their own, loaded when first needed.
 */
export const SEARCHLIGHT_KIND: SkyEventKind<SearchlightJson, SearchlightKindMessages> = {
  key: "searchlights",
  messages: SEARCHLIGHT_KIND_MESSAGES,
  pickKind: "searchlight",
  simulation: () => import("./SearchlightSystem.js").then(({ SearchlightSystem }) => () => new SearchlightSystem()),
  editor: () => import("./SearchlightEditor.js").then(({ SearchlightEditor }) => (container, host, language) => new SearchlightEditor(container, host, language)),
  reachM: (lights, centre) => SearchlightSighting.reachM(lights, centre),
  describe: (light, hit, { texts, name, distance }) => {
    const beam = (hit.detail as { beam?: number } | undefined)?.beam ?? 1
    return {
      name,
      detail: texts.detail.replace("{name}", name).replace("{beam}", String(beam)).replace("{beams}", String(SearchlightSighting.beamsOf(light)))
        .replace("{intensity}", (light.intensityCd ?? SearchlightSighting.DEFAULT_INTENSITY_CD).toExponential(1)).replace("{distance}", distance(hit.distanceM ?? 0))
    }
  }
}
