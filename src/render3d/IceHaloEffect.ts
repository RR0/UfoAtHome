import {
  AdditiveBlending,
  BackSide,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  Mesh,
  RGBAFormat,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from "three"
import { HaloSky } from "../engine/atmosphere/HaloSky.js"
import { CIRRUS_COVER_GLSL, CLOUD_NOISE_GLSL } from "./CloudSystem.js"

/**
 * Draws what ice crystals do to the light of the Sun or the Moon — all of it, not a chosen few.
 *
 * The display is not drawn form by form. HaloSky traces light through crystals and hands back a map
 * of the sky in the source's own frame; this reads that map and paints it. So the ring, the second
 * ring, the sundogs, the arc riding on the ring's top, the coloured arc high above, the white circle
 * at the source's own height and the shaft standing over a low Sun are not seven pieces of code
 * here. They are seven places where the traced light piled up, and there is no line below that
 * knows the name of any of them.
 *
 * That matters for the thing photographs of real displays keep showing: they are PARTIAL. One
 * sundog and not the other, an arc where the veil is thick and nothing where it thins, a ring
 * complete on one side and broken on the other. Two separate causes of that are honoured here and
 * neither is a fudge. The veil's own patchiness is sampled from the same coverage field the ice
 * deck itself is drawn from, so the display is broken exactly where the sky has no crystals. And
 * how steadily the crystals fall — which is what decides whether anything beyond the plain rings
 * shows at all — is an input, because no record holds it.
 *
 * Drawn on a SPHERE rather than as a screen-space overlay, which is the whole reason this stays
 * simple. Every feature of a display is an angle from the source, not a distance in pixels, so a
 * shader working from the direction of each fragment is right under every projection this scene
 * has, the witness's own equidistant eye included, with no reconstruction of view rays and no
 * special case.
 */
export class IceHaloEffect {
  /** Just inside the sky dome, so it is painted over the sky and under everything else. */
  private static readonly RADIUS = 880

  /**
   * How many rays a finished display is worth, and how many are traced per frame.
   *
   * The trade is noise against waiting. A tenth of this already shows every form; the rest is what
   * takes the grain off the faint ones — the big ring, the arcs that need a bounce — which are
   * exactly the forms a reader would otherwise never be sure they were seeing. The batch is sized to
   * fit inside a frame, so the scene keeps answering while its sky is being worked out.
   */
  private static readonly RAYS = 900_000
  private static readonly RAYS_PER_FRAME = 4_000

  /** How many rays the FIRST display of a scene shows itself after, and how much it doubles by.
   * Only the first: once a display is standing, the next one is swapped in whole (see the step
   * below), and watching a finished sky dissolve into a grainy one would read as the sky
   * flickering, which is not what the sky was doing. */
  private static readonly FIRST_GLIMPSE_RAYS = 50_000

  /**
   * How far the source may move, or the crystals change, before the display is worth tracing again.
   *
   * Every form moves with the source, so in principle each frame wants its own map. In practice the
   * Sun takes four minutes to cross a degree, no feature is sharper than the half-degree the source
   * itself subtends, and re-tracing on every frame would spend the whole budget on a picture nobody
   * could tell from the last one.
   */
  private static readonly ALTITUDE_STEP_DEG = 1

  /**
   * What the traced radiance is multiplied by to become screen light.
   *
   * The one number here that is a choice, and it has to be: the map says how the source's light is
   * spread across the sky per crystal, and turning that into a brightness needs the optical depth of
   * the veil — how MUCH ice was in the line of sight — which no weather record holds (see
   * IceHalos.strength). So this sets the scale of an ordinary display, and everything within a
   * display keeps the ratio the physics gave it: the big ring stays as much fainter than the common
   * one as it really is, and the sundogs stay as much brighter.
   */
  private static readonly GAIN = 0.55

  readonly object: Mesh
  private readonly material: ShaderMaterial
  private readonly sky = new HaloSky()
  private readonly texture: DataTexture
  private readonly texels: Uint16Array
  /** What the map on the texture was traced for, so a fresh one is only asked for when it would
   * differ. NaN until the first display has been traced. */
  private mappedAltitudeDeg = Number.NaN
  private mappedAlignment = Number.NaN
  private tracing = false
  private everDisplayed = false
  /** True until one display has been traced right through — the only time a half-traced sky is
   * worth showing, because the alternative is no sky at all. */
  private refining = true
  private nextGlimpse = IceHaloEffect.FIRST_GLIMPSE_RAYS
  private workHandle: number | undefined
  private onRepaint?: () => void

  constructor() {
    const width = HaloSky.AZIMUTH_BINS
    const height = HaloSky.ALTITUDE_BINS
    this.texels = new Uint16Array(width * height * 4)
    this.texture = new DataTexture(this.texels, width, height, RGBAFormat, HalfFloatType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.wrapS = ClampToEdgeWrapping
    this.texture.wrapT = ClampToEdgeWrapping
    this.texture.needsUpdate = true
    this.material = new ShaderMaterial({
      uniforms: {
        uSource: { value: new Vector3(0, 1, 0) },
        /** Up in world space — the axis altitude is measured from and azimuth is measured around. */
        uUp: { value: new Vector3(0, 1, 0) },
        uStrength: { value: 0 },
        uTint: { value: new Vector3(1, 0.97, 0.92) },
        /** The ice deck this display is being refracted through — the same coverage and the same
         * height the sky itself is drawn from, so the gaps line up with the visible veil. */
        uIceCover: { value: 0 },
        uIceHeight: { value: 1 },
        uMap: { value: this.texture },
        uGain: { value: IceHaloEffect.GAIN }
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
        ${CLOUD_NOISE_GLSL}
        ${CIRRUS_COVER_GLSL}
        varying vec3 vDirection;
        uniform vec3 uSource;
        uniform vec3 uUp;
        uniform float uStrength;
        uniform vec3 uTint;
        uniform float uIceCover;
        uniform float uIceHeight;
        uniform sampler2D uMap;
        uniform float uGain;

        void main() {
          vec3 dir = normalize(vDirection);
          // WHERE THERE ARE CRYSTALS, AND NOWHERE ELSE. Every part of a display is the source's own
          // light bent by ice, so it exists only along lines of sight that cross the veil — which is
          // why real displays are so rarely the complete circles a diagram shows. They are arcs,
          // fragments, one sundog and not the other. Sampling the same field the ice deck is drawn
          // from gets all of that for free, and guarantees the gaps fall where the sky has none.
          // It also ends the display at the horizon, which is right: the crystals are eight
          // kilometres up, so a line of sight that goes down never reaches any.
          float ice = cirrusCoverAt(dir, uIceHeight, uIceCover);
          if (ice <= 0.0) discard;
          vec3 up = normalize(uUp);
          vec3 source = normalize(uSource);
          // The map is held in the source's own frame: how far up, and how far round from its
          // bearing. Reading it that way is what lets one traced map serve every direction the
          // witness may be facing and every bearing the Sun may be on.
          float altitude = asin(clamp(dot(dir, up), -1.0, 1.0));
          vec3 sourceLevel = source - up * dot(source, up);
          vec3 dirLevel = dir - up * dot(dir, up);
          float sourceLength = length(sourceLevel);
          float dirLength = length(dirLevel);
          float around = (sourceLength < 1e-4 || dirLength < 1e-4)
            ? 0.0
            : acos(clamp(dot(sourceLevel, dirLevel) / (sourceLength * dirLength), -1.0, 1.0));
          vec2 place = vec2(around / 3.14159265, (altitude + 1.57079633) / 3.14159265);
          vec3 light = texture2D(uMap, place).rgb * uGain * uTint;
          // A little of the veil's own patchiness carried through rather than a hard mask, so the
          // display fades at the edge of a fibre instead of ending on a cut line.
          gl_FragColor = vec4(light * uStrength * (0.25 + 0.75 * ice), 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(IceHaloEffect.RADIUS, 64, 32), this.material)
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /** What to call when a newly traced display is ready to be seen — the scene may well be paused,
   * in which case nothing else would repaint it. */
  set onReady(repaint: () => void) {
    this.onRepaint = repaint
  }

  /**
   * Points the display at a light source and sets how strongly the sky could have shown it.
   *
   * `strength` of zero takes the whole thing down, which is the usual state of the sky: no ice
   * cloud, no display. `alignment` is how steadily the crystals were falling — see HaloSky.begin.
   */
  update(
    source: { x: number; y: number; z: number },
    sourceAltitudeDeg: number,
    strength: number,
    tint: [number, number, number],
    ice: { cover: number; layerHeight: number },
    alignment: number
  ): void {
    const uniforms = this.material.uniforms
    if (strength <= 0) {
      // Zeroed as well as hidden. Leaving the old value in the uniform changes nothing on screen —
      // the mesh is not drawn — but it leaves the effect REPORTING a strength it is not showing,
      // which is how a probe of the live scene ends up believing a display is up when it is not.
      uniforms.uStrength.value = 0
      this.object.visible = false
      this.stopWork()
      return
    }
    uniforms.uSource.value.set(source.x, source.y, source.z).normalize()
    uniforms.uStrength.value = strength
    uniforms.uTint.value.set(tint[0], tint[1], tint[2])
    uniforms.uIceCover.value = ice.cover
    uniforms.uIceHeight.value = ice.layerHeight
    this.object.visible = this.everDisplayed
    this.requestMap(sourceAltitudeDeg, alignment)
  }

  /** Starts tracing a display for that source height and those crystals, unless the one already on
   * screen was traced for near enough the same and would look the same. */
  private requestMap(sourceAltitudeDeg: number, alignment: number): void {
    const stale =
      !(Math.abs(sourceAltitudeDeg - this.mappedAltitudeDeg) < IceHaloEffect.ALTITUDE_STEP_DEG) ||
      alignment !== this.mappedAlignment
    if (!stale || this.tracingFor(sourceAltitudeDeg, alignment)) return
    this.pendingAltitudeDeg = sourceAltitudeDeg
    this.pendingAlignment = alignment
    this.sky.begin(sourceAltitudeDeg, alignment)
    this.tracing = true
    this.nextGlimpse = IceHaloEffect.FIRST_GLIMPSE_RAYS
    this.scheduleWork()
  }

  private pendingAltitudeDeg = Number.NaN
  private pendingAlignment = Number.NaN

  private tracingFor(sourceAltitudeDeg: number, alignment: number): boolean {
    return (
      this.tracing &&
      Math.abs(sourceAltitudeDeg - this.pendingAltitudeDeg) < IceHaloEffect.ALTITUDE_STEP_DEG &&
      alignment === this.pendingAlignment
    )
  }

  /**
   * Traces the display a frame's worth at a time, on its own schedule.
   *
   * Its own, and not the scene's animation loop, because that loop only runs during playback: a
   * reader who has paused to look at the sky is exactly the reader who wants the display, and would
   * otherwise wait for it forever. It stops the moment the display is finished — a background loop
   * with no end has cost this project a release before.
   */
  private scheduleWork(): void {
    if (this.workHandle !== undefined) return
    const step = () => {
      this.workHandle = undefined
      if (!this.tracing) return
      this.sky.trace(IceHaloEffect.RAYS_PER_FRAME)
      const done = this.sky.tracedRays >= IceHaloEffect.RAYS
      const glimpse = this.refining && this.sky.tracedRays >= this.nextGlimpse
      if (glimpse) this.nextGlimpse *= 2
      if (done || glimpse) this.publish()
      if (done) {
        this.tracing = false
        this.refining = false
        this.mappedAltitudeDeg = this.pendingAltitudeDeg
        this.mappedAlignment = this.pendingAlignment
        return
      }
      this.workHandle = requestAnimationFrame(step)
    }
    this.workHandle = requestAnimationFrame(step)
  }

  private stopWork(): void {
    if (this.workHandle !== undefined) cancelAnimationFrame(this.workHandle)
    this.workHandle = undefined
    this.tracing = false
  }

  /** Copies the traced sky onto the texture the shader reads. Half-float rather than byte, because
   * a display spans three orders of magnitude between a sundog and the outer ring, and a byte
   * would band the faint end into steps. */
  private publish(): void {
    const map = this.sky.harvest()
    const data = map.data
    for (let texel = 0, at = 0; at < data.length; texel += 4, at += 3) {
      this.texels[texel] = DataUtils.toHalfFloat(data[at])
      this.texels[texel + 1] = DataUtils.toHalfFloat(data[at + 1])
      this.texels[texel + 2] = DataUtils.toHalfFloat(data[at + 2])
      this.texels[texel + 3] = 1
    }
    this.texture.needsUpdate = true
    this.everDisplayed = true
    this.object.visible = this.material.uniforms.uStrength.value > 0
    this.onRepaint?.()
  }

  dispose(): void {
    this.stopWork()
    this.texture.dispose()
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
