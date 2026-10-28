import {
  HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh, NoBlending, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2,
  Vector3, WebGLRenderTarget, type Camera, type WebGLRenderer
} from "three"
import type { LensGhost } from "../engine/instrument/LensGhost.js"
import { EYE_UNIFORMS, FINISH_GLSL, type UnfinishedFrame } from "./colorSpace.js"

/**
 * Lays a lens's ghosts over the picture it took (see LensGhost), then finishes it onto the canvas.
 *
 * A ghost is the whole picture again, scaled about its centre (mirrored when the scale is negative), out of focus and much fainter: every
 * light makes its own, wherever it is and whatever it is — a traffic light, a streetlamp, a headlight, a lantern, the Moon. So it is drawn
 * from the picture itself, as light, rather than from a list of the scene's lights: nothing that shines can be forgotten, and a light that
 * is dimmed by the air or half hidden by a tree has a ghost dimmed or halved with it.
 *
 * The picture's light is copied into a chain of mipmaps, whose every level is the average of the one below: reading a level is reading the
 * picture blurred by its size, with its light kept. A ghost at a pixel is then the picture read where that pixel maps back to, blurred to
 * the ghost's own defocus, its flux spread over the square of its scale. Only light is added: the ghosts are in the picture's linear light,
 * before the medium answers it (see FINISH_GLSL), so the ghost of a light that saturated the sensor can itself be plainly visible.
 */
export class GhostPass {
  /** The most ghosts a lens is drawn with. */
  static readonly MAX_GHOSTS = 6

  /** Where a single picture is drawn before its ghosts are laid over it: its light and its overlays, unfinished. */
  readonly frame: UnfinishedFrame
  /** The picture's light, with its mipmaps: what the ghosts are read from. At half the picture's size: the sharpest ghost is several pixels
   * wide, and copying and averaging the full picture cost a millisecond of the GPU's every frame. */
  private readonly mips: WebGLRenderTarget
  private readonly quadScene = new Scene()
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly quad: Mesh
  private readonly copyMaterial: ShaderMaterial
  private readonly developMaterial: ShaderMaterial

  constructor(width: number, height: number) {
    const size = (w: number, h: number) => [Math.max(1, w), Math.max(1, h)] as const
    // The single picture keeps the antialiasing the canvas would have given its edges (see FinishPass.SAMPLES).
    this.frame = {
      scene: new WebGLRenderTarget(...size(width, height), { type: HalfFloatType, samples: 4 }),
      overlay: new WebGLRenderTarget(...size(width, height), { type: HalfFloatType, samples: 4 }),
      single: true
    }
    this.mips = new WebGLRenderTarget(...size(Math.ceil(width / 2), Math.ceil(height / 2)), {
      type: HalfFloatType, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter
    })
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
    this.developMaterial = new ShaderMaterial({
      uniforms: {
        ...EYE_UNIFORMS,
        uSource: { value: null },
        uOverlay: { value: null },
        uMips: { value: this.mips.texture },
        uGain: { value: 1 },
        uSize: { value: new Vector2(1, 1) },
        uCount: { value: 0 },
        uScale: { value: new Array<number>(n).fill(1) },
        uShare: { value: new Array<number>(n).fill(0) },
        uBlur: { value: new Array<number>(n).fill(0) },
        uTint: { value: Array.from({ length: n }, () => new Vector3(1, 1, 1)) }
      },
      vertexShader,
      fragmentShader: `
        precision highp float;
        ${FINISH_GLSL}
        uniform sampler2D uSource;
        uniform sampler2D uOverlay;
        uniform sampler2D uMips;
        uniform float uGain;
        uniform vec2 uSize;
        uniform int uCount;
        uniform float uScale[${n}];
        uniform float uShare[${n}];
        uniform float uBlur[${n}];
        uniform vec3 uTint[${n}];
        varying vec2 vUv;

        // The picture blurred to a disc of this radius, pixels, round this point: the level whose texels are as large as the disc, read at
        // its middle and at four points of its rim, so that a ghost is round rather than the square of a texel.
        vec3 blurred(vec2 at, float radiusPx) {
          float lod = log2(max(1.0, radiusPx * 1.77));
          vec2 rim = 0.5 * radiusPx / uSize;
          return 0.4 * textureLod(uMips, at, lod).rgb
            + 0.15 * (textureLod(uMips, at + vec2(rim.x, 0.0), lod).rgb + textureLod(uMips, at - vec2(rim.x, 0.0), lod).rgb
                    + textureLod(uMips, at + vec2(0.0, rim.y), lod).rgb + textureLod(uMips, at - vec2(0.0, rim.y), lod).rgb);
        }

        vec3 ghosts(vec2 uv) {
          vec3 sum = vec3(0.0);
          for (int i = 0; i < ${n}; i++) {
            if (i >= uCount) break;
            float k = uScale[i];
            // Where in the picture the light that lands here as this ghost came from.
            vec2 from = 0.5 + (uv - 0.5) / k;
            if (any(lessThan(from, vec2(0.0))) || any(greaterThan(from, vec2(1.0)))) continue;
            // Light from near the edge of the field reaches the surfaces that make the ghost only in part, the lens's barrel cutting it off
            // gradually: the ghost of a bright foreground fades out where its source leaves the picture, rather than ending in a hard
            // rectangle of the picture's own edges.
            vec2 edge = min(from, 1.0 - from);
            float vignette = smoothstep(0.0, 0.15, edge.x) * smoothstep(0.0, 0.15, edge.y);
            // Its defocus, in the picture's pixels, read where the light came from: the ghost is that picture scaled by k.
            float radiusPx = uBlur[i] * uSize.y / abs(k);
            sum += vignette * uTint[i] * uShare[i] * blurred(from, radiusPx) / (k * k);
          }
          return sum;
        }

        void main() {
          vec4 texel = texture2D(uSource, vUv) * uGain;
          vec3 scene = texel.rgb + ghosts(vUv);
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
   * Finishes `source` onto the canvas with these ghosts laid over its light. `gain` is what its light is multiplied by first (see
   * ExposureAccumulation.develop).
   */
  develop(renderer: WebGLRenderer, source: UnfinishedFrame, ghosts: readonly LensGhost[], gain = 1): void {
    const previous = renderer.getRenderTarget()
    this.copyMaterial.uniforms.uSource.value = source.scene.texture
    this.copyMaterial.uniforms.uGain.value = gain
    this.quad.material = this.copyMaterial
    renderer.setRenderTarget(this.mips)
    renderer.render(this.quadScene, this.quadCamera as Camera)
    const uniforms = this.developMaterial.uniforms
    uniforms.uSource.value = source.scene.texture
    uniforms.uOverlay.value = source.overlay.texture
    uniforms.uGain.value = gain
    ;(uniforms.uSize.value as Vector2).set(this.mips.width, this.mips.height)
    const count = Math.min(ghosts.length, GhostPass.MAX_GHOSTS)
    uniforms.uCount.value = count
    for (let i = 0; i < count; i++) {
      const ghost = ghosts[i]
      ;(uniforms.uScale.value as number[])[i] = ghost.scale || 1
      ;(uniforms.uShare.value as number[])[i] = ghost.share
      ;(uniforms.uBlur.value as number[])[i] = ghost.blur
      ;(uniforms.uTint.value as Vector3[])[i].set(...(ghost.tint ?? [1, 1, 1]))
    }
    this.quad.material = this.developMaterial
    // Setting the canvas as the target is what has three build the copy's mipmaps.
    renderer.setRenderTarget(previous)
    renderer.render(this.quadScene, this.quadCamera as Camera)
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width), h = Math.max(1, height)
    this.frame.scene.setSize(w, h)
    this.frame.overlay.setSize(w, h)
    this.mips.setSize(Math.ceil(w / 2), Math.ceil(h / 2))
  }

  dispose(): void {
    this.frame.scene.dispose()
    this.frame.overlay.dispose()
    this.mips.dispose()
    this.copyMaterial.dispose()
    this.developMaterial.dispose()
    this.quad.geometry.dispose()
    this.quadScene.clear()
  }
}
