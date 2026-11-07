import type { InterpretationKind } from "../InterpretationKind.js"
import { DecoyFlare } from "./DecoyFlare.js"
import type { FlareSalvoJson } from "./DecoyFlare.js"

/** Salvoes of decoy flares an aircraft dispensed, computed into the aircraft and one body per flare (see FlareSalvoJson, DecoyFlare). Edited
 * in the recording's text: no part of the editor of its own yet. */
export const FLARE_KIND: InterpretationKind<FlareSalvoJson> = {
  key: "flares",
  title: { en: "Decoy flares", fr: "Leurres pyrotechniques", es: "Bengalas señuelo", it: "Bengala esca" },
  bodiesOf: salvo => DecoyFlare.bodiesOf(salvo)
}
