import {
  FloatType, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3, Vector4, WebGLRenderTarget,
  type PerspectiveCamera, type Texture, type WebGLRenderer
} from "three"

/** What a device that sets its own exposure reads of its own frame, in the scene's relative units (see FrameMeter). */
export interface FrameLight {
  /** The mean luminance over the frame, the disc of the Sun or the Moon left out. */
  readonly mean: number
  /** The luminance of the brightest zone of the frame, some degrees across, the disc and its smear left out. */
  readonly brightest: number
}

/**
 * What a camera or a phone meters: its own frame, not the sky round the observer.
 *
 * An eye adapts to the whole upper hemisphere it stands under (see ProbeIrradiance). A device that sets its own exposure reads the picture
 * it is about to take: aimed at the Sun through a cirrostratus, its frame holds the bright aureole round it, and it exposes shorter than
 * the sky overhead would have it — the darker, harder picture a phone gives of a halo. Metered on the hemisphere instead, the same phone
 * burned the aureole out over thirteen degrees round a Sun whose photograph shows a white core of one and a half.
 *
 * Read on the same photograph of the surroundings the eye's probe is (see Reflections), at the directions of the frame. The disc of a
 * source is left out of both readings: whatever the exposure it clips, and a clipped pixel weighs no more in a meter than the white it
 * shows, a few pixels in a million. Done on the GPU into two texels, read back without waiting: a frame late, as a device's own metering is.
 */
export class FrameMeter {
  /** Directions sampled across the frame, and down it: a thousand and two hundred. */
  static readonly COLUMNS = 40
  static readonly ROWS = 30
  /** The probe's level the mean is read at: 1, sixty-four pixels a side, a texel of under a degree and a half. */
  static readonly LEVEL = 1
  /** The level a zone is read at: 3, sixteen a side, a zone of some six degrees, a fiftieth of a phone's frame. */
  static readonly ZONE_LEVEL = 3
  /** The cone left out round a source for the mean, degrees of radius: its disc spread over a texel of LEVEL. */
  static readonly SOURCE_CONE_DEG = 2
  /**
   * The same for the zones, faded in rather than cut: nothing of a zone nearer the source than the first angle counts, all of one beyond
   * the second. A texel of ZONE_LEVEL is some six degrees, and read between texels the disc's light reaches a zone up to eight or eleven
   * degrees off. Cut sharp at six, the samples of the frame's grid caught that light or missed it as the frame turned, the brightest zone
   * went from sixty thousand to a hundred and seventy thousand candela from one picture to the next, and the Sun pulsed as the phone panned.
   */
  static readonly ZONE_SOURCE_FADE_DEG: readonly [number, number] = [8, 14]

  private readonly target = new WebGLRenderTarget(2, 1, { type: FloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: false })
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly material: ShaderMaterial
  private reading = false
  private readonly forward = new Vector3()
  private readonly right = new Vector3()
  private readonly up = new Vector3()

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uProbe: { value: null },
        uForward: { value: new Vector3() },
        uRight: { value: new Vector3() },
        uUp: { value: new Vector3() },
        uSource: { value: new Vector4(0, -1, 0, 2) }
      },
      vertexShader: `
        void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        uniform samplerCube uProbe;
        uniform vec3 uForward;
        uniform vec3 uRight;
        uniform vec3 uUp;
        uniform vec4 uSource;
        const vec3 LUMINANCE = vec3(0.2126, 0.7152, 0.0722);
        void main() {
          bool zones = int(gl_FragCoord.x) == 1;
          float cone = ${Math.cos((FrameMeter.SOURCE_CONE_DEG * Math.PI) / 180)};
          float sum = 0.0;
          float count = 0.0;
          float brightest = 0.0;
          for (int j = 0; j < ${FrameMeter.ROWS}; j++) {
            for (int i = 0; i < ${FrameMeter.COLUMNS}; i++) {
              vec2 at = (vec2(float(i), float(j)) + 0.5) / vec2(${FrameMeter.COLUMNS}.0, ${FrameMeter.ROWS}.0) * 2.0 - 1.0;
              vec3 dir = normalize(uForward + at.x * uRight + at.y * uUp);
              float toSource = uSource.w <= 1.0 ? dot(dir, uSource.xyz) : -1.0;
              if (zones) {
                float counted = 1.0 - smoothstep(${Math.cos((FrameMeter.ZONE_SOURCE_FADE_DEG[1] * Math.PI) / 180)}, ${Math.cos((FrameMeter.ZONE_SOURCE_FADE_DEG[0] * Math.PI) / 180)}, toSource);
                brightest = max(brightest, counted * dot(textureCubeLodEXT(uProbe, dir, ${FrameMeter.ZONE_LEVEL}.0).rgb, LUMINANCE));
                count += 1.0;
                continue;
              }
              if (toSource > cone) continue;
              sum += dot(textureCubeLodEXT(uProbe, dir, ${FrameMeter.LEVEL}.0).rgb, LUMINANCE);
              count += 1.0;
            }
          }
          gl_FragColor = vec4(zones ? brightest : (count > 0.0 ? sum / count : 0.0), count, 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    })
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material))
  }

  /**
   * Meters the photograph `cube` over the frame of `camera` (its direction and its field), leaving out the disc of `source` (a unit
   * direction, or none), and hands the answer to `done` once it is back — unless a reading is already under way.
   */
  measure(renderer: WebGLRenderer, cube: Texture, camera: PerspectiveCamera, source: { x: number, y: number, z: number } | undefined,
    done: (light: FrameLight) => void): void {
    if (this.reading) return
    camera.updateMatrixWorld()
    camera.matrixWorld.extractBasis(this.right, this.up, this.forward)
    this.forward.negate()
    const tanY = Math.tan((camera.fov * Math.PI) / 360) / camera.zoom
    const uniforms = this.material.uniforms
    uniforms.uProbe.value = cube
    ;(uniforms.uForward.value as Vector3).copy(this.forward)
    ;(uniforms.uRight.value as Vector3).copy(this.right).multiplyScalar(tanY * camera.aspect)
    ;(uniforms.uUp.value as Vector3).copy(this.up).multiplyScalar(tanY)
    const excluded = uniforms.uSource.value as Vector4
    if (source) excluded.set(source.x, source.y, source.z, 0)
    else excluded.set(0, -1, 0, 2)
    const previous = renderer.getRenderTarget()
    renderer.setRenderTarget(this.target)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(previous)
    this.reading = true
    const texels = new Float32Array(8)
    renderer.readRenderTargetPixelsAsync(this.target, 0, 0, 2, 1, texels)
      .then(() => done({ mean: texels[0], brightest: texels[4] }))
      .catch(() => undefined)
      .finally(() => { this.reading = false })
  }

  dispose(): void {
    this.target.dispose()
    this.material.dispose()
    ;(this.scene.children[0] as Mesh).geometry.dispose()
  }
}
