import { describe, expect, it } from "vitest"
import { Instruments } from "../../src/engine/instrument/Instrument.js"
import { LimitingMagnitude } from "../../src/engine/instrument/LimitingMagnitude.js"
import { visibleMagnitudeLimit } from "../../src/render3d/skyColors.js"

const eye = Instruments.byId("eye")
const instamatic = Instruments.byId("instamatic-126")
const slr = Instruments.byId("slr-35mm-50")
const zoom = Instruments.byId("slr-35mm-zoom")
const phone = Instruments.byId("phone-landscape")

describe("LimitingMagnitude", () => {

  it("gives an eye nothing at all, which is what every recording that says nothing was made with", () => {
    // The reference, and it has to be exactly zero rather than nearly: the whole sky threshold is
    // this added to a curve calibrated for human eyes, and a recording that names no instrument
    // must come out of it byte for byte where it did before this existed.
    expect(LimitingMagnitude.gainOverEye(eye)).toBe(0)
    expect(visibleMagnitudeLimit(-18, LimitingMagnitude.gainOverEye(eye))).toBe(6.5)
  })

  it("puts a snapshot camera BEHIND the witness holding it", () => {
    // The result that matters most and reads as a surprise: an Instamatic at f/11 and a ninetieth
    // of a second collects a fraction of what a dark-adapted eye does, so its stars are FEWER than
    // the ones the witness described. Half of "the sky was full of stars, and the photograph is
    // black" is this, and nothing in the scene said so while every sighting was drawn at 6.5.
    const gain = LimitingMagnitude.gainOverEye(instamatic)
    expect(gain).toBeLessThan(-2)
    expect(gain).toBeGreaterThan(-2.6)
    // Magnitude 4.2 on a dark night: a few hundred stars where the eye had several thousand.
    expect(visibleMagnitudeLimit(-18, gain)).toBeCloseTo(4.2, 1)
  })

  it("puts a tripod at f/2 three magnitudes past it, where a real 20-second exposure lands", () => {
    // The calibration case, checked against the thing photographers actually get: a 50 mm lens
    // opened to f/2 for twenty seconds on a fixed tripod records to about magnitude nine and a half
    // to ten. Nothing here was fitted to that number — it falls out of the aperture, the exposure
    // and the grain — which is what makes it a check rather than a setting.
    const gain = LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 20 })
    expect(visibleMagnitudeLimit(-18, gain)).toBeCloseTo(9.7, 1)
  })

  it("stops crediting an exposure once the sky has slid past what the instrument can resolve", () => {
    // An hour on a fixed tripod is no deeper than five seconds on one, and that is not a modelling
    // shortcut: past that point the star's light is landing on new grain rather than on the same
    // grain, so its peak stops climbing while the sky under it keeps rising. The renderer already
    // DRAWS this — a first-magnitude trail peaks at 181 in a snapshot and 35 over an hour — and the
    // threshold has to agree with the picture.
    const twenty = LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 20 })
    const hour = LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 3600 })
    expect(hour).toBeCloseTo(twenty, 6)
    // And below the cap it is still an ordinary exposure, where more time really does buy depth.
    expect(LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 1 })).toBeLessThan(twenty)
  })

  it("credits a longer lens at the same aperture ratio, because the sky under the star thins out", () => {
    // The term people forget. A 210 mm at f/4 has both a bigger opening than a 50 mm at f/4 AND
    // spreads the sky background over four times the film per degree, so the star stands on less of
    // it. Same f-number, same film, same exposure — and two magnitudes between them.
    const short = LimitingMagnitude.gainOverEye(zoom, { fNumber: 4, focalLengthMm: 70, exposureSeconds: 30 })
    const long = LimitingMagnitude.gainOverEye(zoom, { fNumber: 4, focalLengthMm: 210, exposureSeconds: 30 })
    expect(long).toBeGreaterThan(short + 1)
  })

  it("reads a zoom's field of view back as the focal length that made it", () => {
    // A recording keeps the FIELD and not the focal (see Instruments.focalLengthMmFor), so the two
    // ways of asking must give the same answer or the scene and the editor would disagree about the
    // same photograph.
    const fieldOfViewDeg = Instruments.fieldOfViewDegAt(zoom, 210)!
    expect(LimitingMagnitude.gainFor(zoom, { fNumber: 4, fieldOfViewDeg, exposureSeconds: 30 })).toBeCloseTo(
      LimitingMagnitude.gainOverEye(zoom, { fNumber: 4, focalLengthMm: 210, exposureSeconds: 30 }),
      6
    )
  })

  it("lets a phone's night mode past the eye and its daylight snapshot nowhere near", () => {
    // The same device, ten seconds apart in the settings and three magnitudes apart in what it
    // records — which is why this is a property of the observation and not of the instrument alone.
    expect(LimitingMagnitude.gainOverEye(phone)).toBeLessThan(-1.5)
    expect(LimitingMagnitude.gainOverEye(phone, { exposureSeconds: 10 })).toBeGreaterThan(1)
  })

  it("does not hand a camera the eight magnitudes a collection-only model would", () => {
    // The reason the gain is 1.25 log10 and not 2.5: a star is detected against the sky, which the
    // same aperture and the same exposure gather just as much of. Counting only the light collected
    // would put a twenty-second pose eight magnitudes past the eye and draw the Milky Way at noon.
    const gain = LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 20 })
    expect(gain).toBeLessThan(4)
    // At noon the sky is still the limit: the eye's daylight floor of -4, moved by the device and
    // no further, which leaves nothing but the very brightest things in the sky.
    expect(visibleMagnitudeLimit(45, gain)).toBeLessThan(0)
  })

  it("assumes an ordinary snapshot for a camera nobody identified, rather than refusing to answer", () => {
    // The entry for "he photographed it and said no more" has an f-number and a shutter but no
    // frame, so there is no aperture in millimetres without an assumed focal length. Stated, and
    // stated as the same 50 mm on 35 mm film the rest of the era's snapshots were.
    const unknown = Instruments.byId("rectilinear-lens")
    const named = LimitingMagnitude.gainOverEye(slr)
    expect(LimitingMagnitude.gainOverEye(unknown)).toBeCloseTo(named, 6)
  })

  it("keeps the sky's own shape and only shifts it", () => {
    // The instrument is a property of the observation and the twilight is a property of the sky:
    // the same device must move the threshold by the same amount whatever the Sun is doing, or one
    // of the two would be quietly standing in for the other.
    const gain = LimitingMagnitude.gainOverEye(slr, { fNumber: 2, exposureSeconds: 20 })
    for (const sunAltitudeDeg of [-30, -18, -12, -6, -1, 10]) {
      expect(visibleMagnitudeLimit(sunAltitudeDeg, gain) - visibleMagnitudeLimit(sunAltitudeDeg)).toBeCloseTo(gain, 6)
    }
  })
})
