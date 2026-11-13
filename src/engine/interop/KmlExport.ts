import type { Sighting } from "../model/Sighting.js"
import { resolveObserverPoseAt } from "../model/Sighting.js"
import type { GeoPoint } from "../model/SaidPosition.js"
import { SaidPositions } from "../model/SaidPosition.js"
import type { TracePoint } from "../model/Trace.js"
import type { SaidText, SaidTexts } from "../model/SaidText.js"
import type { Ground } from "../interpretation/BodyPlacement.js"
import { BodyPlacement } from "../interpretation/BodyPlacement.js"
import type { KmlExportTexts } from "./messages/KmlExportTexts.js"

const DEG = Math.PI / 180

/** A point of a placemark: where it is, and how high, in metres read as `mode` says. */
interface Placed extends GeoPoint {
  altM: number
}

/**
 * Writes out what a reconstruction holds geographically, as a Google Earth file: where the observer
 * stood, the directions the account states, where a reading places what would have been seen, and
 * the traces an investigator brought in.
 *
 * Asked for by the GEIPAN (A. Cousyn, November 2026) as the way back out of the tool: their own
 * geometry is measured in SVH, in QGIS and in Google Earth, and a reconstruction is worth comparing
 * with it only if it can be laid beside it. So this exports what can be compared and nothing else.
 *
 * Three things it refuses to pretend. A line of sight is a DIRECTION: the account gives an azimuth
 * and a height, never a distance, so the line is drawn at a conventional length that its own
 * description names as conventional (see SIGHT_LINE_M) — read its bearing, not its end. What a
 * reading places is somebody's interpretation, in a folder that says so, never beside the account's
 * own data as though it were of the same kind. And heights are counted from the ground the observer
 * set off from, as the reconstruction's own frame counts them, which the document states rather
 * than dressing up as altitudes above the sea.
 */
export class KmlExport {

  /** How long a line of sight is drawn, metres. Conventional, and said to be: see the class comment. */
  static readonly SIGHT_LINE_M = 5000

  /**
   * The ground heights are counted on: flat, at the level of the point the observer set off from.
   *
   * The relief belongs to the renderer, which is not here (this writes a file, from a recording, with
   * no scene loaded). Over the few kilometres a line of sight spans, the difference is a height, and
   * `heightNote` says what heights are counted from, so nothing is claimed that is not true.
   */
  private static readonly FLAT: Ground = { heightAt: () => 0 }

  static of(sighting: Sighting, name: string, texts: KmlExportTexts, said: SaidTexts): string {
    const folders = [
      KmlExport.observer(sighting, texts),
      KmlExport.sightLines(sighting, texts, said),
      KmlExport.bodies(sighting, texts, said),
      KmlExport.traces(sighting, texts, said)
    ].filter(folder => folder !== undefined)
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${KmlExport.xml(KmlExport.fill(texts.document, { name }))}</name>
<description>${KmlExport.xml(`${texts.documentNote} ${texts.heightNote}`)}</description>
${folders.join("\n")}
</Document>
</kml>
`
  }

  /** Where the observer stood: a point where they set off, and their path when they moved. */
  private static observer(sighting: Sighting, texts: KmlExportTexts): string | undefined {
    const stands: { t: number, at: Placed, headingDeg?: number, elevationM: number }[] = []
    for (const key of sighting.observerTrack.allKeyframes) {
      const pose = resolveObserverPoseAt(sighting, key.t)
      if (pose?.lat === undefined || pose.lng === undefined) continue
      const elevationM = pose.elevationM ?? 0
      stands.push({
        t: key.t,
        at: { lat: pose.lat, lng: pose.lng, altM: elevationM + BodyPlacement.EYE_HEIGHT_M },
        ...(pose.headingDeg === undefined ? {} : { headingDeg: pose.headingDeg }),
        elevationM
      })
    }
    if (stands.length === 0) return undefined
    const first = stands[0]
    const note = KmlExport.fill(texts.observerNote, {
      elevation: KmlExport.round(first.elevationM, 1),
      heading: first.headingDeg === undefined ? "—" : KmlExport.round(first.headingDeg, 0)
    })
    const marks = [KmlExport.placemark(KmlExport.fill(texts.observerPoint, { s: KmlExport.seconds(first.t) }), note, "Point", [first.at], "relativeToGround")]
    // A path only where there is one: a observer who never moved has one position, and a line
    // through one point is not a path.
    const moved = stands.some(stand => stand.at.lat !== first.at.lat || stand.at.lng !== first.at.lng)
    if (moved) marks.push(KmlExport.placemark(texts.observerPath, undefined, "LineString", stands.map(stand => stand.at), "relativeToGround"))
    return KmlExport.folder(texts.folderObserver, marks)
  }

  /**
   * One line per direction the account states: from where the observer's eye was at that instant,
   * along the azimuth and height the shape was aimed at.
   *
   * Only the keyframes that state an aim themselves — a direction blended between two keyframes is
   * this class's arithmetic, not the account's, and a file of traces is no place for it.
   */
  private static sightLines(sighting: Sighting, texts: KmlExportTexts, said: SaidTexts): string | undefined {
    const marks: string[] = []
    for (const key of sighting.timeline.allKeyframes) {
      const pose = resolveObserverPoseAt(sighting, key.t)
      if (pose?.lat === undefined || pose.lng === undefined) continue
      const eye = { lat: pose.lat, lng: pose.lng, altM: (pose.elevationM ?? 0) + BodyPlacement.EYE_HEIGHT_M }
      for (const state of key.shapes) {
        const aim = state.shape.aim
        if (!aim) continue
        const name = KmlExport.fill(texts.sightLine, {
          what: KmlExport.nameOf(said.read(state.shape.title), state.sourceId, texts),
          s: KmlExport.seconds(key.t)
        })
        const note = KmlExport.fill(texts.sightLineNote, {
          azimuth: KmlExport.round(aim.azimuthDeg, 1),
          altitude: KmlExport.round(aim.altitudeDeg, 1),
          km: KmlExport.round(KmlExport.SIGHT_LINE_M / 1000, 0)
        })
        marks.push(KmlExport.placemark(name, note, "LineString", [eye, KmlExport.along(eye, aim.azimuthDeg, aim.altitudeDeg)], "relativeToGround"))
      }
    }
    return marks.length > 0 ? KmlExport.folder(texts.folderSightLines, marks) : undefined
  }

  /** Where the line of sight reaches, SIGHT_LINE_M along it. */
  private static along(eye: Placed, azimuthDeg: number, altitudeDeg: number): Placed {
    const horizontal = KmlExport.SIGHT_LINE_M * Math.cos(altitudeDeg * DEG)
    const geo = SaidPositions.toGeo({
      eastM: Math.sin(azimuthDeg * DEG) * horizontal,
      northM: Math.cos(azimuthDeg * DEG) * horizontal
    }, eye)
    return { lat: geo.lat, lng: geo.lng, altM: eye.altM + KmlExport.SIGHT_LINE_M * Math.sin(altitudeDeg * DEG) }
  }

  /** What a reading places in the world: each body where its own track puts it. */
  private static bodies(sighting: Sighting, texts: KmlExportTexts, said: SaidTexts): string | undefined {
    const bodies = sighting.interpretation?.bodies ?? []
    const origin = resolveObserverPoseAt(sighting, 0)
    if (bodies.length === 0 || origin?.lat === undefined || origin.lng === undefined) return undefined
    const from: GeoPoint = { lat: origin.lat, lng: origin.lng }
    const marks: string[] = []
    for (const body of bodies) {
      const placement = new BodyPlacement(body, KmlExport.FLAT, t => BodyPlacement.eyeOf(sighting, t, KmlExport.FLAT))
      const points: Placed[] = []
      for (const key of [...body.track].sort((a, b) => a.t - b.t)) {
        const state = placement.at(key.t)
        if (!state) continue
        const geo = SaidPositions.toGeo({ eastM: state.eastM, northM: state.northM }, from)
        const placed: Placed = { lat: geo.lat, lng: geo.lng, altM: state.upM }
        const last = points[points.length - 1]
        if (last && last.lat === placed.lat && last.lng === placed.lng && last.altM === placed.altM) continue
        points.push(placed)
      }
      if (points.length === 0) continue
      const what = KmlExport.nameOf(said.read(body.title as SaidText | undefined), body.id, texts)
      marks.push(points.length === 1
        ? KmlExport.placemark(KmlExport.fill(texts.bodyPoint, { what }), texts.bodyNote, "Point", points, "relativeToGround")
        : KmlExport.placemark(KmlExport.fill(texts.bodyPath, { what }), texts.bodyNote, "LineString", points, "relativeToGround"))
    }
    return marks.length > 0 ? KmlExport.folder(texts.folderBodies, marks) : undefined
  }

  /** The traces an investigator brought in, back out as they came: same coordinates, same colours. */
  private static traces(sighting: Sighting, texts: KmlExportTexts, said: SaidTexts): string | undefined {
    if (sighting.traces.length === 0) return undefined
    const marks = sighting.traces.map(trace => {
      const mode = trace.altitude === "absolute" ? "absolute" : trace.altitude === "relative" ? "relativeToGround" : "clampToGround"
      const geometry = trace.kind === "point" ? "Point" : trace.kind === "line" ? "LineString" : "Polygon"
      return KmlExport.placemark(
        said.read(trace.title) ?? trace.id,
        said.read(trace.source),
        geometry,
        trace.points.map((point: TracePoint) => ({ lat: point.lat, lng: point.lng, altM: point.altM ?? 0 })),
        mode,
        trace.color
      )
    })
    return KmlExport.folder(texts.folderTraces, marks)
  }

  private static folder(name: string, marks: string[]): string {
    return `<Folder>\n<name>${KmlExport.xml(name)}</name>\n${marks.join("\n")}\n</Folder>`
  }

  /**
   * One placemark. A polygon's ring is closed here: the model holds an outline whose last point is
   * not the first, and KML wants it written back.
   */
  private static placemark(
    name: string, description: string | undefined, geometry: "Point" | "LineString" | "Polygon",
    points: Placed[], mode: string, color?: string
  ): string {
    const written = geometry === "Polygon" && points.length > 0 ? [...points, points[0]] : points
    const coordinates = written.map(point => `${KmlExport.round(point.lng, 7)},${KmlExport.round(point.lat, 7)},${KmlExport.round(point.altM, 2)}`).join(" ")
    const inside = geometry === "Polygon"
      ? `<Polygon><altitudeMode>${mode}</altitudeMode><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
      : `<${geometry}>${geometry === "LineString" ? "<tessellate>1</tessellate>" : ""}<altitudeMode>${mode}</altitudeMode><coordinates>${coordinates}</coordinates></${geometry}>`
    return `<Placemark>
<name>${KmlExport.xml(name)}</name>${description ? `\n<description>${KmlExport.xml(description)}</description>` : ""}${color ? `\n<Style><LineStyle><color>${KmlExport.abgr(color)}</color><width>2</width></LineStyle><PolyStyle><color>${KmlExport.abgr(color)}</color></PolyStyle></Style>` : ""}
${inside}
</Placemark>`
  }

  private static nameOf(title: string | undefined, id: string, texts: KmlExportTexts): string {
    return title && title.trim() ? title.trim() : KmlExport.fill(texts.unnamed, { id })
  }

  /** `#rrggbb` as KML's own `aabbggrr`, opaque. */
  private static abgr(css: string): string {
    const match = /^#?([0-9a-f]{6})$/i.exec(css.trim())
    if (!match) return "ff0000ff"
    const [r, g, b] = [0, 2, 4].map(at => match[1].slice(at, at + 2).toLowerCase())
    return `ff${b}${g}${r}`
  }

  private static seconds(t: number): string {
    return KmlExport.round(t / 1000, 1)
  }

  private static round(value: number, digits: number): string {
    const factor = 10 ** digits
    return String(Math.round(value * factor) / factor)
  }

  private static fill(text: string, values: Record<string, string>): string {
    return Object.entries(values).reduce((filled, [key, value]) => filled.replaceAll(`{${key}}`, value), text)
  }

  private static xml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
