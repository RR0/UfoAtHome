import { Instruments, type Instrument } from "./Instrument.js"
import type { Weather } from "../model/Weather.js"

/** What sends a ghost: whose surfaces the light bounced between, or what scattered it — what the tooltip of a ghost says it is. */
export type GhostCause = "lens" | "sensor" | "filter" | "glass" | "drops" | "condensation" | "dirt"

/**
 * One ghost of a lens: the light that bounced between two of its surfaces (or off the sensor and back) on its way through, and lands out of
 * place as a fainter, out-of-focus copy of the picture.
 *
 * Every bright light of the picture has one, and they all obey the same geometry: a ghost lies on the line from the picture's centre through
 * the light, at `scale` times the light's distance from the centre — on the other side when `scale` is negative. That is what tells a ghost
 * from a light in a photograph or a video: the red disc mirrored across the frame from the traffic light, moving the other way when the phone
 * turns, which an observer filming a street at night may take for a second, silent red object.
 *
 * A ghost of the lens's own glass is an out-of-focus image of its aperture: round, or the polygon of its blades once it is stopped down, and
 * the wider the aperture, the wider the ghost (see LensGhosts.optics). Light scattered rather than reflected (by condensation, dirt, drops on
 * the glass) is a halo round each light instead, at a scale of 1.
 *
 * It is not drawn for an eye. The eye's own glare is the scene's veils (see Veil); ghosts are what glass and a sensor add, so they belong to
 * an instrument that records the picture.
 */
export interface LensGhost {
  /** Where it lies, as a multiple of the light's offset from the picture's centre: −1 is mirrored through the centre, 1 is on the light. */
  scale: number
  /** The share of the light's flux it carries: the two reflections it took, a fraction of a per cent each on coated glass. */
  share: number
  /** How out of focus it is, at the lens's reference aperture: the radius of the disc a point light becomes, as a share of the picture's
   * height. */
  blur: number
  /** The colour its reflections leave it, per channel, 1 when absent: an anti-reflection coating reflects some wavelengths more than
   * others, which is why a white light's ghosts come out green or magenta. */
  tint?: [number, number, number]
  /** How far it is shifted besides, as shares of the picture's width and height: a tilted pane doubles a light a little aside of it. */
  offset?: [number, number]
  /** What sends it. "lens" when absent. */
  cause?: GhostCause
}

/**
 * What is on or in front of the lens, as a recording states it: what the picture was taken through, and what was on that glass. Each share
 * runs from 0 (none) to 1 (as bad as it gets).
 */
export interface LensStateJson {
  /** What the picture was taken through besides the lens: a filter screwed on it, a window pane, a car's windscreen. None when absent. */
  glass?: "filter" | "window" | "windscreen"
  /** Drops of water on the outermost glass. When absent, from the rain or snow falling (see LensGhosts.dropsFrom), unless `sheltered`. */
  drops?: number
  /** Condensation on it: a lens taken from a warm room or car into the cold, or the cold glass of a windscreen. None when absent. */
  condensation?: number
  /** Dirt, grease or fingerprints on it: a phone's lens wiped on a pocket. None when absent. */
  dirt?: number
  /** Whether the outermost glass was out of the rain or snow: under a roof, behind a windscreen whose wipers run. */
  sheltered?: boolean
}

/** What the scene needs of the lens to lay its ghosts over a picture. */
export interface LensOptics {
  ghosts: LensGhost[]
  /** The blades of its aperture, which make each ghost of its glass a polygon; 0 for a round aperture, or one wide open. */
  blades: number
  /** How the aperture polygon is turned, radians. */
  bladeAngleRad: number
  /** The share of the light the scattering ghosts (condensation, dirt, drops) take off each light's own image: light is not created. */
  scattered: number
  /** How dense the drops on the glass are, 0 to 1: what the drop halos are shown through (see GhostPass). */
  drops: number
  /** How many drops have landed on each spot of the glass the size of a drop's place since the recording began (see GlassWetting): what
   * says which drops are there. 0 when the drops are stated rather than falling. */
  impacts: number
  /** The same count, one second ago, two seconds ago… (see GlassWetting.HISTORY_S): what says how long ago each landed, so that a drop that
   * landed just before the rain stopped still runs down after. */
  history: number[]
  /** Whether the drops are stated, there for good and still, rather than left by the rain. */
  still: boolean
  /** How readily drops run down the glass, 0 to 1: a pane's run in streams, a lens's small curved front holds them. */
  running: number
}

/**
 * How many drops the rain has landed on each spot of a glass since the recording began, from how many land there each second at each instant
 * (see LensGhosts.impactRate): the sum, second by second, kept as it is worked out, so that what is on the glass at any instant follows from
 * the whole shower before it — and played backwards or sought to, the same as played through.
 */
export class GlassWetting {
  /** How far back the drops are followed, s: longer than any drop clings and runs. */
  static readonly HISTORY_S = 20

  /** The count at each whole second of the recording. */
  private readonly sums: number[] = [0]

  /** @param rateAt How many drops land on each spot per second at second `s` of the recording. */
  constructor(private readonly rateAt: (s: number) => number) {}

  /** The count at `s` seconds, 0 before the recording. */
  at(s: number): number {
    if (!(s > 0)) return 0
    const whole = Math.floor(s)
    while (this.sums.length <= whole + 1) {
      const n = this.sums.length - 1
      this.sums.push(this.sums[n] + (this.rateAt(n) + this.rateAt(n + 1)) / 2)
    }
    return this.sums[whole] + (this.sums[whole + 1] - this.sums[whole]) * (s - whole)
  }

  /** The count now, and the counts of each of the seconds before. */
  stateAt(s: number): { impacts: number, history: number[] } {
    return { impacts: this.at(s), history: Array.from({ length: GlassWetting.HISTORY_S }, (_, j) => this.at(s - j - 1)) }
  }
}

/** Which way the instrument looks, and the wind: what decides how square its glass meets the rain. */
export interface RainExposure {
  headingDeg: number
  pitchDeg: number
  /** Where the wind blows FROM, degrees, and its speed, m/s. */
  windFromDeg?: number
  windSpeedMS?: number
}

export class LensGhosts {

  /** What an eye lays over its picture: nothing. */
  static readonly NONE: LensOptics = { ghosts: [], blades: 0, bladeAngleRad: 0, scattered: 0, drops: 0, impacts: 0, history: [], still: false, running: 0 }

  /**
   * A phone: few elements, but a sensor and its cover glass close behind them, which send back a ghost mirrored through the centre, small
   * and nearly sharp — the familiar dot opposite every streetlight in a phone's night video, the light's colour less its red. Two fainter, wider
   * ones from the lens itself, a tenth and a thirteenth of it, ASSUMED.
   *
   * MEASURED on a phone's photograph of the Sun through a cirrostratus (Royan, 29 October 2026, see the halo demo): the sensor's ghost adds,
   * at its centre, as much light again as the grey sky round it (0.94 of it), in a disc of some 0.45 degrees, and it is turquoise: what it
   * adds is red 0.41, green 1, blue 0.83, against a sky that is neutral grey. The green-blue is put down to the coatings of what it comes
   * back through (users' reports; no maker's account was found). The lens's own two leave nothing measurable on that sky. The share that
   * gives (5e-5, and the others in proportion) is a fortieth of the one first ASSUMED for a traffic light's ghost in a night video, which
   * drew the Sun's as an opaque white disc. That video's ghosts still show: it is the phone's development that lifts them off a dark
   * ground (see PhoneDevelopment), not a stronger reflection.
   */
  static readonly PHONE: readonly LensGhost[] = [
    { scale: -1, share: 5e-5, blur: 0.006, cause: "sensor", tint: [0.41, 1, 0.83] },
    { scale: -0.45, share: 5e-6, blur: 0.02, tint: [0.7, 1, 0.8] },
    { scale: 0.55, share: 3.75e-6, blur: 0.035, tint: [1, 0.75, 1] }
  ]

  /**
   * A camera's lens: a dozen coated surfaces, so a string of ghosts along the line through the centre, each fainter and wider than a phone's
   * main one, tinted by the coatings. ASSUMED, after the look of photographs of streetlights through such lenses.
   */
  static readonly CAMERA: readonly LensGhost[] = [
    { scale: -1.4, share: 3e-4, blur: 0.045, tint: [1, 0.8, 1] },
    { scale: -0.8, share: 4e-4, blur: 0.02, tint: [0.75, 1, 0.8] },
    { scale: -0.35, share: 2.5e-4, blur: 0.012, tint: [1, 0.9, 0.7] },
    { scale: 0.3, share: 2e-4, blur: 0.03, tint: [0.8, 0.9, 1] },
    { scale: 0.65, share: 1.5e-4, blur: 0.06, tint: [1, 0.85, 1] }
  ]

  /**
   * The ghost of a flat filter on the lens: the picture the sensor sends back, reflected by the filter's flat faces back onto the sensor,
   * mirrored through the centre and nearly in focus — the strongest ghost of a camera, which is why a filter is taken off to shoot lights at
   * night. About 10 % off the sensor and 1 % off a coated filter's faces (ASSUMED orders of magnitude).
   */
  static readonly FILTER: LensGhost = { scale: -1, share: 1e-3, blur: 0.004, cause: "filter" }

  /**
   * A pane of glass in front of the lens doubles every light: the light that went through, and the light that bounced once off its far face
   * and once off its near face before coming through too, 4 % of 4 % of it — a fainter twin of the light just aside, by the tilt of the
   * pane. A window is near square to the line of sight; a windscreen leans back some 60 degrees, so its twin is further off and, at that
   * slant, each face reflects about 15 %.
   */
  static readonly WINDOW: LensGhost = { scale: 1, share: 1.6e-3, blur: 0.002, offset: [0, 0.006], cause: "glass" }
  static readonly WINDSCREEN: LensGhost = { scale: 1, share: 2e-2, blur: 0.003, offset: [0, 0.025], cause: "glass" }

  /** The aperture the ghosts' blur is stated at when a lens states none. */
  private static readonly REFERENCE_F_NUMBER = 4

  /** The ghosts of an instrument's glass alone: its own when it states them, else its kind's, and none for what records no picture (an eye,
   * binoculars). */
  static of(instrument: Pick<Instrument, "category" | "medium" | "ghosts">): readonly LensGhost[] {
    if (instrument.ghosts) return instrument.ghosts
    if (!LensGhosts.records(instrument)) return []
    return instrument.category === "phone" ? LensGhosts.PHONE : LensGhosts.CAMERA
  }

  /** Whether an instrument records a picture, and so has glass whose ghosts it records: a camera or a phone, even one whose film nobody
   * knows, and anything stating what it records on — not an eye, nor binoculars or a telescope an eye looks through. */
  static records(instrument: Pick<Instrument, "category" | "medium">): boolean {
    return instrument.medium !== undefined || instrument.category === "camera" || instrument.category === "dslr" || instrument.category === "phone"
  }

  /**
   * Everything an instrument lays over its picture at an instant: the ghosts of its glass at the aperture it is set to, those of what it was
   * taken through, and the halos of what is on that glass — with the drops the rain has left on it (`wetting`, see GlassWetting) when the
   * recording says nothing of them. NONE for an eye.
   */
  static optics(
    instrument: Pick<Instrument, "category" | "medium" | "ghosts" | "fNumber" | "fNumberRange" | "apertureBlades">,
    fNumber: number | undefined, lens: LensStateJson | undefined, wetting?: { impacts: number, history: number[] }
  ): LensOptics {
    const own = LensGhosts.of(instrument)
    if (own.length === 0) return LensGhosts.NONE
    // A ghost of the glass is an image of the aperture: as wide as the aperture is open.
    const reference = instrument.fNumber ?? LensGhosts.REFERENCE_F_NUMBER
    const set = fNumber ?? reference
    const ghosts: LensGhost[] = own.map(ghost => ({ ...ghost, blur: ghost.blur * reference / set }))
    if (lens?.glass === "filter") ghosts.push({ ...LensGhosts.FILTER })
    else if (lens?.glass === "window") ghosts.push({ ...LensGhosts.WINDOW })
    else if (lens?.glass === "windscreen") ghosts.push({ ...LensGhosts.WINDSCREEN })
    // What is on the glass scatters light round each light, its own picture losing what the halo takes.
    const condensation = LensGhosts.share(lens?.condensation)
    const dirt = LensGhosts.share(lens?.dirt)
    const falling = LensGhosts.falling(lens)
    const impacts = falling ? wetting?.impacts ?? 0 : 0
    const history = falling ? wetting?.history ?? [] : []
    // Stated, the drops are as many as said; falling, as many as landed in a drop's life (see GhostPass).
    const recent = impacts - (history[LensGhosts.DROP_LIFE_S - 1] ?? 0)
    const drops = lens?.drops !== undefined ? LensGhosts.share(lens.drops) : falling ? Math.min(1, recent) : 0
    if (condensation > 0) {
      ghosts.push({ scale: 1, share: 0.25 * condensation, blur: 0.03, cause: "condensation" })
      ghosts.push({ scale: 1, share: 0.15 * condensation, blur: 0.12, cause: "condensation" })
    }
    if (dirt > 0) {
      ghosts.push({ scale: 1, share: 0.03 * dirt, blur: 0.04, cause: "dirt" })
      ghosts.push({ scale: 1, share: 0.02 * dirt, blur: 0.15, cause: "dirt" })
    }
    if (drops > 0) ghosts.push({ scale: 1, share: 0.12 * drops, blur: 0.025, cause: "drops" })
    const scattered = ghosts.filter(ghost => LensGhosts.scatters(ghost)).reduce((sum, ghost) => sum + ghost.share, 0)
    // Blades show once the aperture is closed past where they swing clear of the beam: a lens wide open is round. The rule the star
    // follows too (see Instruments.bladesShowing), so that a Sun is starred exactly when its ghosts have corners.
    const blades = Instruments.bladesShowing(instrument, fNumber) >= 0.5 ? instrument.apertureBlades ?? 0 : 0
    const running = lens?.glass === "window" || lens?.glass === "windscreen" ? 1 : 0.25
    return { ghosts, blades, bladeAngleRad: 0.3, scattered: Math.min(0.9, scattered), drops, impacts, history, still: lens?.drops !== undefined, running }
  }

  /** Whether drops land on the glass from the rain, rather than being stated or kept off it. */
  static falling(lens: LensStateJson | undefined): boolean {
    return lens?.drops === undefined && !lens?.sheltered
  }

  /** How long a drop stays where it landed, s, before it runs off or dries: what the density of drops on a glass in the rain levels at. */
  static readonly DROP_LIFE_S = 8

  /**
   * How often a new drop lands on each spot of the glass, per second: the rain's own rate (see dropsFrom) times how square the glass meets
   * it. Rain falls at some 6.5 m/s, snow at 1, the wind carrying both: a lens tilted up to the sky catches it, a pane facing the wind
   * catches it, a pane with its back to the wind, or square to a rain falling straight down, catches only the odd drop eddies and splashes
   * bring (a fiftieth). A window is upright whichever way the camera behind it looks; a windscreen leans back 60 degrees, so faces the sky as much
   * as the road. ASSUMED proportions.
   */
  static impactRate(weather: Pick<Weather, "precipitationType" | "precipitationIntensity"> | undefined, glass: LensStateJson["glass"],
    exposure: RainExposure | undefined): number {
    const wetness = LensGhosts.dropsFrom(weather)
    if (wetness === 0) return 0
    const fall = weather!.precipitationType === "snow" ? 1 : 6.5
    const toward = ((exposure?.windFromDeg ?? 0) + 180) * Math.PI / 180, wind = exposure?.windSpeedMS ?? 0
    // The rain's velocity, east, north, up; and the outward normal of the glass, which looks the way the instrument does.
    const rain = [Math.sin(toward) * wind, Math.cos(toward) * wind, -fall]
    const heading = (exposure?.headingDeg ?? 0) * Math.PI / 180
    const tilt = (glass === "window" ? 0 : glass === "windscreen" ? 60 : exposure?.pitchDeg ?? 0) * Math.PI / 180
    const normal = [Math.sin(heading) * Math.cos(tilt), Math.cos(heading) * Math.cos(tilt), Math.sin(tilt)]
    const speed = Math.hypot(rain[0], rain[1], rain[2])
    const square = Math.max(0, -(rain[0] * normal[0] + rain[1] * normal[1] + rain[2] * normal[2]) / speed)
    return wetness * 0.4 * (0.02 + 0.98 * square)
  }

  /** Whether a ghost is light scattered round its light by what is on the glass, rather than an image the glass reflects. */
  static scatters(ghost: LensGhost): boolean {
    return ghost.cause === "condensation" || ghost.cause === "dirt" || ghost.cause === "drops"
  }

  /**
   * How much of the glass rain or snow has covered with drops, from how hard it falls: a drizzle speckles it, a downpour covers it. Snow melts
   * into fewer drops on a lens warmed by a hand, and hail bounces off. ASSUMED proportions.
   */
  static dropsFrom(weather: Pick<Weather, "precipitationType" | "precipitationIntensity"> | undefined): number {
    if (!weather || weather.precipitationType === "none" || weather.precipitationType === "hail") return 0
    const intensity = LensGhosts.share(weather.precipitationIntensity)
    if (intensity === 0) return 0
    return weather.precipitationType === "snow" ? 0.5 * intensity : Math.min(1, 0.3 + 0.7 * intensity)
  }

  /**
   * Where the ghost of a light at `point` lands, in the picture's own coordinates (the centre at 0, as normalised device coordinates are):
   * what the drawing does for every pixel, stated for one.
   */
  static positionOf(ghost: LensGhost, point: { x: number, y: number }): { x: number, y: number } {
    return { x: point.x * ghost.scale + 2 * (ghost.offset?.[0] ?? 0), y: point.y * ghost.scale + 2 * (ghost.offset?.[1] ?? 0) }
  }

  /** Where the light whose ghost lands at `point` is: the inverse of positionOf. */
  static sourceOf(ghost: LensGhost, point: { x: number, y: number }): { x: number, y: number } {
    return { x: (point.x - 2 * (ghost.offset?.[0] ?? 0)) / ghost.scale, y: (point.y - 2 * (ghost.offset?.[1] ?? 0)) / ghost.scale }
  }

  private static share(value: number | undefined): number {
    return Math.max(0, Math.min(1, value ?? 0))
  }
}
