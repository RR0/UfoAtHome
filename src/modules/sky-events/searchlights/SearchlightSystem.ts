import type { Vector3 } from "three"
import type { SkyEventCloudLight, SkyEventFrame, SkyEventPickContext, SkyEventSimulation } from "../SkyEventKind.js"
import { BeamSystem } from "../beams/BeamSystem.js"
import type { BeamLine, BeamPlaced } from "../beams/BeamSystem.js"
import { LaserBeamSighting } from "../beams/LaserBeam.js"
import { ReentrySighting } from "../reentries/Reentry.js"
import { LampColour } from "../../../render3d/LampColour.js"
import { CloudDimming } from "../../../render3d/CloudDimming.js"
import { SearchlightSighting } from "./Searchlight.js"
import type { SearchlightJson } from "./Searchlight.js"

/** What a searchlight's beam is when picked: which of its beams, and how far the ray met it. */
export interface SearchlightHit {
  id: string
  distanceM: number
  detail: { beam: number }
}

/**
 * Draws the searchlights of the recording (see SearchlightJson): each of their beams twice over.
 *
 * In the air, as the lasers are (see BeamSystem): a ribbon facing the eye, lit metre by metre by what the molecules and the haze turn of it
 * towards the eye, in three channels since a xenon arc's light is white; dimmed, fragment by fragment, by the clouds between the eye and it
 * (see SkyEventClouds.dim), and losing along its own way what the clouds it crosses take of it, so that a beam stops in the base of an
 * overcast and goes on through a gap.
 *
 * On the clouds, by the decks themselves (see SkyEventFrame.lightClouds, VolumetricClouds' beamsLight): each beam is a light the volumetric
 * decks are lit by from below, sample by sample, as bright as the beam is where it meets them, as wide as it has spread, moving with it. What
 * is drawn is the cloud lit, not a disc laid on it: where the beam meets a gap there is nothing, where it grazes a cloud's flank the flank is
 * lit, and the patch is an ellipse drawn out away from the lamp as the beam leans.
 */
export class SearchlightSystem implements SkyEventSimulation<SearchlightJson> {
  /** How wide a beam leaves its lamp, metres: a xenon searchlight's mirror. */
  static readonly APERTURE_M = 0.6
  /** The shortest and the longest stretch between two of its points, metres, and the share of the distance a stretch is between. */
  private static readonly NEAR_STEP_M = 10
  private static readonly FAR_STEP_M = 250
  private static readonly STEP_SHARE = 0.05
  /** The stretch through a deck of clouds, metres: what the clouds take of the beam is summed that finely. */
  private static readonly CLOUD_STEP_M = 25
  /** What is left of a beam, of what it left with, below which it is not followed: swallowed by a cloud. */
  private static readonly SPENT = 0.003

  private readonly beams = new BeamSystem()
  /** Where each searchlight stands east and north of the reference place, for a reference place: worked out once. */
  private placed?: { lat: number, lng: number, at: Map<SearchlightJson, { eastM: number, northM: number }> }
  /** Which searchlight, and which of its beams, each line drawn is. */
  private lineOwners: { id: string, beam: number }[] = []

  constructor() {
    this.beams.group.name = "searchlights"
  }

  get object() {
    return this.beams.group
  }

  get drawnCount(): number {
    return this.beams.drawnCount
  }

  update(lights: readonly SearchlightJson[], t: number, frame: SkyEventFrame): void {
    const lines: BeamLine[] = []
    const cloudLights: SkyEventCloudLight[] = []
    this.lineOwners = []
    const clouds = frame.clouds
    if (clouds) clouds.dim(this.beams.material)
    else CloudDimming.apply(this.beams.material, [])
    const wind = frame.wind ?? { eastMS: 0, northMS: 0 }
    for (const light of SearchlightSighting.onAt(lights, t)) {
      const where = this.whereOf(light, frame.reference)
      const x = frame.origin.x + where.eastM * frame.eastScale
      const z = frame.origin.z - where.northM
      const y = frame.groundYAt(x, z) + (light.heightM ?? SearchlightSighting.DEFAULT_HEIGHT_M)
      const intensity = light.intensityCd ?? SearchlightSighting.DEFAULT_INTENSITY_CD
      const divergence = light.divergenceDeg ?? SearchlightSighting.DEFAULT_DIVERGENCE_DEG
      const fwhm = (divergence * Math.PI) / 180
      const flux = SearchlightSighting.fluxLm(intensity, divergence)
      const colour = LampColour.ofTemperature(light.colourTemperatureK ?? SearchlightSighting.DEFAULT_TEMPERATURE_K)
      const spectrum = BeamSystem.white(colour)
      SearchlightSighting.aimsAt(light, t).forEach((aim, beam) => {
        const axisEnu = SearchlightSighting.axisOf(aim)
        const axis = { x: axisEnu.east, y: axisEnu.up, z: -axisEnu.north }
        const along = { windAlongMS: wind.eastMS * axisEnu.east + wind.northMS * axisEnu.north, windAcrossMS: wind.eastMS * axisEnu.north - wind.northMS * axisEnu.east }
        const { points, throughBelow } = this.walk({ x, y, z }, axis, fwhm, flux, t, frame, along)
        lines.push({ id: light.id, points, spectrum })
        this.lineOwners.push({ id: light.id, beam })
        if (clouds && axis.y > 0.02 && clouds.bottomY > y) {
          // The air between the lamp and the lowest base, per channel: the patches' light, before the clouds' own.
          const toBase = (clouds.bottomY - y) / axis.y
          const air = frame.air.transmittance(frame.siteElevationM + y, frame.siteElevationM + clouds.bottomY, toBase)
          const scale = intensity * frame.relativeScale
          cloudLights.push({
            x, y, z, axis, fwhmRad: fwhm,
            rgb: [scale * colour[0] * air[0], scale * colour[1] * air[1], scale * colour[2] * air[2]],
            throughCloudsBelow: throughBelow
          })
        }
      })
    }
    this.beams.drawLines(lines, frame)
    frame.lightClouds?.(cloudLights)
  }

  /**
   * The points of a beam from its lamp: closer together near it, where the eye may be, and through the clouds, where what they take of it
   * is summed; with what is still in it at each, as luminous flux. Followed until it has gone RANGE_M, risen to CEILING_M, or been
   * swallowed by a cloud. And what the clouds under a height let through of it along its axis, for the decks it lights.
   */
  private walk(
    from: { x: number, y: number, z: number }, axis: { x: number, y: number, z: number }, fwhm: number, flux: number, t: number, frame: SkyEventFrame,
    along: { windAlongMS: number, windAcrossMS: number }
  ): { points: BeamPlaced[], throughBelow: (y: number) => number } {
    const clouds = frame.clouds
    const points: BeamPlaced[] = []
    const heights: number[] = []
    const cloudThrough: number[] = []
    const fromAltitude = frame.siteElevationM + from.y
    let s = 0
    let opticalDepth = 0
    for (;;) {
      const x = from.x + axis.x * s
      const y = from.y + axis.y * s
      const z = from.z + axis.z * s
      const inCloud = clouds !== undefined && y >= clouds.bottomY && y <= clouds.topY
      const through = Math.exp(-opticalDepth)
      const air = s > 0 ? frame.air.transmittance(fromAltitude, frame.siteElevationM + y, s)[1] : 1
      points.push({
        x, y, z, altitudeM: frame.siteElevationM + y, widthM: SearchlightSystem.APERTURE_M + fwhm * s, powerW: flux * air * through,
        haze: LaserBeamSighting.patchAt(s, t, { ...along, patchiness: LaserBeamSighting.DEFAULT_PATCHINESS })
      })
      heights.push(y)
      cloudThrough.push(through)
      if (s >= SearchlightSighting.RANGE_M || y >= SearchlightSighting.CEILING_M || through < SearchlightSystem.SPENT) break
      const step = inCloud ? SearchlightSystem.CLOUD_STEP_M
        : Math.min(SearchlightSystem.FAR_STEP_M, Math.max(SearchlightSystem.NEAR_STEP_M, s * SearchlightSystem.STEP_SHARE))
      if (clouds && (inCloud || (y < clouds.bottomY && y + axis.y * step > clouds.bottomY))) {
        // Into the deck at the first stretch that reaches it, then stretch by stretch through it, at the middle of each.
        const into = inCloud ? step : Math.max(0, (clouds.bottomY - y) / Math.max(axis.y, 1e-6))
        if (!inCloud) {
          s += Math.max(1, into)
          continue
        }
        // Exactly as opaque as the cloud is drawn: a beam stops only in a cloud that is seen to stop it. Five times more (a real cloud's, as
        // the patches' shape is worked out with) stopped beams in wisps the picture showed nearly clear.
        opticalDepth += clouds.extinctionAt(x + axis.x * step / 2, y + axis.y * step / 2, z + axis.z * step / 2) * step
      }
      s += step
    }
    const throughBelow = (height: number): number => {
      const i = heights.findIndex(y => y >= height)
      return i < 0 ? cloudThrough[cloudThrough.length - 1] : cloudThrough[i]
    }
    return { points, throughBelow }
  }

  /** Where a searchlight stands east and north of the reference place, metres, on the tangent plane there: worked out once a place. */
  private whereOf(light: SearchlightJson, reference: { lat: number, lng: number }): { eastM: number, northM: number } {
    if (!this.placed || this.placed.lat !== reference.lat || this.placed.lng !== reference.lng) this.placed = { ...reference, at: new Map() }
    let where = this.placed.at.get(light)
    if (!where) {
      const origin = ReentrySighting.ecef({ lat: reference.lat, lng: reference.lng, heightM: 0 })
      const point = ReentrySighting.ecef({ lat: light.lat, lng: light.lng, heightM: 0 })
      const lat = (reference.lat * Math.PI) / 180
      const lng = (reference.lng * Math.PI) / 180
      const d = [point[0] - origin[0], point[1] - origin[1], point[2] - origin[2]]
      where = {
        eastM: -Math.sin(lng) * d[0] + Math.cos(lng) * d[1],
        northM: -Math.sin(lat) * Math.cos(lng) * d[0] - Math.sin(lat) * Math.sin(lng) * d[1] + Math.cos(lat) * d[2]
      }
      this.placed.at.set(light, where)
    }
    return where
  }

  pick(origin: Vector3, direction: Vector3, context: SkyEventPickContext): SearchlightHit | undefined {
    const hit = this.beams.pickAt(origin, direction, context.toleranceRad)
    if (!hit) return undefined
    return { id: hit.id, distanceM: hit.distanceM, detail: { beam: (this.lineOwners[hit.line]?.beam ?? 0) + 1 } }
  }

  dispose(): void {
    this.beams.dispose()
  }
}
