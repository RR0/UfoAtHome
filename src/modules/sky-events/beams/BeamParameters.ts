import { LaserBeamSighting } from "./LaserBeam.js"
import type { BeamJson } from "./LaserBeam.js"
import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"

/**
 * What a beam of light lets its author set (see BeamJson): its colour, its power, how it widens and when it is on, and the points of its path.
 * The beam kind's whole contribution to the editor: the form is built from it (see ParameterForm) and nothing in the editor knows what a beam is.
 * Nothing of its brightness is offered: that is what the air makes of it (see LaserBeamSighting).
 */
export class BeamParameters {
  private static readonly LIGHT_TITLE = "light"
  private static readonly BEAM = "beam"
  private static readonly WHEN = "when"

  /** The path goes on as it was going: the step between the last two points taken once more, or half a kilometre east of a single one. */
  static nextPlace(rows: ReadonlyArray<Record<string, number>>): Record<string, number> {
    const last = rows[rows.length - 1] ?? { lat: 0, lng: 0, altitudeM: 0 }
    const before = rows[rows.length - 2]
    if (!before) return { lat: last.lat, lng: last.lng + 500 / (111320 * Math.max(0.05, Math.cos(last.lat * Math.PI / 180))), altitudeM: last.altitudeM }
    return { lat: 2 * last.lat - before.lat, lng: 2 * last.lng - before.lng, altitudeM: 2 * last.altitudeM - before.altitudeM }
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds; empty is its start, or its end. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"], required = false): ParameterSpec {
    return { type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label, hint, ...(required ? { required } : {}) }
  }

  /** What does not change while the beam is on: its name, how it widens, and the haze it crosses. */
  static readonly SET: ParameterSet = {
    kind: "beam",
    title: "beam",
    parameters: ([
      { type: "said", key: "title", label: "name", group: BeamParameters.BEAM },
      {
        type: "number", key: "divergenceMrad", min: 0.001, max: 1000, step: 0.001, unit: "mrad", group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_DIVERGENCE_MRAD,
        label: "divergence",
        hint: "howFastItWidensFullAngle"
      },
      {
        type: "number", key: "apertureM", min: 0.001, max: 10, step: 0.001, unit: "m", group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_APERTURE_M,
        label: "widthAtTheEmitter"
      },
      {
        type: "number", key: "patchiness", min: 0, max: 100, step: 1, unit: "%", scale: 100, group: BeamParameters.BEAM,
        effective: () => LaserBeamSighting.DEFAULT_PATCHINESS,
        label: "unevenHaze",
        hint: "howUnevenlyTheHazeItCrosses"
      }
    ] satisfies ParameterSpec[])
  }

  private static readonly WAVELENGTH_HINT = "itsColour532ForTheGreen"
  private static readonly POWER_HINT = "theOpticalPowerItCarriesIts"
  private static readonly WAVELENGTH_LABEL = "wavelength"
  private static readonly POWER_LABEL = "power"

  /** Its light where it does not change in time, or before and after its keys: the beam's own colour and power. */
  static readonly LIGHT: ParameterSet = {
    kind: "beam-light",
    title: BeamParameters.LIGHT_TITLE,
    parameters: ([
      { type: "number", key: "wavelengthNm", min: 380, max: 780, step: 1, unit: "nm", required: true, label: BeamParameters.WAVELENGTH_LABEL, hint: BeamParameters.WAVELENGTH_HINT },
      { type: "number", key: "powerW", min: 0.001, max: 100000, step: 0.001, unit: "W", required: true, label: BeamParameters.POWER_LABEL, hint: BeamParameters.POWER_HINT }
    ] satisfies ParameterSpec[])
  }

  /** Its light at an instant (see BeamJson.light): what a key leaves empty is the beam's own, which the form is told. */
  static readonly LIGHT_KEY: ParameterSet = {
    kind: "beam-light-key",
    title: BeamParameters.LIGHT_TITLE,
    parameters: ([
      BeamParameters.instant("t", "time",
        "secondsOfTheRecording", true),
      { type: "number", key: "wavelengthNm", min: 380, max: 780, step: 1, unit: "nm", label: BeamParameters.WAVELENGTH_LABEL, hint: BeamParameters.WAVELENGTH_HINT,
        effective: (_, context) => (context as BeamJson | undefined)?.wavelengthNm },
      { type: "number", key: "powerW", min: 0.001, max: 100000, step: 0.001, unit: "W", label: BeamParameters.POWER_LABEL, hint: BeamParameters.POWER_HINT,
        effective: (_, context) => (context as BeamJson | undefined)?.powerW }
    ] satisfies ParameterSpec[])
  }

  /** When it is on. */
  static readonly ON: ParameterSet = {
    kind: "beam-on",
    title: BeamParameters.WHEN,
    parameters: ([
      BeamParameters.instant("fromT", "onFrom",
        "secondsOfTheRecordingEmptyFrom"),
      BeamParameters.instant("untilT", "offAt",
        "secondsOfTheRecordingEmptyUntil")
    ] satisfies ParameterSpec[])
  }

  /** The instant of a key of the path (see BeamJson.moves): its points are edited below it, as the path's are. */
  static readonly MOVE_KEY: ParameterSet = {
    kind: "beam-move-key",
    title: "pathAtAnInstant",
    parameters: ([
      BeamParameters.instant("t", "time",
        "secondsOfTheRecording", true)
    ] satisfies ParameterSpec[])
  }

  /** The colour a light of `wavelengthNm` is shown as, as a CSS hex colour: its most saturated, at its brightest. */
  static hexOf(wavelengthNm: number): string {
    const rgb = LaserBeamSighting.colourOf(wavelengthNm)
    const top = Math.max(...rgb, 1e-9)
    const encode = (linear: number) => {
      const c = Math.min(1, Math.max(0, linear / top))
      const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
      return Math.round(srgb * 255).toString(16).padStart(2, "0")
    }
    return `#${rgb.map(encode).join("")}`
  }

  /**
   * The wavelength whose colour is nearest `hex` in hue, nm: what a colour picked stands for, a laser's light being of one wavelength. A
   * purple or a magenta, which no single wavelength is, gives the end of the spectrum nearest it.
   */
  static wavelengthOf(hex: string): number {
    const hue = BeamParameters.hueOf(hex)
    let best = 532
    let distance = Infinity
    for (let nm = 400; nm <= 700; nm++) {
      const gap = Math.abs(((BeamParameters.hueOf(BeamParameters.hexOf(nm)) - hue + 540) % 360) - 180)
      if (gap < distance) {
        distance = gap
        best = nm
      }
    }
    return best
  }

  private static hueOf(hex: string): number {
    const value = Number.parseInt(hex.replace("#", ""), 16)
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => channel / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === min) return 0
    const d = max - min
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return (h * 60 + 360) % 360
  }

  /** A point of the path: where the light leaves the emitter, is turned by a mirror, or ends. */
  static readonly PLACE: ParameterSet = {
    kind: "beam-place",
    title: "pointOfThePath",
    parameters: ([
      // As degrees, or from the observer or a decor object (the house the laser was shot from): see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 0.1, label: "position" },
      {
        type: "number", key: "altitudeM", min: -500, max: 100000, step: 0.1, unit: "m", required: true,
        label: "altitude",
        hint: "aboveTheSeaNotTheGround"
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the beam kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(BeamParameters.SET)
  }
}
