import {
  HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2,
  Vector3, WebGLRenderTarget, type Camera, type WebGLRenderer
} from "three"
import { LensGhosts, type LensGhost, type LensOptics } from "../engine/instrument/LensGhost.js"
import { EYE_UNIFORMS, FINISH_GLSL, type UnfinishedFrame } from "./colorSpace.js"

/** A ghost found under a point of the picture (see GhostPass.pickAt): which, and where in the picture the light that makes it is. */
export interface GhostHit {
  ghost: LensGhost
  /** Where its light is, in normalised device coordinates. */
  source: { x: number, y: number }
}

/**
 * Lays a lens's ghosts over the picture it took (see LensGhost), then finishes it onto the canvas.
 *
 * A ghost is the whole picture again, scaled about its centre (mirrored when the scale is negative), out of focus and much fainter: every
 * light makes its own, wherever it is and whatever it is — a traffic light, a streetlamp, a headlight, a lantern, the Moon. So it is drawn
 * from the picture itself, as light, rather than from a list of the scene's lights: nothing that shines can be forgotten, and a light that
 * is dimmed by the air or half hidden by a tree has a ghost dimmed or halved with it.
 *
 * The picture's light is copied, at half its size, into a chain of mipmaps whose every level is the average of the one below: reading a level
 * is reading the picture blurred by its size, with its light kept. The ghosts are gathered from it into a layer of their own at that same half
 * size — each a disc (or the polygon of the aperture's blades) of taps round where its light came from, its flux spread over the square of
 * its scale — and the finish adds that layer to the picture, whose own light loses what the glass scattered away. Only light is added, in the
 * picture's linear light and before the medium answers it (see FINISH_GLSL): the ghost of a light that saturated the sensor can itself be
 * plainly visible.
 */
export class GhostPass {
  /** The most ghosts a lens is drawn with: its own, what it was taken through, and what is on the glass. */
  static readonly MAX_GHOSTS = 12
  /** Taps of a ghost of the glass: enough for the polygon of the blades to show. */
  private static readonly TAPS = 12
  /** What a ghost has to show on the screen to be pointed at, in the medium's response (0 black, 1 white): faint, but seen. */
  private static readonly VISIBLE_RESPONSE = 0.03

  /** Where a single picture is drawn before its ghosts are laid over it: its light and its overlays, unfinished. */
  readonly frame: UnfinishedFrame
  /** The picture's light, with its mipmaps: what the ghosts are read from. At half the picture's size: the sharpest ghost is several pixels
   * wide, and copying and averaging the full picture cost a millisecond of the GPU's every frame. */
  private readonly mips: WebGLRenderTarget
  /** The ghosts alone, at that same half size. */
  private readonly ghostLayer: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly quad: Mesh
  private readonly copyMaterial: ShaderMaterial
  private readonly ghostMaterial: ShaderMaterial
  private readonly developMaterial: ShaderMaterial

  constructor(width: number, height: number) {
    const size = (w: number, h: number) => [Math.max(1, w), Math.max(1, h)] as const
    // The single picture keeps the antialiasing the canvas would have given its edges (see FinishPass.SAMPLES).
    this.frame = {
      scene: new WebGLRenderTarget(...size(width, height), { type: HalfFloatType, samples: 4 }),
      overlay: new WebGLRenderTarget(...size(width, height), { type: HalfFloatType, samples: 4 }),
      single: true
    }
    const half = size(Math.ceil(width / 2), Math.ceil(height / 2))
    this.mips = new WebGLRenderTarget(...half, { type: HalfFloatType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter })
    this.ghostLayer = new WebGLRenderTarget(...half, { type: HalfFloatType })
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `
    this.copyMaterial = new ShaderMaterial({
      uniforms: { uSource: { value: null }, uGain: { value: 1 } },
      vertexShader,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uSource;
        uniform float uGain;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(texture2D(uSource, vUv).rgb * uGain, 1.0);
        }
      `,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })
    const n = GhostPass.MAX_GHOSTS
    this.ghostMaterial = new ShaderMaterial({
      uniforms: {
        uMips: { value: this.mips.texture },
        uSize: { value: new Vector2(1, 1) },
        uCount: { value: 0 },
        uScale: { value: new Array<number>(n).fill(1) },
        uShare: { value: new Array<number>(n).fill(0) },
        uBlur: { value: new Array<number>(n).fill(0) },
        uKind: { value: new Array<number>(n).fill(0) },
        uOffset: { value: Array.from({ length: n }, () => new Vector2()) },
        uTint: { value: Array.from({ length: n }, () => new Vector3(1, 1, 1)) },
        uBlades: { value: 0 },
        uBladeAngle: { value: 0 },
        uDrops: { value: 0 },
        uImpactRate: { value: 0 },
        uRunning: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader,
      fragmentShader: `
        precision highp float;
        uniform sampler2D uMips;
        uniform vec2 uSize;
        uniform int uCount;
        uniform float uScale[${n}];
        uniform float uShare[${n}];
        uniform float uBlur[${n}];
        // 0 an image the glass reflects, shaped as the aperture; 1 a halo scattered round the light; 2 the same, through drops only.
        uniform float uKind[${n}];
        uniform vec2 uOffset[${n}];
        uniform vec3 uTint[${n}];
        uniform float uBlades;
        uniform float uBladeAngle;
        uniform float uDrops;
        uniform float uImpactRate;
        uniform float uRunning;
        uniform float uTime;
        varying vec2 vUv;

        // The picture blurred to a disc of this radius, pixels, round this point: the level whose texels are as large as the disc, read at
        // its middle and at four points of its rim, so that a halo is round rather than the square of a texel.
        vec3 blurred(vec2 at, float radiusPx) {
          float lod = log2(max(1.0, radiusPx * 1.77));
          vec2 rim = 0.5 * radiusPx / uSize;
          return 0.4 * textureLod(uMips, at, lod).rgb
            + 0.15 * (textureLod(uMips, at + vec2(rim.x, 0.0), lod).rgb + textureLod(uMips, at - vec2(rim.x, 0.0), lod).rgb
                    + textureLod(uMips, at + vec2(0.0, rim.y), lod).rgb + textureLod(uMips, at - vec2(0.0, rim.y), lod).rgb);
        }

        // The picture seen through the aperture's out-of-focus image, of this radius: taps spread evenly over a disc, pulled in to the
        // polygon of the blades when there are any, each read at the level that fills the gap between them. Turned half a turn for a
        // ghost on the other side of the centre, whose image is upside down.
        vec3 shaped(vec2 at, float radiusPx, float turn) {
          float lod = log2(max(1.0, radiusPx * 0.5));
          vec3 sum = vec3(0.0);
          for (int j = 0; j < ${GhostPass.TAPS}; j++) {
            float r = sqrt((float(j) + 0.5) / ${GhostPass.TAPS}.0);
            float theta = float(j) * 2.39996323 + turn;
            if (uBlades >= 3.0) {
              float sector = 6.28318531 / uBlades;
              r *= cos(sector * 0.5) / cos(mod(theta - uBladeAngle, sector) - sector * 0.5);
            }
            vec2 tap = vec2(cos(theta), sin(theta)) * r * radiusPx / uSize;
            sum += textureLod(uMips, at + tap, lod).rgb;
          }
          return sum / ${GhostPass.TAPS}.0;
        }

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // A drop that landed in one cell of a grid of the glass, size cells to the picture's height: the latest of those the rain threw
        // there, for as long as it stays before running off or drying (${LensGhosts.DROP_LIFE_S} s, or until the next lands), or, the drops
        // being stated rather than falling, one that is there or not for good. Its coverage, and its offset from its centre (in the picture's
        // own coordinates), which is what it refracts by.
        vec3 landed(vec2 q, float size, float layer, float aspect) {
          vec2 cellular = q * size;
          vec2 cell = floor(cellular);
          vec2 seed = cell + layer * 17.3;
          if (uImpactRate > 0.0) {
            float cycles = uTime * uImpactRate + hash(seed);
            float n = floor(cycles);
            float age = (cycles - n) / uImpactRate;
            if (age > min(${LensGhosts.DROP_LIFE_S}.0, 0.9 / uImpactRate)) return vec3(0.0);
            seed += n * 7.13;
          } else if (hash(seed) > 0.2 + 0.6 * uDrops) {
            return vec3(0.0);
          }
          vec2 centre = cell + 0.5 + (vec2(hash(seed + 1.3), hash(seed + 2.7)) - 0.5) * 0.5;
          float radius = 0.2 + 0.25 * hash(seed + 4.1);
          float cover = smoothstep(radius, radius * 0.5, distance(cellular, centre));
          return vec3(cover, (cellular - centre) / size / vec2(aspect, 1.0));
        }

        // The drops on the glass at this point of the picture: those running down it in streams, each leaving a trail of beads and the
        // glass wiped of the drops it ran into, and those that landed and stay. Their coverage and offset, as landed's.
        vec3 drops(vec2 uv) {
          float aspect = uSize.x / uSize.y;
          vec2 q = vec2(uv.x * aspect, uv.y);
          vec3 best = vec3(0.0);
          float wiped = 0.0;
          if (uRunning > 0.0 && uDrops > 0.0) {
            float width = 0.09;
            float column = floor(q.x / width);
            float h = hash(vec2(column, 3.1));
            if (h < uDrops * uRunning) {
              float speed = (0.04 + 0.1 * hash(vec2(column, 5.7))) * uRunning;
              float head = 1.15 - fract(uTime * speed + h * 13.0) * 1.3;
              float x = (column + 0.5) * width + 0.02 * sin(head * 23.0 + h * 6.28);
              float r = 0.012 + 0.008 * h;
              vec2 c = vec2(x, head);
              float cover = smoothstep(r, r * 0.4, distance(q, c));
              if (cover > best.x) best = vec3(cover, (q - c) / vec2(aspect, 1.0));
              float above = q.y - head;
              if (above > 0.0 && above < 0.3) {
                float fade = 1.0 - above / 0.3;
                float xt = (column + 0.5) * width + 0.02 * sin(q.y * 23.0 + h * 6.28);
                wiped = smoothstep(0.02, 0.01, abs(q.x - xt)) * fade;
                float slot = floor(q.y * 45.0 + h);
                vec2 bead = vec2(xt, (slot + 0.5 - h) / 45.0);
                float rb = 0.004 * fade * step(0.4, hash(vec2(column, slot)));
                float beadCover = rb > 0.0 ? smoothstep(rb, rb * 0.4, distance(q, bead)) : 0.0;
                if (beadCover > best.x) best = vec3(beadCover, (q - bead) / vec2(aspect, 1.0));
              }
            }
          }
          // Two grids, so that a drop landing does not have to wait for the one before it to go.
          vec3 first = landed(q, 14.0, 0.0, aspect), second = landed(q + 0.031, 9.0, 1.0, aspect);
          vec3 still = first.x > second.x ? first : second;
          still.x *= 1.0 - wiped;
          return still.x > best.x ? still : best;
        }

        void main() {
          vec3 sum = vec3(0.0);
          vec3 drop = uDrops > 0.0 ? drops(vUv) : vec3(0.0);
          // What a drop shows of the scene: what is on the other side of it, upside down and out of focus, instead of what is behind it
          // (the finish takes the scene away where the alpha says a drop covers it).
          if (drop.x > 0.0) sum += drop.x * textureLod(uMips, vUv - drop.yz * 4.0, 2.0).rgb;
          for (int i = 0; i < ${n}; i++) {
            if (i >= uCount) break;
            float k = uScale[i];
            // Where in the picture the light that lands here as this ghost came from.
            vec2 from = 0.5 + (vUv - 0.5 - uOffset[i]) / k;
            if (any(lessThan(from, vec2(0.0))) || any(greaterThan(from, vec2(1.0)))) continue;
            // Light from near the edge of the field reaches the surfaces that make the ghost only in part, the lens's barrel cutting it off
            // gradually: the ghost of a bright foreground fades out where its source leaves the picture, rather than ending in a hard
            // rectangle of the picture's own edges.
            vec2 edge = min(from, 1.0 - from);
            float vignette = smoothstep(0.0, 0.15, edge.x) * smoothstep(0.0, 0.15, edge.y);
            // Its defocus, in the picture's pixels, read where the light came from: the ghost is that picture scaled by k.
            float radiusPx = uBlur[i] * uSize.y / abs(k);
            vec3 light = uKind[i] < 0.5 ? shaped(from, radiusPx, k < 0.0 ? 3.14159265 : 0.0) : blurred(from, radiusPx);
            // A drop's halo is where the drops are, and as much brighter there as they leave the rest of the glass clear.
            float through = uKind[i] > 1.5 ? drop.x / 0.3 : 1.0;
            sum += vignette * through * uTint[i] * uShare[i] * light / (k * k);
          }
          gl_FragColor = vec4(sum, drop.x);
        }
      `,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })
    this.developMaterial = new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS,
        uSource: { value: null },
        uOverlay: { value: null },
        uGhosts: { value: this.ghostLayer.texture },
        uGain: { value: 1 },
        uKept: { value: 1 }
      },
      vertexShader,
      fragmentShader: `
        precision highp float;
        ${FINISH_GLSL}
        uniform sampler2D uSource;
        uniform sampler2D uOverlay;
        uniform sampler2D uGhosts;
        uniform float uGain;
        uniform float uKept;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(uSource, vUv) * uGain;
          // What the glass scattered into halos is no longer in each light's own image, nor is what a drop covers.
          vec4 ghosts = texture2D(uGhosts, vUv);
          vec3 scene = texel.rgb * uKept * (1.0 - ghosts.a) + ghosts.rgb;
          // A picture with nothing laid over it may not even have cleared its overlay (see EYE_UNIFORMS).
          gl_FragColor = vec4(finish(scene, texture2D(uOverlay, vUv) * uGain * uHasOverlay, lampOf(texel.a)), 1.0);
        }
      `,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    })
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.copyMaterial)
    this.quadScene.add(this.quad)
  }

  /**
   * Finishes `source` onto the canvas with the lens's ghosts laid over its light. `gain` is what its light is multiplied by first (see
   * ExposureAccumulation.develop).
   */
  develop(renderer: WebGLRenderer, source: UnfinishedFrame, optics: LensOptics, gain = 1): void {
    const previous = renderer.getRenderTarget()
    this.copyMaterial.uniforms.uSource.value = source.scene.texture
    this.copyMaterial.uniforms.uGain.value = gain
    this.draw(renderer, this.copyMaterial, this.mips)
    const uniforms = this.ghostMaterial.uniforms
    ;(uniforms.uSize.value as Vector2).set(this.mips.width, this.mips.height)
    const count = Math.min(optics.ghosts.length, GhostPass.MAX_GHOSTS)
    uniforms.uCount.value = count
    for (let i = 0; i < count; i++) {
      const ghost = optics.ghosts[i]
      ;(uniforms.uScale.value as number[])[i] = ghost.scale || 1
      ;(uniforms.uShare.value as number[])[i] = ghost.share
      ;(uniforms.uBlur.value as number[])[i] = ghost.blur
      ;(uniforms.uKind.value as number[])[i] = ghost.cause === "drops" ? 2 : LensGhosts.scatters(ghost) ? 1 : 0
      ;(uniforms.uOffset.value as Vector2[])[i].set(ghost.offset?.[0] ?? 0, ghost.offset?.[1] ?? 0)
      ;(uniforms.uTint.value as Vector3[])[i].set(...(ghost.tint ?? [1, 1, 1]))
    }
    uniforms.uBlades.value = optics.blades
    uniforms.uBladeAngle.value = optics.bladeAngleRad
    uniforms.uDrops.value = optics.drops
    uniforms.uImpactRate.value = optics.impactRate
    uniforms.uRunning.value = optics.running
    uniforms.uTime.value = optics.timeS
    this.draw(renderer, this.ghostMaterial, this.ghostLayer)
    const develop = this.developMaterial.uniforms
    develop.uSource.value = source.scene.texture
    develop.uOverlay.value = source.overlay.texture
    develop.uGain.value = gain
    develop.uKept.value = 1 - optics.scattered
    this.draw(renderer, this.developMaterial, previous)
  }

  /**
   * The ghost under a point of the picture, in normalised device coordinates, that shows on the screen there and stands out from what is
   * under it — the brightest of them — and where the light that makes it is; none when nothing but the scene is there. Read back from the
   * last picture developed, as the drawing computed it, round where each ghost's light comes from: a few thousand texels, on a hover only.
   *
   * `exposure` is what the medium multiplies the picture's light by (see EYE_UNIFORMS.uMediumExposure).
   */
  pickAt(renderer: WebGLRenderer, ndcX: number, ndcY: number, optics: LensOptics, exposure: number): GhostHit | undefined {
    const width = this.mips.width, height = this.mips.height
    const at = (x: number, y: number) => ({ x: Math.round((x + 1) / 2 * width), y: Math.round((y + 1) / 2 * height) })
    const here = at(ndcX, ndcY)
    const under = this.window(renderer, here.x, here.y, 0)
    if (!under) return undefined
    let best: { score: number, hit: GhostHit } | undefined
    for (const ghost of optics.ghosts) {
      const source = LensGhosts.sourceOf(ghost, { x: ndcX, y: ndcY })
      if (Math.abs(source.x) >= 1 || Math.abs(source.y) >= 1) continue
      const edgeX = Math.min(1 + source.x, 1 - source.x) / 2, edgeY = Math.min(1 + source.y, 1 - source.y) / 2
      const vignette = GhostPass.smoothstep(0, 0.15, edgeX) * GhostPass.smoothstep(0, 0.15, edgeY)
      const radius = Math.max(2, Math.round(ghost.blur * height / Math.abs(ghost.scale)))
      const centre = at(source.x, source.y)
      const window = this.window(renderer, centre.x, centre.y, radius)
      if (!window) continue
      const ghostLight = vignette * ghost.share * window.mean / (ghost.scale * ghost.scale)
      const response = 0.18 * ghostLight * exposure
      // Seen on the screen, and a good part of what is there: not the light itself, nor a ghost lost in a lit sky.
      if (response < GhostPass.VISIBLE_RESPONSE || ghostLight < 0.3 * under.mean) continue
      if (!best || response > best.score) {
        best = { score: response, hit: { ghost, source: { x: window.brightest.x / width * 2 - 1, y: window.brightest.y / height * 2 - 1 } } }
      }
    }
    return best?.hit
  }

  /** The mean luminance of the half-size picture over a square round a texel, and its brightest texel; undefined outside it. */
  private window(renderer: WebGLRenderer, x: number, y: number, radius: number): { mean: number, brightest: { x: number, y: number } } | undefined {
    // A wide ghost is read every few texels: its mean is all that is wanted of it.
    const step = Math.max(1, Math.ceil(radius / 24))
    const from = { x: Math.max(0, x - radius), y: Math.max(0, y - radius) }
    const to = { x: Math.min(this.mips.width - 1, x + radius), y: Math.min(this.mips.height - 1, y + radius) }
    if (from.x > to.x || from.y > to.y) return undefined
    const w = to.x - from.x + 1
    const row = new Uint16Array(w * 4)
    let sum = 0, count = 0, peak = -1
    let brightest = { x, y }
    for (let j = from.y; j <= to.y; j += step) {
      renderer.readRenderTargetPixels(this.mips, from.x, j, w, 1, row)
      for (let i = 0; i < w; i += step) {
        const luminance = 0.2126 * GhostPass.half(row[i * 4]) + 0.7152 * GhostPass.half(row[i * 4 + 1]) + 0.0722 * GhostPass.half(row[i * 4 + 2])
        sum += luminance
        count++
        if (luminance > peak) {
          peak = luminance
          brightest = { x: from.x + i, y: j }
        }
      }
    }
    return { mean: count > 0 ? sum / count : 0, brightest }
  }

  private draw(renderer: WebGLRenderer, material: ShaderMaterial, target: WebGLRenderTarget | null): void {
    this.quad.material = material
    renderer.setRenderTarget(target)
    renderer.render(this.quadScene, this.quadCamera as Camera)
  }

  /** A half-float, as the GPU stores it, as a number. */
  private static half(bits: number): number {
    const exponent = (bits >> 10) & 31, fraction = bits & 1023, sign = bits & 0x8000 ? -1 : 1
    if (exponent === 0) return sign * fraction * 2 ** -24
    if (exponent === 31) return 0
    return sign * (1 + fraction / 1024) * 2 ** (exponent - 15)
  }

  private static smoothstep(from: number, to: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - from) / (to - from)))
    return t * t * (3 - 2 * t)
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width), h = Math.max(1, height)
    this.frame.scene.setSize(w, h)
    this.frame.overlay.setSize(w, h)
    this.mips.setSize(Math.ceil(w / 2), Math.ceil(h / 2))
    this.ghostLayer.setSize(Math.ceil(w / 2), Math.ceil(h / 2))
  }

  dispose(): void {
    this.frame.scene.dispose()
    this.frame.overlay.dispose()
    this.mips.dispose()
    this.ghostLayer.dispose()
    this.copyMaterial.dispose()
    this.ghostMaterial.dispose()
    this.developMaterial.dispose()
    this.quad.geometry.dispose()
    this.quadScene.clear()
  }
}
