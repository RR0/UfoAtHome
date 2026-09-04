import {
  AdditiveBlending,
  BackSide,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  Matrix3,
  Mesh,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from "three"
import { MilkyWay } from "../engine/astronomy/MilkyWay.js"
import { ZodiacalLight } from "../engine/astronomy/ZodiacalLight.js"
import { NightSkyBrightness } from "../engine/atmosphere/NightSkyBrightness.js"
import type { SkyBrightnessMap } from "../engine/astronomy/SurfaceBrightness.js"
import { SRGB_ENCODE_GLSL } from "./colorSpace.js"

/**
 * The two things left in a naked-eye sky that are neither a star nor weather: the Milky Way, and the
 * zodiacal light.
 *
 * Both are computed, not drawn — see MilkyWay.ts and ZodiacalLight.ts, which walk a line of sight
 * through a Galaxy and through the dust of the Solar System and hand back how bright the sky is in
 * every direction. This file is what turns those two answers into light on a screen, and almost all
 * of it is one question: could the witness have seen it.
 *
 * THAT QUESTION IS THE POINT, and it is why the sky's own brightness is modelled here alongside the
 * glows (see NightSkyBrightness). A star is seen or not seen by its magnitude. A glow has no
 * magnitude — it is a brightness spread over the sky — and an eye reads it only as a CONTRAST
 * against the sky it lies on. So the same band, of exactly the same brightness, is an unmistakable
 * arch at two in the morning, a faint smudge at the end of twilight, nothing at all under a full
 * Moon, and nothing at all by day. None of those four is a fade applied on top: they are one
 * division, by a sky that the Sun's depression and the Moon's phase and distance decide.
 *
 * Which is what makes both worth having in a project about what people report. The zodiacal light
 * in particular is a manual's own "strange glow" — a leaning cone of light with no edge, standing
 * where the Sun went down an hour after it went down, gone before midnight, and unfamiliar enough
 * that first-time observers reach for other explanations. It is the rare candidate that costs
 * nothing to state: no catalogue, no coverage that starts in some year, no licence. Only geometry.
 */
export class SkyGlowEffect {
  /** Outside the ice display and the bows at 880, and inside the sky dome: these two are the
   * FURTHEST things there are, and everything else in the sky stands in front of them. */
  private static readonly RADIUS = 890

  /**
   * How long a frame is allowed to spend walking the two maps.
   *
   * A BUDGET AND NOT A ROW COUNT, which is the difference between a scene that stays smooth on
   * every machine and one that stays smooth on the machine it was written on. Measured here: four
   * rows of each map came to 39 ms in the worst frame — two and a half frames' worth of stutter,
   * repeated thirty times — where the same total work spread by the clock never exceeds this and
   * finishes in about two seconds, which for a background that was not there a moment ago is
   * nothing at all.
   */
  private static readonly WORK_BUDGET_MS = 6

  /**
   * Past this the sky is too bright for either glow to be anything, and the dome is not drawn at
   * all — a fill-rate saving, not a rule: the shader's own division would already have returned
   * something invisible. Sixteenth magnitude a square arcsecond is the sky about seven degrees of
   * solar depression, which is nautical twilight barely begun.
   */
  private static readonly TOO_BRIGHT_MAG_PER_ARCSEC2 = 16

  /**
   * What the band and the cone are tinted.
   *
   * Neither is far from grey, and that is the honest answer rather than a dull one. Both are lit by
   * ordinary starlight and ordinary sunlight, so on paper the Milky Way is a warm yellow-white
   * population and the zodiacal light is the Sun's own colour — and at the light level either is
   * actually seen at, an eye has no colour vision left to resolve it with. What survives is the rod
   * response's own blue shift, which is why the band is given a faintly cool cast and not a warm
   * one, and the cone, which is the brighter of the two and is seen against a sky the Sun has only
   * just left, keeps a trace of where its light came from.
   */
  private static readonly MILKY_WAY_TINT: [number, number, number] = [0.9, 0.94, 1]
  private static readonly ZODIACAL_TINT: [number, number, number] = [1, 0.97, 0.9]

  readonly object: Mesh
  private readonly material: ShaderMaterial
  private readonly galaxy = new MilkyWay()
  private readonly dust = new ZodiacalLight()
  private readonly milkyWayTexture: DataTexture
  private readonly zodiacalTexture: DataTexture
  private readonly milkyWayTexels: Uint16Array
  private readonly zodiacalTexels: Uint16Array
  private workHandle?: number
  private repaint?: () => void

  constructor() {
    this.milkyWayTexels = new Uint16Array(MilkyWay.LONGITUDE_STEPS * MilkyWay.LATITUDE_STEPS * 4)
    this.milkyWayTexture = SkyGlowEffect.buildTexture(
      this.milkyWayTexels,
      MilkyWay.LONGITUDE_STEPS,
      MilkyWay.LATITUDE_STEPS,
      // Longitude wraps: the map is a full turn round the Galaxy and its two edges are the same
      // meridian, so a fragment interpolating across them must be given the far side rather than
      // the near edge repeated.
      RepeatWrapping
    )
    this.zodiacalTexels = new Uint16Array(ZodiacalLight.LONGITUDE_STEPS * ZodiacalLight.LATITUDE_STEPS * 4)
    this.zodiacalTexture = SkyGlowEffect.buildTexture(
      this.zodiacalTexels,
      ZodiacalLight.LONGITUDE_STEPS,
      ZodiacalLight.LATITUDE_STEPS,
      // Not a full turn: the map runs from the Sun's own longitude to the anti-solar one and is
      // mirrored, so its edges are real edges.
      ClampToEdgeWrapping
    )
    this.material = new ShaderMaterial({
      uniforms: {
        uMilkyWay: { value: this.milkyWayTexture },
        uZodiacal: { value: this.zodiacalTexture },
        uGalactic: { value: new Matrix3() },
        uEclipticPole: { value: new Vector3(0, 1, 0) },
        uSunLongitude: { value: new Vector3(1, 0, 0) },
        uMoonDirection: { value: new Vector3(0, -1, 0) },
        uMoonOutput: { value: 0 },
        uSunDirection: { value: new Vector3(0, -1, 0) },
        uTwilightOutput: { value: 0 },
        uAirglowNanolamberts: { value: NightSkyBrightness.toNanolamberts(NightSkyBrightness.AIRGLOW_MAG_PER_ARCSEC2) },
        uSkyColor: { value: new Vector3(0, 0, 0) },
        uMilkyWayTint: { value: new Vector3(...SkyGlowEffect.MILKY_WAY_TINT) },
        uZodiacalTint: { value: new Vector3(...SkyGlowEffect.ZODIACAL_TINT) },
        uReady: { value: 0 },
        uEncodeDestination: { value: 1 }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        ${SRGB_ENCODE_GLSL}
        varying vec3 vDirection;
        uniform sampler2D uMilkyWay;
        uniform sampler2D uZodiacal;
        uniform mat3 uGalactic;
        uniform vec3 uEclipticPole;
        uniform vec3 uSunLongitude;
        uniform vec3 uMoonDirection;
        uniform float uMoonOutput;
        uniform vec3 uSunDirection;
        uniform float uTwilightOutput;
        uniform float uAirglowNanolamberts;
        uniform vec3 uSkyColor;
        uniform vec3 uMilkyWayTint;
        uniform vec3 uZodiacalTint;
        uniform float uReady;
        uniform float uEncodeDestination;

        const float DEGREES = 57.29577951308232;
        /** Magnitudes per air mass, and the air-mass law, both the moonlight model's own — see
         * NightSkyBrightness. One system for the sky's brightness and for what the air takes out
         * of the glow standing in it, rather than two constants that would have to be told apart. */
        const float EXTINCTION = 0.172;

        /** How much brighter this line of sight is for standing that far round from a source of
         * glow — the twin of NightSkyBrightness.scatteringAt, and the one formula this shader has
         * to keep in step with the code that measures the sky it divides by. */
        float scatteringAt(vec3 dir, vec3 source) {
          float separation = acos(clamp(dot(dir, source), -1.0, 1.0));
          return pow(10.0, 5.36) * (1.06 + pow(cos(separation), 2.0)) +
                 pow(10.0, 6.15 - (separation * DEGREES) / 40.0);
        }

        float airMass(float sinZenith) {
          return inversesqrt(max(1.0 - 0.96 * sinZenith * sinZenith, 0.001));
        }

        /** The warped row a latitude sits on — the inverse of SurfaceBrightness.latitudeOfRowCoord,
         * and the one place this shader has to agree with the code that built the map. */
        float rowOf(float latitudeDeg) {
          float t = sign(latitudeDeg) * sqrt(min(abs(latitudeDeg), 90.0) / 90.0);
          return (t + 1.0) * 0.5;
        }

        void main() {
          if (uReady < 0.5) discard;
          vec3 dir = normalize(vDirection);
          // Air the line of sight looks through: one at the zenith, five at the horizon.
          float thickness = airMass(sqrt(max(1.0 - dir.y * dir.y, 0.0)));

          // What the sky itself is worth HERE, in nanolamberts, and the whole point is the "here":
          // the floor that is the same everywhere, plus two sources of scattered glow whose share
          // depends on how far round from them this line of sight lies and how much air it has to
          // scatter in. The zodiacal cone stands in the brightest part of a twilit sky and the
          // Milky Way lies low in a moonlit one; comparing either with the zenith instead —
          // which is what a single number for the sky would do — flatters both.
          float scatteredHere = 1.0 - pow(10.0, -0.4 * EXTINCTION * thickness);
          float sky =
            uAirglowNanolamberts +
            (scatteringAt(dir, uSunDirection) * uTwilightOutput +
             scatteringAt(dir, uMoonDirection) * uMoonOutput) * scatteredHere;

          // The Galaxy, in its own coordinates.
          vec3 galactic = uGalactic * dir;
          float galacticLatitude = asin(clamp(galactic.z, -1.0, 1.0)) * DEGREES;
          float galacticLongitude = atan(galactic.y, galactic.x) * DEGREES;
          vec2 bandAt = vec2(fract(galacticLongitude / 360.0), rowOf(galacticLatitude));
          float band = texture2D(uMilkyWay, bandAt).r;

          // The dust cloud, in its own: how far above the ecliptic, and how far round it from the
          // Sun's own longitude. Both taken as magnitudes because the cloud is symmetric about
          // both planes, which is also why no handedness has to be settled here.
          float sinEcliptic = clamp(dot(dir, uEclipticPole), -1.0, 1.0);
          float eclipticLatitude = asin(sinEcliptic) * DEGREES;
          vec3 inPlane = dir - sinEcliptic * uEclipticPole;
          float gap = acos(clamp(dot(normalize(inPlane), uSunLongitude), -1.0, 1.0)) * DEGREES;
          vec2 coneAt = vec2(sqrt(gap / 180.0), rowOf(eclipticLatitude));
          float cone = texture2D(uZodiacal, coneAt).r;

          // What the air leaves of either by the time it arrives.
          float through = pow(10.0, -0.4 * EXTINCTION * (thickness - 1.0));
          // The light the glow adds, as a fraction of the light the sky is being painted with:
          // that fraction is the contrast, and the contrast is the whole physical claim.
          float skyLight = dot(uSkyColor, vec3(0.2126, 0.7152, 0.0722));
          vec3 light = (band * uMilkyWayTint + cone * uZodiacalTint) * through * skyLight / max(sky, 1e-3);
          // WHICH OF TWO PICTURES THIS IS BEING ADDED TO, and it is not the same arithmetic.
          //
          // Straight to the canvas, three.js has already bent every other material's linear light
          // through the sRGB curve by the time this blends into it — so light written in as light is
          // added to numbers that are no longer light, and comes out around nine times too dark near
          // the black end. Measured, not reasoned: the same fragment answered 3, 10 and 33 levels
          // brighter to gains of 1, 3 and 10, a straight line where the curve would have given 5, 30
          // and 96. What has to be added there is the DIFFERENCE the glow makes to the encoded value.
          //
          // Into a render target — which is every frame that goes through the fisheye projection, the
          // depth of field, or a long pose being added up — nothing has been encoded yet and
          // everything in the buffer really is light, so the light goes in as it is. Getting this
          // backwards would have made the band jump in brightness the moment a reader switched on a
          // lens, which is the kind of thing that gets blamed on the lens.
          //
          // The other displays on this dome (the bows, the ice) write their light straight in either
          // way and are calibrated against clipping to make up for it, which works because each has
          // one brightness to get right. This one cannot: it has to span a band that is invisible
          // under a Moon and unmistakable without one, and only the real curve keeps that span honest.
          vec3 onEncoded = encodeSrgb(uSkyColor + light) - encodeSrgb(uSkyColor);
          gl_FragColor = vec4(mix(light, onEncoded, uEncodeDestination), 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(SkyGlowEffect.RADIUS, 64, 32), this.material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  private static buildTexture(texels: Uint16Array, width: number, height: number, wrapS: number): DataTexture {
    const texture = new DataTexture(texels, width, height, RGBAFormat, HalfFloatType)
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.wrapS = wrapS as never
    texture.wrapT = ClampToEdgeWrapping
    texture.needsUpdate = true
    return texture
  }

  /** Asked for a repaint when the maps finish, for the reason IceHaloEffect gives: a reader who has
   * paused on a night sky is exactly the reader waiting for the band to arrive, and the scene's own
   * animation loop only runs during playback. */
  set onReady(repaint: () => void) {
    this.repaint = repaint
  }

  /**
   * Points both glows at the sky they belong in, and says how bright that sky is.
   *
   * `galactic` maps a direction in the scene onto galactic coordinates; `eclipticPole` and
   * `sunLongitude` are the two directions the dust cloud's own frame is built from. `skyColor` is
   * the colour the renderer is actually painting the night sky with, and it does two jobs: its
   * brightness is the reference the glows are expressed against, and its value is what the added
   * light has to be encoded on top of — see the fragment shader's own comment.
   */
  update(sky: {
    galactic: Matrix3
    eclipticPole: Vector3
    sunLongitude: Vector3
    sunDirection: Vector3
    sunAltitudeDeg: number
    moon: { direction: Vector3; altitudeDeg: number; phaseAngleDeg: number }
    skyColor: Vector3
  }): void {
    const moonlessMag = NightSkyBrightness.moonlessMagPerArcsec2(sky.sunAltitudeDeg)
    if (moonlessMag < SkyGlowEffect.TOO_BRIGHT_MAG_PER_ARCSEC2) {
      this.object.visible = false
      this.stopWork()
      return
    }
    const uniforms = this.material.uniforms
    uniforms.uGalactic.value.copy(sky.galactic)
    uniforms.uEclipticPole.value.copy(sky.eclipticPole).normalize()
    uniforms.uSunLongitude.value.copy(sky.sunLongitude).normalize()
    uniforms.uMoonDirection.value.copy(sky.moon.direction).normalize()
    uniforms.uSunDirection.value.copy(sky.sunDirection).normalize()
    // Everything about either source that does not depend on which way the fragment is looking. The
    // Sun's is the measured twilight brightness at the zenith divided back out through the same
    // scattering the shader will multiply it by, so whatever shape the sky ends up with, the zenith
    // still lands exactly on the photometry.
    uniforms.uMoonOutput.value = NightSkyBrightness.moonOutput(sky.moon.phaseAngleDeg, sky.moon.altitudeDeg)
    uniforms.uTwilightOutput.value = NightSkyBrightness.twilightOutput(sky.sunAltitudeDeg)
    uniforms.uSkyColor.value.copy(sky.skyColor)
    this.object.visible = true
    // Walked only once a sky has turned up that could actually show them — most sightings are
    // daylight ones and should not pay for a Galaxy they will not draw.
    if (uniforms.uReady.value < 0.5) this.scheduleWork()
  }

  /**
   * Says whether what this is about to be drawn into is already sRGB-encoded (the canvas) or still
   * linear light (any render target) — see the fragment shader, where the two are different sums.
   *
   * Set per frame by the renderer rather than once, because the same scene goes both ways within a
   * second: an ordinary frame straight to the canvas, and the very next one into a target because a
   * lens with depth of field was chosen or a long pose is being added up.
   */
  setDestinationEncoded(encoded: boolean): void {
    this.material.uniforms.uEncodeDestination.value = encoded ? 1 : 0
  }

  /** Taken down without touching anything it has computed — a sighting with no resolvable date has
   * no sky to put a Galaxy in, but the next one along may. */
  hide(): void {
    this.object.visible = false
    this.stopWork()
  }

  private scheduleWork(): void {
    if (this.workHandle !== undefined) return
    const step = () => {
      this.workHandle = undefined
      const until = performance.now() + SkyGlowEffect.WORK_BUDGET_MS
      // A row at a time, so the budget is checked against work already done rather than work
      // guessed at. Both maps advance together: neither is any use without the other.
      while (performance.now() < until && !(this.galaxy.done && this.dust.done)) {
        this.galaxy.walk(1)
        this.dust.walk(1)
      }
      if (this.galaxy.done && this.dust.done) {
        this.publish()
        return
      }
      this.workHandle = requestAnimationFrame(step)
    }
    this.workHandle = requestAnimationFrame(step)
  }

  private stopWork(): void {
    if (this.workHandle !== undefined) cancelAnimationFrame(this.workHandle)
    this.workHandle = undefined
  }

  /**
   * Copies both finished maps onto the textures the shader reads, in the sky's own unit.
   *
   * Nanolamberts rather than S10, so that the shader divides one brightness by another of the same
   * kind and gets a plain ratio — the contrast — with no conversion left in it. Half-float rather
   * than byte because the zodiacal cone spans two orders of magnitude between its foot and the
   * anti-solar sky, and a byte would band the faint end into steps.
   */
  private publish(): void {
    SkyGlowEffect.fill(this.milkyWayTexels, this.galaxy.harvest())
    this.milkyWayTexture.needsUpdate = true
    SkyGlowEffect.fill(this.zodiacalTexels, this.dust.harvest())
    this.zodiacalTexture.needsUpdate = true
    this.material.uniforms.uReady.value = 1
    this.repaint?.()
  }

  private static fill(texels: Uint16Array, map: SkyBrightnessMap): void {
    for (let at = 0; at < map.data.length; at++) {
      texels[at * 4] = DataUtils.toHalfFloat(NightSkyBrightness.nanolambertsOfS10(map.data[at]))
      texels[at * 4 + 3] = DataUtils.toHalfFloat(1)
    }
  }

  dispose(): void {
    this.stopWork()
    this.milkyWayTexture.dispose()
    this.zodiacalTexture.dispose()
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
