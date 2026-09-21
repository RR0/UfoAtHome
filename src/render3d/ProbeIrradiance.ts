import {
  FloatType, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector4, WebGLRenderTarget,
  type Texture, type WebGLRenderer
} from "three"

/** What the eye's probe says about the light round the witness, in the scene's relative units. */
export interface ProbeLight {
  /** The light falling on a level surface from the upper hemisphere, ∫ L cos θ dω. */
  readonly up: [number, number, number]
  /** The same from below — the ground's and the decor's own light, thrown back up. */
  readonly down: [number, number, number]
  /** The log-average luminance of the upper hemisphere: what an eye adapts to. */
  readonly logAverage: number
}

/**
 * The light that surrounds the witness, measured on what is actually drawn round them.
 *
 * The eye's reflection probe (see Reflections) is a photograph of the whole scene in every direction
 * from the witness, in light: the scattered sky, and over it the clouds as drawn, the ground as lit,
 * the decor, the lamps. Integrated over each hemisphere it is the light a level surface receives
 * from above and from below — what three's hemisphere light needs — and its log-average over the
 * upper one is what an eye standing there adapts to. So an overcast day lights the ground with the
 * deck the reader is looking at, not with a clear sky the deck hides, and the eye adapts to that
 * deck; and the ground's own light reaches what faces it, a bounce per photograph.
 *
 * What the eye gets straight from a source is not in it: the Sun's and the Moon's beams are lights
 * of their own (see SceneRenderer.updateCelestialLight), so a cone round each is left out, and what
 * is drawn only for the eye (its veiling glare, the points the eye resolves stars to) is hidden from
 * the probe when it is taken.
 *
 * Done on the GPU into four texels, read back without waiting: a frame late costs nothing a
 * witness could see.
 */
export class ProbeIrradiance {
  /** Directions sampled, spread evenly over the sphere. */
  static readonly SAMPLES = 4096
  /** The cone left out round a source whose beam is a light of its own, degrees of radius. */
  static readonly SOURCE_CONE_DEG = 1.5

  private readonly target = new WebGLRenderTarget(3, 1, { type: FloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false })
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial
  private reading = false

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uProbe: { value: null },
        uExcludeA: { value: new Vector4(0, -1, 0, 2) },
        uExcludeB: { value: new Vector4(0, -1, 0, 2) }
      },
      vertexShader: `
        void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        uniform samplerCube uProbe;
        uniform vec4 uExcludeA;
        uniform vec4 uExcludeB;
        const float SAMPLES = ${ProbeIrradiance.SAMPLES}.0;
        const float PI = 3.141592653589793;
        void main() {
          int which = int(gl_FragCoord.x);
          vec3 sum = vec3(0.0);
          float logSum = 0.0;
          float count = 0.0;
          for (int i = 0; i < ${ProbeIrradiance.SAMPLES}; i++) {
            float k = float(i) + 0.5;
            float y = 1.0 - 2.0 * k / SAMPLES;
            float r = sqrt(max(0.0, 1.0 - y * y));
            float phi = k * 2.399963229728653;
            vec3 dir = vec3(r * cos(phi), y, r * sin(phi));
            if (dot(dir, uExcludeA.xyz) > uExcludeA.w || dot(dir, uExcludeB.xyz) > uExcludeB.w) continue;
            vec3 light = textureCube(uProbe, dir).rgb;
            if (which == 0 && y > 0.0) sum += light * y;
            else if (which == 1 && y < 0.0) sum -= light * y;
            else if (which == 2 && y > 0.0) {
              logSum += log(max(dot(light, vec3(0.2126, 0.7152, 0.0722)), 1e-12));
              count += 1.0;
            }
          }
          // Each direction stands for 4π/N of the sphere.
          if (which < 2) gl_FragColor = vec4(sum * 4.0 * PI / SAMPLES, 1.0);
          else gl_FragColor = vec4(count > 0.0 ? logSum / count : -27.6, count, 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    })
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  /**
   * Measures the probe `cube`, leaving out a cone round each of `sources` (unit directions), and
   * hands the answer to `done` once it is back — unless a measurement is already under way.
   */
  measure(renderer: WebGLRenderer, cube: Texture, sources: readonly { x: number, y: number, z: number }[], done: (light: ProbeLight) => void): void {
    if (this.reading) return
    const uniforms = this.material.uniforms
    uniforms.uProbe.value = cube
    const cos = Math.cos((ProbeIrradiance.SOURCE_CONE_DEG * Math.PI) / 180)
    const exclusions = [uniforms.uExcludeA.value as Vector4, uniforms.uExcludeB.value as Vector4]
    exclusions.forEach((exclusion, index) => {
      const source = sources[index]
      if (source) exclusion.set(source.x, source.y, source.z, cos)
      else exclusion.set(0, -1, 0, 2)
    })
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(previous)
    this.reading = true
    const texels = new Float32Array(12)
    renderer.readRenderTargetPixelsAsync(this.target, 0, 0, 3, 1, texels)
      .then(() => done({ up: [texels[0], texels[1], texels[2]], down: [texels[4], texels[5], texels[6]], logAverage: texels[8] }))
      .catch(() => undefined)
      .finally(() => { this.reading = false })
  }

  dispose(): void {
    this.target.dispose()
    this.material.dispose()
    ;(this.scene.children[0] as Mesh).geometry.dispose()
  }
}
