import { Color, FrontSide, ShaderMaterial, SphereGeometry, Vector3 } from "three"

/**
 * Layout/material factories for volumetric-looking clouds — mirrors RainSystem.ts's split of
 * responsibility: everything here is a pure, deterministic builder; all scene-graph lifecycle
 * (add/update/dispose, RAF wiring) stays owned by SceneRenderer.
 *
 * Replaces SceneRenderer's old flat Sprite-billboard clouds with clusters of instanced spheres
 * (Three.js's "mesh cluster" cloud technique), each cluster built from a genus-specific particle
 * profile so cumulus/stratocumulus/storm clouds actually read as different shapes, not just
 * differently-tinted flat puffs. Lighting is a hand-rolled wrap-diffuse + subsurface-scattering
 * approximation driven by the app's own real sun direction/color (see SceneRenderer's
 * updateCloudLighting) — no THREE.Light, matching SceneRenderer's own "no real light" convention.
 */

export type CloudGenus = "cumulus" | "stratocumulus" | "dramatic"

export interface CloudGenusProfile {
  particlesPerCloud: number
  /** Local XZ distance range (pre-CLOUD_CLUSTER_SCALE) a particle's center can land from the
   * cluster's own root position. */
  radiusRange: [number, number]
  /** Per-particle sphere scale range (pre-CLOUD_CLUSTER_SCALE). */
  scaleRange: [number, number]
  /** 0-1 — how tall the cluster's local particle spread is relative to its own radius; higher
   * reads as a more vertically-developed cloud (cumulus/dramatic) vs. a flat sheet (stratocumulus). */
  verticalBias: number
  /** Clamps local y >= 0 (flat base, particles build upward from the cluster root) instead of
   * spreading symmetrically above/below it — real cumuliform clouds have a flat, defined base. */
  flatBase: boolean
}

/** Only 3 of the reference skill's 10 cloud genera are used — this app's weather model only has
 * cloudCover/cloudDarkness to map from (see cloudGenusForWeather), not a genus picker, so there's
 * no way for a user to ask for e.g. cirrus specifically. Numbers ported from the skill's own
 * cloud-types.md meshProfile blocks (cumulus/stratocumulus/cumulonimbus). */
export const CLOUD_GENUS_PROFILES: Record<CloudGenus, CloudGenusProfile> = {
  cumulus: { particlesPerCloud: 30, radiusRange: [0, 15], scaleRange: [4, 12], verticalBias: 0.7, flatBase: true },
  stratocumulus: { particlesPerCloud: 20, radiusRange: [0, 14], scaleRange: [6, 14], verticalBias: 0.3, flatBase: true },
  dramatic: { particlesPerCloud: 50, radiusRange: [0, 20], scaleRange: [5, 25], verticalBias: 0.9, flatBase: true }
}

/** darkness>=0.5 reuses SceneRenderer's own LIGHTNING_MIN_DARKNESS threshold — same "is this a
 * storm" concept, so a dark/stormy sky always gets the towering dramatic profile regardless of
 * cover, even before cover alone would reach the "overcast" stratocumulus threshold. */
const DRAMATIC_DARKNESS_THRESHOLD = 0.5
const STRATOCUMULUS_COVER_THRESHOLD = 0.6

export function cloudGenusForWeather(cloudCover: number, cloudDarkness: number): CloudGenus {
  if (cloudDarkness >= DRAMATIC_DARKNESS_THRESHOLD) return "dramatic"
  if (cloudCover >= STRATOCUMULUS_COVER_THRESHOLD) return "stratocumulus"
  return "cumulus"
}

export interface CloudParticleOffset {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
}

export interface CloudClusterLayout {
  baseAltitudeDeg: number
  baseAzimuthDeg: number
  particles: CloudParticleOffset[]
}

export interface CloudLayoutConfig {
  poolSize: number
  /** Leading N of poolSize actually emitted — mirrors SceneRenderer's old buildClouds visibleCount:
   * lowering cloudCover always drops the same trailing clusters first, not a different random subset. */
  visibleCount: number
  genus: CloudGenus
  seed: number
  /** Uniform multiplier on every profile offset/scale number — the skill's own numbers assume a
   * ~20-100-unit flight scene; this app's clouds sit at CLOUD_RADIUS=700, so they need scaling up
   * to read as a comparable on-screen size to the sky dome/stars/bodies around them. */
  clusterScale: number
}

function mulberry32(seed: number): () => number {
  let a = seed
  return function random(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One particle's local offset/scale within its cluster — a generalized version of the reference
 * skill's per-genus _cloudProfile branches, driven by CloudGenusProfile instead of three hardcoded
 * functions. `index`/`total` bias later-placed particles smaller/flatter, the same "taller near the
 * cluster's own center" shaping the skill's cumulus branch used. */
function placeParticle(profile: CloudGenusProfile, index: number, random: () => number): CloudParticleOffset {
  const angle = random() * Math.PI * 2
  const radius = profile.radiusRange[0] + random() * (profile.radiusRange[1] - profile.radiusRange[0])
  const heightRange = profile.radiusRange[1] * profile.verticalBias
  let y = random() * heightRange
  y = profile.flatBase ? Math.max(y - heightRange * 0.15, 0) : (random() - 0.5) * heightRange
  const centerBias = 1 - (index / profile.particlesPerCloud) * 0.4
  const sx = profile.scaleRange[0] + random() * (profile.scaleRange[1] - profile.scaleRange[0])
  const sy = (profile.scaleRange[0] + random() * (profile.scaleRange[1] - profile.scaleRange[0])) * centerBias
  const sz = profile.scaleRange[0] + random() * (profile.scaleRange[1] - profile.scaleRange[0])
  return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, sx, sy, sz }
}

/** Same "consume the RNG stream for every pool slot, only emit the leading visibleCount" discipline
 * as SceneRenderer's old buildClouds, so a cloudCover change never reshuffles which clusters are
 * visible — it only reveals/hides the same deterministic set. */
export function buildCloudClusterLayouts(config: CloudLayoutConfig): CloudClusterLayout[] {
  const random = mulberry32(config.seed)
  const profile = CLOUD_GENUS_PROFILES[config.genus]
  const layouts: CloudClusterLayout[] = []
  for (let i = 0; i < config.poolSize; i++) {
    const baseAltitudeDeg = 15 + random() * 55
    const baseAzimuthDeg = random() * 360
    const particles: CloudParticleOffset[] = []
    for (let p = 0; p < profile.particlesPerCloud; p++) {
      const local = placeParticle(profile, p, random)
      particles.push({
        x: local.x * config.clusterScale,
        y: local.y * config.clusterScale,
        z: local.z * config.clusterScale,
        sx: local.sx * config.clusterScale,
        sy: local.sy * config.clusterScale,
        sz: local.sz * config.clusterScale
      })
    }
    if (i < config.visibleCount) layouts.push({ baseAltitudeDeg, baseAzimuthDeg, particles })
  }
  return layouts
}

let sharedCloudSphereGeometry: SphereGeometry | undefined

/** One shared low-poly unit sphere (module-scope cached, same convention as RainSystem's own
 * getRainStreakTexture) — every cluster's InstancedMesh reuses it, only each instance's own matrix
 * (position + non-uniform scale) differs. */
export function getCloudSphereGeometry(): SphereGeometry {
  if (sharedCloudSphereGeometry) return sharedCloudSphereGeometry
  sharedCloudSphereGeometry = new SphereGeometry(1, 12, 8)
  return sharedCloudSphereGeometry
}

export interface CloudUniforms {
  // Index signature so this satisfies ShaderMaterial's own uniforms type — named props below stay
  // individually typed for callers, same pattern as RainSystem's RainUniforms.
  [uniform: string]: { value: unknown }
  sunDir: { value: Vector3 }
  sunColor: { value: Color }
  ambientColor: { value: Color }
  baseColor: { value: Color }
  opacity: { value: number }
}

const MESH_CLOUD_VERTEX_SHADER = `
varying vec3 vNormal;
varying float vRimFade;

void main() {
  // Instance rotation/scale applied to the normal directly, without the inverse-transpose
  // correction a non-uniformly-scaled normal strictly needs — an accepted simplification for
  // these soft, stylized puffs (the reference skill's own shader skips this entirely too).
  vec3 instanceNormal = normalize((instanceMatrix * vec4(normal, 0.0)).xyz);
  vNormal = normalize(normalMatrix * instanceNormal);
  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 viewDir = normalize(cameraPosition - worldPosition.xyz);
  // Fresnel-style rim fade: 1 face-on (opaque core), fading to 0 at the silhouette — stands in for
  // the soft volumetric falloff a true raymarched cloud would have at its edges. Replaces the
  // reference skill's own vEdgeFade (1.0 - length(position)*0.5) — a no-op on a true unit sphere,
  // since length(position) is always exactly 1 by construction.
  vRimFade = smoothstep(0.0, 0.6, dot(vNormal, viewDir));
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const MESH_CLOUD_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambientColor;
uniform vec3 baseColor;
uniform float opacity;
varying vec3 vNormal;
varying float vRimFade;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(sunDir); // points from the cloud toward the sun, matching horizontalToCartesian's own convention
  float diff = dot(N, L) * 0.5 + 0.5;                   // wrap diffuse — softer than a hard lit/unlit split
  float sss = pow(max(dot(-N, L), 0.0), 2.0) * 0.4;      // subsurface approximation: thin edges lit from behind
  float topBias = smoothstep(-0.2, 0.5, N.y) * 0.3;      // real clouds are brighter on top, sun-facing or not
  vec3 color = baseColor * (sunColor * diff + ambientColor * 0.4 + sunColor * sss);
  color += sunColor * topBias;
  float baseDarken = smoothstep(0.3, -0.3, N.y) * 0.3;   // darker underside
  color *= 1.0 - baseDarken;
  gl_FragColor = vec4(color, opacity * vRimFade);
}
`

/** Builds the one shared ShaderMaterial every cluster's InstancedMesh in a given buildClouds() call
 * references — see SceneRenderer's disposeCloudSystem for why disposal is single, not per-cluster.
 * `side: FrontSide` (not the reference skill's DoubleSide): the camera is fixed at the world origin
 * and can never enter a cluster at CLOUD_RADIUS=700, so backfaces are never visible — halves
 * fragment cost for zero visual loss in this app's fixed-observer model. */
export function buildCloudMaterial(baseColor: Color, opacity: number): { material: ShaderMaterial; uniforms: CloudUniforms } {
  const uniforms: CloudUniforms = {
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColor: { value: new Color(1, 1, 1) },
    ambientColor: { value: new Color(0.5, 0.5, 0.5) },
    baseColor: { value: baseColor },
    opacity: { value: opacity }
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: MESH_CLOUD_VERTEX_SHADER,
    fragmentShader: MESH_CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    // Same precision reasoning as SceneRenderer's old CLOUD_RENDER_ORDER comment: at CLOUD_RADIUS=700
    // against a far plane of SKY_RADIUS*1.2=1080, real depth testing against the sky dome isn't
    // reliable — draw order (renderOrder, set by the caller) does the layering instead. Accepted v1
    // side effect: instances within/across clusters no longer self-sort by real distance either: the
    // soft rim-fade + transparency mean an occasional wrong-order overlap blends rather than hard-clips.
    depthTest: false,
    side: FrontSide
  })
  return { material, uniforms }
}
