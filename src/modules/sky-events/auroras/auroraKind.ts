import type { SkyEventKind } from "../SkyEventKind.js"
import type { AuroraJson } from "./Aurora.js"
import { AURORA_KIND_MESSAGES } from "./messages/AuroraKindMessages.js"
import type { AuroraKindMessages } from "./messages/AuroraKindMessages.js"

/**
 * Aurorae over the night of the recording (see AuroraJson). The kind's whole declaration: its drawing (AuroraSimulation), its editor's part
 * (AuroraEditor) and its texts are chunks of their own, loaded when first needed. The scene adds the aurora the planetary index Kp of the
 * GFZ's archive implies when a recording states none (see GeomagneticArchive).
 */
export const AURORA_KIND: SkyEventKind<AuroraJson, AuroraKindMessages> = {
  key: "auroras",
  messages: AURORA_KIND_MESSAGES,
  pickKind: "aurora",
  simulation: () => import("./AuroraSimulation.js").then(({ AuroraSimulation }) => () => new AuroraSimulation()),
  editor: () => import("./AuroraEditor.js").then(({ AuroraEditor }) => (container, host, language) => new AuroraEditor(container, host, language)),
  describe: (_aurora, hit, { texts, name }) => {
    const picked = hit.detail as { kp: number, green: number, red: number }
    const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    return {
      name,
      detail: texts.detail.replace("{name}", name).replace("{kp}", number(picked.kp)).replace("{green}", number(picked.green)).replace("{red}", number(picked.red))
    }
  }
}
