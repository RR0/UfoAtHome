import { BackSide, Color, Data3DTexture, LinearFilter, Mesh, RedFormat, RepeatWrapping, ShaderMaterial, SphereGeometry, Vector3 } from "three"
import type { CloudInstance, CloudLayer } from "../engine/model/CloudLayer.js"

export const CLOUD_EARTH_RADIUS_M = 6371000
const NOISE_SIZE = 64
/** How many of a layer's own individual clouds its field can be carved around — a uniform array's
 * size, fixed at compile time. */
export const MAX_HOLES = 8
/** The shader's SLICE: the one slice of the noise every layer reads its weather from. */
const WEATHER_SLICE = 0.2787

/** Stable hash, independent of array order or frame number. */
export function cloudSeed(layer: CloudLayer): number {
  if (layer.seed !== undefined) return layer.seed
  let hash = 2166136261
  for (const char of layer.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

/** A small, periodic density texture shared by the layers of one renderer. */
export function createCloudNoise(): Data3DTexture {
  const bytes = new Uint8Array(NOISE_SIZE ** 3)
  const hash = (x: number, y: number, z: number, period: number): number => {
    let h = Math.imul(x % period + 1, 374761393) ^ Math.imul(y % period + 1, 668265263) ^ Math.imul(z % period + 1, 1274126177)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const noise = (x: number, y: number, z: number, period: number): number => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
    const smooth = (v: number) => v * v * (3 - 2 * v)
    const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz)
    let value = 0
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      value += hash(ix + dx, iy + dy, iz + dz, period) * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz)
    }
    return value
  }
  for (let z = 0; z < NOISE_SIZE; z++) for (let y = 0; y < NOISE_SIZE; y++) for (let x = 0; x < NOISE_SIZE; x++) {
    let value = 0
    for (const [period, weight] of [[4, 0.65], [8, 0.25], [16, 0.1]]) {
      value += noise(x / NOISE_SIZE * period, y / NOISE_SIZE * period, z / NOISE_SIZE * period, period) * weight
    }
    bytes[x + NOISE_SIZE * (y + NOISE_SIZE * z)] = Math.round(value * 255)
  }
  const texture = new Data3DTexture(bytes, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE)
  texture.format = RedFormat
  texture.minFilter = texture.magFilter = LinearFilter
  texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping
  texture.needsUpdate = true
  return texture
}

/** Nearest shell interval in front of the eye, stopping at the planet. Stable sphere roots
 * avoid subtracting two Earth-radius squares, including for a tangent ray at the horizon.
 */
export function cloudRayInterval(dy: number, eyeM: number, baseM: number, thicknessM: number): [number, number] | undefined {
  const roots = (height: number): [number, number] | undefined => {
    const b = (CLOUD_EARTH_RADIUS_M + eyeM) * dy
    const c = (eyeM - height) * (2 * CLOUD_EARTH_RADIUS_M + eyeM + height)
    const discriminant = b * b - c
    if (discriminant < 0) return undefined
    const q = -b - (b >= 0 ? 1 : -1) * Math.sqrt(discriminant)
    const other = q === 0 ? 0 : c / q
    return [Math.min(q, other), Math.max(q, other)]
  }
  const outer = roots(baseM + thicknessM)
  if (!outer || outer[1] <= 0) return undefined
  let start = Math.max(0, outer[0]), end = outer[1]
  const inner = roots(baseM)
  if (inner) {
    if (start >= inner[0] && start < inner[1]) start = inner[1]
    else if (inner[0] > start) end = Math.min(end, inner[0])
  }
  const ground = roots(0)
  if (ground && ground[0] >= 0) end = Math.min(end, ground[0])
  return end > start ? [start, end] : undefined
}

const VERTEX = `varying vec3 vCloudDirection;
void main() {
  vCloudDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAGMENT = `precision highp float;
precision highp sampler3D;
varying vec3 vCloudDirection;
uniform sampler3D noiseMap;
uniform vec3 sunDir, sunColor, ambientColor, hazeColor;
uniform vec3 offsetM, seedOffset;
uniform vec3 localCenter, localSize;
uniform float localRotation;
uniform float baseM, thicknessM, eyeM, coverage, sizeM, density, darkness, flatness;
// Where this layer's own individual clouds stand: the field is carved out there, because each of
// them is drawn by a deck of its own, and drawing the field under it too would sum the two.
const int MAX_HOLES = 8;
uniform int holeCount;
uniform vec3 holeCenter[MAX_HOLES];
uniform vec3 holeSize[MAX_HOLES];
uniform float holeRotation[MAX_HOLES];
const float R = 6371000.0;
// The slice of the noise the weather (where cloud is) is read from — one for every seed, because
// each slice of the small texture has a distribution of its own and the threshold below is fitted
// to this one; a seed shifts the pattern sideways (seedOffset.xz) and picks the billows' slice.
const float SLICE = 0.2787;
// A coverage is the fraction of sky covered, so the threshold is a quantile — the same logistic
// form as the surface deck's coverageThreshold (see CloudSystem), but fitted to what a RAY finds,
// not to the field's values at a point: a ray crosses the whole thickness and every sample above
// the threshold adds to it, then the billows erode the mass again, so the plane's own quantile
// (mean 0.567, spread 0.21) still covered 66% at 55%. Measured instead as the fraction of three
// thousand directions the CPU twin leaves less than half transparent, at seven thresholds: half
// the sky at 0.645, a logistic scale of 0.23 (0.5513 being sqrt(3)/pi) — a tenth of the sky at
// 12%, three tenths at 30%, three quarters at 80%. With 1 - coverage, 55% had covered 78%.
float coverageThreshold(float coverage) {
  float c = clamp(coverage, 0.001, 0.999);
  return 0.645 - 0.23 * 0.5513 * log(c / (1.0 - c));
}
// How far a point is from an ellipsoid's centre in units of its semi-axes: 1 on its surface.
float ellipsoidRadius(vec3 p, float alt, vec3 center, vec3 size, float rotation) {
  vec3 relative = vec3(p.x + offsetM.x - center.x, alt - center.y, p.z + offsetM.z - center.z);
  float c = cos(rotation), s = sin(rotation);
  relative.xz = vec2(c * relative.x - s * relative.z, s * relative.x + c * relative.z);
  return length(relative / (size * 0.5));
}
vec2 roots(float dy, float height) {
  float b = (R + eyeM) * dy;
  float c = (eyeM - height) * (2.0 * R + eyeM + height);
  float d = b * b - c;
  if (d < 0.0) return vec2(1.0, -1.0);
  float q = -b - (b >= 0.0 ? 1.0 : -1.0) * sqrt(d);
  float other = abs(q) < 0.0001 ? 0.0 : c / q;
  return vec2(min(q, other), max(q, other));
}
float altitude(vec3 p) {
  float y = eyeM + p.y;
  float delta = 2.0 * R * y + dot(vec3(p.x, y, p.z), vec3(p.x, y, p.z));
  return delta / (sqrt(max(0.0, R * R + delta)) + R);
}
vec2 clipLocal(vec3 dir, vec2 interval) {
  if (localSize.x <= 0.0) return interval;
  vec3 center = localCenter - offsetM - vec3(0.0, eyeM, 0.0);
  center.y -= dot(center.xz, center.xz) / (2.0 * R);
  float radius = length(localSize) * 0.5 + 25.0;
  float b = dot(dir, center);
  float d = b * b - dot(center, center) + radius * radius;
  if (d < 0.0) return vec2(1.0, -1.0);
  return vec2(max(interval.x, b - sqrt(d)), min(interval.y, b + sqrt(d)));
}
// An individual cloud (localSize set) is a piece of its layer's own field — the same noise at the
// same scale, seed and offset, under the same threshold — told apart from its neighbours by
// nothing but where it stands and how big it is: inside its ellipsoid the field is lifted to a
// full cloud, and past the rim it is nothing. The layer's deck carves the same rim out (see
// holeCenter), so the two meet without summing.
float densityAt(vec3 p) {
  float alt = altitude(p);
  float h = (alt - baseM) / thicknessM;
  bool local = localSize.x > 0.0;
  if (h <= 0.0 || h >= 1.0 || (coverage <= 0.0 && !local)) return 0.0;
  float radius = local ? ellipsoidRadius(p, alt, localCenter, localSize, localRotation) : 0.0;
  if (radius > 1.3) return 0.0;
  vec3 uv = (p + offsetM) / (sizeM * 4.0) + seedOffset;
  // Independent scales and an oblique domain break the small texture's visible tiling.
  vec3 warpUV = vec3(uv.x * 0.173, SLICE, uv.z * 0.173);
  uv.x += (texture(noiseMap, warpUV + vec3(0.13, 0.27, 0.41)).r - 0.5) * 1.3;
  uv.z += (texture(noiseMap, warpUV + vec3(0.67, 0.53, 0.19)).r - 0.5) * 1.3;
  vec2 oblique = vec2(uv.x * 0.731 + uv.z * 0.682, -uv.x * 0.682 + uv.z * 0.731) * 1.371;
  float weather = smoothstep(0.20, 0.80,
    texture(noiseMap, vec3(uv.x, SLICE, uv.z)).r * 0.65 +
    texture(noiseMap, vec3(oblique.x, SLICE + 0.37, oblique.y)).r * 0.35);
  // Subpixel distant masses converge to mean cover rather than aliasing into horizontal bands.
  float distant = smoothstep(8000.0, 40000.0, length(p));
  float billow = mix(texture(noiseMap, uv * vec3(2.0, 3.0, 2.0)).r, 0.5, distant);
  float detail = mix(texture(noiseMap, uv * 7.0).r, 0.5, distant);
  float threshold = coverageThreshold(coverage);
  float carve = 1.0, core = 0.0;
  if (local) {
    float r = radius + (billow - 0.5) * 0.18;
    core = 1.0 - smoothstep(0.35, 1.0, r);
    carve = 1.0 - smoothstep(0.85, 1.15, r);
    weather = mix(weather, 1.0, core);
    // A cloud someone placed is at least as full as a half-covered sky's, whatever its layer's cover.
    threshold = min(threshold, coverageThreshold(0.5));
  }
  for (int i = 0; i < MAX_HOLES; i++) {
    if (i >= holeCount) break;
    carve *= smoothstep(0.85, 1.15, ellipsoidRadius(p, alt, holeCenter[i], holeSize[i], holeRotation[i]) + (billow - 0.5) * 0.18);
  }
  if (carve < 0.001) return 0.0;
  float mask = smoothstep(threshold - 0.10, threshold + 0.10, weather);
  mask = mix(mask, 1.0, smoothstep(0.92, 1.0, coverage));
  mask = mix(mask, max(coverage, core), distant);
  if (mask < 0.001) return 0.0;
  float top = mix(0.45 + 0.55 * billow, 0.96, flatness);
  float profile = smoothstep(0.0, 0.09, h) * (1.0 - smoothstep(top - 0.22, top, h));
  float erosion = mix(max(0.0, mask - (1.0 - billow) * 0.38 - (1.0 - detail) * 0.10), mask * 0.8, flatness);
  return profile * erosion * density * carve;
}
void main() {
  vec3 dir = normalize(vCloudDirection);
  vec2 outer = roots(dir.y, baseM + thicknessM);
  float start = max(0.0, outer.x), end = outer.y;
  if (end <= start) discard;
  vec2 inner = roots(dir.y, baseM);
  if (inner.x <= inner.y) {
    if (start >= inner.x && start < inner.y) start = inner.y;
    else if (inner.x > start) end = min(end, inner.x);
  }
  vec2 ground = roots(dir.y, 0.0);
  if (ground.x <= ground.y && ground.x >= 0.0) end = min(end, ground.x);
  if (end <= start) discard;
  vec2 localInterval = clipLocal(dir, vec2(start, end));
  start = localInterval.x; end = localInterval.y;
  if (end <= start) discard;
  // Atmospheric extinction hides distant detail continuously; no vertical cutoff wall.
  // At grazing incidence only the nearest few kilometres affect transmission significantly.
  end = min(end, start + 18000.0);
  float ds = (end - start) / 48.0;
  float transmission = 1.0;
  vec3 radiance = vec3(0.0);
  for (int i = 0; i < 48; i++) {
    vec3 p = dir * (start + (float(i) + 0.5) * ds);
    float d = densityAt(p);
    if (d > 0.001) {
      float lightDepth = 0.0;
      float lightStep = thicknessM / 3.0;
      for (int j = 0; j < 3; j++) {
        lightDepth += densityAt(p + sunDir * ((float(j) + 0.5) * lightStep)) * lightStep;
      }
      float sunTransmission = exp(-lightDepth * 0.006);
      float forward = pow(max(0.0, dot(dir, sunDir)), 8.0);
      vec3 lit = ambientColor * 0.65 + sunColor * (0.22 + sunTransmission * (0.55 + forward * 0.2));
      lit = mix(hazeColor, lit, exp(-length(p) / 55000.0));
      lit *= mix(1.0, 0.32, darkness);
      float opacity = 1.0 - exp(-d * ds * 0.006);
      radiance += transmission * opacity * lit;
      transmission *= 1.0 - opacity;
      if (transmission < 0.015) break;
    }
  }
  float alpha = 1.0 - transmission;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(radiance / max(0.001, 1.0 - transmission), alpha);
}`

/** Generate a namespaced transmission function using exactly the displayed density field.
 * A finite distance stops sampling at a phenomenon; clouds behind it cannot hide it.
 */
export function cloudTransmissionShader(prefix: string): string {
  const definitions = FRAGMENT.slice(0, FRAGMENT.indexOf("void main()"))
    .replace("varying vec3 vCloudDirection;", "")
  const body = `
float transmissionAt(vec3 dir, float distanceM) {
  vec2 outer = roots(dir.y, baseM + thicknessM);
  float start = max(0.0, outer.x), end = outer.y;
  if (end <= start) return 1.0;
  vec2 inner = roots(dir.y, baseM);
  if (inner.x <= inner.y) {
    if (start >= inner.x && start < inner.y) start = inner.y;
    else if (inner.x > start) end = min(end, inner.x);
  }
  vec2 ground = roots(dir.y, 0.0);
  if (ground.x <= ground.y && ground.x >= 0.0) end = min(end, ground.x);
  vec2 localInterval = clipLocal(dir, vec2(start, end));
  start = localInterval.x; end = localInterval.y;
  end = min(end, min(distanceM, start + 18000.0));
  if (end <= start) return 1.0;
  float ds = (end - start) / 48.0;
  float transmission = 1.0;
  for (int i = 0; i < 48; i++) {
    transmission *= exp(-densityAt(dir * (start + (float(i) + 0.5) * ds)) * ds * 0.006);
    if (transmission < 0.015) break;
  }
  return transmission;
}`
  const names = /\b(noiseMap|sunDir|sunColor|ambientColor|hazeColor|offsetM|seedOffset|localCenter|localSize|localRotation|baseM|thicknessM|eyeM|coverage|sizeM|density|darkness|flatness|SLICE|MAX_HOLES|holeCount|holeCenter|holeSize|holeRotation|R|roots|altitude|coverageThreshold|ellipsoidRadius|clipLocal|densityAt|transmissionAt)\b/g
  return (definitions + body).replace(names, name => prefix + name)
}

/** A real metre-based density volume displayed on an observer-centred proxy shell.
 * The proxy is only a rasterization surface: ray/shell intersections set the cloud distance.
 */
export class VolumetricCloudLayer {
  readonly mesh: Mesh<SphereGeometry, ShaderMaterial>
  readonly uniforms

  constructor(texture: Data3DTexture, radius: number) {
    this.uniforms = {
      noiseMap: { value: texture },
      sunDir: { value: new Vector3(0, 1, 0) }, sunColor: { value: new Color(1, 1, 1) },
      ambientColor: { value: new Color(0.4, 0.45, 0.5) }, hazeColor: { value: new Color(0.5, 0.6, 0.7) },
      offsetM: { value: new Vector3() }, seedOffset: { value: new Vector3() },
      localCenter: { value: new Vector3() }, localSize: { value: new Vector3() }, localRotation: { value: 0 },
      holeCount: { value: 0 },
      holeCenter: { value: Array.from({ length: MAX_HOLES }, () => new Vector3()) },
      holeSize: { value: Array.from({ length: MAX_HOLES }, () => new Vector3()) },
      holeRotation: { value: new Array<number>(MAX_HOLES).fill(0) },
      baseM: { value: 1000 }, thicknessM: { value: 650 }, eyeM: { value: 1.6 },
      coverage: { value: 0.5 }, sizeM: { value: 1400 }, density: { value: 1 }, darkness: { value: 0 }, flatness: { value: 0 }
    }
    const material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, depthTest: true, side: BackSide })
    this.mesh = new Mesh(new SphereGeometry(radius, 32, 16), material)
    this.mesh.frustumCulled = false
  }

  /** `instance` makes this deck one individual cloud of `layer`'s field; `holes` are the individual
   * clouds a LAYER's deck leaves room for, each drawn by a deck of its own. */
  update(layer: CloudLayer, eyeM: number, instance?: CloudInstance, holes: readonly CloudInstance[] = []): void {
    const u = this.uniforms
    u.localSize.value.set(instance?.widthM ?? 0, instance?.thicknessM ?? 0, instance?.depthM ?? 0)
    u.localCenter.value.set(instance?.eastM ?? 0, instance ? instance.baseM + instance.thicknessM / 2 : 0, -(instance?.northM ?? 0))
    u.localRotation.value = (instance?.rotationDeg ?? 0) * Math.PI / 180
    u.holeCount.value = Math.min(MAX_HOLES, holes.length)
    holes.slice(0, MAX_HOLES).forEach((hole, i) => {
      u.holeCenter.value[i].set(hole.eastM, hole.baseM + hole.thicknessM / 2, -hole.northM)
      u.holeSize.value[i].set(hole.widthM, hole.thicknessM, hole.depthM)
      u.holeRotation.value[i] = hole.rotationDeg * Math.PI / 180
    })
    u.baseM.value = Math.max(0, layer.baseM)
    u.thicknessM.value = Math.max(10, layer.thicknessM)
    u.coverage.value = Math.max(0, Math.min(1, layer.coverage))
    u.sizeM.value = Math.max(50, layer.sizeM)
    u.density.value = Math.max(0, Math.min(2, layer.density))
    u.darkness.value = Math.max(0, Math.min(1, layer.darkness ?? 0))
    u.eyeM.value = Math.max(0.1, eyeM)
    u.flatness.value = layer.type === "stratus" ? 1 : layer.type === "stratocumulus" ? 0.45 : 0
    const seed = cloudSeed(layer)
    u.seedOffset.value.set((seed % 97) / 97, (seed % 61) / 61, (seed % 37) / 37)
    // An individual cloud stands whatever its layer's cover, nought included.
    this.mesh.visible = u.density.value > 0 && (instance !== undefined || u.coverage.value > 0)
  }

  /** The shader's own coverageThreshold. */
  static thresholdFor(coverage: number): number {
    const c = Math.min(0.999, Math.max(0.001, coverage))
    return 0.645 - 0.23 * (Math.sqrt(3) / Math.PI) * Math.log(c / (1 - c))
  }

  /** CPU twin of densityAt, for celestial light transmission (not colour/shadow shading). */
  densityAt(point: { x: number; y: number; z: number }): number {
    const u = this.uniforms
    const smooth = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
      return t * t * (3 - 2 * t)
    }
    const mix = (a: number, b: number, t: number) => a + (b - a) * t
    const y = u.eyeM.value + point.y
    const delta = 2 * CLOUD_EARTH_RADIUS_M * y + point.x ** 2 + y ** 2 + point.z ** 2
    const altitude = delta / (Math.sqrt(CLOUD_EARTH_RADIUS_M ** 2 + delta) + CLOUD_EARTH_RADIUS_M)
    const h = (altitude - u.baseM.value) / u.thicknessM.value
    const local = u.localSize.value.x > 0
    if (h <= 0 || h >= 1 || (u.coverage.value <= 0 && !local)) return 0
    const ellipsoidRadius = (center: Vector3, size: Vector3, rotation: number): number => {
      const x = point.x + u.offsetM.value.x - center.x
      const z = point.z + u.offsetM.value.z - center.z
      const c = Math.cos(rotation), s = Math.sin(rotation)
      return Math.hypot((c * x - s * z) / (size.x * 0.5), (altitude - center.y) / (size.y * 0.5), (s * x + c * z) / (size.z * 0.5))
    }
    const radius = local ? ellipsoidRadius(u.localCenter.value, u.localSize.value, u.localRotation.value) : 0
    if (radius > 1.3) return 0
    const uv = [point.x, point.y, point.z].map((v, i) =>
      (v + u.offsetM.value.getComponent(i)) / (u.sizeM.value * 4) + u.seedOffset.value.getComponent(i))
    const data = u.noiseMap.value.image.data as Uint8Array
    const sample = (x: number, y: number, z: number) => {
      const xyz = [x, y, z].map(v => ((v % 1 + 1) % 1) * NOISE_SIZE - 0.5)
      const ints = xyz.map(Math.floor), f = xyz.map((v, i) => v - ints[i])
      let result = 0
      for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const ix = (ints[0] + dx + NOISE_SIZE) % NOISE_SIZE
        const iy = (ints[1] + dy + NOISE_SIZE) % NOISE_SIZE
        const iz = (ints[2] + dz + NOISE_SIZE) % NOISE_SIZE
        result += data[ix + NOISE_SIZE * (iy + NOISE_SIZE * iz)] / 255 *
          (dx ? f[0] : 1 - f[0]) * (dy ? f[1] : 1 - f[1]) * (dz ? f[2] : 1 - f[2])
      }
      return result
    }
    const warpUV = [uv[0] * 0.173, WEATHER_SLICE, uv[2] * 0.173]
    uv[0] += (sample(warpUV[0] + 0.13, warpUV[1] + 0.27, warpUV[2] + 0.41) - 0.5) * 1.3
    uv[2] += (sample(warpUV[0] + 0.67, warpUV[1] + 0.53, warpUV[2] + 0.19) - 0.5) * 1.3
    const ox = (uv[0] * 0.731 + uv[2] * 0.682) * 1.371
    const oz = (-uv[0] * 0.682 + uv[2] * 0.731) * 1.371
    let weather = smooth(0.2, 0.8, sample(uv[0], WEATHER_SLICE, uv[2]) * 0.65 + sample(ox, WEATHER_SLICE + 0.37, oz) * 0.35)
    const distant = smooth(8000, 40000, Math.hypot(point.x, point.y, point.z))
    const billow = mix(sample(uv[0] * 2, uv[1] * 3, uv[2] * 2), 0.5, distant)
    const detail = mix(sample(uv[0] * 7, uv[1] * 7, uv[2] * 7), 0.5, distant)
    let threshold = VolumetricCloudLayer.thresholdFor(u.coverage.value)
    let carve = 1, core = 0
    if (local) {
      const r = radius + (billow - 0.5) * 0.18
      core = 1 - smooth(0.35, 1, r)
      carve = 1 - smooth(0.85, 1.15, r)
      weather = mix(weather, 1, core)
      threshold = Math.min(threshold, VolumetricCloudLayer.thresholdFor(0.5))
    }
    for (let i = 0; i < u.holeCount.value; i++) {
      carve *= smooth(0.85, 1.15, ellipsoidRadius(u.holeCenter.value[i], u.holeSize.value[i], u.holeRotation.value[i]) + (billow - 0.5) * 0.18)
    }
    if (carve < 0.001) return 0
    let mask = smooth(threshold - 0.1, threshold + 0.1, weather)
    mask = mix(mask, 1, smooth(0.92, 1, u.coverage.value))
    mask = mix(mask, Math.max(u.coverage.value, core), distant)
    if (mask < 0.001) return 0
    const top = mix(0.45 + 0.55 * billow, 0.96, u.flatness.value)
    const profile = smooth(0, 0.09, h) * (1 - smooth(top - 0.22, top, h))
    const erosion = mix(Math.max(0, mask - (1 - billow) * 0.38 - (1 - detail) * 0.1), mask * 0.8, u.flatness.value)
    return profile * erosion * u.density.value * carve
  }

  transmissionAt(direction: { x: number; y: number; z: number }, distanceM = Infinity): number {
    const u = this.uniforms
    const interval = cloudRayInterval(direction.y, u.eyeM.value, u.baseM.value, u.thicknessM.value)
    if (!interval) return 1
    let [start, far] = interval
    if (u.localSize.value.x > 0) {
      const center = u.localCenter.value.clone().sub(u.offsetM.value)
      center.y -= u.eyeM.value + (center.x ** 2 + center.z ** 2) / (2 * CLOUD_EARTH_RADIUS_M)
      const radius = u.localSize.value.length() * 0.5 + 25
      const b = direction.x * center.x + direction.y * center.y + direction.z * center.z
      const d = b * b - center.lengthSq() + radius * radius
      if (d < 0) return 1
      start = Math.max(start, b - Math.sqrt(d))
      far = Math.min(far, b + Math.sqrt(d))
    }
    const end = Math.min(far, distanceM, start + 18000)
    if (end <= start) return 1
    const ds = (end - start) / 48
    let transmission = 1
    for (let i = 0; i < 48; i++) {
      const d = start + (i + 0.5) * ds
      transmission *= Math.exp(-this.densityAt({ x: direction.x * d, y: direction.y * d, z: direction.z * d }) * ds * 0.006)
      if (transmission < 0.015) break
    }
    return transmission
  }

  dispose(): void {
    this.mesh.removeFromParent()
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
