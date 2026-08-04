import { BackSide, Color, ShaderMaterial, SphereGeometry, Vector3 } from "three"

/**
 * A single continuous cloud-layer shell — mirrors RainSystem.ts's split of responsibility: pure,
 * deterministic builders here; all scene-graph lifecycle (add/update/dispose, RAF wiring) stays
 * owned by SceneRenderer.
 *
 * This project's earlier cloud systems (flat Sprite billboards, then a pool of InstancedMesh puff
 * clusters built from noise-eroded spheres) are both gone. The sprite pool read as flat/illustrative;
 * the puff-cluster spheres, despite several rounds of tuning (per-fragment rim fade, narrower
 * erosion band, cubic edge weighting), kept reading as scalloped "crescent/claw" fragments rather
 * than solid billows, and never actually looked like clouds. A single noise-shaded dome, sized by
 * weather.cloudCover, replaces both: it already handled partial coverage well (patchy, broken cloud
 * with real sky-colored gaps) once introduced to guarantee genuine full-sky overcast at cloudCover=1
 * (the discrete puff clusters could never promise zero gaps no matter how many were visible), so it
 * became the obvious sole cloud representation once the clusters were dropped. Lighting is a
 * hand-rolled sun-facing glow driven by the app's own real sun direction/color (see SceneRenderer's
 * updateCloudLighting) — no THREE.Light, matching SceneRenderer's own "no real light" convention.
 */

export interface CloudUniforms {
  [uniform: string]: { value: unknown }
  sunDir: { value: Vector3 }
  sunColor: { value: Color }
  ambientColor: { value: Color }
  baseColor: { value: Color }
  coverage: { value: number }
}

const CLOUD_VERTEX_SHADER = `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CLOUD_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambientColor;
uniform vec3 baseColor;
uniform float coverage;
varying vec3 vDir;

// Implied altitude (world units) of the flat plane cloud noise is projected onto — see main()'s own
// comment for why. Roughly matches typical real cloud-base altitudes scaled into this scene's own
// CLOUD_RADIUS=700 dome: a mid-low value so the horizon compression effect is clearly visible
// without being so low it reads as unrealistically close fog.
const float CLOUD_LAYER_HEIGHT = 250.0;

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

  // Sampling noise directly by angular direction put clouds at a CONSTANT apparent size regardless
  // of where you look — real clouds sit at a real, roughly flat altitude, so ones near the horizon
  // are seen through a much longer, grazing slant path and compress/stretch dramatically (the same
  // reason floor tiles or a flat ceiling look compressed toward a vanishing point), while ones
  // overhead look comparatively large. Projecting the view ray onto a flat plane at a fixed height
  // and sampling noise in THAT position (not the raw direction) reproduces the effect for free: near
  // zenith the projected point stays close to the origin (small coordinates, large apparent cloud
  // features); near the horizon dir.y shrinks toward 0 and the projected point races toward infinity
  // (huge, fast-varying coordinates between neighboring pixels = visual compression). dir.y is
  // floored, not left to hit exactly 0, to avoid an infinite/NaN blowup right at the horizon edge.
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

  float shapeFbm = fbm(warpedPos * 0.014) * 0.5 + 0.5;
  float shapeCell = 1.0 - worley(warpedPos * 0.011);
  float shape = mix(shapeFbm, shapeCell, 0.4);
  float detail = fbm(warpedPos * 0.031 + 41.0) * 0.5 + 0.5;

  // Leaves a real, unclouded gap near the horizon (see buildCloudGeometry's own thetaLength — the
  // geometry itself stops short of the true horizon) — a soft fade across that same last few degrees
  // so the shell's own edge doesn't read as a hard-edged rim floating in the sky. Real terrain relief
  // near the observer can rise above the flat y=0 horizon plane in screen space, and this shell
  // (depthTest off, see buildCloudMaterial) would otherwise paint straight over it regardless of
  // which is really closer — see CLOUD_MIN_ALTITUDE_DEG's own comment.
  float horizonFade = smoothstep(0.026, 0.052, dir.y); // sin(1.5deg)..sin(3deg), matches buildCloudGeometry's own cutoff

  // Below coverage's own noise threshold: a broken/patchy ceiling with real sky-colored gaps,
  // exactly like a real transition from scattered to overcast. remap-by-threshold, same technique
  // as the reference skill's own cloudDensity coverage control.
  float threshold = 1.0 - coverage;
  float alpha = smoothstep(threshold - 0.08, threshold + 0.08, shape);
  // This is what actually guarantees "total overcast, no sky visible" at cloudCover=1: force full
  // opacity everywhere as coverage approaches its max, overriding the noise field's own local value
  // rather than merely biasing it (a pure threshold shift would still leave the occasional fragment
  // below threshold even at coverage=1, since fbm's own range rarely spans a full 0..1).
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

/** A continuous sphere shell (BackSide — the camera sits inside it, like buildSky's own dome). Its
 * coverage-driven alpha threshold (see the fragment shader's own comment) handles the whole range
 * from a few scattered patches to genuine full-sky overcast, forced fully opaque at coverage's own
 * max so cloudCover=1 always guarantees zero visible sky. `coverage` is weather.cloudCover directly,
 * baked in at build time (weather is static per sighting, same reasoning as baseColor below). */
export function buildCloudMaterial(baseColor: Color, coverage: number): { material: ShaderMaterial; uniforms: CloudUniforms } {
  const uniforms: CloudUniforms = {
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColor: { value: new Color(1, 1, 1) },
    ambientColor: { value: new Color(0.5, 0.5, 0.5) },
    baseColor: { value: baseColor },
    coverage: { value: coverage }
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false, // CLOUD_RADIUS's precision against the far plane is unreliable — see buildCloudGeometry's own comment
    side: BackSide
  })
  return { material, uniforms }
}

/** Below this altitude, the shell has no geometry at all (see buildCloudGeometry) — a flat ground
 * disc never rises above the true horizon, but real terrain *relief* near the observer can, into
 * screen space the shell would otherwise claim. depthTest is off (see buildCloudMaterial), so
 * without this gap the shell would paint straight over a terrain silhouette poking up into it,
 * regardless of the terrain being genuinely closer. Trimmed twice already (8deg, then 3deg) for
 * reading as an oversized, conspicuously empty band of sky — 1.5deg is close to the minimum that
 * still reliably clears typical nearby relief. Matched by CLOUD_FRAGMENT_SHADER's own horizonFade
 * (sin(1.5deg)=0.026, sin(3deg)=0.052), which tapers the shell's visible bottom edge across the same
 * band rather than a hard-edged rim. */
const CLOUD_MIN_ALTITUDE_DEG = 1.5

/** Fresh SphereGeometry each call (not module-cached) — this mirrors buildSky/buildGround's own
 * "rebuild from scratch, no dirty tracking" style since it's cheap (one sphere, no per-instance
 * data). `radius` is CLOUD_RADIUS, passed in rather than imported since that constant lives in
 * SceneRenderer.ts.
 *
 * three.js measures theta from the +Y pole (0=zenith, PI/2=horizon), so thetaLength stops
 * CLOUD_MIN_ALTITUDE_DEG short of the true horizon instead of reaching all the way to PI/2 — see
 * that constant's own comment. A full sphere down to the literal horizon was the actual bug behind
 * an earlier "looks like ground fog" report: with depthTest off, a full-sphere shell painted over
 * EVERY direction including downward-looking rays toward the ground, since it ignores what's really
 * closer and just overpaints in draw order. At CLOUD_RADIUS=700 against a far plane of
 * SKY_RADIUS*1.2=1080, real depth testing against the sky dome (900) isn't reliable either, which is
 * why depthTest stays off and this geometric restriction does the occlusion work instead. */
export function buildCloudGeometry(radius: number): SphereGeometry {
  const thetaLength = Math.PI / 2 - (CLOUD_MIN_ALTITUDE_DEG * Math.PI) / 180
  return new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, thetaLength)
}
