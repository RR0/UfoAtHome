import type { DataSource } from "../source/DataSource.js"
import type { PlaceProvider } from "./PlaceProvider.js"
import { NominatimPlaceProvider } from "./providers/NominatimPlaceProvider.js"

/** Every geocoder the editor can search with. One entry today — see DataSource's own doc comment
 * on why the picker exists anyway. */
export const PLACE_SOURCES: DataSource<PlaceProvider>[] = [
  {
    id: "nominatim",
    name: "Nominatim",
    credit: "© OpenStreetMap",
    creditUrl: "https://osm.org/copyright",
    create: () => new NominatimPlaceProvider()
  }
]
