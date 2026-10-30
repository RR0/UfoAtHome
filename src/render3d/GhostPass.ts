import {
  HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2,
  Vector3, WebGLRenderTarget, type Camera, type WebGLRenderer
} from "three"
import { GlassWetting, LensGhosts, type LensGhost, type LensOptics } from "../engine/instrument/LensGhost.js"
import { EYE_UNIFORMS, FINISH_GLSL, type UnfinishedFrame } from "./colorSpace.js"

/**
 * A light brighter than the picture can hold: a half float holds 65 504, and a pixel is given at most a little less (the Sun's disc is
 * more than twice that). Its ghosts are made from the picture's light like every other's, and so would carry only what was drawn of it:
 * the light it has beyond that is handed to them here, as the same ghosts (same scales, shares, defocus and fade), and nothing else —
 * what the picture's storage cut, given back. Where it is, in normalised device coordinates, how wide its disc is, as a share of the
 * picture's height, and that light beyond, per channel, times its disc's area in that same unit squared.
 */
export interface BrightSource {
  x: number
  y: number
  radius: number
  flux: [number, number, number]
}

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

  /**
   * Whether a picture has been developed since its storage was last made (see resize): what a pick reads back. While a scene plays, the
   * picture's resolution follows what the device can draw (see AdaptiveResolution), and in the moment between a resize and the next picture
   * a pick read an empty picture and found no ghost, which put out the one the pointer was naming.
   */
  readable = false

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
        uImpacts: { value: 0 },
        uHistory: { value: new Array<number>(GlassWetting.HISTORY_S).fill(0) },
        uStill: { value: 0 },
        uRunning: { value: 0 },
        uBright: { value: new Vector2() },
        uBrightRadius: { value: 0 },
        uBrightFlux: { value: new Vector3() }
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
        uniform float uImpacts;
        uniform float uHistory[${GlassWetting.HISTORY_S}];
        uniform float uStill;
        uniform float uRunning;
        uniform vec2 uBright;
        uniform float uBrightRadius;
        uniform vec3 uBrightFlux;
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

        // The drops on the glass, as the rain leaves them: drops landing at the rate the rain meets the glass, each the latest of a cell of a
        // grid the size of a large drop (and the one before it, still living out its life). A small one clings for minutes, then dries,
        // shrinking. A large one clings for a few seconds, then runs down, faster and faster, a tear with its tail up, wandering a little, leaving a trail of
        // beads and wiping the fine droplets it crosses. Drops near each other merge: each is a field falling off with the distance from its
        // centre, the fields of neighbours add up, and the glass is wet where their sum passes one, so that two drops touching are one drop of
        // their joint outline rather than two discs overlapping. Under them, a mist of fine droplets that only accumulates, and that the
        // running drops wipe. Stated rather than falling (no impact rate), the drops are there for good, and still.

        // The field of a drop of this radius at this distance from its centre: highest at its centre, falling smoothly to nothing at two and
        // a half radii, and 0.7 at its own edge, which is where the fields of a drop alone pass the threshold. Two drops nearer than that add
        // up and the glass between them is wet too: they merge into one outline, as drops on a glass do.
        float kernel(float distance, float radius) {
          float x = distance / (2.5 * radius);
          return x < 1.0 ? (1.0 - x * x) * (1.0 - x * x) : 0.0;
        }

        // The field one drop throws at a point of the glass, in cells, and its pull on what the drop refracts; wiped grows where its trail
        // passes. age is the seconds since it landed.
        float field(vec2 cellular, vec2 cell, vec2 seed, float age, inout vec2 pull, inout float wiped) {
          float h1 = hash(seed + 1.3), h2 = hash(seed + 2.7), h3 = hash(seed + 4.1), h4 = hash(seed + 5.9), h5 = hash(seed + 8.3);
          // Many small drops, few large ones.
          float radius = 0.08 + 0.3 * h3 * h3 * h3;
          vec2 centre = cell + 0.5 + (vec2(h1, h2) - 0.5) * 0.7;
          // A drop that does not run stays minutes on a glass before it dries.
          float life = 60.0 + 120.0 * h4;
          bool still = uStill > 0.5;
          bool runs = !still && uRunning > 0.0 && radius > 0.2;
          float stick = 2.0 + 10.0 * h5;
          float slid = 0.0;
          if (runs && age > stick) {
            float s = age - stick;
            slid = uRunning * (0.25 * s * s + 0.3 * s);
            if (slid > 8.0) return 0.0;
            centre.y -= slid;
            centre.x += 0.18 * sin(slid * 1.9 + h1 * 6.28);
            radius *= 0.8 * (1.0 - smoothstep(7.0, 8.0, slid)) + 0.0001;
          } else if (!still) {
            if (age > life) return 0.0;
            // Drying: it shrinks over the last part of its life.
            radius *= 1.0 - smoothstep(life * 0.5, life, age);
          }
          vec2 d = cellular - centre;
          // Out of reach of this point, as most drops of the cells looked at are: nothing to work out. A running drop reaches up its trail.
          if (abs(d.x) > radius * 2.5 || d.y < -radius * 2.5 || d.y > radius * 2.5 + slid) return 0.0;
          // A running drop is a tear: its tail drawn up behind it, its front round. One that clings sags a little under its weight, wider
          // below than above. Round or oval otherwise, but for a slight unevenness: the shapes of a wet glass come from drops merging.
          if (slid > 0.0) d.y *= d.y > 0.0 ? 0.5 : 1.15;
          else if (d.y < 0.0) d.y *= 0.88;
          float angle = atan(d.y, d.x);
          float outline = 1.0 + 0.04 * sin(3.0 * angle + h4 * 6.28) + 0.02 * sin(5.0 * angle + h5 * 6.28);
          float f = kernel(length(d) / outline, radius);
          pull += f * d;
          // Its trail: the strip it ran down, wiped, and beads left along it.
          if (slid > 0.0 && cellular.y > centre.y && cellular.y < centre.y + slid) {
            float along = cellular.y - centre.y;
            float x = cell.x + 0.5 + (h1 - 0.5) * 0.7 + 0.18 * sin((slid - along) * 1.9 + h1 * 6.28);
            float fade = 1.0 - along / max(slid, 1e-3) * 0.6;
            wiped = max(wiped, smoothstep(radius * 0.9, radius * 0.4, abs(cellular.x - x)) * fade);
            float slot = floor(along * 3.0);
            vec2 bead = vec2(x, centre.y + (slot + 0.5) / 3.0);
            float rb = 0.05 * fade * step(0.45, hash(seed + slot * 3.7));
            float fb = rb > 0.0 ? kernel(distance(cellular, bead), rb) : 0.0;
            f += fb;
            pull += fb * (cellular - bead);
          }
          return f;
        }

        // How long ago the count of drops landed reached this value, s (see GlassWetting): found in the counts of the seconds before, by
        // halves; 1000 when it was reached before all of them.
        float ageAt(float count) {
          if (count > uImpacts) return -1.0;
          if (count > uHistory[0]) return (uImpacts - count) / max(uImpacts - uHistory[0], 1e-6);
          if (count <= uHistory[${GlassWetting.HISTORY_S - 1}]) return 1e3;
          int low = 0, high = ${GlassWetting.HISTORY_S - 1};
          for (int i = 0; i < 5; i++) {
            int middle = (low + high) / 2;
            if (uHistory[middle] >= count) low = middle; else high = middle;
          }
          float later = uHistory[low], earlier = uHistory[high];
          return float(low + 1) + (later - count) / max(later - earlier, 1e-6) * float(high - low);
        }

        // The drops of one cell (the latest to land there, and the one before it), as their summed field.
        float cellField(vec2 cellular, vec2 cell, inout vec2 pull, inout float wiped) {
          if (uStill > 0.5) {
            if (hash(cell) > 0.2 + 0.6 * uDrops) return 0.0;
            return field(cellular, cell, cell, 0.0, pull, wiped);
          }
          // The n-th drop of this cell landed when the count passed n, less the cell's own phase.
          float phase = hash(cell);
          float n = floor(uImpacts + phase);
          float total = 0.0;
          for (int back = 0; back < 2; back++) {
            float m = n - float(back);
            if (m < 1.0) break;
            float age = ageAt(m - phase);
            // Landed before the counts kept: long enough ago for any drop that runs to have run off, not for one that clings to have dried.
            if (age >= 0.0) total += field(cellular, cell, cell + m * 7.13, min(age, 30.0), pull, wiped);
          }
          return total;
        }

        // The wet glass at this point of the picture: how much a drop covers it, and the offset (in the picture's own coordinates) by which
        // the drop there refracts.
        vec4 drops(vec2 uv) {
          float aspect = uSize.x / uSize.y;
          vec2 q = vec2(uv.x * aspect, uv.y);
          float size = 18.0;
          vec2 cellular = q * size;
          vec2 cell = floor(cellular);
          vec2 pull = vec2(0.0);
          float wiped = 0.0;
          float total = 0.0;
          // Its own cell and those beside it, whose drops it may merge with, and those above, whose drops may have run down to here.
          total += cellField(cellular, cell + vec2(-1.0, 0.0), pull, wiped);
          total += cellField(cellular, cell + vec2(1.0, 0.0), pull, wiped);
          for (int k = 0; k <= 8; k++) total += cellField(cellular, cell + vec2(0.0, float(k)), pull, wiped);
          float cover = smoothstep(0.64, 0.76, total);
          // Darker at its rim, where the glass of water is steepest and turns the light it gets away from the lens: what outlines a drop.
          float shade = 0.3 + 0.7 * smoothstep(0.7, 1.05, total);
          // The fine droplets: a dense grid, each there once it has landed (in a few seconds of rain), wiped where a drop ran.
          vec2 fineCell = floor(q * 90.0);
          // Each fine droplet there once the count has passed its own share: they only add up, dry rain or not.
          bool landedFine = uStill > 0.5 ? hash(fineCell + 3.3) < 0.15 + 0.5 * uDrops : hash(fineCell + 9.1) < min(0.45, uImpacts * 0.03);
          if (landedFine) {
            vec2 centre = fineCell + 0.5 + (vec2(hash(fineCell + 5.1), hash(fineCell + 6.2)) - 0.5) * 0.6;
            float away = distance(q * 90.0, centre);
            float fine = smoothstep(0.35, 0.25, away) * (1.0 - wiped);
            if (fine > cover) return vec4(fine * 0.6, (q * 90.0 - centre) / 90.0 / vec2(aspect, 1.0), 0.4 + 0.6 * smoothstep(0.35, 0.1, away));
          }
          return vec4(cover, pull / max(total, 1e-3) / size / vec2(aspect, 1.0), shade);
        }

        // How much of a ghost shows for light at a point of the picture: none outside it, and fading in over its fade (a share of the
        // picture's height) from its edges.
        float GhostPass_edgeFade(vec2 at, float fade, vec2 size) {
          vec2 edge = min(at, 1.0 - at) * vec2(size.x / size.y, 1.0);
          if (edge.x <= 0.0 || edge.y <= 0.0) return 0.0;
          return smoothstep(0.0, fade, edge.x) * smoothstep(0.0, fade, edge.y);
        }

        void main() {
          vec3 sum = vec3(0.0);
          vec4 drop = uDrops > 0.0 || uImpacts > 0.0 ? drops(vUv) : vec4(0.0);
          // What a drop shows of the scene: what is on the other side of it, upside down and out of focus, instead of what is behind it
          // (the finish takes the scene away where the alpha says a drop covers it).
          if (drop.x > 0.0) sum += drop.x * drop.w * textureLod(uMips, vUv - drop.yz * 4.0, 2.0).rgb;
          for (int i = 0; i < ${n}; i++) {
            if (i >= uCount) break;
            float k = uScale[i];
            // The light of a source the picture could not hold (see BrightSource), added as the same ghost: its disc scaled by k and
            // spread by the defocus, its light conserved over it.
            if (uKind[i] < 1.5 && uBrightFlux.g > 0.0) {
              vec2 centre = 0.5 + uOffset[i] + k * (uBright - 0.5);
              vec2 away = (vUv - centre) * vec2(uSize.x / uSize.y, 1.0);
              float radius = max(uBlur[i] + abs(k) * uBrightRadius, 1.5 / uSize.y);
              // Faded at the picture's edge as every light's ghosts are (see below).
              float brightFade = max(2.0 * uBlur[i] * uSize.y / abs(k), 2.0) / uSize.y;
              float inside = smoothstep(radius, 0.8 * radius, length(away));
              sum += GhostPass_edgeFade(uBright, brightFade, uSize) * uTint[i] * uShare[i] * uBrightFlux * inside
                / (3.14159265 * 0.81 * radius * radius);
            }
            // Where in the picture the light that lands here as this ghost came from.
            vec2 from = 0.5 + (vUv - 0.5 - uOffset[i]) / k;
            if (any(lessThan(from, vec2(0.0))) || any(greaterThan(from, vec2(1.0)))) continue;
            // Its defocus, in the picture's pixels, read where the light came from: the ghost is that picture scaled by k.
            float radiusPx = uBlur[i] * uSize.y / abs(k);
            // The picture ends where the field does not: light just outside it throws ghosts too, which this picture cannot know. Its
            // ghosts fade out over their own defocus where their source reaches the edge, as the light beyond would have carried them on,
            // rather than ending in a hard rectangle of the picture's own edges (a lit road cut by the frame). The same for every light.
            float fade = max(2.0 * radiusPx, 2.0) / uSize.y;
            float vignette = GhostPass_edgeFade(from, fade, uSize);
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
  develop(renderer: WebGLRenderer, source: UnfinishedFrame, optics: LensOptics, gain = 1, bright?: BrightSource): void {
    const previous = renderer.getRenderTarget()
    this.readable = true
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
    uniforms.uImpacts.value = optics.impacts
    const history = uniforms.uHistory.value as number[]
    for (let j = 0; j < history.length; j++) history[j] = optics.history[j] ?? 0
    uniforms.uStill.value = optics.still ? 1 : 0
    uniforms.uRunning.value = optics.running
    ;(uniforms.uBright.value as Vector2).set(((bright?.x ?? 0) + 1) / 2, ((bright?.y ?? 0) + 1) / 2)
    uniforms.uBrightRadius.value = bright?.radius ?? 0
    const flux = bright?.flux ?? [0, 0, 0]
    ;(uniforms.uBrightFlux.value as Vector3).set(flux[0] * gain, flux[1] * gain, flux[2] * gain)
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
      const radius = Math.max(2, Math.round(ghost.blur * height / Math.abs(ghost.scale)))
      // As the drawing fades it (see GhostPass_edgeFade): over its own defocus from the picture's edges, in heights.
      const edgeX = Math.min(1 + source.x, 1 - source.x) / 2 * width / height, edgeY = Math.min(1 + source.y, 1 - source.y) / 2
      const fade = Math.max(2 * ghost.blur * height / Math.abs(ghost.scale), 2) / height
      const vignette = GhostPass.smoothstep(0, fade, edgeX) * GhostPass.smoothstep(0, fade, edgeY)
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

  /**
   * Whether the picture a pick reads back holds a picture at all round a point, in normalised device coordinates: anything but black. A
   * night sky is never black to the last bit; a picture not developed yet is. While a pose plays it is made again at every frame, and read
   * between two of those it was black, and every ghost under the pointer was taken to have gone.
   */
  holdsPictureAt(renderer: WebGLRenderer, ndcX: number, ndcY: number): boolean {
    if (!this.readable) return false
    const window = this.window(renderer, Math.round((ndcX + 1) / 2 * this.mips.width), Math.round((ndcY + 1) / 2 * this.mips.height), 4)
    return window !== undefined && window.mean > 0
  }

  /**
   * How much of the glass a drop covers at a point of the picture, in normalised device coordinates, 0 to 1: read back from the last picture
   * developed, where the layer of the ghosts keeps it (see develop). On a hover only.
   */
  dropAt(renderer: WebGLRenderer, ndcX: number, ndcY: number): number {
    const x = Math.round((ndcX + 1) / 2 * this.ghostLayer.width), y = Math.round((ndcY + 1) / 2 * this.ghostLayer.height)
    if (x < 0 || y < 0 || x >= this.ghostLayer.width || y >= this.ghostLayer.height) return 0
    const texel = new Uint16Array(4)
    renderer.readRenderTargetPixels(this.ghostLayer, x, y, 1, 1, texel)
    return GhostPass.half(texel[3])
  }

  /** The mean luminance of the half-size picture over a square round a texel, and its brightest texel; undefined outside it. */
  private window(renderer: WebGLRenderer, x: number, y: number, radius: number): { mean: number, brightest: { x: number, y: number } } | undefined {
    // A wide ghost is read every few texels: its mean is all that is wanted of it.
    const step = Math.max(1, Math.ceil(radius / 24))
    const from = { x: Math.max(0, x - radius), y: Math.max(0, y - radius) }
    const to = { x: Math.min(this.mips.width - 1, x + radius), y: Math.min(this.mips.height - 1, y + radius) }
    if (from.x > to.x || from.y > to.y) return undefined
    const w = to.x - from.x + 1, h = to.y - from.y + 1
    // In one read: each is a wait for the picture being drawn to be done, and reading a row at a time made a hover of a few ghosts dozens
    // of them, which froze a playing scene.
    const texels = new Uint16Array(w * h * 4)
    renderer.readRenderTargetPixels(this.mips, from.x, from.y, w, h, texels)
    let sum = 0, count = 0, peak = -1
    let brightest = { x, y }
    for (let j = from.y; j <= to.y; j += step) {
      const row = (j - from.y) * w * 4
      for (let i = 0; i < w; i += step) {
        const luminance = 0.2126 * GhostPass.half(texels[row + i * 4]) + 0.7152 * GhostPass.half(texels[row + i * 4 + 1]) + 0.0722 * GhostPass.half(texels[row + i * 4 + 2])
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
    // Its storage made again at another size holds nothing until the next picture is developed into it (see readable).
    if (this.mips.width !== Math.ceil(w / 2) || this.mips.height !== Math.ceil(h / 2)) this.readable = false
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
