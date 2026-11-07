import type { SaidPosition } from "../../../engine/model/SaidPosition.js"
import type { SaidText } from "../../../engine/model/SaidText.js"
import { AtmosphereProfile } from "../../../engine/atmosphere/AtmosphereProfile.js"
import type { AerialPerspective } from "../../../engine/atmosphere/AerialPerspective.js"
import { VisibleSpectrum } from "../../../engine/atmosphere/Spectrum.js"
import { ReentrySighting } from "../reentries/Reentry.js"

/**
 * A beam of light sent through the air from the ground — a laser shot between two observatories, a
 * laser show, a searchlight — as an interpretation claims it was there.
 *
 * Nothing of a beam is seen but what the air sends sideways of it: molecules (Rayleigh, the same in
 * front and behind) and haze (strongly forward). So it is placed where it really went — from one
 * point of the Earth to another, as a straight line through space and not along the ground, which
 * falls away under it — and how bright each part of it is follows from three things the engine
 * computes: how much power is left in it there, how wide it has spread, and at which angle the light
 * has to turn to reach this eye. A beam that goes away from the eye is seen by light thrown back, one
 * that comes towards it by light thrown forward, which is why a beam is so much brighter looking up
 * it than looking along it.
 */
export interface BeamJson {
  id: string
  title?: SaidText
  /** The phenomena of the account (their `sourceId`s) this beam claims to be — see BodyJson.explains. */
  explains?: string[]
  /**
   * Where the light goes, in order: where it leaves the emitter, then where it is turned (a mirror) if it is, and where it ends (what it hits, or
   * where it has gone far enough for nothing more of it to matter). Two at least.
   */
  path: BeamPoint[]
  /** The wavelength of the light, nm: 532 for the green of a frequency-doubled Nd:YAG laser, 520 for a green diode, 638 for a red one. */
  wavelengthNm: number
  /** The optical power it carries, watts: its mean power for a pulsed laser, whose pulses an eye cannot tell apart. */
  powerW: number
  /** How fast it widens, milliradians, full angle. LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD when absent. */
  divergenceMrad?: number
  /** How wide it leaves the emitter, metres. LaserBeamSighting.DEFAULT_APERTURE_M when absent. */
  apertureM?: number
  /** When it is on, ms of the recording: from its start and until its end when absent. */
  fromT?: number
  untilT?: number
  /**
   * How its light ran while it was on, when it changed: its colour and its power at instants of the recording, joined linearly between them
   * and held past either end. What a key leaves out is the beam's own (`wavelengthNm`, `powerW`). A wavelength joined linearly goes through
   * the colours between, as a tunable source does: a show laser switching from green to red would be two keys a few milliseconds apart.
   */
  light?: BeamLightKey[]
  /**
   * Where it went, when it moved (a laser aimed at an aircraft by hand, a searchlight sweeping the sky): its whole path at instants of the
   * recording, each point joined linearly to the same point of the next key, and held past either end. `path` stands when absent; a key with
   * another number of points than the next is held until it.
   */
  moves?: BeamMoveKey[]
  /**
   * How unevenly the haze it crosses is spread, 0 to 1: what makes a beam seen from the side lumpy, brighter where it crosses a denser patch
   * of haze or smoke and dimmer between, the patches drifting with the wind. 0 is a haze as even as a mean; 1, patches from nothing to twice
   * the mean. LaserBeamSighting.DEFAULT_PATCHINESS when absent. Only the haze's share of its light is touched: the air's own (Rayleigh) is even.
   */
  patchiness?: number
}

/** The light of a beam at an instant (see BeamJson.light). */
export interface BeamLightKey {
  t: number
  wavelengthNm?: number
  powerW?: number
}

/** The path of a beam at an instant (see BeamJson.moves). */
export interface BeamMoveKey {
  t: number
  path: BeamPoint[]
}

export interface BeamPoint {
  lat: number
  lng: number
  /** How it was said, when not as degrees (see SaidPosition). */
  saidPosition?: SaidPosition
  /** Altitude above the sea, metres. */
  altitudeM: number
}

/** One point along a beam, as the engine hands it to a renderer. */
export interface BeamSample {
  /** East, north and up of the point of the observer's place at the sea's level, metres: up is an altitude, less what the Earth's curve takes off it. */
  eastM: number
  northM: number
  upM: number
  /** Its altitude above the sea, metres — what the air there is reckoned from. */
  altitudeM: number
  /** How far the light has come from the emitter, metres. */
  fromSourceM: number
  /** Which way the light goes there, east, north and up, a unit vector: what the wind drifts the haze along it by. */
  dirEast: number
  dirNorth: number
  /** How wide the beam is there, metres. */
  widthM: number
  /** The power still in it there, watts: what the air has scattered or absorbed on the way is gone. */
  powerW: number
}

/** A beam at an instant: its points in order, and what its light is. */
export interface BeamView {
  id: string
  wavelengthNm: number
  /** How uneven the haze it crosses is (see BeamJson.patchiness), its default worked out. */
  patchiness: number
  samples: BeamSample[]
}

/** What the air sends of a beam towards an eye: per metre of the beam, per steradian, as a share of the power in it. */
export interface BeamScattering {
  rayleighPerM: number
  aerosolPerM: number
}

export class LaserBeamSighting {
  /** A collimated laser of a few watts, its beam expanded to reach kilometres without spreading much: 0.1 mrad, 1 m wide at 10 km. */
  static readonly DEFAULT_DIVERGENCE_MRAD = 0.1
  static readonly DEFAULT_APERTURE_M = 0.01
  /** How much of the light the haze takes it scatters rather than absorbs: a city's haze, which has some soot in it. */
  static readonly AEROSOL_SINGLE_SCATTERING_ALBEDO = 0.9
  /** How forward the haze scatters, as a Henyey-Greenstein asymmetry: the value the plumes of LaunchPlumeSighting use too. */
  static readonly AEROSOL_ASYMMETRY = 0.7
  /**
   * How uneven the haze along a beam is when the recording does not say (see BeamJson.patchiness): judged on photographs and videos of laser
   * shots through a city's air, which show the beam lumpy from kilometres away; no measurement of a haze's spread is behind it.
   */
  static readonly DEFAULT_PATCHINESS = 0.35
  /** How big the patches of haze are, metres: the size of the largest of the two scales summed (see patchAt), the smallest a third of it. */
  static readonly PATCH_M = 120
  /** The longest stretch of a beam between two of its points, metres. */
  static readonly STEP_M = 25
  private static readonly MAX_SAMPLES = 2000

  /**
   * The beams that are on at `t`, cut into points, placed round `observer` (latitude and longitude: the heights are counted from the sea).
   * `air` is what thins each beam as it goes.
   */
  static viewsAt(beams: readonly BeamJson[], t: number, observer: { lat: number; lng: number }, air: AerialPerspective): BeamView[] {
    return LaserBeamSighting.onAt(beams, t).map(beam => LaserBeamSighting.viewOf(beam, observer, air))
  }

  /** A beam as it is (see stateAt), cut into points. */
  static viewOf(beam: BeamJson, observer: { lat: number; lng: number }, air: AerialPerspective): BeamView {
    return {
      id: beam.id, wavelengthNm: beam.wavelengthNm, patchiness: beam.patchiness ?? LaserBeamSighting.DEFAULT_PATCHINESS,
      samples: LaserBeamSighting.samplesOf(beam, observer, air)
    }
  }

  /**
   * The beams that are on at `t`, and have a path to follow, as they are then (see stateAt): the very beams of the recording where nothing
   * of them changes in time, which a renderer may keep what it worked out of.
   */
  static onAt(beams: readonly BeamJson[], t: number): BeamJson[] {
    return beams
      .filter(beam => (beam.fromT === undefined || t >= beam.fromT) && (beam.untilT === undefined || t <= beam.untilT))
      .map(beam => LaserBeamSighting.stateAt(beam, t))
      .filter(beam => beam.path.length >= 2)
  }

  /**
   * `beam` as it is at `t`: its light and its path where they change (see BeamJson.light and moves), joined between their keys. The beam
   * itself where neither does, so that what was worked out of it can be kept.
   */
  static stateAt(beam: BeamJson, t: number): BeamJson {
    if (!beam.light?.length && !beam.moves?.length) return beam
    const state: BeamJson = { ...beam }
    if (beam.light?.length) {
      const wavelength = LaserBeamSighting.joined(beam.light.filter(key => key.wavelengthNm !== undefined), t, key => key.wavelengthNm!)
      const power = LaserBeamSighting.joined(beam.light.filter(key => key.powerW !== undefined), t, key => key.powerW!)
      if (wavelength !== undefined) state.wavelengthNm = wavelength
      if (power !== undefined) state.powerW = power
    }
    if (beam.moves?.length) state.path = LaserBeamSighting.pathAt(beam.moves, t)
    return state
  }

  /** The value of keys sorted or not at `t`: joined linearly between the two round it, held past either end; undefined with no key. */
  private static joined<K extends { t: number }>(keys: readonly K[], t: number, value: (key: K) => number): number | undefined {
    if (keys.length === 0) return undefined
    const sorted = [...keys].sort((a, b) => a.t - b.t)
    if (t <= sorted[0].t) return value(sorted[0])
    const last = sorted[sorted.length - 1]
    if (t >= last.t) return value(last)
    const after = sorted.findIndex(key => key.t > t)
    const a = sorted[after - 1]
    const b = sorted[after]
    const f = (t - a.t) / (b.t - a.t)
    return value(a) + (value(b) - value(a)) * f
  }

  /** The path at `t`, from its keys: each point joined to the same point of the next key, or held where the next has another number of them. */
  static pathAt(moves: readonly BeamMoveKey[], t: number): BeamPoint[] {
    const sorted = [...moves].sort((a, b) => a.t - b.t)
    if (t <= sorted[0].t) return sorted[0].path
    const last = sorted[sorted.length - 1]
    if (t >= last.t) return last.path
    const after = sorted.findIndex(key => key.t > t)
    const a = sorted[after - 1]
    const b = sorted[after]
    if (a.path.length !== b.path.length) return a.path
    const f = (t - a.t) / (b.t - a.t)
    const at = (from: number, to: number) => from + (to - from) * f
    return a.path.map((point, i) => ({ lat: at(point.lat, b.path[i].lat), lng: at(point.lng, b.path[i].lng), altitudeM: at(point.altitudeM, b.path[i].altitudeM) }))
  }

  /**
   * How much denser than its mean the haze is at a point of a beam, at `t`: 1 on average, from 1 − patchiness to 1 + patchiness. Patches of
   * PATCH_M and a third of it, summed, laid along the beam and through time: the wind's share along the beam carries them along it, its share
   * across carries new ones through (which is a change in time where the beam is). Smooth, and the same at every replay of an instant.
   */
  static patchAt(fromSourceM: number, t: number, along: { windAlongMS: number, windAcrossMS: number, patchiness: number }): number {
    if (along.patchiness <= 0) return 1
    const s = t / 1000
    const octave = (sizeM: number, seed: number) => {
      const u = (fromSourceM - along.windAlongMS * s) / sizeM
      const v = (Math.abs(along.windAcrossMS) + 0.3) * s / sizeM + seed
      return LaserBeamSighting.valueNoise(u, v)
    }
    const noise = (2 * octave(LaserBeamSighting.PATCH_M, 0) + octave(LaserBeamSighting.PATCH_M / 3, 17.3)) / 3
    return 1 + along.patchiness * (2 * noise - 1)
  }

  /** A smooth noise of two variables, 0 to 1: values at the integer points, joined by a smoothstep. */
  private static valueNoise(u: number, v: number): number {
    const iu = Math.floor(u)
    const iv = Math.floor(v)
    const fu = u - iu
    const fv = v - iv
    const smooth = (f: number) => f * f * (3 - 2 * f)
    const at = (x: number, y: number) => {
      const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      return h - Math.floor(h)
    }
    const a = at(iu, iv) + (at(iu + 1, iv) - at(iu, iv)) * smooth(fu)
    const b = at(iu, iv + 1) + (at(iu + 1, iv + 1) - at(iu, iv + 1)) * smooth(fu)
    return a + (b - a) * smooth(fv)
  }

  /** The points of a beam, every STEP_M at most, a straight line through space between two points of its path. */
  static samplesOf(beam: BeamJson, observer: { lat: number; lng: number }, air: AerialPerspective): BeamSample[] {
    const origin = ReentrySighting.ecef({ lat: observer.lat, lng: observer.lng, heightM: 0 })
    const lat = (observer.lat * Math.PI) / 180
    const lng = (observer.lng * Math.PI) / 180
    const enu = (p: readonly number[]): [number, number, number] => {
      const dx = p[0] - origin[0]
      const dy = p[1] - origin[1]
      const dz = p[2] - origin[2]
      return [
        -Math.sin(lng) * dx + Math.cos(lng) * dy,
        -Math.sin(lat) * Math.cos(lng) * dx - Math.sin(lat) * Math.sin(lng) * dy + Math.cos(lat) * dz,
        Math.cos(lat) * Math.cos(lng) * dx + Math.cos(lat) * Math.sin(lng) * dy + Math.sin(lat) * dz
      ]
    }
    const divergence = (beam.divergenceMrad ?? LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD) / 1000
    const aperture = beam.apertureM ?? LaserBeamSighting.DEFAULT_APERTURE_M
    const samples: BeamSample[] = []
    let fromSource = 0
    let power = beam.powerW
    let opticalDepth = 0
    for (let leg = 0; leg + 1 < beam.path.length; leg++) {
      const a = beam.path[leg]
      const b = beam.path[leg + 1]
      const pa = ReentrySighting.ecef({ lat: a.lat, lng: a.lng, heightM: a.altitudeM })
      const pb = ReentrySighting.ecef({ lat: b.lat, lng: b.lng, heightM: b.altitudeM })
      const length = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2])
      const [dirEast, dirNorth] = (() => {
        const [ea, na] = enu(pa)
        const [eb, nb] = enu(pb)
        return [(eb - ea) / (length || 1), (nb - na) / (length || 1)]
      })()
      const steps = Math.max(1, Math.min(LaserBeamSighting.MAX_SAMPLES, Math.ceil(length / LaserBeamSighting.STEP_M)))
      // The altitude of a point of a straight chord, from its height above the ellipsoid at each end and the sag of the Earth under it.
      for (let i = leg === 0 ? 0 : 1; i <= steps; i++) {
        const f = i / steps
        const p = [0, 1, 2].map(axis => pa[axis] + (pb[axis] - pa[axis]) * f)
        const along = f * length
        const altitude = a.altitudeM + (b.altitudeM - a.altitudeM) * f + LaserBeamSighting.bulgeM(along, length)
        if (i > 0) {
          const previous = samples[samples.length - 1]
          const stretch = along + fromSource - previous.fromSourceM
          const extinction = LaserBeamSighting.extinctionAt(air, beam.wavelengthNm, (previous.altitudeM + altitude) / 2)
          opticalDepth += extinction * stretch
          power = beam.powerW * Math.exp(-opticalDepth)
        }
        const [eastM, northM, upM] = enu(p)
        samples.push({ eastM, northM, upM, altitudeM: altitude, fromSourceM: fromSource + along, dirEast, dirNorth, widthM: aperture + divergence * (fromSource + along), powerW: power })
      }
      fromSource += length
    }
    return samples
  }

  /** How much higher above the ground a straight chord `length` long stands at `along` than the line drawn between its ends' altitudes. */
  private static bulgeM(along: number, length: number): number {
    return (along * (length - along)) / (2 * 6371000)
  }

  /** What the air takes of a beam, per metre, at an altitude: molecules and haze, each at the beam's own wavelength. */
  static extinctionAt(air: AerialPerspective, wavelengthNm: number, altitudeM: number): number {
    const { rayleighPerM, aerosolPerM } = LaserBeamSighting.coefficientsAt(air, wavelengthNm, altitudeM)
    return rayleighPerM + aerosolPerM
  }

  /** The extinctions of the molecules and of the haze at a wavelength and an altitude, per metre: the air's own at 550 nm, scaled. */
  static coefficientsAt(air: AerialPerspective, wavelengthNm: number, altitudeM: number): BeamScattering {
    const rayleigh = AtmosphereProfile.rayleighAt(wavelengthNm) * AtmosphereProfile.rayleighDensity(altitudeM)
    const haze = air.aerosol[1] * (wavelengthNm / 550) ** -AtmosphereProfile.AEROSOL_ANGSTROM_EXPONENT * AtmosphereProfile.aerosolDensity(altitudeM)
    return { rayleighPerM: rayleigh, aerosolPerM: haze }
  }

  /**
   * What one metre of beam sends towards an eye, per steradian, as a share of the power in it, when the light has to turn by an angle whose
   * cosine is `cosTurn` (1 straight on, -1 straight back): the molecules' phase function, the same either way, and the haze's, mostly forward.
   */
  static phasedScattering(coefficients: BeamScattering, cosTurn: number): number {
    const rayleigh = (3 / (16 * Math.PI)) * (1 + cosTurn * cosTurn)
    const g = LaserBeamSighting.AEROSOL_ASYMMETRY
    const haze = (1 - g * g) / (4 * Math.PI * (1 + g * g - 2 * g * cosTurn) ** 1.5)
    return coefficients.rayleighPerM * rayleigh + coefficients.aerosolPerM * LaserBeamSighting.AEROSOL_SINGLE_SCATTERING_ALBEDO * haze
  }

  /** Lumens per watt of a light of one wavelength: 683 at the photopic peak, by definition of the candela. */
  static efficacy(wavelengthNm: number): number {
    return 683 * Math.max(0, VisibleSpectrum.colourMatching(wavelengthNm)[1])
  }

  /**
   * The colour of a light of one wavelength in the screen's linear primaries, of unit luminance. A spectral colour is outside every screen's
   * gamut (a laser's green needs a negative red and blue), and light added to a picture cannot be negative: the negative primaries are left out
   * and the rest scaled back to the same luminance. Brought towards grey instead, as the display brings a colour too saturated for it, the
   * green of a laser turned the mint of a fluorescent tube, where what is seen is the most saturated green there is.
   */
  static colourOf(wavelengthNm: number): [number, number, number] {
    const [x, y, z] = VisibleSpectrum.colourMatching(wavelengthNm)
    if (y <= 0) return [0, 0, 0]
    const rgb = VisibleSpectrum.linearSrgbOf([x / y, 1, z / y]).map(channel => Math.max(0, channel))
    const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    return rgb.map(channel => channel / luminance) as [number, number, number]
  }

  /**
   * The luminance of a stretch of beam, cd/m², drawn `shownWidthM` wide: its light per metre and per steradian towards the eye, over the area a
   * metre of it covers seen from the side (`sinTurn` of a metre long, `shownWidthM` across). Looking along a beam, a metre of it is a short
   * stretch of the picture, and all its light is there.
   */
  static luminanceCdM2(powerW: number, wavelengthNm: number, scatteredPerSr: number, shownWidthM: number, sinTurn: number): number {
    return (LaserBeamSighting.efficacy(wavelengthNm) * powerW * scatteredPerSr) / (shownWidthM * Math.max(sinTurn, 1e-3))
  }
}
