import { AdditiveBlending, Color, DoubleSide, LatheGeometry, Mesh, PointLight, ShaderMaterial, Vector2 } from "three"

/**
 * A flame thrown by a body of an interpretation — see BodyFlame.
 *
 * The recipe is the usual one for a jet that has to hold up at a few metres: a volume of revolution
 * shaped like an exhaust plume (narrower at the nozzle, fullest a third of the way down, drawn out
 * to a point), lit from within rather than by anything outside it. Its shader thins the light
 * towards the silhouette, where the line of sight crosses less flame, breaks the far end up with
 * rising turbulence, and shades it from the colour at the nozzle to the colour at the tip. Drawn
 * additively and writing no depth, so what stands in front of it (the ground a jet strikes, a car)
 * still hides it, and it never hides what is behind its own glow.
 *
 * Its turbulence runs on the RECORDING's clock, not the wall's: a paused replay shows one instant,
 * and a flame that went on flickering over a still picture would be showing an instant nobody saw.
 *
 * Built one metre long and one metre across and scaled to the flame stated, pointing down its own
 * -Y from its origin, which is set on the node it comes out of.
 *
 * And it LIGHTS what is around it: a point light at the heart of the flame, of the flame's own
 * luminous intensity (see BodySystem), falling off as the square of the distance — the ground under
 * a craft on its legs, its own underside and legs, a car parked near it. It casts no shadow: six
 * more renders of the scene per frame, for the one light that is only ever there for seconds.
 *
 * The light is a sibling of the flame, not its child, and is never taken out of the scene while
 * the body that throws it is there: three.js compiles every material for the number of lights in
 * view, so a light that came and went with the flame would recompile the whole scene twice, a
 * stall at the very moment the flame catches. Out, it is still there, at an intensity of nothing.
 */
export class FlameEffect {
  /** Drawn after the relief, which is itself transparent (its fading edge) and drawn in the
   * transparent pass at order 1: a flame that writes no depth and was drawn before it was painted
   * over by it wherever the two overlapped, which at a craft standing on the ground is everywhere. */
  static readonly RENDER_ORDER = 3
  /** Where in the flame its light is, down its length from the node: the middle of its brightest
   * part rather than its tip. */
  static readonly LIGHT_AT = 0.35

  readonly mesh: Mesh<LatheGeometry, ShaderMaterial>
  readonly light = new PointLight(0xffffff, 0, 0, 2)

  constructor() {
    const profile: Vector2[] = []
    const steps = 32
    for (let i = 0; i <= steps; i++) {
      const s = i / steps
      // Full at a third of the way, a nozzle seven tenths as wide, a point at the end.
      const radius = 0.5 * (0.7 + 0.3 * Math.sin(Math.min(1, s / 0.33) * Math.PI / 2)) * Math.pow(1 - s, 0.55)
      profile.push(new Vector2(Math.max(radius, 1e-4), -s))
    }
    const geometry = new LatheGeometry(profile, 48)
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(1, 1, 1) },
        uTipColor: { value: new Color(1, 1, 1) }
      },
      vertexShader: FlameEffect.VERTEX,
      fragmentShader: FlameEffect.FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false
    })
    this.mesh = new Mesh(geometry, material)
    this.mesh.name = "flame"
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = FlameEffect.RENDER_ORDER
    this.mesh.visible = false
  }

  /** Puts the flame out without taking its light out of the scene — see the class comment. */
  putOut(): void {
    this.mesh.visible = false
    this.light.intensity = 0
  }

  /** Stands the flame on its node, pointing down the way the body points, `lengthM` × `widthM`. */
  place(position: { x: number, y: number, z: number }, quaternion: { x: number, y: number, z: number, w: number }, lengthM: number, widthM: number): void {
    this.mesh.visible = true
    this.mesh.position.set(position.x, position.y, position.z)
    this.mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    this.mesh.scale.set(widthM, lengthM, widthM)
    this.mesh.updateMatrixWorld()
    this.light.position.set(0, -FlameEffect.LIGHT_AT, 0).applyMatrix4(this.mesh.matrixWorld)
  }

  /**
   * @param nozzle The colour where it leaves the node, as it looks on screen (linear).
   * @param tip The same, at its far end.
   * @param seconds The recording's own time.
   */
  set(nozzle: readonly [number, number, number], tip: readonly [number, number, number], seconds: number): void {
    const uniforms = this.mesh.material.uniforms
    ;(uniforms.uColor.value as Color).setRGB(nozzle[0], nozzle[1], nozzle[2])
    ;(uniforms.uTipColor.value as Color).setRGB(tip[0], tip[1], tip[2])
    uniforms.uTime.value = seconds
  }

  /**
   * What the flame gives the scene around it: `intensity` in the scene's own light units at one
   * metre (so its illuminance at d metres is that over d²), of this linear colour.
   */
  illuminate(intensity: number, linearColour: readonly [number, number, number]): void {
    this.light.intensity = intensity
    this.light.color.setRGB(linearColour[0], linearColour[1], linearColour[2])
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }

  private static readonly VERTEX = /* glsl */ `
    varying vec3 vLocal;
    varying vec3 vViewNormal;
    varying vec3 vViewPosition;
    void main() {
      vLocal = position;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = viewPosition.xyz;
      vViewNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewPosition;
    }
  `

  private static readonly FRAGMENT = /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uTipColor;
    varying vec3 vLocal;
    varying vec3 vViewNormal;
    varying vec3 vViewPosition;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }

    float fbm(vec3 p) {
      float sum = 0.0;
      float amplitude = 0.5;
      for (int octave = 0; octave < 4; octave++) {
        sum += amplitude * noise(p);
        p *= 2.03;
        amplitude *= 0.5;
      }
      return sum;
    }

    void main() {
      // How far down the flame this is, 0 at the nozzle, 1 at the tip.
      float s = clamp(-vLocal.y, 0.0, 1.0);
      // How squarely the line of sight crosses the surface here: through the middle of the flame
      // it crosses the most of it, along the silhouette almost none.
      vec3 toEye = normalize(-vViewPosition);
      float facing = abs(dot(normalize(vViewNormal), toEye));
      // Turbulence carried downstream, faster than the flame is long, and growing towards the tip.
      float angle = atan(vLocal.z, vLocal.x);
      float turbulence = fbm(vec3(cos(angle) * 1.5, s * 5.0 - uTime * 7.0, sin(angle) * 1.5));
      // Written as one minus a rising step: a smoothstep with its edges reversed is undefined in
      // GLSL, and on some drivers (Metal through ANGLE) it is zero everywhere — no flame at all.
      float breakup = 1.0 - smoothstep(0.55, 1.0, s + (turbulence - 0.5) * (0.25 + 0.6 * s));
      float body = pow(facing, 1.6) * breakup * smoothstep(0.0, 0.04, s) * (0.7 + 0.6 * turbulence);
      vec3 colour = mix(uColor, uTipColor, smoothstep(0.35, 0.95, s));
      gl_FragColor = vec4(colour * body, body);
    }
  `
}
