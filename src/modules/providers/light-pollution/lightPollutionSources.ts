import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import type { LightPollutionProvider } from "../../../engine/atmosphere/LightPollutionProvider.js"
import { AtlasLightPollutionProvider } from "./AtlasLightPollutionProvider.js"

/** Every record the editor can read a place's night sky from. */
export const LIGHT_POLLUTION_SOURCES: DataSource<LightPollutionProvider>[] = ModuleRegistry.point("lightPollution").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "falchi-2015",
    name: "World Atlas 2015",
    credit: "Falchi et al. 2016, CC BY-NC 4.0",
    creditUrl: "https://doi.org/10.5880/GFZ.1.4.2016.001",
    create: () => new AtlasLightPollutionProvider()
  }
])
