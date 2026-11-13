import type { Sighting } from "../model/Sighting.js"
import type { SaidTexts } from "../model/SaidText.js"
import type { Figure } from "./GeographicFigures.js"
import { GeographicFigures } from "./GeographicFigures.js"
import type { GeoExportTexts } from "./messages/GeoExportTexts.js"

/** A position as GeoJSON writes one: longitude, latitude, height. */
type Position = [number, number, number]

/**
 * Writes what a reconstruction holds geographically as GeoJSON — see GeographicFigures, which
 * decides what may honestly leave the tool; this only writes it as the one format every GIS reads
 * (QGIS, and so PANs Detector, where the GEIPAN's own spatial work is done).
 *
 * WGS 84, as RFC 7946 requires, with no `crs` member: a reader that finds none knows what it has,
 * which is the other half of the rule this project's own reader enforces (see GeoJsonImport).
 *
 * Two things it writes that the standard has no word for, and names in properties rather than
 * leaving to be guessed. `group` says which of the four kinds of thing a feature is — what the
 * account states, what a reading places — since GeoJSON has no folders and mixing the two would be
 * the one mistake worth refusing. And `heights` says what a position's third ordinate is counted
 * from: the standard reads it as a height above the ellipsoid, which is true of a trace that came in
 * that way and not of this project's own frame, whose heights are counted from the ground the
 * observer set off from.
 */
export class GeoJsonExport {

  static of(sighting: Sighting, name: string, texts: GeoExportTexts, said: SaidTexts): string {
    const figures = GeographicFigures.of(sighting, texts, said)
    const collection = {
      type: "FeatureCollection",
      name: GeographicFigures.fill(texts.document, { name }),
      description: `${texts.documentNote} ${texts.heightNote}`,
      features: figures.map(figure => GeoJsonExport.feature(figure))
    }
    return `${JSON.stringify(collection, undefined, 2)}\n`
  }

  private static feature(figure: Figure): object {
    return {
      type: "Feature",
      properties: {
        name: figure.name,
        ...(figure.note ? { description: figure.note } : {}),
        group: figure.group,
        folder: figure.groupName,
        heights: figure.heights,
        // simplestyle, which is what reads a colour back — in QGIS, in GitHub, and in this project's
        // own reader. A line takes `stroke`, an outline `fill` too, a marker `marker-color`.
        ...(figure.color
          ? {
            stroke: figure.color,
            ...(figure.kind === "polygon" ? { fill: figure.color } : {}),
            ...(figure.kind === "point" ? { "marker-color": figure.color } : {})
          }
          : {})
      },
      geometry: GeoJsonExport.geometry(figure)
    }
  }

  /** A polygon's ring is closed here: the model holds an outline whose last point is not the first,
   * and RFC 7946 requires the first repeated at the end. */
  private static geometry(figure: Figure): object {
    const positions = figure.points.map(point => GeoJsonExport.position(point.lng, point.lat, point.altM))
    switch (figure.kind) {
      case "point":
        return { type: "Point", coordinates: positions[0] }
      case "line":
        return { type: "LineString", coordinates: positions }
      case "polygon":
        return { type: "Polygon", coordinates: [[...positions, positions[0]]] }
    }
  }

  private static position(lng: number, lat: number, altM: number): Position {
    return [Number(GeographicFigures.round(lng, 7)), Number(GeographicFigures.round(lat, 7)), Number(GeographicFigures.round(altM, 2))]
  }
}
