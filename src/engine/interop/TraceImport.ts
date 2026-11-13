import type { InvestigatorTrace } from "../model/Trace.js"

/** What reading a file of traces gives: the traces it holds, without ids (the recording hands those
 * out), and what it could not read, so that an import that drops something says so. */
export interface TraceImportResult {
  traces: Omit<InvestigatorTrace, "id">[]
  /** Kinds of element found and left out, by the name the file gives them — a Google Earth file also
   * holds photo overlays, tours and 3D models, none of which is a line or a place. */
  skipped: string[]
  /** What the document calls itself, for the credit. */
  documentName?: string
}

/**
 * Reads what somebody else drew over the place, from whichever of the two formats they drew it in:
 * Google Earth's (KML, KMZ) or the one every GIS writes (GeoJSON).
 *
 * The two were asked for together by the GEIPAN (A. Cousyn, November 2026), and for one reason: an
 * investigator's lines live in whichever tool measured them — Google Earth, SVH, QGIS — and
 * retyping coordinates is how coordinates get changed. Which format a file is in is read off the
 * file and not off its name: a zip is a KMZ, text that starts an object or an array is GeoJSON, and
 * anything else is tried as KML.
 */
export class TraceImport {

  private static readonly ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]

  static async fromBytes(bytes: Uint8Array): Promise<TraceImportResult> {
    if (TraceImport.ZIP_MAGIC.every((byte, index) => bytes[index] === byte)) {
      const { KmlImport } = await import("./KmlImport.js")
      return KmlImport.fromBytes(bytes)
    }
    const text = new TextDecoder("utf-8").decode(bytes)
    return TraceImport.fromText(text)
  }

  static async fromText(text: string): Promise<TraceImportResult> {
    if (/^\s*[[{]/.test(text)) {
      const { GeoJsonImport } = await import("./GeoJsonImport.js")
      return GeoJsonImport.fromText(text)
    }
    const { KmlImport } = await import("./KmlImport.js")
    return KmlImport.fromText(text)
  }
}
