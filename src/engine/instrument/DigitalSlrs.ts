import type { Instrument } from "./Instrument.js"

/**
 * One digital SLR body, as Stellarium's Oculars plugin lists it (`default_ocular.ini`, `[ccd]`):
 * the size of the sensor and the pitch of its pixels. Those are facts about a real device, which
 * is why they are taken from a catalogue other people already maintain and argue with rather than
 * typed in again here.
 */
interface DigitalSlrBody {
  /** Stable id, what a case file names. */
  id: string
  /** Maker's name, which reads the same in every language. */
  name: string
  /** Sensor width and height, millimetres, landscape. */
  widthMm: number
  heightMm: number
  /** Pixel pitch, micrometres. */
  pixelUm: number
  /** Year it went on sale (not in Stellarium's list: from the makers' announcements). */
  year: number
}

/**
 * The bodies, and the one lens Stellarium cannot tell us about: a camera nobody can say what was
 * screwed on. The focal range below is the span of Stellarium's own list of "Photo Lens" entries
 * (14 to 135 mm), and 50 mm is where a recording starts, as for the film SLR in Instrument.ts.
 * Whoever knows the real focal states it, and the field follows (see Instruments.fieldOfViewDegAt).
 */
export class DigitalSlrs {
  static readonly DEFAULT_FOCAL_MM = 50
  static readonly FOCAL_RANGE_MM = { minMm: 14, maxMm: 135 }

  static readonly BODIES: readonly DigitalSlrBody[] = [
    { id: "eos-450d", name: "Canon EOS 450D (APS-C)", widthMm: 22.2, heightMm: 14.8, pixelUm: 5.2, year: 2008 },
    { id: "eos-60da", name: "Canon EOS 60Da (APS-C)", widthMm: 22.3, heightMm: 14.9, pixelUm: 4.3, year: 2012 },
    { id: "eos-70d", name: "Canon EOS 70D (APS-C)", widthMm: 22.5, heightMm: 15.0, pixelUm: 4.1, year: 2013 },
    { id: "eos-80d", name: "Canon EOS 80D (APS-C)", widthMm: 22.3, heightMm: 14.9, pixelUm: 3.7, year: 2016 },
    { id: "eos-7d", name: "Canon EOS 7D (APS-C)", widthMm: 22.3, heightMm: 14.9, pixelUm: 4.1, year: 2009 },
    { id: "eos-7d-ii", name: "Canon EOS 7D Mark II (APS-C)", widthMm: 22.4, heightMm: 15.0, pixelUm: 4.1, year: 2014 },
    { id: "eos-5d", name: "Canon EOS 5D (full frame)", widthMm: 35.8, heightMm: 23.9, pixelUm: 8.2, year: 2005 },
    { id: "eos-5d-ii", name: "Canon EOS 5D Mark II (full frame)", widthMm: 36, heightMm: 24, pixelUm: 6.4, year: 2008 },
    { id: "eos-5d-iii", name: "Canon EOS 5D Mark III (full frame)", widthMm: 36, heightMm: 24, pixelUm: 6.25, year: 2012 },
    { id: "eos-5d-iv", name: "Canon EOS 5D Mark IV (full frame)", widthMm: 36, heightMm: 24, pixelUm: 5.36, year: 2016 },
    { id: "eos-6d", name: "Canon EOS 6D (full frame)", widthMm: 35.8, heightMm: 23.9, pixelUm: 6.55, year: 2012 },
    { id: "eos-6d-ii", name: "Canon EOS 6D Mark II (full frame)", widthMm: 36, heightMm: 24, pixelUm: 5.77, year: 2017 },
    { id: "nikon-d3", name: "Nikon D3 / D700 (full frame)", widthMm: 36, heightMm: 23.9, pixelUm: 8.44, year: 2007 },
    { id: "nikon-d7000", name: "Nikon D7000 (DX)", widthMm: 23.6, heightMm: 15.6, pixelUm: 4.78, year: 2010 },
    { id: "nikon-d7100", name: "Nikon D7100 / D7200 (DX)", widthMm: 23.5, heightMm: 15.6, pixelUm: 3.9, year: 2013 },
    { id: "nikon-d500", name: "Nikon D500 / D7500 (DX)", widthMm: 23.5, heightMm: 15.7, pixelUm: 4.2, year: 2016 }
  ]

  /** The bodies as instruments, in the shape of the film SLR they replace in a recent photograph. */
  static instruments(): Instrument[] {
    return DigitalSlrs.BODIES.map(body => ({
      id: body.id,
      name: body.name,
      projection: "rectilinear",
      frame: {
        widthMm: body.widthMm,
        heightMm: body.heightMm,
        focalLengthMm: DigitalSlrs.DEFAULT_FOCAL_MM,
        focalRangeMm: DigitalSlrs.FOCAL_RANGE_MM
      },
      fNumber: 8,
      fNumberRange: { min: 1.4, max: 22 },
      exposureSeconds: 1 / 250,
      // Bulb, as on the film bodies: the shutter stays open as long as it is held.
      exposureRangeSeconds: { min: 1 / 8000, max: 3600 },
      years: { from: body.year },
      apertureBlades: 7,
      // Sensor pixels, not grain: the pitch is the finest detail the receptor keeps.
      detailUm: body.pixelUm,
      medium: { kind: "sensor", iso: 100 }
    }))
  }

  /** Their names by id, for the per-language tables of SceneNames: a maker's model reads the same
   * in every language, so one table serves them all. */
  static names(): Record<string, string> {
    return Object.fromEntries(DigitalSlrs.BODIES.map(body => [body.id, body.name]))
  }
}
