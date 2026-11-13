import type { Sighting } from "../model/Sighting.js"
import type { SaidTexts } from "../model/SaidText.js"
import type { Figure, FigureGroup } from "./GeographicFigures.js"
import { GeographicFigures } from "./GeographicFigures.js"
import type { GeoExportTexts } from "./messages/GeoExportTexts.js"

/**
 * Writes what a reconstruction holds geographically as a Google Earth file — see GeographicFigures,
 * which decides what may honestly leave the tool; this only writes it as KML.
 *
 * A figure's group becomes a folder, so that what the account states and what a reading places are
 * never read as the same kind of thing. Its heights become an `altitudeMode`: the one KML has for
 * heights counted from the ground under a point (`relativeToGround`) is the nearest thing to this
 * project's own frame, and the document says which ground that is.
 */
export class KmlExport {

  private static readonly GROUPS: FigureGroup[] = ["observer", "sight-line", "body", "trace"]

  static of(sighting: Sighting, name: string, texts: GeoExportTexts, said: SaidTexts): string {
    const figures = GeographicFigures.of(sighting, texts, said)
    const folders = KmlExport.GROUPS
      .map(group => figures.filter(figure => figure.group === group))
      .filter(held => held.length > 0)
      .map(held => KmlExport.folder(held[0].groupName, held.map(figure => KmlExport.placemark(figure))))
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${KmlExport.xml(GeographicFigures.fill(texts.document, { name }))}</name>
<description>${KmlExport.xml(`${texts.documentNote} ${texts.heightNote}`)}</description>
${folders.join("\n")}
</Document>
</kml>
`
  }

  private static folder(name: string, marks: string[]): string {
    return `<Folder>\n<name>${KmlExport.xml(name)}</name>\n${marks.join("\n")}\n</Folder>`
  }

  /**
   * One placemark. A polygon's ring is closed here: the model holds an outline whose last point is
   * not the first, and KML wants it written back.
   */
  private static placemark(figure: Figure): string {
    const mode = KmlExport.mode(figure)
    const written = figure.kind === "polygon" && figure.points.length > 0 ? [...figure.points, figure.points[0]] : figure.points
    const coordinates = written
      .map(point => `${GeographicFigures.round(point.lng, 7)},${GeographicFigures.round(point.lat, 7)},${GeographicFigures.round(point.altM, 2)}`)
      .join(" ")
    const geometry = figure.kind === "point" ? "Point" : figure.kind === "line" ? "LineString" : "Polygon"
    const inside = geometry === "Polygon"
      ? `<Polygon><altitudeMode>${mode}</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
      : `<${geometry}>${geometry === "LineString" ? "<tessellate>1</tessellate>" : ""}<altitudeMode>${mode}</altitudeMode><coordinates>${coordinates}</coordinates></${geometry}>`
    const style = figure.color
      ? `\n<Style><LineStyle><color>${KmlExport.abgr(figure.color)}</color><width>2</width></LineStyle><PolyStyle><color>${KmlExport.abgr(figure.color)}</color></PolyStyle></Style>`
      : ""
    return `<Placemark>
<name>${KmlExport.xml(figure.name)}</name>${figure.note ? `\n<description>${KmlExport.xml(figure.note)}</description>` : ""}${style}
${inside}
</Placemark>`
  }

  /** KML's own name for how a figure's heights are read — see FigureHeights. */
  private static mode(figure: Figure): string {
    switch (figure.heights) {
      case "absolute": return "absolute"
      case "ground": return "clampToGround"
      // Counted from the ground under the point, which is what this project's frame counts from at
      // the observer: the nearest thing KML has, and the document says which ground it is.
      default: return "relativeToGround"
    }
  }

  /** `#rrggbb` as KML's own `aabbggrr`, opaque. */
  private static abgr(css: string): string {
    const match = /^#?([0-9a-f]{6})$/i.exec(css.trim())
    if (!match) return "ff0000ff"
    const [r, g, b] = [0, 2, 4].map(at => match[1].slice(at, at + 2).toLowerCase())
    return `ff${b}${g}${r}`
  }

  private static xml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
