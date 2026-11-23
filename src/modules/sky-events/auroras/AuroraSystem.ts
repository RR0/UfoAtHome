import { AdditiveBlending, BackSide, Mesh, ShaderMaterial, SphereGeometry, Vector3, Vector4 } from "three"
import type { HorizontalPosition } from "../../../engine/astronomy/CelestialPositions.js"
import { AuroralHeights, AuroralLines } from "./Aurora.js"
import type { AuroraView } from "./Aurora.js"

/**
 * The aurora as the eye sees it: every pixel of the sky walks its own line of sight through the shell of upper air that gives off light,
 * 90 to 900 km up, and adds what each line gives off there (see AuroraRadiance, the same model without its folds and rays).
 *
 * Nothing in it is drawn as a shape. A curtain is a sheet a few kilometres thick that lies along the field (Geomagnetism.footLatitude): seen
 * from far equatorward it is a glow over the poleward horizon, from nearer an arc, edge on along its length a bright band, from under it a
 * corona of rays meeting at the magnetic zenith; its red tops stand over its green because the red line is given off higher, and are seen
 * alone from far off because the green is under the horizon there. The violet of tops still in the Sun after the ground has lost it comes
 * from the same walk, where the Earth's shadow does not reach.
 *
 * Its light is cd/m² times the scene's relative scale, through the air between (sampled from the frame by altitude), added to what is
 * behind: the finish's Purkinje shift then makes it grey-green to an eye adapted to the night, and leaves a camera its reds.
 */
export class AuroraSystem {
  /** Behind the halos and bows (880), which are in the air near the eye, and in front of the Milky Way (890), which is behind everything. */
  private static readonly RADIUS = 885
  /** The most arcs drawn at once (see AuroraView.arcs). */
  static readonly MAX_ARCS = 4
  /** Steps along a line of sight. */
  static readonly STEPS = 56
  /** The altitudes the air's transmittance is sampled at, degrees. */
  static readonly ALTITUDES = [-3, 0, 1, 2, 4, 7, 12, 20, 35, 60, 90] as const

  readonly object: Mesh
  private readonly material: ShaderMaterial
  private shown = false

  constructor() {
    const H = AuroralHeights
    const f = (value: number) => value.toFixed(6)
    this.material = new ShaderMaterial({
      uniforms: {
        uAxis: { value: new Vector3(0, 1, 0) },
        uSun: { value: new Vector3(0, -1, 0) },
        uObserverKm: { value: H.EARTH_KM },
        uEdge: { value: 60 },
        uWidth: { value: 8 },
        uDiffuse: { value: 0 },
        uRed: { value: 0 },
        uArcRed: { value: new Vector3(0.1, 250, 70) },
        uArcs: { value: Array.from({ length: AuroraSystem.MAX_ARCS }, () => new Vector4()) },
        uArcCount: { value: 0 },
        uTime: { value: 0 },
        uGreenLight: { value: new Vector3() },
        uRedLight: { value: new Vector3() },
        uBlueLight: { value: new Vector3() },
        uAir: { value: AuroraSystem.ALTITUDES.map(() => new Vector3(1, 1, 1)) }
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vDirection;
        uniform vec3 uAxis;
        uniform vec3 uSun;
        uniform float uObserverKm;
        uniform float uEdge;
        uniform float uWidth;
        uniform float uDiffuse;
        uniform float uRed;
        /** The arcs' red: its share of their green, the height it peaks at and how wide, km. */
        uniform vec3 uArcRed;
        uniform vec4 uArcs[${AuroraSystem.MAX_ARCS}];
        uniform int uArcCount;
        uniform float uTime;
        uniform vec3 uGreenLight;
        uniform vec3 uRedLight;
        uniform vec3 uBlueLight;
        uniform vec3 uAir[${AuroraSystem.ALTITUDES.length}];

        const float EARTH = ${f(H.EARTH_KM)};
        const float BOTTOM = ${f(H.BOTTOM_KM)};
        const float TOP = ${f(H.TOP_KM)};
        const float DEG = 57.29577951308232;
        const float PI = 3.141592653589793;
        const int STEPS = ${AuroraSystem.STEPS};

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise1(float x, float seed) {
          float i = floor(x); float t = x - i; t = t * t * (3.0 - 2.0 * t);
          return mix(hash(vec2(i, seed)), hash(vec2(i + 1.0, seed)), t);
        }
        float exponential(float h, float base, float scale) {
          float rise = smoothstep(base - 8.0, base + 2.0, h);
          return rise * exp(-max(0.0, h - base) / scale) / (scale + 5.0);
        }
        float gaussian(float h, float peak, float width) {
          float t = (h - peak) / width;
          return exp(-0.5 * t * t) / (width * 2.5066283);
        }
        /** The standard normal's cumulative distribution (Abramowitz and Stegun 7.1.26 through erf). */
        float cdf(float z) {
          float x = abs(z) * 0.70710678;
          float t = 1.0 / (1.0 + 0.3275911 * x);
          float e = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
          return 0.5 * (1.0 + sign(z) * e);
        }
        /** Where a point stands in the field: [the latitude its line comes down to at 100 km, magnetic longitude from the Sun, magnetic local time]. */
        vec3 fieldOf(vec3 p, float r) {
          vec3 u = p / r;
          float s = clamp(dot(u, uAxis), -1.0, 1.0);
          float c2 = 1.0 - s * s;
          float foot = acos(sqrt(min(1.0, c2 * (EARTH + 100.0) / r))) * DEG;
          vec3 across = u - s * uAxis;
          vec3 sunFlat = uSun - dot(uSun, uAxis) * uAxis;
          vec3 east = cross(uAxis, sunFlat);
          float angle = atan(dot(east, across), dot(sunFlat, across));
          float mlt = mod(12.0 + angle * 12.0 / PI, 24.0);
          return vec3(foot, angle, mlt);
        }
        float sunlit(vec3 p) {
          float along = dot(p, uSun);
          if (along > 0.0) return 1.0;
          return smoothstep(EARTH + 20.0, EARTH + 80.0, length(p - along * uSun));
        }
        vec3 airTowards(float altitude) {
          ${AuroraSystem.ALTITUDES.slice(1).map((a, i) => `if (altitude < ${a.toFixed(1)}) return mix(uAir[${i}], uAir[${i + 1}], (altitude - ${AuroraSystem.ALTITUDES[i].toFixed(1)}) / ${(a - AuroraSystem.ALTITUDES[i]).toFixed(1)});`).join("\n          ")}
          return uAir[${AuroraSystem.ALTITUDES.length - 1}];
        }

        void main() {
          vec3 dir = normalize(vDirection);
          // The shell along this line: from where it enters the lowest that gives off light to where it leaves the highest.
          float b = uObserverKm * dir.y;
          float cGround = uObserverKm * uObserverKm - EARTH * EARTH;
          float dGround = b * b - cGround;
          if (dGround > 0.0 && -b - sqrt(dGround) > 0.0) discard;
          float dBottom = b * b - (uObserverKm * uObserverKm - (EARTH + BOTTOM) * (EARTH + BOTTOM));
          float dTop = b * b - (uObserverKm * uObserverKm - (EARTH + TOP) * (EARTH + TOP));
          float s0 = max(0.0, -b + sqrt(max(dBottom, 0.0)));
          float s1 = -b + sqrt(max(dTop, 0.0));
          float ds = (s1 - s0) / float(STEPS);
          vec3 origin = vec3(0.0, uObserverKm, 0.0);
          float jitter = hash(gl_FragCoord.xy);
          float green = 0.0, red = 0.0, blue = 0.0;
          vec3 fieldA = fieldOf(origin + dir * s0, length(origin + dir * s0));
          for (int i = 0; i < STEPS; i++) {
            float sa = s0 + float(i) * ds;
            float sm = sa + (0.25 + 0.5 * jitter) * ds;
            vec3 pb = origin + dir * (sa + ds);
            vec3 fieldB = fieldOf(pb, length(pb));
            vec3 pm = origin + dir * sm;
            float rm = length(pm);
            float h = rm - EARTH;
            vec3 fm = mix(fieldA, fieldB, 0.5);
            float mlt = fm.z;
            float noon = (1.0 - cos(mlt * PI / 12.0)) * 0.5;
            float edge = uEdge + ${f(8)} * noon;
            float width = uWidth * (1.0 - 0.4 * noon);
            float band = smoothstep(edge - 1.0, edge + 0.5, fm.x) * (1.0 - smoothstep(edge + width - 1.0, edge + width + 1.5, fm.x));
            green += uDiffuse * band * exponential(h, ${f(H.DIFFUSE_BASE_KM)}, ${f(H.DIFFUSE_SCALE_KM)}) * ds;
            red += uDiffuse * band * ${f(H.RED_OF_GREEN)} * gaussian(h, ${f(H.RED_PEAK_KM)}, ${f(H.RED_WIDTH_KM)}) * ds;
            if (uRed > 0.0) {
              float t = (fm.x - (edge - 1.0)) / 3.0;
              red += uRed * exp(-0.5 * t * t) * gaussian(h, ${f(H.STORM_RED_PEAK_KM)}, ${f(H.STORM_RED_WIDTH_KM)}) * ds;
            }
            float lit = sunlit(pm);
            for (int a = 0; a < ${AuroraSystem.MAX_ARCS}; a++) {
              if (a >= uArcCount) break;
              vec4 arc = uArcs[a];
              // Its folds move it at most 0.75° from where it stands: a step whose field lines come down farther than that and five of its
              // thicknesses away crosses nothing of it, and is passed over before its folds, its sheet and its rays are worked out.
              float nominal = edge + arc.x;
              float reach = 0.75 + 5.0 * ${f(H.ARC_THICKNESS_DEG)};
              if (min(fieldA.x, fieldB.x) > nominal + reach || max(fieldA.x, fieldB.x) < nominal - reach) continue;
              // Where it stands here along its length: folded, the folds drifting.
              float phi = fm.y;
              float centre = edge + arc.x + 0.6 * sin(9.0 * phi + 0.004 * uTime + arc.z) + 0.15 * sin(37.0 * phi - 0.02 * uTime + 2.0 * arc.z);
              // The share of the sheet this step crosses, integrated across it: a sheet a few km thick is never stepped over.
              float sigma = ${f(H.ARC_THICKNESS_DEG)};
              float za = (fieldA.x - centre) / sigma, zb = (fieldB.x - centre) / sigma;
              float across;
              if (abs(zb - za) < 0.2) {
                float z = 0.5 * (za + zb);
                across = exp(-0.5 * z * z);
              } else {
                across = 2.5066283 * abs(cdf(zb) - cdf(za)) / abs(zb - za);
              }
              if (across < 1e-4) continue;
              // Its rays: along the field, so a function of where along the arc the line comes down; they reach higher in places.
              // Warped, for the rays not to stand at even intervals as a fence's posts do: their spacing and width wander along the arc.
              float cell = phi * 260.0 + 4.0 * noise1(phi * 23.0 + uTime * 0.01, arc.w + 3.0) + arc.w + uTime * 0.6;
              float n = 0.5 * noise1(cell, arc.w) + 0.3 * noise1(cell * 2.7, arc.w + 7.0) + 0.2 * noise1(cell * 7.3, arc.w + 11.0);
              // Of mean 1, as AuroraRadiance's sheet is: the rays move the light about, they do not add to it.
              float ray = 0.4 + 2.0 * n * n;
              float tall = 0.6 + 0.9 * noise1(phi * 90.0 + arc.w, 3.0 + arc.w);
              float sheet = arc.y * across * ray;
              float g = sheet * exponential(h, ${f(H.ARC_BASE_KM)}, ${f(H.ARC_SCALE_KM)} * tall);
              green += g * ds;
              red += sheet * uArcRed.x * gaussian(h, uArcRed.y, uArcRed.z * tall) * ds;
              blue += (g * ${f(H.BLUE_OF_GREEN)} + sheet * lit * ${f(H.SUNLIT_BLUE_OF_GREEN)} * gaussian(h, 300.0, 120.0)) * ds;
            }
            fieldA = fieldB;
          }
          float altitude = asin(clamp(dir.y, -1.0, 1.0)) * DEG;
          vec3 light = (green * uGreenLight + red * uRedLight + blue * uBlueLight) * airTowards(altitude);
          if (max(light.r, max(light.g, light.b)) <= 0.0) discard;
          gl_FragColor = vec4(min(light, vec3(60000.0)), 1.0);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      fog: false
    })
    this.object = new Mesh(new SphereGeometry(AuroraSystem.RADIUS, 96, 48), this.material)
    this.object.name = "aurora"
    this.object.renderOrder = -1
    this.object.frustumCulled = false
    this.object.visible = false
  }

  /** Whether it draws anything now. */
  get count(): number {
    return this.shown ? 1 : 0
  }

  /**
   * Draws `view`, or nothing. `relativeScale` is what a cd/m² is in the scene's light, `air` what the air above the eye keeps of a light from
   * space towards a direction (per channel).
   */
  set(view: AuroraView | undefined, relativeScale: number, air: (position: HorizontalPosition) => readonly [number, number, number]): void {
    this.shown = view !== undefined
    this.object.visible = this.shown
    if (!view) return
    const u = this.material.uniforms
    u.uAxis.value.set(...view.axis)
    u.uSun.value.set(...view.sun).normalize()
    u.uObserverKm.value = AuroralHeights.EARTH_KM + view.observerHeightKm
    u.uEdge.value = view.edgeDeg
    u.uWidth.value = view.widthDeg
    u.uDiffuse.value = view.diffuseKR
    u.uRed.value = view.redKR
    u.uArcRed.value.set(view.arcRed.share, view.arcRed.peakKm, view.arcRed.widthKm)
    const arcs = view.arcs.slice(0, AuroraSystem.MAX_ARCS)
    u.uArcCount.value = arcs.length
    arcs.forEach((arc, index) => (u.uArcs.value as Vector4[])[index].set(arc.offsetDeg, arc.kr, arc.foldPhase, arc.rayPhase))
    u.uTime.value = view.timeS
    const scale = relativeScale * view.fade
    const lightOf = (line: { cdM2PerKR: number, colour: readonly number[] }, target: Vector3) =>
      target.set(line.colour[0], line.colour[1], line.colour[2]).multiplyScalar(line.cdM2PerKR * scale)
    lightOf(AuroralLines.GREEN, u.uGreenLight.value)
    lightOf(AuroralLines.RED, u.uRedLight.value)
    lightOf(AuroralLines.BLUE, u.uBlueLight.value)
    AuroraSystem.ALTITUDES.forEach((altitudeDeg, index) => {
      const through = air({ altitudeDeg: Math.max(altitudeDeg, 0), azimuthDeg: 0 })
      ;(u.uAir.value as Vector3[])[index].set(through[0], through[1], through[2])
    })
  }

  dispose(): void {
    this.object.geometry.dispose()
    this.material.dispose()
    this.object.removeFromParent()
  }
}
