import type { Sighting } from "../model/Sighting.js"
import { resolveObserverPoseAt } from "../model/Sighting.js"
import type { GeoPoint } from "../model/SaidPosition.js"
import { SaidPositions } from "../model/SaidPosition.js"
import type { TraceKind } from "../model/Trace.js"
import type { SaidText, SaidTexts } from "../model/SaidText.js"
import type { Ground } from "../interpretation/BodyPlacement.js"
import { BodyPlacement } from "../interpretation/BodyPlacement.js"
import type { GeoExportTexts } from "./messages/GeoExportTexts.js"

const DEG = Math.PI / 180

/** Which of the four things a figure is one of — what a writer groups them by, and what tells the
 * account's own data from somebody's reading of it. */
export type FigureGroup = "observer" | "sight-line" | "body" | "trace"

/** How a figure's heights are to be read: as InvestigatorTrace.altitude, plus what this class's own
 * frame counts from (`observer-ground`, the ground where the observer set off). */
export type FigureHeights = "ground" | "relative" | "absolute" | "observer-ground"

export interface FigurePoint extends GeoPoint {
  altM: number
}

/** One thing to draw on a map: what it is, what it is called, what it must be read with, and where it is. */
export interface Figure {
  group: FigureGroup
  /** The name of the group it is in, in the author's language — a KML folder, a GeoJSON property. */
  groupName: string
  name: string
  /** What a reader has to be told before taking it for a measurement. */
  note?: string
  kind: TraceKind
  points: FigurePoint[]
  heights: FigureHeights
  /** `#rrggbb`, when its author gave one. */
  color?: string
}

/**
 * What a reconstruction holds geographically, as figures a map can take: where the observer stood,
 * the directions the account states, where a reading places what would have been seen, and the
 * traces an investigator brought in.
 *
 * One place, and two writers over it (see KmlExport, GeoJsonExport), because the hard part is not
 * the syntax of either format: it is deciding what may honestly leave the tool. Asked for by the
 * GEIPAN (A. Cousyn, November 2026), whose own geometry is measured in SVH, in QGIS and in Google
 * Earth, and who can only compare a reconstruction with it if it comes out.
 *
 * Three things are refused here, once, rather than in each writer. A line of sight is a DIRECTION:
 * the account gives an azimuth and a height above the horizon, never a distance, so the line is
 * drawn at a conventional length that its own note names as conventional (see SIGHT_LINE_M) — its
 * bearing is the datum, its end is not. What a reading places is somebody's interpretation, in a
 * group that says so, never mixed in with the account's own. And heights are counted from the ground
 * the observer set off from (`observer-ground`), as the reconstruction's own frame counts them,
 * which is said rather than dressed up as an altitude above the sea.
 */
export class GeographicFigures {

  /** How long a line of sight is drawn, metres. Conventional, and said to be: see the class comment. */
  static readonly SIGHT_LINE_M = 5000

  /**
   * The ground heights are counted on: flat, at the level of the point the observer set off from.
   *
   * The relief belongs to the renderer, which is not here (this reads a recording, with no scene
   * loaded). Over the few kilometres a line of sight spans the difference is a height, and every
   * figure says what its heights are counted from, so nothing is claimed that is not true.
   */
  private static readonly FLAT: Ground = { heightAt: () => 0 }

  static of(sighting: Sighting, texts: GeoExportTexts, said: SaidTexts): Figure[] {
    return [
      ...GeographicFigures.observer(sighting, texts),
      ...GeographicFigures.sightLines(sighting, texts, said),
      ...GeographicFigures.bodies(sighting, texts, said),
      ...GeographicFigures.traces(sighting, texts, said)
    ]
  }

  /** Where the observer stood: a point where they set off, and their path when they moved. */
  private static observer(sighting: Sighting, texts: GeoExportTexts): Figure[] {
    const stands: { t: number, at: FigurePoint, headingDeg?: number, elevationM: number }[] = []
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
    if (stands.length === 0) return []
    const first = stands[0]
    const figures: Figure[] = [{
      group: "observer",
      groupName: texts.folderObserver,
      name: GeographicFigures.fill(texts.observerPoint, { s: GeographicFigures.seconds(first.t) }),
      note: GeographicFigures.fill(texts.observerNote, {
        elevation: GeographicFigures.round(first.elevationM, 1),
        heading: first.headingDeg === undefined ? "—" : GeographicFigures.round(first.headingDeg, 0)
      }),
      kind: "point",
      points: [first.at],
      heights: "observer-ground"
    }]
    // A path only where there is one: a observer who never moved has one position, and a line
    // through one point is not a path.
    const moved = stands.some(stand => stand.at.lat !== first.at.lat || stand.at.lng !== first.at.lng)
    if (moved) {
      figures.push({
        group: "observer", groupName: texts.folderObserver, name: texts.observerPath,
        kind: "line", points: stands.map(stand => stand.at), heights: "observer-ground"
      })
    }
    return figures
  }

  /**
   * One line per direction the account states: from where the observer's eye was at that instant,
   * along the azimuth and height the shape was aimed at.
   *
   * Only the keyframes that state an aim themselves — a direction blended between two keyframes is
   * this class's arithmetic, not the account's, and a file of figures is no place for it.
   */
  private static sightLines(sighting: Sighting, texts: GeoExportTexts, said: SaidTexts): Figure[] {
    const figures: Figure[] = []
    for (const key of sighting.timeline.allKeyframes) {
      const pose = resolveObserverPoseAt(sighting, key.t)
      if (pose?.lat === undefined || pose.lng === undefined) continue
      const eye: FigurePoint = { lat: pose.lat, lng: pose.lng, altM: (pose.elevationM ?? 0) + BodyPlacement.EYE_HEIGHT_M }
      for (const state of key.shapes) {
        const aim = state.shape.aim
        if (!aim) continue
        figures.push({
          group: "sight-line",
          groupName: texts.folderSightLines,
          name: GeographicFigures.fill(texts.sightLine, {
            what: GeographicFigures.nameOf(said.read(state.shape.title), state.sourceId, texts),
            s: GeographicFigures.seconds(key.t)
          }),
          note: GeographicFigures.fill(texts.sightLineNote, {
            azimuth: GeographicFigures.round(aim.azimuthDeg, 1),
            altitude: GeographicFigures.round(aim.altitudeDeg, 1),
            km: GeographicFigures.round(GeographicFigures.SIGHT_LINE_M / 1000, 0)
          }),
          kind: "line",
          points: [eye, GeographicFigures.along(eye, aim.azimuthDeg, aim.altitudeDeg)],
          heights: "observer-ground"
        })
      }
    }
    return figures
  }

  /** Where the line of sight reaches, SIGHT_LINE_M along it. */
  private static along(eye: FigurePoint, azimuthDeg: number, altitudeDeg: number): FigurePoint {
    const horizontal = GeographicFigures.SIGHT_LINE_M * Math.cos(altitudeDeg * DEG)
    const geo = SaidPositions.toGeo({
      eastM: Math.sin(azimuthDeg * DEG) * horizontal,
      northM: Math.cos(azimuthDeg * DEG) * horizontal
    }, eye)
    return { lat: geo.lat, lng: geo.lng, altM: eye.altM + GeographicFigures.SIGHT_LINE_M * Math.sin(altitudeDeg * DEG) }
  }

  /** What a reading places in the world: each body where its own track puts it. */
  private static bodies(sighting: Sighting, texts: GeoExportTexts, said: SaidTexts): Figure[] {
    const bodies = sighting.interpretation?.bodies ?? []
    const origin = resolveObserverPoseAt(sighting, 0)
    if (bodies.length === 0 || origin?.lat === undefined || origin.lng === undefined) return []
    const from: GeoPoint = { lat: origin.lat, lng: origin.lng }
    const figures: Figure[] = []
    for (const body of bodies) {
      const placement = new BodyPlacement(body, GeographicFigures.FLAT, t => BodyPlacement.eyeOf(sighting, t, GeographicFigures.FLAT))
      const points: FigurePoint[] = []
      for (const key of [...body.track].sort((a, b) => a.t - b.t)) {
        const state = placement.at(key.t)
        if (!state) continue
        const geo = SaidPositions.toGeo({ eastM: state.eastM, northM: state.northM }, from)
        const placed: FigurePoint = { lat: geo.lat, lng: geo.lng, altM: state.upM }
        const last = points[points.length - 1]
        if (last && last.lat === placed.lat && last.lng === placed.lng && last.altM === placed.altM) continue
        points.push(placed)
      }
      if (points.length === 0) continue
      const what = GeographicFigures.nameOf(said.read(body.title as SaidText | undefined), body.id, texts)
      figures.push({
        group: "body",
        groupName: texts.folderBodies,
        name: GeographicFigures.fill(points.length === 1 ? texts.bodyPoint : texts.bodyPath, { what }),
        note: texts.bodyNote,
        kind: points.length === 1 ? "point" : "line",
        points,
        heights: "observer-ground"
      })
    }
    return figures
  }

  /** The traces an investigator brought in, as they came: same coordinates, same colours, same heights. */
  private static traces(sighting: Sighting, texts: GeoExportTexts, said: SaidTexts): Figure[] {
    return sighting.traces.map(trace => ({
      group: "trace" as const,
      groupName: texts.folderTraces,
      name: said.read(trace.title) ?? trace.id,
      ...(said.read(trace.source) ? { note: said.read(trace.source)! } : {}),
      kind: trace.kind,
      points: trace.points.map(point => ({ lat: point.lat, lng: point.lng, altM: point.altM ?? 0 })),
      heights: trace.altitude ?? "ground",
      ...(trace.color ? { color: trace.color } : {})
    }))
  }

  private static nameOf(title: string | undefined, id: string, texts: GeoExportTexts): string {
    return title && title.trim() ? title.trim() : GeographicFigures.fill(texts.unnamed, { id })
  }

  static seconds(t: number): string {
    return GeographicFigures.round(t / 1000, 1)
  }

  static round(value: number, digits: number): string {
    const factor = 10 ** digits
    return String(Math.round(value * factor) / factor)
  }

  static fill(text: string, values: Record<string, string>): string {
    return Object.entries(values).reduce((filled, [key, value]) => filled.replaceAll(`{${key}}`, value), text)
  }
}
