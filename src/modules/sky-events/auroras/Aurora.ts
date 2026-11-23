import type { SaidText } from "../../../engine/model/SaidText.js"
import { Geomagnetism } from "../../../engine/astronomy/Geomagnetism.js"
import { Igrf } from "../../../engine/astronomy/Igrf.js"
import { VisibleSpectrum } from "../../../engine/atmosphere/Spectrum.js"

/**
 * An aurora over the night of the recording: the light the upper air gives off where electrons from the magnetosphere's tail come down along
 * the field, in a ring round the magnetic pole (the auroral oval) that widens towards the equator as the field is shaken (see AuroralOval).
 *
 * A fact of the sky, there whether anybody looked or not: what is stated is how disturbed the field was and, when it is known, where the
 * aurora's edge stood and how bright its arcs were. What it looked like from the observer's place follows: a glow on the poleward horizon,
 * arcs, curtains of rays, a corona overhead, red tops over green, or nothing at all.
 *
 * When a recording states none, the scene adds the one the planetary index Kp the GFZ archived implies (see GeomagneticArchive): the field's
 * state is a measurement, the arcs' details are not.
 */
export interface AuroraJson {
  id: string
  title?: SaidText
  /** The phenomena of the account (their `sourceId`s) this aurora claims to be — see BodyJson.explains. */
  explains?: string[]
  /** When it is on, ms of the recording: from its start and until its end when absent. */
  fromT?: number
  untilT?: number
  /** The planetary index Kp, 0 to 9 (or the GFZ's open-ended Hp past it): how disturbed the field was. 3 when neither it nor `activity` is stated. */
  kp?: number
  /** Kp as it ran, at instants of the recording (ms), joined linearly and held past either end: what the archive states, every hour (Hp60)
   * or three (Kp). */
  activity?: { t: number, kp: number }[]
  /**
   * The geomagnetic latitude of the oval's equatorward edge at magnetic midnight, degrees, when it is known otherwise than from Kp (a
   * satellite's boundary, reports of the aurora overhead): Kp stops at 9, and a storm such as May 2024's pushed the edge far past what
   * 9 says.
   */
  edgeLatDeg?: number
  /** How many discrete arcs stand in the oval: 0 for a diffuse glow only. From Kp when absent (see AuroralOval.arcsOf). */
  arcs?: number
  /**
   * How bright the arcs are, kilorayleighs of the green line seen through the arc's height: 1 is the International Brightness Coefficient's
   * class I (as bright as the Milky Way), 10 class II (thin cirrus in moonlight), 100 class III (moonlit cumulus), 1000 class IV (it lights
   * the ground as a full Moon does). From Kp when absent.
   */
  arcKR?: number
  /** The red of a storm, kilorayleighs of the 630 nm line: the high, smooth glow that the aurora seen from far equatorward is mostly made
   * of (and SAR arcs, below the eye's reach). From Kp when absent. */
  redKR?: number
}

/** The three lines an auroral eye or camera is given: the oxygen green and red, and the blue of ionised nitrogen. */
export interface AuroralLine {
  wavelengthNm: number
  /** What one kilorayleigh of it is, cd/m² for a cone (photopic). */
  cdM2PerKR: number
  /** Its colour on the screen, linear sRGB of unit luminance, brought into the gamut (a line is purer than any screen's primaries). */
  colour: [number, number, number]
}

export class AuroralLines {
  /** One rayleigh is 10¹⁰ photons a second through a square metre of column, spread over the 4π of the sphere. */
  static readonly PHOTONS_PER_KR = 1e13 / (4 * Math.PI)

  /** O(¹S), 557.7 nm, 100 to 200 km: the green, which lives 0.7 s and so shows every ray. */
  static readonly GREEN = AuroralLines.line(557.7)
  /** O(¹D), 630.0 and 636.4 nm counted together, 200 to 400 km and higher in a storm: it lives 110 s, so it smooths everything out. */
  static readonly RED = AuroralLines.line(631.5)
  /** N₂⁺, 427.8 nm (and 391.4, which the eye hardly sees): the violet of the lower edge, and of tops still in the Sun. */
  static readonly BLUE = AuroralLines.line(427.8)

  private static line(wavelengthNm: number): AuroralLine {
    const xyz = VisibleSpectrum.colourMatching(wavelengthNm)
    const joules = (6.62607015e-34 * 299792458) / (wavelengthNm * 1e-9)
    const wattsPerKR = AuroralLines.PHOTONS_PER_KR * joules
    const rgb = VisibleSpectrum.linearSrgbOf(xyz).map(value => Math.max(value, 0)) as [number, number, number]
    const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    return {
      wavelengthNm,
      cdM2PerKR: 683 * xyz[1] * wattsPerKR,
      colour: rgb.map(value => value / luminance) as [number, number, number]
    }
  }
}

/**
 * Where the oval stands and how bright it is, from Kp: the classical relation between the index and the equatorward edge at magnetic
 * midnight (NOAA's SWPC: 66.5° at Kp 0, some two degrees nearer the equator for every step, 48° at Kp 9), a ring that is some eight degrees
 * nearer the pole at noon than at midnight, and wider as it moves out.
 *
 * The brightnesses are SUPPOSED, of the order the literature gives for each state of the field: a diffuse glow of a kilorayleigh or two,
 * arcs from ten kilorayleighs in a quiet field to over a hundred in a storm, a storm's red of a few (Kataoka et al. 2024 measured
 * some 5 kR of the red that was seen by eye from Japan in May 2024). Stated values replace them (see AuroraJson).
 */
export class AuroralOval {
  static readonly DEFAULT_KP = 3
  /** How much nearer the pole the edge stands at magnetic noon than at midnight, degrees. */
  static readonly NOON_SHIFT_DEG = 8

  /** The equatorward edge at magnetic midnight, geomagnetic degrees: the line carried on past 9 for Hp, as far as 12. */
  static equatorwardEdgeDeg(kp: number): number {
    return 66.5 - 2.04 * Math.max(0, Math.min(12, kp))
  }

  /**
   * How far the oval reaches poleward of its edge at midnight, degrees: its poleward edge goes from some 74.5° in a quiet field to 67° at
   * Kp 9, less far than its equatorward one, as Feldstein and Starkov's ovals draw it (about 67-73° at Kp 0, 56-70° at Kp 5).
   */
  static widthDeg(kp: number): number {
    return 8 + 1.2 * Math.max(0, Math.min(12, kp))
  }

  /** The diffuse glow's green, kR: a kilorayleigh or two, often under what the eye sees, the arcs standing out of it. */
  static diffuseKR(kp: number): number {
    return 0.5 + 0.15 * Math.max(0, kp)
  }

  static arcsOf(kp: number): number {
    return kp < 1 ? 1 : Math.min(4, Math.round(1 + kp / 2.5))
  }

  /**
   * The brightest arc's green, kR looking up through it: some 10 in a quiet field (class II), 40 at Kp 5, 120 at Kp 9 (class III). Seen from
   * the side, across its few kilometres, an arc sends a third of that or less.
   */
  static arcKROf(kp: number): number {
    return 10 * 2 ** (Math.max(0, kp) / 2.5)
  }

  /**
   * The red of the arcs as a share of their green, and the height it peaks at and spreads over, km. Quiet arcs are green with a little red
   * over them; in a great storm the electrons that come down are softer and the arcs' rays are red from 200 km to their tops, which were
   * measured at 950 km from Japan in May 2024 (Kataoka et al. 2024): the red pillars every camera in Europe caught that night. SUPPOSED past
   * that, of the order the storms' photographs show.
   */
  static arcRedOf(kp: number): { share: number, peakKm: number, widthKm: number } {
    const storm = Math.max(0, kp - 6)
    return { share: 0.1 + 0.25 * storm, peakKm: 250 + 40 * storm, widthKm: 70 + 30 * storm }
  }

  /** A storm's red, kR: none below Kp 5. */
  static redKROf(kp: number): number {
    return kp <= 5 ? 0 : 0.5 * (kp - 5) ** 1.5
  }

  /** The edge at a magnetic local time, hours: nearest the equator at midnight. */
  static edgeAt(midnightEdgeDeg: number, mltHours: number): number {
    return midnightEdgeDeg + AuroralOval.NOON_SHIFT_DEG * (1 - Math.cos((mltHours * Math.PI) / 12)) / 2
  }
}

/** How the arcs of an aurora are, at an instant: what the shader draws and what the tooltip, the lighting and the tests read. */
export interface AuroraArcView {
  /** How far poleward of the oval's edge it stands, degrees of the latitude its field lines come down to at 100 km. */
  offsetDeg: number
  kr: number
  /** Where its folds and rays are along it, radians and cells, from its own seed and the instant. */
  foldPhase: number
  rayPhase: number
}

/** An aurora as the scene draws it at an instant, seen from the observer. */
export interface AuroraView {
  id: string
  kp: number
  /** The equatorward edge at magnetic midnight, degrees of the dipole's latitude round this place (see AuroraSighting.viewAt). */
  edgeDeg: number
  widthDeg: number
  diffuseKR: number
  redKR: number
  /** The arcs' red: see AuroralOval.arcRedOf. */
  arcRed: { share: number, peakKm: number, widthKm: number }
  arcs: AuroraArcView[]
  /** The dipole's northern axis and the way to the Sun, in the scene's frame (x east, y up, z south), unit vectors. */
  axis: [number, number, number]
  sun: [number, number, number]
  /** The observer's own geomagnetic latitude (the real field's, see Igrf.apexLatitude), degrees, and their height above the sea, km. */
  observerLatitudeDeg: number
  observerHeightKm: number
  /** 0 to 1: how far it has come on or gone out (see AuroraJson.fromT). */
  fade: number
  /** Seconds since the recording started: what its folds and rays move by. */
  timeS: number
}

/** The heights the lines are given off at, km: what the shader and AuroraRadiance share. */
export class AuroralHeights {
  static readonly EARTH_KM = 6371
  /** Nothing is given off below this, nor above TOP_KM. */
  static readonly BOTTOM_KM = 90
  static readonly TOP_KM = 900
  /** An arc's lower edge, and how its green falls off above it. */
  static readonly ARC_BASE_KM = 105
  static readonly ARC_SCALE_KM = 35
  /** The diffuse glow's. */
  static readonly DIFFUSE_BASE_KM = 115
  static readonly DIFFUSE_SCALE_KM = 45
  /** The red: where it peaks and how wide, quiet and in a storm. */
  static readonly RED_PEAK_KM = 250
  static readonly RED_WIDTH_KM = 70
  static readonly STORM_RED_PEAK_KM = 380
  static readonly STORM_RED_WIDTH_KM = 150
  /** How thick an arc is across the field, degrees of latitude: a few kilometres. */
  static readonly ARC_THICKNESS_DEG = 0.06
  /** The red that goes with the green of the glow and the arcs, as a share of it. */
  static readonly RED_OF_GREEN = 0.25
  /** The violet of ionised nitrogen at the arcs' lower edge, as a share of their green. */
  static readonly BLUE_OF_GREEN = 0.12
  /** The violet of sunlit tops, as a share of the arcs' green (resonant scattering of N₂⁺ in the Sun). */
  static readonly SUNLIT_BLUE_OF_GREEN = 0.2

  /** A profile that rises at `baseKm` and falls off over `scaleKm` above it, of unit integral over height. */
  static exponential(heightKm: number, baseKm: number, scaleKm: number): number {
    if (heightKm < baseKm - 8) return 0
    const rise = Math.min(1, Math.max(0, (heightKm - (baseKm - 8)) / 10))
    const smooth = rise * rise * (3 - 2 * rise)
    return (smooth * Math.exp(-Math.max(0, heightKm - baseKm) / scaleKm)) / (scaleKm + 5)
  }

  static gaussian(heightKm: number, peakKm: number, widthKm: number): number {
    const t = (heightKm - peakKm) / widthKm
    return Math.exp(-0.5 * t * t) / (widthKm * Math.sqrt(2 * Math.PI))
  }
}

/** What a recording's aurora is at an instant. */
export class AuroraSighting {
  /** How long it takes to come on or go out, ms. */
  static readonly FADE_MS = 60_000
  /** How far equatorward of the oval's edge nothing of it is above the horizon any more, degrees of latitude. */
  static readonly OUT_OF_SIGHT_DEG = 28

  static kpAt(aurora: AuroraJson, t: number): number {
    const keys = aurora.activity
    if (!keys || keys.length === 0) return aurora.kp ?? AuroralOval.DEFAULT_KP
    if (t <= keys[0].t) return keys[0].kp
    for (let i = 1; i < keys.length; i++) {
      if (t > keys[i].t) continue
      const a = keys[i - 1], b = keys[i]
      return a.kp + ((b.kp - a.kp) * (t - a.t)) / Math.max(b.t - a.t, 1)
    }
    return keys[keys.length - 1].kp
  }

  static fadeAt(aurora: AuroraJson, t: number): number {
    const on = aurora.fromT === undefined ? 1 : Math.min(1, Math.max(0, (t - aurora.fromT) / AuroraSighting.FADE_MS))
    const off = aurora.untilT === undefined ? 1 : Math.min(1, Math.max(0, (aurora.untilT - t) / AuroraSighting.FADE_MS))
    return on * off
  }

  private static readonly apexes = new Map<string, number>()

  /** The place's apex latitude, once per place and day: it takes a millisecond to trace. */
  static apexLatitude(lat: number, lng: number, date: Date): number {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)},${date.toISOString().slice(0, 10)}`
    let latitude = AuroraSighting.apexes.get(key)
    if (latitude === undefined) {
      latitude = Igrf.apexLatitude(lat, lng, date)
      if (AuroraSighting.apexes.size > 64) AuroraSighting.apexes.clear()
      AuroraSighting.apexes.set(key, latitude)
    }
    return latitude
  }

  /** A number of its own from its id, for its arcs not to fold alike in two auroras. */
  private static seed(id: string): number {
    let h = 2166136261
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
    return ((h >>> 0) % 10000) / 10000
  }

  /** How it is at `t` (ms of the recording), seen from `observer` at the real instant `date`, the Sun in `sun` (scene frame). */
  static viewAt(aurora: AuroraJson, t: number, observer: { lat: number, lng: number, heightM: number }, date: Date,
    sun: [number, number, number]): AuroraView | undefined {
    const fade = AuroraSighting.fadeAt(aurora, t)
    if (fade <= 0) return undefined
    const kp = AuroraSighting.kpAt(aurora, t)
    const seed = AuroraSighting.seed(aurora.id)
    const timeS = t / 1000
    const count = Math.max(0, Math.min(4, Math.round(aurora.arcs ?? AuroralOval.arcsOf(kp))))
    const arcKR = aurora.arcKR ?? AuroralOval.arcKROf(kp)
    const width = AuroralOval.widthDeg(kp)
    const arcs: AuroraArcView[] = []
    for (let i = 0; i < count; i++) {
      // Most arcs stand in the equatorward half of the oval, the brightest nearest its edge; each brightens and dims over a few minutes.
      const phase = seed * 37 + i * 2.3
      const pulse = 0.7 + 0.3 * Math.sin((2 * Math.PI * timeS) / (90 + 40 * i) + phase)
      arcs.push({
        offsetDeg: width * (count === 1 ? 0.15 : 0.1 + (0.8 * i) / (count - 1)),
        kr: (arcKR * pulse) / (1 + 0.6 * i),
        foldPhase: phase,
        rayPhase: seed * 1000 + i * 131
      })
    }
    // The oval's latitudes are the real field's (see Igrf.apexLatitude); the shader walks a dipole's, which is the same field near enough
    // over the few thousand kilometres an observer sees, once the place's own difference between the two is taken out.
    // Nothing to see where even the tops of the red, 900 km up, stay under the horizon: some 28° of latitude off.
    const apex = Math.abs(AuroraSighting.apexLatitude(observer.lat, observer.lng, date))
    if ((aurora.edgeLatDeg ?? AuroralOval.equatorwardEdgeDeg(kp)) - apex > AuroraSighting.OUT_OF_SIGHT_DEG) return undefined
    const dipoleLatitude = Geomagnetism.latitudeOf(observer.lat, observer.lng, date)
    const shift = dipoleLatitude - apex * Math.sign(dipoleLatitude || 1)
    return {
      id: aurora.id,
      kp,
      edgeDeg: (aurora.edgeLatDeg ?? AuroralOval.equatorwardEdgeDeg(kp)) + shift,
      widthDeg: width,
      diffuseKR: AuroralOval.diffuseKR(kp),
      redKR: aurora.redKR ?? AuroralOval.redKROf(kp),
      arcRed: AuroralOval.arcRedOf(kp),
      arcs,
      axis: Geomagnetism.axisAt(observer.lat, observer.lng, date),
      sun,
      observerLatitudeDeg: dipoleLatitude - shift,
      observerHeightKm: observer.heightM / 1000,
      fade,
      timeS
    }
  }
}

/**
 * What an aurora gives off along a line of sight, kilorayleighs of each line, before the air in front: the same model the shader walks
 * (AuroraSystem), without its folds and rays, which only move the light about. What lights the ground and what the tests measure.
 */
export class AuroraRadiance {
  static readonly STEPS = 160

  /** [green, red, blue] kR along `direction` (scene frame, unit) from the observer, in `steps` steps. */
  static along(view: AuroraView, direction: readonly [number, number, number], steps = AuroraRadiance.STEPS): [number, number, number] {
    const R = AuroralHeights.EARTH_KM
    const o = R + view.observerHeightKm
    const range = AuroraRadiance.shellRange(o, direction[1])
    if (!range) return [0, 0, 0]
    const [s0, s1] = range
    const ds = (s1 - s0) / steps
    const out: [number, number, number] = [0, 0, 0]
    for (let i = 0; i < steps; i++) {
      const s = s0 + (i + 0.5) * ds
      const p: [number, number, number] = [direction[0] * s, o + direction[1] * s, direction[2] * s]
      const e = AuroraRadiance.emission(view, p)
      out[0] += e[0] * ds
      out[1] += e[1] * ds
      out[2] += e[2] * ds
    }
    return [out[0] * view.fade, out[1] * view.fade, out[2] * view.fade]
  }

  /** Where a line of sight from a point `observerKm` from the Earth's centre goes through the shell that gives off light, km along it. */
  static shellRange(observerKm: number, upward: number): [number, number] | undefined {
    const R = AuroralHeights.EARTH_KM
    const hit = (radius: number): [number, number] | undefined => {
      const b = observerKm * upward
      const c = observerKm * observerKm - radius * radius
      const d = b * b - c
      if (d < 0) return undefined
      const root = Math.sqrt(d)
      return [-b - root, -b + root]
    }
    const ground = hit(R)
    if (ground && ground[0] > 0) return undefined
    const bottom = hit(R + AuroralHeights.BOTTOM_KM)!
    const top = hit(R + AuroralHeights.TOP_KM)!
    return [Math.max(0, bottom[1]), top[1]]
  }

  /** What a point of the upper air gives off, [green, red, blue] kR per km of path. `p` from the Earth's centre, scene frame, km. */
  static emission(view: AuroraView, p: readonly [number, number, number]): [number, number, number] {
    const r = Math.hypot(p[0], p[1], p[2])
    const h = r - AuroralHeights.EARTH_KM
    if (h < AuroralHeights.BOTTOM_KM - 10 || h > AuroralHeights.TOP_KM) return [0, 0, 0]
    const unit = [p[0] / r, p[1] / r, p[2] / r]
    const latitude = (Math.asin(Math.max(-1, Math.min(1, unit[0] * view.axis[0] + unit[1] * view.axis[1] + unit[2] * view.axis[2]))) * 180) / Math.PI
    const foot = Math.abs(Geomagnetism.footLatitude(latitude, h))
    const mlt = Geomagnetism.localTime(unit, view.axis, view.sun)
    const edge = AuroralOval.edgeAt(view.edgeDeg, mlt)
    const width = view.widthDeg * (1 - 0.4 * (1 - Math.cos((mlt * Math.PI) / 12)) / 2)
    const H = AuroralHeights
    // The diffuse glow: a band from the edge poleward, soft at both sides.
    const band = AuroraRadiance.smoothstep(edge - 1, edge + 0.5, foot) * (1 - AuroraRadiance.smoothstep(edge + width - 1, edge + width + 1.5, foot))
    let green = view.diffuseKR * band * H.exponential(h, H.DIFFUSE_BASE_KM, H.DIFFUSE_SCALE_KM)
    let red = view.diffuseKR * band * H.RED_OF_GREEN * H.gaussian(h, H.RED_PEAK_KM, H.RED_WIDTH_KM)
    let blue = 0
    // The arcs: thin sheets along the field, a Gaussian across it.
    const sunlit = AuroraRadiance.sunlit(p, view.sun)
    for (const arc of view.arcs) {
      const t = (foot - (edge + arc.offsetDeg)) / H.ARC_THICKNESS_DEG
      const across = Math.exp(-0.5 * t * t)
      if (across < 1e-4) continue
      // Its kR is what a column up through its middle holds (the profile is of unit integral): seen edge on, along its length, it is many
      // times brighter; seen across, a few kilometres of it.
      const sheet = arc.kr * across
      const g = sheet * H.exponential(h, H.ARC_BASE_KM, H.ARC_SCALE_KM)
      green += g
      red += sheet * view.arcRed.share * H.gaussian(h, view.arcRed.peakKm, view.arcRed.widthKm)
      blue += g * H.BLUE_OF_GREEN + sheet * sunlit * H.SUNLIT_BLUE_OF_GREEN * H.gaussian(h, 300, 120)
    }
    // A storm's red, standing over the edge and just equatorward of it.
    if (view.redKR > 0) {
      const t = (foot - (edge - 1)) / 3
      red += view.redKR * Math.exp(-0.5 * t * t) * H.gaussian(h, H.STORM_RED_PEAK_KM, H.STORM_RED_WIDTH_KM)
    }
    return [green, red, blue]
  }

  /** Whether a point, from the Earth's centre, is out of the Earth's shadow (a cylinder, the atmosphere's own darkening some 40 km deep). */
  static sunlit(p: readonly number[], sun: readonly number[]): number {
    const along = p[0] * sun[0] + p[1] * sun[1] + p[2] * sun[2]
    if (along > 0) return 1
    const off = Math.hypot(p[0] - along * sun[0], p[1] - along * sun[1], p[2] - along * sun[2])
    return AuroraRadiance.smoothstep(AuroralHeights.EARTH_KM + 20, AuroralHeights.EARTH_KM + 80, off)
  }

  static smoothstep(a: number, b: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
}
