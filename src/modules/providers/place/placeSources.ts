import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import type { PlaceProvider } from "../../../engine/place/PlaceProvider.js"
import { NominatimPlaceProvider } from "./NominatimPlaceProvider.js"

/** Every geocoder the editor can search with. One entry today — see DataSource's own doc comment
 * on why the picker exists anyway. */
export const PLACE_SOURCES: DataSource<PlaceProvider>[] = ModuleRegistry.point("place").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "nominatim",
    name: "Nominatim",
    credit: "© OpenStreetMap",
    creditUrl: "https://osm.org/copyright",
    create: () => new NominatimPlaceProvider()
  }
])
