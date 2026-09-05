import type { Instrument } from "./Instrument.js"
import { Instruments } from "./Instrument.js"
import { SkyDrift } from "../astronomy/SkyDrift.js"

/**
 * How faint a point of light the observation could have recorded — which is a property of the
 * INSTRUMENT, and was being answered for every sighting as though it were an eye.
 *
 * The sky field was drawn to magnitude 6.5 whatever the recording said it was made through. That
 * number is not a property of the sky: it is what a dark-adapted human eye reaches, and the whole
 * point of stating an instrument is that a witness who photographed did not see what a witness who
 * looked saw. A twenty-second pose at f/2 records stars three magnitudes fainter than anybody
 * standing beside the tripod could see — that is most of what makes a photograph worth arguing
 * about — and an Instamatic at a ninetieth of a second records two magnitudes LESS than the eye,
 * which is why so many "the sky was full of stars" accounts come with a photograph of an empty
 * black rectangle.
 *
 * CONTRAST, NOT COLLECTION, is what this is computed from, and the difference decides the whole
 * shape of the answer. A star is never detected against nothing: it is detected against the sky it
 * stands on, which the same aperture and the same exposure collect just as much of. What grows with
 * exposure is the star's signal against the sky's PHOTON NOISE, and noise grows as the square root
 * — so the gain is 1.25 log10 of the collected light and not 2.5 log10 of it. Written the other
 * way, a camera in daylight would be handed eight magnitudes over the eye and would draw the whole
 * Milky Way at noon.
 *
 * Three things therefore enter it, and the third is the one people forget:
 * - the APERTURE, as area, `(f/N)²` — real millimetres of opening, which is why a fast lens is
 *   worth more than a big sensor;
 * - the EXPOSURE, capped by trailing (see trailLimitedSeconds) — light that lands on new grain
 *   is not light added to the star;
 * - the RESOLUTION, as the solid angle the star's image is spread over, which sets how much sky
 *   comes with it. A sharp instrument sees a star against less sky, and this is the term that makes
 *   a long lens deeper than a short one at the same f-number.
 *
 * Two things it does NOT model, both stated rather than hidden. It assumes every receptor turns the
 * same fraction of arriving light into signal, which is wrong in silicon's favour: a modern sensor
 * is several times more efficient than a rod or a film grain, so a phone's night mode comes out
 * under-credited here. And it describes a photograph EXPOSED FOR THAT SKY; a twenty-second pose at
 * noon is a white rectangle in which nothing is visible at all, and that is a fact about the frame
 * rather than about the threshold this computes.
 *
 * And it answers for a POINT THAT STAYS PUT — a star, a planet, a comet, a satellite steady enough
 * to be one. A meteor is not that: it crosses the frame in a second, so a longer exposure adds sky
 * to its trail without adding anything to the meteor, and a camera records FEWER of them than the
 * eye beside it even while recording fainter stars. The shower rates are therefore deliberately
 * left where they are (see MeteorShowers.observedRatePerHour, which asks a dark-sky eye), and
 * applying this gain to them would be wrong rather than merely approximate.
 *
 * The reference is the eye, deliberately, so that the existing twilight curve keeps answering the
 * question it was calibrated for (see visibleMagnitudeLimit) and this only ever says how far the
 * device stands from a witness's own eyes.
 */
export class LimitingMagnitude {

  /**
   * The instrument every other one is measured against — a dark-adapted human eye, in the same
   * three numbers.
   *
   * All three are standard human photometry rather than choices: a pupil that opens to about 7 mm
   * in the dark, an acuity of about one arcminute (retinal sampling, not diffraction, which at 7 mm
   * would be three times finer), and Bloch's critical duration of about a tenth of a second, past
   * which the eye stops accumulating and starts refreshing. That last one is why a camera is ever
   * ahead at all: nothing an eye can do makes its own exposure longer.
   */
  static readonly EYE = { apertureMm: 7, exposureSeconds: 0.1, resolutionArcsec: 60 }

  /** Green, where the eye's own sensitivity peaks and where a diffraction limit is conventionally
   * quoted. Metres, since that is what the aperture is converted to. */
  static readonly WAVELENGTH_M = 550e-9

  /** Radians to arcseconds — one radian is this many, and it is a definition rather than a
   * measurement. */
  static readonly ARCSEC_PER_RADIAN = (180 * 3600) / Math.PI

  /**
   * What a camera nobody identified is taken to have been, for this question only.
   *
   * A stated assumption and not a silent one: the entry for "he photographed it and said no more"
   * carries an f-number and a shutter speed but no frame, and there is no aperture in millimetres
   * without a focal length to divide. The ordinary snapshot of the era this project mostly deals
   * with is a 50 mm lens on 35 mm film, so that is what is assumed — and it is the reason a real
   * device, once named, is always better than this.
   */
  static readonly UNKNOWN_CAMERA_FOCAL_MM = 50

  /**
   * The finest detail an ordinary film frame or sensor keeps, micrometres, for a device that does
   * not state its own — colour negative of the snapshot decades, which resolves something like
   * 25 line pairs per millimetre once printed.
   */
  static readonly UNKNOWN_CAMERA_DETAIL_UM = 20

  /**
   * How fast the sky slides past, arcseconds per second — the same sidereal rate the star trails
   * are drawn from (see SkyDrift), at the celestial equator where it is fastest.
   *
   * The equator rather than an average, for the same reason SkyDrift takes it there: it is the
   * longest trail in the frame, and a star near the pole barely moves. Taking the fastest makes
   * this a conservative cap.
   */
  static get skyDriftArcsecPerSecond(): number {
    return SkyDrift.DEG_PER_SECOND * 3600
  }

  /**
   * The three numbers that decide how faint a point of light an instrument can hold, resolved for
   * one observation — its own settings first, then the device's, then the assumption above.
   *
   * An instrument with no shutter and no diaphragm is an eye, and gets the eye's own: there is
   * nothing to compute, and every recording made before instruments existed here is one.
   */
  static graspOf(
    instrument: Instrument,
    settings: { fNumber?: number; focalLengthMm?: number; exposureSeconds?: number } = {}
  ): { apertureMm: number; exposureSeconds: number; resolutionArcsec: number } {
    const exposureSeconds = settings.exposureSeconds ?? instrument.exposureSeconds
    const fNumber = settings.fNumber ?? instrument.fNumber
    if (exposureSeconds === undefined || fNumber === undefined || !(exposureSeconds > 0) || !(fNumber > 0)) {
      return LimitingMagnitude.EYE
    }
    const focalLengthMm =
      settings.focalLengthMm ?? instrument.frame?.focalLengthMm ?? LimitingMagnitude.UNKNOWN_CAMERA_FOCAL_MM
    const apertureMm = focalLengthMm / fNumber
    const resolutionArcsec = LimitingMagnitude.resolutionArcsec(instrument, focalLengthMm, apertureMm)
    return {
      apertureMm,
      exposureSeconds: Math.min(exposureSeconds, LimitingMagnitude.trailLimitedSeconds(resolutionArcsec)),
      resolutionArcsec
    }
  }

  /**
   * How small a thing that instrument can keep separate on the sky, arcseconds — the COARSER of the
   * two limits, which is the one that actually applies.
   *
   * Both are real and either can win. The receptor's own grain or pixel subtends `detail/f`, and it
   * is what limits every ordinary camera: 20 µm of film behind a 50 mm lens is 82 arcseconds, an
   * arcminute and a half, coarser than the eye. Diffraction at the aperture, `1.22 λ/D`, only takes
   * over on something with a big opening and a fine receptor — a phone's 1.4 µm pixels are finer
   * than its own tiny lens can deliver.
   */
  static resolutionArcsec(instrument: Instrument, focalLengthMm: number, apertureMm: number): number {
    const detailUm = instrument.detailUm ?? LimitingMagnitude.UNKNOWN_CAMERA_DETAIL_UM
    const detector = (detailUm / 1000 / focalLengthMm) * LimitingMagnitude.ARCSEC_PER_RADIAN
    const diffraction =
      ((1.22 * LimitingMagnitude.WAVELENGTH_M) / (apertureMm / 1000)) * LimitingMagnitude.ARCSEC_PER_RADIAN
    return Math.max(detector, diffraction)
  }

  /**
   * How long a fixed camera can gather a star's light before it stops being the same star's light,
   * seconds.
   *
   * The cap that makes an hour on a tripod no deeper than ten seconds on one, and it is the same
   * physics the renderer already DRAWS: once the sky has slid further than the instrument can
   * resolve, the star is no longer accumulating on one grain, it is being smeared across new ones,
   * and its peak stops climbing while the sky under it keeps rising. Measured in this project's own
   * renderer, from the other side: a first-magnitude trail peaked at 181 in a snapshot, 52 at ten
   * minutes and 35 at an hour, against a sky of 30.5.
   *
   * A witness tracking the sky would break this, and no recording here can say so yet — a driven
   * mount is not something an eyewitness account has ever mentioned.
   */
  static trailLimitedSeconds(resolutionArcsec: number): number {
    return resolutionArcsec / LimitingMagnitude.skyDriftArcsecPerSecond
  }

  /**
   * How many magnitudes deeper (positive) or shallower (negative) than a naked eye that instrument
   * reaches in the same sky.
   *
   * Deliberately a DIFFERENCE, added to whatever the sky's own threshold for an eye is, so that
   * daylight, twilight and moonlight keep being answered where they already were and this stays the
   * one statement about the device. Zero for an eye, by construction.
   *
   * What it gives, and none of it was dialled: an Instamatic at f/11 and a ninetieth, −2.3 (a
   * snapshot camera records fewer stars than the witness holding it saw); the same 35 mm SLR, −2.2
   * at a two-hundred-and-fiftieth and f/8, +3.2 at f/2 for twenty seconds on a tripod — which puts
   * it at magnitude 9.7, where a fixed-camera shot of that exposure really does land; a phone in
   * daylight −2.1, and the same phone at ten seconds +1.2.
   */
  static gainOverEye(
    instrument: Instrument,
    settings: { fNumber?: number; focalLengthMm?: number; exposureSeconds?: number } = {}
  ): number {
    const grasp = LimitingMagnitude.graspOf(instrument, settings)
    const eye = LimitingMagnitude.EYE
    const area = (grasp.apertureMm / eye.apertureMm) ** 2
    const time = grasp.exposureSeconds / eye.exposureSeconds
    const sharpness = (eye.resolutionArcsec / grasp.resolutionArcsec) ** 2
    return 1.25 * Math.log10(area * time * sharpness)
  }

  /**
   * The same question asked of a whole recording rather than of loose settings: what the sighting's
   * own instrument, aperture, focal length and shutter come to.
   *
   * The field of view is what a recording keeps rather than a focal length (see
   * Instruments.focalLengthMmFor), so it is converted here — which is also what makes a zoom change
   * the threshold as it is turned, since a longer lens spreads the sky background over more of the
   * frame while the star stays a point.
   */
  static gainFor(
    instrument: Instrument,
    optics: { fNumber?: number; fieldOfViewDeg?: number; exposureSeconds?: number }
  ): number {
    const focalLengthMm =
      optics.fieldOfViewDeg === undefined ? undefined : Instruments.focalLengthMmFor(instrument, optics.fieldOfViewDeg)
    return LimitingMagnitude.gainOverEye(instrument, {
      fNumber: optics.fNumber,
      focalLengthMm,
      exposureSeconds: optics.exposureSeconds
    })
  }
}
