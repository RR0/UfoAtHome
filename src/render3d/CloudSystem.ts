import { BackSide, Color, FrontSide, InstancedBufferAttribute, ShaderMaterial, SphereGeometry, Vector3 } from "three"

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
  /** Per-particle noise-domain offset (see MESH_CLOUD_FRAGMENT_SHADER) — without this every
   * instance sampled the exact same 3D noise field in its own local unit-sphere space and looked
   * like identical repeated puffs; this decorrelates them cheaply (one scalar, not a full 3D
   * offset) while staying in the same deterministic mulberry32 stream as the rest of the layout. */
  seed: number
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
  const seed = random() * 100
  return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, sx, sy, sz, seed }
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
        sz: local.sz * config.clusterScale,
        seed: local.seed
      })
    }
    if (i < config.visibleCount) layouts.push({ baseAltitudeDeg, baseAzimuthDeg, particles })
  }
  return layouts
}

let sharedCloudSphereGeometry: SphereGeometry | undefined

/** One shared unit sphere (module-scope cached, same convention as RainSystem's own
 * getRainStreakTexture) — cloned per cluster by buildCloudInstanceGeometry (an InstancedMesh's
 * per-instance aSeed attribute can't live on a geometry shared across meshes with different
 * instance counts), so only the base vertex/index buffers are actually shared. 16x12 (up from an
 * earlier 12x8) for smoother base normals feeding the fragment shader's noise erosion — a coarser
 * sphere's own facets showed through as visible flat-shaded bands. */
export function getCloudSphereGeometry(): SphereGeometry {
  if (sharedCloudSphereGeometry) return sharedCloudSphereGeometry
  sharedCloudSphereGeometry = new SphereGeometry(1, 16, 12)
  return sharedCloudSphereGeometry
}

/** Clones the shared base sphere and attaches this cluster's own per-instance aSeed attribute (see
 * CloudParticleOffset.seed) — must be a clone, not the shared geometry itself, since two clusters
 * with different instance counts can't share one InstancedBufferAttribute. */
export function buildCloudInstanceGeometry(layout: CloudClusterLayout): SphereGeometry {
  const geometry = getCloudSphereGeometry().clone()
  const seeds = new Float32Array(layout.particles.length)
  layout.particles.forEach((particle, i) => {
    seeds[i] = particle.seed
  })
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1))
  return geometry
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
attribute float aSeed;
varying vec3 vNormal;
varying float vRimFade;
varying vec3 vLocalPos;
varying float vSeed;

void main() {
  vLocalPos = position; // pre-instance-transform, unit-sphere-local — see fragment shader's own noise
  vSeed = aSeed;
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
varying vec3 vLocalPos;
varying float vSeed;

// Cheap 3D value noise + fbm — a single-sample-per-fragment impostor, not a real raymarched
// density field (see the reference skill's own volumetric path for that, ~80 steps/pixel). Used
// to erode the sphere's clean geometric silhouette and break up its flat-shaded lighting bands,
// which otherwise read as a smooth-shaded "toon" ball rather than a fluffy billow.
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}
float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
            dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
            dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
            dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
            dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    sum += noise3D(p) * amp;
    p *= 2.03;
    amp *= 0.55;
  }
  return sum; // roughly -1..1
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(sunDir); // points from the cloud toward the sun, matching horizontalToCartesian's own convention

  vec3 noiseP = vLocalPos * 2.2 + vec3(vSeed * 13.1, vSeed * 7.7, vSeed * 19.3);
  float shape = fbm(noiseP) * 0.5 + 0.5; // 0..1, per-fragment billow density

  // Erodes the sphere's silhouette with noise instead of a clean geometric edge — a real cumulus
  // puff doesn't end in a perfect circle. depthTest is already off (see buildCloudMaterial), so an
  // eroded gap just reveals whatever's behind (sky, or another instance), reading as the frilly,
  // layered edge real cloud photography shows rather than a hole. edgeWeight (0 at the dead center,
  // 1 at the silhouette, squared to concentrate the effect even closer to the rim) scales the
  // erosion term, so a patch of low-shape noise mid-sphere just softens slightly rather than
  // carving a visible chunk out of the core — an earlier version scaled erosion directly off
  // vRimFade everywhere, which could erode broad swaths of a puff's face into thin, partial
  // crescents instead of frilly-edged but otherwise solid billows.
  float edgeWeight = 1.0 - vRimFade;
  float density = vRimFade - edgeWeight * edgeWeight * (1.0 - shape) * 0.9;
  if (density < 0.02) discard;

  // Pseudo self-shadow: one extra noise sample offset toward the sun stands in for a real light
  // march (see the raymarching reference's own lightMarch) — a fragment whose sunward neighborhood
  // reads as denser billow gets darkened, breaking up the single flat N.L lighting band that on its
  // own read as "toon shaded".
  float shadowSample = fbm(noiseP + L * 1.6) * 0.5 + 0.5;
  float selfShadow = mix(1.0, 0.5, clamp(shadowSample * 1.4 - 0.2, 0.0, 1.0));

  float diff = dot(N, L) * 0.5 + 0.5;                    // wrap diffuse — softer than a hard lit/unlit split
  float sss = pow(max(dot(-N, L), 0.0), 2.0) * 0.4;      // subsurface approximation: thin edges lit from behind
  float topBias = smoothstep(-0.2, 0.5, N.y) * 0.3;      // real clouds are brighter on top, sun-facing or not
  vec3 color = baseColor * (sunColor * diff * selfShadow + ambientColor * 0.4 + sunColor * sss);
  color += sunColor * topBias;
  float baseDarken = smoothstep(0.3, -0.3, N.y) * 0.3;   // darker underside
  color *= 1.0 - baseDarken;
  color *= mix(0.82, 1.12, shape);                        // surface variegation — denser billows read brighter

  gl_FragColor = vec4(color, opacity * density);
}
`

export interface OvercastUniforms {
  [uniform: string]: { value: unknown }
  sunDir: { value: Vector3 }
  sunColor: { value: Color }
  ambientColor: { value: Color }
  baseColor: { value: Color }
  coverage: { value: number }
}

const OVERCAST_VERTEX_SHADER = `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const OVERCAST_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambientColor;
uniform vec3 baseColor;
uniform float coverage;
varying vec3 vDir;

// Implied altitude (world units) of the flat plane cloud noise is projected onto — see main()'s own
// comment for why. Picked to roughly match where the InstancedMesh puff clusters actually sit
// (altitude 15-70deg at CLOUD_RADIUS=700, i.e. y in [181, 658]): a mid-low value so the horizon
// compression effect is clearly visible without being so low it reads as unrealistically close fog.
const float CLOUD_LAYER_HEIGHT = 250.0;

// Duplicated from MESH_CLOUD_FRAGMENT_SHADER rather than shared — this project keeps each
// ShaderMaterial's GLSL self-contained (see RainSystem.ts's own doc comment on why: no external
// .glsl files, no onBeforeCompile chunk injection).
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}
float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
            dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
            dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
            dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
        mix(dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
            dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    sum += noise3D(p) * amp;
    p *= 2.03;
    amp *= 0.55;
  }
  return sum;
}
// Cellular (Worley) noise — distance to the nearest of 27 randomly-jittered cell points. Unlike
// fbm's smooth interpolated blobs, this has genuinely sharp valleys between cells, reading as
// distinct billowy cloud masses with real gaps/shadows between them rather than one soft gradient.
float worley(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 point = hash3(i + neighbor) * 0.5 + 0.5;
        vec3 diff = neighbor + point - f;
        minDist = min(minDist, dot(diff, diff));
      }
    }
  }
  return sqrt(minDist);
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 L = normalize(sunDir);

  // Sampling noise directly by angular direction (the first version of this shader) put clouds at
  // a CONSTANT apparent size regardless of where you look — real clouds sit at a real, roughly flat
  // altitude, so ones near the horizon are seen through a much longer, grazing slant path and
  // compress/stretch dramatically (the same reason floor tiles or a flat ceiling look compressed
  // toward a vanishing point), while ones overhead look comparatively large. A uniform-on-the-sphere
  // texture has no such compression, which is exactly what read as "obviously a sphere" rather than
  // a real sky. Projecting the view ray onto a flat plane at a fixed height and sampling noise in
  // THAT position (not the raw direction) reproduces the effect for free: near zenith the projected
  // point stays close to the origin (small coordinates, large apparent cloud features); near the
  // horizon dir.y shrinks toward 0 and the projected point races toward infinity (huge, fast-varying
  // coordinates between neighboring pixels = visual compression). dir.y is floored, not left to hit
  // exactly 0, to avoid an infinite/NaN blowup right at the horizon edge.
  float t = CLOUD_LAYER_HEIGHT / max(dir.y, 0.04);
  vec3 planePos = dir * t;

  // Domain warp: distorts the position each noise layer below actually samples, using a slower,
  // broader noise field of its own. Without this, Worley cells (shapeCell) come out as too-regular,
  // too-round, near-identical-sized ovals — visually indistinguishable from a UFO's own saucer
  // silhouette in this app, which is exactly the wrong thing for a cloud layer to look like. Warping
  // the sample position stretches/bends those cell boundaries into irregular, organic shapes instead.
  vec3 warpPos = planePos * 0.006;
  vec3 warp = vec3(fbm(warpPos + 12.3), fbm(warpPos + 47.1), fbm(warpPos + 91.7)) * 40.0;
  vec3 warpedPos = planePos + warp;

  // Frequencies tuned so a 45deg-elevation fragment samples roughly the same effective noise scale
  // the previous dir-space version did at that same elevation (where planePos's own magnitude ~=
  // CLOUD_LAYER_HEIGHT by construction) — keeps the "how big does one cloud formation look overhead"
  // read consistent with earlier tuning, while now varying correctly with viewing angle.
  float shapeFbm = fbm(warpedPos * 0.014) * 0.5 + 0.5;
  float shapeCell = 1.0 - worley(warpedPos * 0.011);
  // Weighted toward fbm now (was 0.55 toward the cellular field) — cellular structure still adds
  // billowy definition, but no longer dominates into a field of same-sized ovals.
  float shape = mix(shapeFbm, shapeCell, 0.4);
  float detail = fbm(warpedPos * 0.031 + 41.0) * 0.5 + 0.5;

  // Leaves a real, unclouded gap near the horizon (see buildOvercastGeometry's own thetaLength —
  // the geometry itself stops short of the true horizon) — a soft fade across that same last few
  // degrees so the shell's own edge doesn't read as a hard-edged rim floating in the sky. Real
  // terrain relief near the observer can rise above the flat y=0 horizon plane in screen space, and
  // this shell (depthTest off, same reasoning as the puff clusters) would otherwise paint straight
  // over it regardless of which is really closer — see OVERCAST_MIN_ALTITUDE_DEG's own comment.
  float horizonFade = smoothstep(0.052, 0.105, dir.y); // sin(3deg)..sin(6deg), matches buildOvercastGeometry's own cutoff

  // Below coverage's own noise threshold: a broken/patchy ceiling with real sky-colored gaps,
  // exactly like a real transition from scattered to overcast. remap-by-threshold, same technique
  // as the reference skill's own cloudDensity coverage control.
  float threshold = 1.0 - coverage;
  float alpha = smoothstep(threshold - 0.08, threshold + 0.08, shape);
  // The puff clusters alone can never promise zero sky gaps (see SceneRenderer's buildClouds doc
  // comment) — this is what actually guarantees "total overcast, no sky visible" at cloudCover=1:
  // force full opacity everywhere as coverage approaches its max, overriding the noise field's own
  // local value rather than merely biasing it (a pure threshold shift would still leave the
  // occasional fragment below threshold even at coverage=1, since fbm's own range rarely spans a
  // full 0..1).
  alpha = mix(alpha, 1.0, smoothstep(0.82, 1.0, coverage)) * horizonFade;
  if (alpha < 0.02) discard;

  float diff = dot(dir, L) * 0.5 + 0.5;
  float sunGlow = pow(max(dot(dir, L), 0.0), 6.0) * 0.6; // diffuse bright patch toward the sun, like light through an overcast layer
  vec3 color = baseColor * (sunColor * diff * 0.7 + ambientColor * 0.5) + sunColor * sunGlow;
  // Strong contrast that survives even where alpha is forced fully opaque (high coverage) — shape's
  // own cell structure must stay visible as darker valleys / brighter billow tops, or a "fully
  // overcast" sky degenerates back into one flat painted color with no visible cloud structure.
  color *= mix(0.45, 1.4, shape) * mix(0.8, 1.15, detail);

  gl_FragColor = vec4(color, alpha);
}
`

/** A continuous sphere shell (BackSide — the camera sits inside it, like buildSky's own dome) that
 * guarantees genuine total overcast at cloudCover=1: the InstancedMesh puff clusters (see
 * buildCloudMaterial) are placed at scattered, discrete altitude/azimuth slots and can never
 * promise zero sky-colored gaps between them no matter how many are visible. This shell fades in
 * as coverage rises and is forced fully opaque at coverage's own max — see the fragment shader's
 * own comment. `coverage` is weather.cloudCover directly, baked in at build time (weather is
 * static per sighting, same reasoning as buildCloudMaterial's baseColor). */
export function buildOvercastMaterial(baseColor: Color, coverage: number): { material: ShaderMaterial; uniforms: OvercastUniforms } {
  const uniforms: OvercastUniforms = {
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColor: { value: new Color(1, 1, 1) },
    ambientColor: { value: new Color(0.5, 0.5, 0.5) },
    baseColor: { value: baseColor },
    coverage: { value: coverage }
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: OVERCAST_VERTEX_SHADER,
    fragmentShader: OVERCAST_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false, // same reasoning as buildCloudMaterial — CLOUD_RADIUS is unreliable against the far plane
    side: BackSide
  })
  return { material, uniforms }
}

/** Below this altitude, the shell has no geometry at all (see buildOvercastGeometry) — a flat ground
 * disc never rises above the true horizon, but real terrain *relief* near the observer can, into
 * screen space the shell would otherwise claim. depthTest is off (see buildOvercastMaterial), so
 * without this gap the shell would paint straight over a terrain silhouette poking up into it,
 * regardless of the terrain being genuinely closer — the same class of bug as the ground bleed this
 * shell's geometry was already restricted to fix, just for relief instead of the flat disc. Kept
 * small (3deg, down from an initial 8deg that read as an oversized, conspicuously empty band of sky)
 * — just enough to clear typical nearby relief, not a wide gap. Matched by OVERCAST_FRAGMENT_SHADER's
 * own horizonFade (sin(3deg)=0.052, sin(6deg)=0.105), which tapers the shell's visible bottom edge
 * across the same band rather than a hard-edged rim. */
const OVERCAST_MIN_ALTITUDE_DEG = 3

/** Fresh SphereGeometry each call (not module-cached like getCloudSphereGeometry) — this mirrors
 * buildSky/buildGround's own "rebuild from scratch, no dirty tracking" style since it's cheap
 * (one sphere, no per-instance data) and, unlike the cluster base sphere, isn't cloned per caller
 * so there's no sharing benefit to cache. `radius` is CLOUD_RADIUS, passed in rather than imported
 * since that constant lives in SceneRenderer.ts.
 *
 * three.js measures theta from the +Y pole (0=zenith, PI/2=horizon), so thetaLength stops
 * OVERCAST_MIN_ALTITUDE_DEG short of the true horizon instead of reaching all the way to PI/2 — see
 * that constant's own comment. A full sphere down to the literal horizon was the actual bug behind
 * an earlier "looks like ground fog" report: with depthTest off, a full-sphere shell painted over
 * EVERY direction including downward-looking rays toward the ground, since it ignores what's really
 * closer and just overpaints in draw order. */
export function buildOvercastGeometry(radius: number): SphereGeometry {
  const thetaLength = Math.PI / 2 - (OVERCAST_MIN_ALTITUDE_DEG * Math.PI) / 180
  return new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, thetaLength)
}

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
