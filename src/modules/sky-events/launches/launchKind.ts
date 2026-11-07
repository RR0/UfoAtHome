import type { SkyEventKind } from "../SkyEventKind.js"
import type { LaunchJson, PlumePuffView } from "./LaunchPlume.js"
import { LAUNCH_KIND_MESSAGES } from "./messages/LaunchKindMessages.js"
import type { LaunchKindMessages } from "./messages/LaunchKindMessages.js"


/**
 * Rocket launches, whose exhaust shows lit by a Sun the ground no longer sees (see LaunchJson). Its drawing (LaunchSimulation) and its
 * editor's part (LaunchEditor) are chunks of their own, loaded when first needed.
 */
export const LAUNCH_KIND: SkyEventKind<LaunchJson, LaunchKindMessages> = {
  key: "launches",
  messages: LAUNCH_KIND_MESSAGES,
  pickKind: "plume",
  simulation: () => import("./LaunchSimulation.js").then(({ LaunchSimulation }) => () => new LaunchSimulation()),
  editor: () => import("./LaunchEditor.js").then(({ LaunchEditor }) => (container, host, language) => new LaunchEditor(container, host, language)),
  describe: (launch, hit, { said, texts, distance }) => {
    const puff = hit.detail as PlumePuffView
    const name = said.read(launch.title) || launch.vehicle?.mission || texts.name
    const jet = puff.release === undefined || puff.release === "burn" ? undefined
      : launch.jets?.find((candidate, index) => `jet:${candidate.id ?? index}` === puff.release)
    const part = puff.release === undefined || puff.release === "burn" ? texts.ascent : jet?.kind === "vent" ? texts.vent : texts.burn
    return {
      name,
      detail: texts.detail.replace("{name}", name).replace("{part}", part)
        .replace("{distance}", distance(puff.centre.distanceKm * 1000))
        .replace("{height}", Math.round(puff.heightKm ?? 0).toLocaleString())
    }
  }
}
