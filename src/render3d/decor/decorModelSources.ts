import type { DataSource } from "../../engine/source/DataSource.js"
import type { DecorModelProvider } from "./DecorModelProvider.js"
import { UfoAtHomeModelCatalogue } from "./providers/UfoAtHomeModelCatalogue.js"

/**
 * Every catalogue the decor's 3D models can come from.
 *
 * One entry today, like placeSources and weatherSources before it — see DataSource's own doc
 * comment on why a registry is written before its second implementation exists: the seam has to be
 * visible, and the credit beside the picker is the whole reason it is a picker at all.
 */
export const DECOR_MODEL_SOURCES: DataSource<DecorModelProvider>[] = [
  {
    id: "ufoathome",
    name: "UFO@home",
    credit: "3D models re-hosted by UFO@home, each under its own author's licence",
    creditUrl: "https://ufoathome.org/models/",
    create: () => new UfoAtHomeModelCatalogue()
  }
]
