import type { DataSource } from "../../engine/source/DataSource.js"
import type { ElevationProvider } from "./ElevationProvider.js"
import type { ImageryProvider } from "./ImageryProvider.js"
import { AwsTerrariumElevationProvider } from "./providers/AwsTerrariumElevationProvider.js"
import { EsriWorldImageryProvider } from "./providers/EsriWorldImageryProvider.js"
import { EoxSentinel2ImageryProvider } from "./providers/EoxSentinel2ImageryProvider.js"

/** Every source of ground relief the scene can be built from. */
export const ELEVATION_SOURCES: DataSource<ElevationProvider>[] = [
  {
    id: "aws-terrarium",
    name: "AWS Terrain Tiles",
    credit: "© AWS Open Data (SRTM, ETOPO1)",
    creditUrl: "https://registry.opendata.aws/terrain-tiles/",
    create: () => new AwsTerrariumElevationProvider()
  }
]

/** Every source of aerial imagery the relief can be draped with. Two real entries — the second was
 * written to prove ImageryProvider had more than one implementation (see its own doc comment) and
 * had until now no way of being reached without editing code. */
export const IMAGERY_SOURCES: DataSource<ImageryProvider>[] = [
  {
    id: "esri-world",
    name: "Esri World Imagery",
    credit: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    creditUrl: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
    create: () => new EsriWorldImageryProvider()
  },
  {
    id: "eox-s2cloudless",
    name: "EOX Sentinel-2 cloudless",
    credit: "EOxCloudless by EOX IT Services GmbH (contains modified Copernicus Sentinel data)",
    creditUrl: "https://cloudless.eox.at",
    create: () => new EoxSentinel2ImageryProvider()
  }
]
