import type { SaidPosition } from "../../../engine/model/SaidPosition.js"
import type { SaidText } from "../../../engine/model/SaidText.js"
import { geoToLocalMeters } from "../../../render3d/terrain/GeoProjection.js"

/**
 * How a searchlight's beams move:
 * - `fixed`: they stand still, fanned evenly round the vertical at `tiltDeg` (a single beam straight at `azimuthDeg`);
 * - `sweep`: a single head swung to and fro, its azimuth going `spreadDeg` across round `azimuthDeg` and back every period (a 7 kW xenon
 *   head on its yoke); with several beams, each a step of the period behind the last;
 * - `rotate`: the beams fanned round the vertical at `tiltDeg`, the whole turning once a period (a skyrose: a lamp's light split into a sheaf
 *   of beams by a turning mirror of many facets);
 * - `cloverleaf`: the four heads of a skytracker each leaning out and back while the base turns, so that the patch each throws on the
 *   clouds traces a four-leaved rose round the vertical (Strong Lighting's SkyTracer: four beams "in a cloverleaf pattern").
 */
export type SearchlightMotion = "fixed" | "sweep" | "rotate" | "cloverleaf"

/**
 * A searchlight on the ground sending beams of white light up at the sky: a skytracker over a car dealer's or a night club, a skyrose over a
 * fair, an event's sky beams. A fact of the sky, there whether anybody saw it or not, which an account of lights moving on the clouds may be
 * confronted with.
 *
 * What a witness reports of one is rarely the beam. A beam is the light the air sends sideways of it, faint a few kilometres off; where it
 * meets the base of a deck of clouds it lights a patch of the cloud itself, hundreds of times brighter, which moves as fast as the beam swings
 * (a patch a kilometre up from a beam turning every ten seconds runs at hundreds of metres a second), and goes out when the beam passes into a
 * gap: an oval of light on the clouds, sometimes several turning together, from a source nobody sees.
 *
 * What is stated is what changes the picture: where it stands, how many beams, how bright and how wide each is, and how they move.
 */
export interface SearchlightJson {
  id: string
  title?: SaidText
  /** The phenomena of the account (their `sourceId`s) this searchlight claims to be — see BodyJson.explains. */
  explains?: string[]
  /** Where it stands. */
  lat: number
  lng: number
  /** How it was said, when not as degrees (see SaidPosition). */
  saidPosition?: SaidPosition
  /** How high above the ground its lamps are, metres: on a trailer, 2; on a roof, more. SearchlightSighting.DEFAULT_HEIGHT_M when absent. */
  heightM?: number
  /** How many beams it sends: 1 for a single head, 4 for a skytracker's four heads, more for a skyrose's sheaf. 1 when absent. */
  beams?: number
  /**
   * The peak intensity of each beam, candelas: what its axis sends. A 1 kW xenon head of a skytracker, some 3 × 10⁸ cd (Strong Lighting's
   * datasheets: 332 million candlepower a head of the four-kilowatt STX4); a beam of a skyrose's sheaf, a share of its one lamp; a beam
   * moving head, some 10⁷. SearchlightSighting.DEFAULT_INTENSITY_CD when absent.
   */
  intensityCd?: number
  /** How wide each beam is, degrees, full width at half its peak: a xenon searchlight's 0.5 to 1.5, a beam moving head's 0.8, a skyrose's few.
   * SearchlightSighting.DEFAULT_DIVERGENCE_DEG when absent. */
  divergenceDeg?: number
  /** The colour of its light, kelvins: a xenon arc's 5 600 to 6 000, a metal halide's 6 000. SearchlightSighting.DEFAULT_TEMPERATURE_K when absent. */
  colourTemperatureK?: number
  /** How its beams move (see SearchlightMotion). `cloverleaf` for four beams, `sweep` for one, `rotate` otherwise, when absent. */
  motion?: SearchlightMotion
  /** How far from the vertical the beams lean, degrees: the most they lean for a cloverleaf. SearchlightSighting.DEFAULT_TILT_DEG when absent. */
  tiltDeg?: number
  /** How far across a sweep goes, degrees of azimuth. SearchlightSighting.DEFAULT_SPREAD_DEG when absent. */
  spreadDeg?: number
  /** Where the motion starts from, degrees from true north: the middle of a sweep, the first beam of a fan. 0 when absent. */
  azimuthDeg?: number
  /** How long one turn or one sweep to and fro takes, seconds. SearchlightSighting.DEFAULT_PERIOD_S when absent. */
  periodS?: number
  /** When it is on, ms of the recording: from its start and until its end when absent. */
  fromT?: number
  untilT?: number
}

/** Which way a beam goes at an instant: degrees from the vertical and from true north. */
export interface SearchlightAim {
  tiltDeg: number
  azimuthDeg: number
}

/** A beam's axis as a unit vector: east, north, up. */
export interface SearchlightAxis {
  east: number
  north: number
  up: number
}

export class SearchlightSighting {
  static readonly DEFAULT_HEIGHT_M = 2
  /** A head of a four-kilowatt skytracker (Strong Lighting STX4-4000: 332 million candlepower a head). */
  static readonly DEFAULT_INTENSITY_CD = 3e8
  static readonly DEFAULT_DIVERGENCE_DEG = 1
  /** A xenon short arc's (Strong Lighting: "a colour temperature constant at 5600 K"). */
  static readonly DEFAULT_TEMPERATURE_K = 5600
  static readonly DEFAULT_TILT_DEG = 25
  static readonly DEFAULT_SPREAD_DEG = 60
  static readonly DEFAULT_PERIOD_S = 12
  /** How far a beam is followed, metres along it, and up to what height: past those it is too thin to matter (see SearchlightSystem). */
  static readonly RANGE_M = 25000
  static readonly CEILING_M = 15000
  /** The most beams one searchlight sends; a sheaf of more is no different on the clouds than this many. */
  static readonly MAX_BEAMS = 16

  /** The searchlights on at `t`, ms of the recording. */
  static onAt(lights: readonly SearchlightJson[], t: number): SearchlightJson[] {
    return lights.filter(light => (light.fromT === undefined || t >= light.fromT) && (light.untilT === undefined || t <= light.untilT))
  }

  static beamsOf(light: SearchlightJson): number {
    return Math.max(1, Math.min(SearchlightSighting.MAX_BEAMS, Math.round(light.beams ?? 1)))
  }

  /** Its motion, what it does when the recording does not say: a skytracker's four heads trace a cloverleaf, a single head sweeps, a sheaf turns. */
  static motionOf(light: SearchlightJson): SearchlightMotion {
    if (light.motion) return light.motion
    const beams = SearchlightSighting.beamsOf(light)
    return beams === 4 ? "cloverleaf" : beams === 1 ? "sweep" : "rotate"
  }

  /** Where each of its beams points at `t`, ms of the recording (see SearchlightMotion). */
  static aimsAt(light: SearchlightJson, t: number): SearchlightAim[] {
    const beams = SearchlightSighting.beamsOf(light)
    const tilt = light.tiltDeg ?? SearchlightSighting.DEFAULT_TILT_DEG
    const spread = light.spreadDeg ?? SearchlightSighting.DEFAULT_SPREAD_DEG
    const azimuth = light.azimuthDeg ?? 0
    const period = Math.max(0.1, light.periodS ?? SearchlightSighting.DEFAULT_PERIOD_S)
    const phase = (2 * Math.PI * (t / 1000)) / period
    const aims: SearchlightAim[] = []
    for (let i = 0; i < beams; i++) {
      const fanDeg = (360 * i) / beams
      switch (SearchlightSighting.motionOf(light)) {
        case "fixed":
          aims.push({ tiltDeg: tilt, azimuthDeg: azimuth + fanDeg })
          break
        case "sweep":
          aims.push({ tiltDeg: tilt, azimuthDeg: azimuth + (spread / 2) * Math.sin(phase - (2 * Math.PI * i) / beams) })
          break
        case "rotate":
          aims.push({ tiltDeg: tilt, azimuthDeg: azimuth + fanDeg + (phase * 180) / Math.PI })
          break
        case "cloverleaf": {
          // A rose of four leaves: each beam's lean follows |cos 2θ| as the base turns it round by θ, so that it rises to the vertical between
          // two leaves and leans out the most at their tips.
          const turn = phase + (2 * Math.PI * i) / beams
          aims.push({ tiltDeg: tilt * Math.abs(Math.cos(2 * turn)), azimuthDeg: azimuth + (turn * 180) / Math.PI })
          break
        }
      }
    }
    return aims.map(aim => ({ tiltDeg: aim.tiltDeg, azimuthDeg: ((aim.azimuthDeg % 360) + 360) % 360 }))
  }

  static axisOf(aim: SearchlightAim): SearchlightAxis {
    const tilt = (aim.tiltDeg * Math.PI) / 180
    const azimuth = (aim.azimuthDeg * Math.PI) / 180
    return { east: Math.sin(tilt) * Math.sin(azimuth), north: Math.sin(tilt) * Math.cos(azimuth), up: Math.cos(tilt) }
  }

  /**
   * The luminous flux of a beam, lumens: its peak intensity over the solid angle of a Gaussian beam of that full width at half maximum,
   * π θ² / (4 ln 2). A 3 × 10⁸ cd beam a degree wide carries some 10⁵ lm, what a 2 to 3 kW xenon lamp gives through its mirror.
   */
  static fluxLm(intensityCd: number, divergenceDeg: number): number {
    const fwhm = (divergenceDeg * Math.PI) / 180
    return (intensityCd * Math.PI * fwhm * fwhm) / (4 * Math.LN2)
  }

  /**
   * The illuminance on a surface square to a beam `distanceM` from it, `offAxisRad` from its axis, lux: I / d², in a Gaussian profile. What
   * the base of a cloud a kilometre up receives from a skytracker's head is some 300 lux, what an office is lit with; under a moonless sky of
   * 0.001 lux, a cloud lit so sends back some 80 cd/m² towards the ground, as bright as a lit shop window, from a source a witness may not see.
   */
  static illuminanceLux(intensityCd: number, divergenceDeg: number, distanceM: number, offAxisRad = 0): number {
    const fwhm = (divergenceDeg * Math.PI) / 180
    return (intensityCd * Math.exp((-4 * Math.LN2 * offAxisRad * offAxisRad) / (fwhm * fwhm))) / Math.max(1, distanceM * distanceM)
  }

  /**
   * How far from `centre` the searchlights' beams go, metres: what the ground is built and the scene drawn as deep as. A beam goes up more than
   * out, but the far plane is a distance from the eye, and a beam followed RANGE_M up has to be inside it.
   */
  static reachM(lights: readonly SearchlightJson[], centre: { lat: number, lng: number }): number {
    let reach = 0
    for (const light of lights) {
      const offset = geoToLocalMeters(light.lat, light.lng, centre.lat, centre.lng)
      reach = Math.max(reach, Math.hypot(offset.x, offset.z) + SearchlightSighting.RANGE_M)
    }
    return reach
  }

  /**
   * Where a beam meets a horizontal cloud base `baseUpM` above the lamp, east and north of the lamp, metres: undefined for a beam that does
   * not rise. What makes a patch run: at a kilometre, a beam turning every ten seconds a quarter of the way down from the vertical moves its
   * patch round a circle of 470 m at 300 m/s.
   */
  static patchOn(aim: SearchlightAim, baseUpM: number): { eastM: number, northM: number } | undefined {
    const axis = SearchlightSighting.axisOf(aim)
    if (axis.up <= 1e-6) return undefined
    const along = baseUpM / axis.up
    return { eastM: axis.east * along, northM: axis.north * along }
  }
}
