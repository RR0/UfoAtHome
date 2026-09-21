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
import { CIRRUS_COVER_GLSL, CLOUD_NOISE_GLSL, ICE_HALO_LIGHT_GLSL } from "./CloudSystem.js"

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
  static readonly RADIUS = 880

  /**
   * How many rays a finished display is worth.
   *
   * The trade is noise against waiting. A tenth of this already shows every form; the rest is what
   * takes the grain off the faint ones — the big ring, the arcs that need a bounce — which are
   * exactly the forms a reader would otherwise never be sure they were seeing. About half a second
   * of work in all, measured.
   */
  private static readonly RAYS = 900_000
  /** Rays traced between two looks at the clock. */
  private static readonly RAYS_PER_BATCH = 2_000
  /**
   * How much of a frame the tracing may take: a little while the scene is being drawn, so it keeps
   * answering, and most of it while the scene's first frame is held for its sky (see setUrgent),
   * when there is no frame to keep.
   *
   * By time and not by a count of rays. At 4 000 rays a frame the display took two to four seconds,
   * and it was shown half-traced meanwhile — grainy, lopsided, the Sun apparently off-centre in its
   * own ring — which a reader took for a fault that "corrected itself after a second". A display is
   * now shown whole or not at all.
   */
  private static readonly BUDGET_MS = 6
  private static readonly URGENT_BUDGET_MS = 40

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
   * The same for the crystals' alignment, which a weather track may change DURING a recording — a
   * veil whose plates stop falling flat loses its sundogs and arcs and keeps its ring.
   *
   * Compared exactly, as it was, every frame of such a change asked for a new display and threw
   * away the one being traced: the display stayed frozen for as long as the change lasted, at 6 ms
   * of tracing a frame. A twentieth: the crystals' tilt goes as a power of the alignment (see
   * HaloSky.begin), and a step this size changes it by a quarter, below what a display shows.
   */
  private static readonly ALIGNMENT_STEP = 0.05
  /**
   * How far a request may be from the display being traced before that tracing is abandoned rather
   * than finished first: a JUMP — the reader seeking elsewhere in the recording — and not the
   * gradual change of a weather track, which a display half traced will still serve.
   */
  private static readonly LEAP_ALTITUDE_DEG = 5
  private static readonly LEAP_ALIGNMENT = 0.25

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

  /** Keep the halo mask on the same moving cirrus field without retracing crystal optics. */
  setCloudOffset(offset: Vector3): void {
    this.material.uniforms.uFieldOffset.value.copy(offset)
  }

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
  private urgent = false
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
        uFieldOffset: { value: new Vector3() },
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
        ${ICE_HALO_LIGHT_GLSL}
        varying vec3 vDirection;
        uniform float uIceCover;
        uniform float uIceHeight;
        uniform vec3 uFieldOffset;

        void main() {
          vec3 dir = normalize(vDirection);
          // WHERE THERE ARE CRYSTALS, AND NOWHERE ELSE. Every part of a display is the source's own
          // light bent by ice, so it exists only along lines of sight that cross the veil — which is
          // why real displays are so rarely the complete circles a diagram shows. They are arcs,
          // fragments, one sundog and not the other. Sampling the same field the ice deck is drawn
          // from gets all of that for free, and guarantees the gaps fall where the sky has none.
          // It also ends the display at the horizon, which is right: the crystals are eight
          // kilometres up, so a line of sight that goes down never reaches any.
          float ice = cirrusCoverAt(dir, uIceHeight, uIceCover, uFieldOffset);
          if (ice <= 0.0) discard;
          gl_FragColor = vec4(iceHaloLight(dir, ice), 1.0);
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
    const uniforms = this.material.uniforms
    this.deckUniforms = {
      uSource: uniforms.uSource, uUp: uniforms.uUp, uStrength: uniforms.uStrength, uTint: uniforms.uTint,
      uMap: uniforms.uMap, uGain: uniforms.uGain, uHaloShown: { value: 0 }
    }
  }

  /**
   * What an ice deck needs to draw this display itself — the SAME uniform objects this effect
   * writes, so whatever it sets reaches the deck with nothing to copy.
   */
  readonly deckUniforms: Record<string, { value: unknown }>
  private shown = false
  private hostedByDeck = false

  /**
   * Whether the ice deck the display is refracted through draws it (see LayeredCloudSystem.hostHalo)
   * rather than this effect's own sphere.
   *
   * The display is masked by the veil, so drawing it on its own meant working the veil out twice
   * for every pixel of sky — five fbm, as dear as the deck itself: 3 to 9 ms of a frame at 2.7
   * million pixels. The deck already has that veil in hand. The sphere stays for a sky whose ice has
   * no deck to host it.
   */
  set hosted(hosted: boolean) {
    this.hostedByDeck = hosted
    this.show(this.shown)
  }

  private show(visible: boolean): void {
    this.shown = visible
    this.object.visible = visible && !this.hostedByDeck
    this.deckUniforms.uHaloShown.value = visible ? 1 : 0
  }

  /** Whether the first display this effect will ever show is still being traced — what a scene's
   * first frame waits for, rather than showing the sky without the display that belongs in it. */
  get awaitingFirstDisplay(): boolean {
    return this.tracing && !this.everDisplayed
  }

  /** See BUDGET_MS. */
  setUrgent(urgent: boolean): void {
    this.urgent = urgent
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
      this.show(false)
      this.stopWork()
      return
    }
    uniforms.uSource.value.set(source.x, source.y, source.z).normalize()
    uniforms.uStrength.value = strength
    uniforms.uTint.value.set(tint[0], tint[1], tint[2])
    uniforms.uIceCover.value = ice.cover
    uniforms.uIceHeight.value = ice.layerHeight
    this.show(this.everDisplayed)
    this.requestMap(sourceAltitudeDeg, alignment)
  }

  /** Starts tracing a display for that source height and those crystals, unless the one already on
   * screen was traced for near enough the same and would look the same. */
  private requestMap(sourceAltitudeDeg: number, alignment: number): void {
    const stale =
      !(Math.abs(sourceAltitudeDeg - this.mappedAltitudeDeg) < IceHaloEffect.ALTITUDE_STEP_DEG) ||
      !(Math.abs(alignment - this.mappedAlignment) < IceHaloEffect.ALIGNMENT_STEP)
    if (!stale) {
      this.next = undefined
      return
    }
    if (this.tracing) {
      if (this.tracingFor(sourceAltitudeDeg, alignment)) {
        this.next = undefined
        return
      }
      // A gradual change: the display being traced is finished and shown, and this one traced
      // after it — the display follows the change a tracing behind, rather than never.
      const leap =
        !(Math.abs(sourceAltitudeDeg - this.pendingAltitudeDeg) < IceHaloEffect.LEAP_ALTITUDE_DEG) ||
        !(Math.abs(alignment - this.pendingAlignment) < IceHaloEffect.LEAP_ALIGNMENT)
      if (!leap) {
        this.next = { sourceAltitudeDeg, alignment }
        return
      }
    }
    this.next = undefined
    this.pendingAltitudeDeg = sourceAltitudeDeg
    this.pendingAlignment = alignment
    this.sky.begin(sourceAltitudeDeg, alignment)
    this.tracing = true
    this.scheduleWork()
  }

  private pendingAltitudeDeg = Number.NaN
  private pendingAlignment = Number.NaN
  /** What was asked for while another display was being traced — see requestMap. */
  private next?: { sourceAltitudeDeg: number; alignment: number }

  private tracingFor(sourceAltitudeDeg: number, alignment: number): boolean {
    return (
      this.tracing &&
      Math.abs(sourceAltitudeDeg - this.pendingAltitudeDeg) < IceHaloEffect.ALTITUDE_STEP_DEG &&
      Math.abs(alignment - this.pendingAlignment) < IceHaloEffect.ALIGNMENT_STEP
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
      const started = performance.now()
      const budget = this.urgent ? IceHaloEffect.URGENT_BUDGET_MS : IceHaloEffect.BUDGET_MS
      do this.sky.trace(IceHaloEffect.RAYS_PER_BATCH)
      while (this.sky.tracedRays < IceHaloEffect.RAYS && performance.now() - started < budget)
      const done = this.sky.tracedRays >= IceHaloEffect.RAYS
      if (done) {
        this.publish()
        this.tracing = false
        this.mappedAltitudeDeg = this.pendingAltitudeDeg
        this.mappedAlignment = this.pendingAlignment
        const next = this.next
        if (next) this.requestMap(next.sourceAltitudeDeg, next.alignment)
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
    this.next = undefined
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
    this.show(this.material.uniforms.uStrength.value > 0)
    this.onRepaint?.()
  }

  dispose(): void {
    this.stopWork()
    this.texture.dispose()
    this.object.geometry.dispose()
    this.material.dispose()
  }
}
