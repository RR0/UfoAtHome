import type { InvestigatorTrace, TraceAltitude, TracePoint } from "../model/Trace.js"

/** What reading a file gives: the traces it holds, without ids (the recording hands those out), and
 * what it could not read, so that an import that drops something says so. */
export interface KmlImportResult {
  traces: Omit<InvestigatorTrace, "id">[]
  /** Kinds of element found and left out, by tag name — a Google Earth file also holds photo
   * overlays, tours and 3D models, none of which is a line or a place. */
  skipped: string[]
  /** What the document calls itself, for the credit. */
  documentName?: string
}

/**
 * Reads the lines, places and outlines out of a Google Earth file (KML, or KMZ — the same thing
 * zipped, which is what Google Earth saves by default).
 *
 * Only geometry is read: points, lines (`LineString`), outlines (`Polygon`'s outer ring and
 * `LinearRing`), and a `MultiGeometry` as the several traces it is. Names, colours and altitude
 * modes come along, because they are part of what the author said. Everything else a KML can hold
 * — overlays, tours, models, look-at cameras — is reported as skipped rather than guessed at.
 * Coordinates are kept exactly as written: nothing is smoothed, thinned or snapped to a road.
 */
export class KmlImport {

  private static readonly ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]
  private static readonly GEOMETRY = new Set(["Point", "LineString", "LinearRing", "Polygon", "MultiGeometry"])
  /** Elements that are neither a container nor a geometry, and that Google Earth writes where a
   * line could have been — told apart from the plain bookkeeping (`Style`, `name`…) that is not
   * worth mentioning. */
  private static readonly UNSUPPORTED = new Set(["GroundOverlay", "ScreenOverlay", "PhotoOverlay", "Model", "Tour", "NetworkLink", "Track", "MultiTrack"])

  /** A file's bytes: unzipped first if it is a KMZ, then read as KML. */
  static async fromBytes(bytes: Uint8Array): Promise<KmlImportResult> {
    if (KmlImport.ZIP_MAGIC.every((byte, i) => bytes[i] === byte)) {
      // Dynamic: a KMZ is the one case that needs an unzipper, and most readers never import one.
      const { unzipSync, strFromU8 } = await import("fflate")
      const entries = unzipSync(bytes)
      const names = Object.keys(entries)
      const main = names.find(name => name.toLowerCase() === "doc.kml") ?? names.find(name => name.toLowerCase().endsWith(".kml"))
      if (!main) throw new Error("This KMZ holds no KML file.")
      return KmlImport.fromText(strFromU8(entries[main]))
    }
    return KmlImport.fromText(new TextDecoder("utf-8").decode(bytes))
  }

  static fromText(text: string): KmlImportResult {
    const doc = new DOMParser().parseFromString(text, "application/xml")
    if (doc.getElementsByTagName("parsererror").length > 0 || !doc.documentElement) throw new Error("This is not a readable KML file.")
    const styles = KmlImport.styleColours(doc)
    const traces: Omit<InvestigatorTrace, "id">[] = []
    const skipped = new Set<string>()
    const walk = (node: Element) => {
      for (const child of Array.from(node.children)) {
        const tag = KmlImport.local(child)
        if (tag === "Placemark") {
          KmlImport.placemark(child, styles, traces, skipped)
        } else if (tag === "Document" || tag === "Folder") {
          walk(child)
        } else if (KmlImport.UNSUPPORTED.has(tag)) {
          skipped.add(tag)
        }
      }
    }
    walk(doc.documentElement)
    const documentName = KmlImport.text(KmlImport.firstChild(KmlImport.firstChild(doc.documentElement, "Document") ?? doc.documentElement, "name"))
    return { traces, skipped: [...skipped], documentName }
  }

  private static placemark(node: Element, styles: Map<string, string>, out: Omit<InvestigatorTrace, "id">[], skipped: Set<string>): void {
    const title = KmlImport.text(KmlImport.firstChild(node, "name"))
    const color = KmlImport.colourOf(node, styles)
    for (const child of Array.from(node.children)) {
      const tag = KmlImport.local(child)
      if (KmlImport.GEOMETRY.has(tag)) KmlImport.geometry(child, title, color, out)
      else if (KmlImport.UNSUPPORTED.has(tag)) skipped.add(tag)
    }
  }

  private static geometry(node: Element, title: string | undefined, color: string | undefined, out: Omit<InvestigatorTrace, "id">[]): void {
    const tag = KmlImport.local(node)
    if (tag === "MultiGeometry") {
      for (const child of Array.from(node.children)) if (KmlImport.GEOMETRY.has(KmlImport.local(child))) KmlImport.geometry(child, title, color, out)
      return
    }
    const ring = tag === "Polygon"
      ? KmlImport.firstChild(KmlImport.firstChild(node, "outerBoundaryIs") ?? node, "LinearRing")
      : node
    const coordinates = KmlImport.firstChild(ring ?? node, "coordinates")
    const points = coordinates ? KmlImport.points(coordinates.textContent ?? "") : []
    const kind = tag === "Point" ? "point" : tag === "LineString" ? "line" : "polygon"
    // A ring written closed repeats its first point at the end; the model closes it by being a
    // polygon, so the repeat would be drawn as a zero-length edge.
    if (kind === "polygon" && points.length > 1) {
      const first = points[0]
      const last = points[points.length - 1]
      if (first.lat === last.lat && first.lng === last.lng && first.altM === last.altM) points.pop()
    }
    if (points.length === 0 || (kind === "line" && points.length < 2) || (kind === "polygon" && points.length < 3)) return
    const altitude = KmlImport.altitudeOf(node)
    out.push({
      kind,
      points,
      ...(title ? { title } : {}),
      ...(altitude !== "ground" ? { altitude } : {}),
      ...(color ? { color } : {})
    })
  }

  /** `lng,lat[,alt]` tuples separated by whitespace. A tuple that is not numbers is dropped. */
  private static points(text: string): TracePoint[] {
    const points: TracePoint[] = []
    for (const tuple of text.trim().split(/\s+/)) {
      const [lng, lat, alt] = tuple.split(",").map(Number)
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
      points.push(Number.isFinite(alt) && alt !== 0 ? { lat, lng, altM: alt } : { lat, lng })
    }
    return points
  }

  private static altitudeOf(node: Element): TraceAltitude {
    const mode = KmlImport.text(KmlImport.firstChild(node, "altitudeMode") ?? KmlImport.firstChild(node, "altitudeMode", true))
    if (mode === "absolute") return "absolute"
    if (mode === "relativeToGround") return "relative"
    return "ground"
  }

  /** The colour a placemark was drawn in, from its own style or the shared one it names. */
  private static colourOf(placemark: Element, styles: Map<string, string>): string | undefined {
    const own = KmlImport.styleColour(KmlImport.firstChild(placemark, "Style"))
    if (own) return own
    const url = KmlImport.text(KmlImport.firstChild(placemark, "styleUrl"))
    return url ? styles.get(url.replace(/^#/, "")) : undefined
  }

  /** The `Style`s of the document by id, and its `StyleMap`s resolved to their "normal" style. */
  private static styleColours(doc: Document): Map<string, string> {
    const colours = new Map<string, string>()
    const all = Array.from(doc.getElementsByTagName("*"))
    for (const element of all) {
      if (KmlImport.local(element) !== "Style") continue
      const id = element.getAttribute("id")
      const colour = KmlImport.styleColour(element)
      if (id && colour) colours.set(id, colour)
    }
    for (const element of all) {
      if (KmlImport.local(element) !== "StyleMap") continue
      const id = element.getAttribute("id")
      if (!id) continue
      for (const pair of Array.from(element.children)) {
        if (KmlImport.text(KmlImport.firstChild(pair, "key")) !== "normal") continue
        const target = KmlImport.text(KmlImport.firstChild(pair, "styleUrl"))?.replace(/^#/, "")
        const colour = target ? colours.get(target) : undefined
        if (colour) colours.set(id, colour)
      }
    }
    return colours
  }

  private static styleColour(style: Element | undefined): string | undefined {
    if (!style) return undefined
    for (const tag of ["LineStyle", "PolyStyle", "IconStyle"]) {
      const colour = KmlImport.text(KmlImport.firstChild(KmlImport.firstChild(style, tag) ?? style, "color"))
      if (colour) return KmlImport.cssColour(colour)
    }
    return undefined
  }

  /** KML writes `aabbggrr`; the opacity is not kept (a trace is drawn at one opacity). */
  private static cssColour(abgr: string): string | undefined {
    const match = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(abgr.trim())
    return match ? `#${match[4]}${match[3]}${match[2]}`.toLowerCase() : undefined
  }

  private static local(node: Element): string {
    return node.localName || node.nodeName.replace(/^.*:/, "")
  }

  /** The first direct child with this tag — or, with `deep`, the first descendant, which is where
   * `altitudeMode` sits for a `Polygon` (on the polygon, not on the ring). */
  private static firstChild(node: Element | undefined | null, tag: string, deep = false): Element | undefined {
    if (!node) return undefined
    for (const child of Array.from(deep ? node.getElementsByTagName("*") : node.children)) {
      if (KmlImport.local(child) === tag) return child
    }
    return undefined
  }

  private static text(node: Element | undefined): string | undefined {
    const value = node?.textContent?.trim()
    return value ? value : undefined
  }
}
