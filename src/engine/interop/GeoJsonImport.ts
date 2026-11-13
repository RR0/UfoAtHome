import type { InvestigatorTrace, TraceAltitude, TracePoint } from "../model/Trace.js"
import type { TraceImportResult } from "./TraceImport.js"

/** A position as GeoJSON writes one: longitude, latitude, and a height above the ellipsoid. */
type Position = number[]

/** As much of a GeoJSON object as this reads; everything else it holds is left where it is. */
interface GeoJsonObject {
  type?: unknown
  name?: unknown
  crs?: { properties?: { name?: unknown } }
  features?: unknown
  geometries?: unknown
  geometry?: unknown
  coordinates?: unknown
  properties?: Record<string, unknown>
}

/**
 * Reads the points, lines and outlines out of a GeoJSON file — what QGIS, PANs Detector, SVH and
 * every other GIS writes when asked for geometry.
 *
 * The same contract as the Google Earth reader (see KmlImport): geometry only, coordinates exactly
 * as written, and whatever could not be read reported rather than guessed at. A `FeatureCollection`,
 * a lone `Feature`, a bare geometry and a `GeometryCollection` are all accepted, since each is what
 * some tool exports; a multi-geometry becomes the several traces it is.
 *
 * Two things are refused rather than read wrong. A file that names a coordinate system other than
 * WGS 84 is refused outright: GeoJSON has been WGS 84 only since RFC 7946, but older writers put a
 * `crs` member in, and reading a Lambert-93 easting as a longitude would put the line in the sea
 * without anybody noticing. And a height is taken as metres above sea level ("absolute"), which is
 * what GeoJSON's third ordinate means, never as a height above the ground.
 */
export class GeoJsonImport {

  /** Where the properties of a feature may name it, in the order they are looked for. */
  private static readonly TITLE_KEYS = ["name", "title", "label", "Name", "NAME", "nom", "libelle", "libellé"]
  /** Where they may give it a colour: the simplestyle spec first (what GitHub, Mapbox and QGIS write). */
  private static readonly COLOR_KEYS = ["stroke", "marker-color", "fill", "color", "colour", "couleur"]
  /** How a `heights` property of this project's own is read back — see GeoJsonExport. "observer-ground" is a
   * height over the ground under the point, which is what "relative" means here. */
  private static readonly HEIGHTS: Record<string, TraceAltitude> = {
    ground: "ground", relative: "relative", absolute: "absolute", "observer-ground": "relative"
  }

  static fromText(text: string): TraceImportResult {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error("This is not a readable GeoJSON file.")
    }
    if (typeof json !== "object" || json === null) throw new Error("This is not a readable GeoJSON file.")
    const root = json as GeoJsonObject
    GeoJsonImport.checkCrs(root)
    const traces: Omit<InvestigatorTrace, "id">[] = []
    const skipped = new Set<string>()
    GeoJsonImport.read(root, undefined, undefined, traces, skipped)
    if (traces.length === 0 && skipped.size === 0 && typeof root.type !== "string") {
      throw new Error("This is not a readable GeoJSON file.")
    }
    const documentName = typeof root.name === "string" && root.name.trim() ? root.name.trim() : undefined
    return { traces, skipped: [...skipped], ...(documentName ? { documentName } : {}) }
  }

  /**
   * Refuses a file that says its coordinates are in some other system.
   *
   * RFC 7946 dropped `crs` and fixed GeoJSON on WGS 84, so a file that still carries one was written
   * by something older — and the only honest answers are to reproject it or to refuse it. Reading it
   * as degrees is not among them.
   */
  private static checkCrs(root: GeoJsonObject): void {
    const name = root.crs?.properties?.name
    if (typeof name !== "string") return
    if (/CRS84|CRS:84|4326/i.test(name)) return
    throw new Error(`This GeoJSON is in ${name}, not WGS 84: reproject it to EPSG:4326 before importing it.`)
  }

  /** Walks whatever kind of GeoJSON object this is, carrying down the name and colour a feature gave. */
  private static read(
    node: GeoJsonObject, title: string | undefined, color: string | undefined,
    out: Omit<InvestigatorTrace, "id">[], skipped: Set<string>, heights?: TraceAltitude
  ): void {
    const type = typeof node.type === "string" ? node.type : undefined
    switch (type) {
      case "FeatureCollection":
        for (const feature of GeoJsonImport.array(node.features)) GeoJsonImport.read(feature as GeoJsonObject, title, color, out, skipped, heights)
        return
      case "Feature": {
        const named = GeoJsonImport.titleOf(node.properties) ?? title
        const coloured = GeoJsonImport.colorOf(node.properties) ?? color
        const counted = GeoJsonImport.heightsOf(node.properties) ?? heights
        // A feature may carry no geometry at all (a row of a table): nothing to draw, and worth saying.
        if (typeof node.geometry !== "object" || node.geometry === null) {
          skipped.add("Feature without geometry")
          return
        }
        GeoJsonImport.read(node.geometry as GeoJsonObject, named, coloured, out, skipped, counted)
        return
      }
      case "GeometryCollection":
        for (const geometry of GeoJsonImport.array(node.geometries)) GeoJsonImport.read(geometry as GeoJsonObject, title, color, out, skipped, heights)
        return
      case "Point":
        GeoJsonImport.push("point", [node.coordinates as Position], title, color, out, heights)
        return
      case "MultiPoint":
        for (const position of GeoJsonImport.array(node.coordinates)) GeoJsonImport.push("point", [position as Position], title, color, out, heights)
        return
      case "LineString":
        GeoJsonImport.push("line", node.coordinates as Position[], title, color, out, heights)
        return
      case "MultiLineString":
        for (const line of GeoJsonImport.array(node.coordinates)) GeoJsonImport.push("line", line as Position[], title, color, out, heights)
        return
      case "Polygon":
        // The first ring is the outline; the others are holes, which a trace has no way to hold.
        GeoJsonImport.polygon(node.coordinates as Position[][], title, color, out, skipped, heights)
        return
      case "MultiPolygon":
        for (const polygon of GeoJsonImport.array(node.coordinates)) GeoJsonImport.polygon(polygon as Position[][], title, color, out, skipped, heights)
        return
      default:
        if (type) skipped.add(type)
    }
  }

  private static polygon(
    rings: Position[][] | undefined, title: string | undefined, color: string | undefined,
    out: Omit<InvestigatorTrace, "id">[], skipped: Set<string>, heights?: TraceAltitude
  ): void {
    const all = GeoJsonImport.array(rings) as Position[][]
    if (all.length === 0) return
    if (all.length > 1) skipped.add("Polygon holes")
    GeoJsonImport.push("polygon", all[0], title, color, out, heights)
  }

  private static push(
    kind: InvestigatorTrace["kind"], positions: Position[] | undefined, title: string | undefined, color: string | undefined,
    out: Omit<InvestigatorTrace, "id">[], heights?: TraceAltitude
  ): void {
    const points = GeoJsonImport.points(positions)
    // A ring written closed repeats its first point at the end; a polygon is closed by being one,
    // so the repeat would be drawn as a zero-length edge.
    if (kind === "polygon" && points.length > 1) {
      const first = points[0]
      const last = points[points.length - 1]
      if (first.lat === last.lat && first.lng === last.lng && first.altM === last.altM) points.pop()
    }
    if (points.length === 0 || (kind === "line" && points.length < 2) || (kind === "polygon" && points.length < 3)) return
    // What the file says of its own heights, where it says anything (see HEIGHTS); failing that,
    // GeoJSON's third ordinate is a height above the ellipsoid, which is metres above sea level near enough.
    const altitude: TraceAltitude = heights ?? (points.some(point => point.altM !== undefined) ? "absolute" : "ground")
    out.push({
      kind,
      points,
      ...(title ? { title } : {}),
      ...(altitude !== "ground" ? { altitude } : {}),
      ...(color ? { color } : {})
    })
  }

  /** `[lng, lat]` or `[lng, lat, alt]` positions. One that is not numbers, or off the Earth, is dropped. */
  private static points(positions: Position[] | undefined): TracePoint[] {
    const points: TracePoint[] = []
    for (const position of GeoJsonImport.array(positions)) {
      if (!Array.isArray(position)) continue
      const [lng, lat, alt] = position.map(Number)
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
      points.push(Number.isFinite(alt) && alt !== 0 ? { lat, lng, altM: alt } : { lat, lng })
    }
    return points
  }

  /** What the file says its heights are counted from, when it is one of ours — see HEIGHTS. */
  private static heightsOf(properties: Record<string, unknown> | undefined): TraceAltitude | undefined {
    const said = properties?.heights
    return typeof said === "string" ? GeoJsonImport.HEIGHTS[said] : undefined
  }

  private static titleOf(properties: Record<string, unknown> | undefined): string | undefined {
    for (const key of GeoJsonImport.TITLE_KEYS) {
      const value = properties?.[key]
      if (typeof value === "string" && value.trim()) return value.trim()
      if (typeof value === "number") return String(value)
    }
    return undefined
  }

  /** A colour its author gave it, as `#rrggbb`; anything else a property holds is left alone. */
  private static colorOf(properties: Record<string, unknown> | undefined): string | undefined {
    for (const key of GeoJsonImport.COLOR_KEYS) {
      const value = properties?.[key]
      if (typeof value !== "string") continue
      const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
      if (!match) continue
      const digits = match[1].toLowerCase()
      return `#${digits.length === 3 ? [...digits].map(digit => digit + digit).join("") : digits}`
    }
    return undefined
  }

  private static array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
  }
}
