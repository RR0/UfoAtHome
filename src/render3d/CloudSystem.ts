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
  /** How far the deck is from the observer, along the vertical, in this scene's own units — see
   * the shader's own use of it, and SceneRenderer.cloudLayerOffset for how a real cloud base in
   * meters becomes this. Always positive: which SIDE the deck is on is the mesh's business (it
   * gets flipped), not the shading's. */
  layerHeight: { value: number }
  /**
   * How ICY the deck is, 0 to 1 — the difference between a cumulus and a cirrus.
   *
   * Not a style setting. Water cloud billows: it has cauliflower tops and real gaps, which is what
   * the Worley cells give. Ice cloud does not billow at all — the crystals fall and are drawn out by
   * the wind into long parallel fibres, translucent enough to see the Sun straight through. Drawing
   * ice with the water shading is what made a cirrus deck read as a field of white dots, which a
   * reader quite reasonably took for stars in the middle of the day.
   */
  fibrous: { value: number }
}

const CLOUD_VERTEX_SHADER = `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * The noise the cloud decks are shaped from, shared as source so anything else that needs to know
 * WHERE the cloud is can ask the same field rather than inventing a second one.
 *
 * The ice optics need exactly that: a halo only exists along a line of sight that actually passes
 * through crystals, which is why real halos are partial — an arc rather than a circle, one sundog
 * and not two. Reproducing that means sampling the same veil the sky is drawn from, and two noise
 * fields that merely looked alike would put the gaps in the halo somewhere the cirrus is not.
 */
export const CLOUD_NOISE_GLSL = `vec3 hash3(vec3 p) {
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
}`

/** How much ice cloud lies along a given direction, 0 to 1 — the ice deck's own coverage field,
 * pulled out so the halo shader can multiply by it. Mirrors the fibrous branch of the fragment
 * shader below; the two must move together. */
export const CIRRUS_COVER_GLSL = `
float cirrusCoverAt(vec3 dir, float layerHeight, float coverage) {
  if (coverage <= 0.0 || dir.y <= 0.02) return 0.0;
  vec3 planePos = dir * (layerHeight / max(dir.y, 0.04));
  vec3 warpPos = planePos * 0.006;
  vec3 warp = vec3(fbm(warpPos + 12.3), fbm(warpPos + 47.1), fbm(warpPos + 91.7)) * 40.0;
  vec3 warpedPos = planePos + warp;
  vec3 drawnOut = vec3(warpedPos.x * 0.0016, warpedPos.y * 0.02, warpedPos.z * 0.045);
  float fibre = fbm(drawnOut) * 0.5 + 0.5;
  float wisp = fbm(drawnOut * 3.1 + 7.0) * 0.5 + 0.5;
  float shape = fibre * 0.72 + wisp * 0.28;
  float threshold = 1.0 - coverage;
  return smoothstep(threshold - 0.10, threshold + 0.10, shape);
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

// How far the flat plane that cloud noise is projected onto sits from the observer — see main()'s
// own comment for why there is a plane at all. A uniform rather than a constant since a recording
// states its own cloud base (Weather.cloudBaseM) and the witness their own altitude: the distance
// between the two is what decides how compressed the deck looks toward the horizon, and a witness
// flying just under a low deck sees something very different from one standing under the same deck
// on the ground.
uniform float layerHeight;
uniform float fibrous;

${CLOUD_NOISE_GLSL}

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
  float t = layerHeight / max(dir.y, 0.04);
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

  // ICE. Sampled through a strongly anisotropic scale — a twentieth of the frequency along one
  // axis and four times it across — so the same noise comes out as long parallel filaments instead
  // of blobs. No Worley at all: cells are what billowing looks like, and ice does not billow.
  if (fibrous > 0.0) {
    vec3 drawnOut = vec3(warpedPos.x * 0.0016, warpedPos.y * 0.02, warpedPos.z * 0.045);
    float fibre = fbm(drawnOut) * 0.5 + 0.5;
    float wisp = fbm(drawnOut * 3.1 + 7.0) * 0.5 + 0.5;
    shape = mix(shape, fibre * 0.72 + wisp * 0.28, fibrous);
    detail = mix(detail, wisp, fibrous);
  }

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
  // A cirrus veil never closes the sky. Even the thickest cirrostratus is something you see the Sun
  // THROUGH — that is the entire reason it can make a halo at all — so an ice deck is held down to
  // a fraction of the opacity a water deck reaches, however completely it covers.
  alpha *= mix(1.0, 0.38, fibrous);
  if (alpha < 0.02) discard;

  float diff = dot(dir, L) * 0.5 + 0.5;
  float sunGlow = pow(max(dot(dir, L), 0.0), 6.0) * 0.6; // diffuse bright patch toward the sun, like light through an overcast layer
  vec3 color = baseColor * (sunColor * diff * 0.7 + ambientColor * 0.5) + sunColor * sunGlow;
  // Strong contrast that survives even where alpha is forced fully opaque (high coverage) — shape's
  // own cell structure must stay visible as darker valleys / brighter billow tops, or a "fully
  // overcast" sky degenerates back into one flat painted color with no visible cloud structure.
  color *= mix(0.45, 1.4, shape) * mix(0.8, 1.15, detail);
  // And ice has no shadowed undersides to give it that contrast — it is a bright thin sheet lit
  // through, so the modelling is flattened right down as the deck turns icy.
  color = mix(color, baseColor * (sunColor * 0.85 + ambientColor * 0.45) * mix(0.72, 1.25, shape), fibrous * 0.75);

  gl_FragColor = vec4(color, alpha);
}
`

/** A continuous sphere shell (BackSide — the camera sits inside it, like buildSky's own dome). Its
 * coverage-driven alpha threshold (see the fragment shader's own comment) handles the whole range
 * from a few scattered patches to genuine full-sky overcast, forced fully opaque at coverage's own
 * max so cloudCover=1 always guarantees zero visible sky. `coverage` is weather.cloudCover directly,
 * baked in at build time (weather is static per sighting, same reasoning as baseColor below). */
export function buildCloudMaterial(
  baseColor: Color,
  coverage: number,
  layerHeight: number,
  fibrous = 0
): { material: ShaderMaterial; uniforms: CloudUniforms } {
  const uniforms: CloudUniforms = {
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColor: { value: new Color(1, 1, 1) },
    ambientColor: { value: new Color(0.5, 0.5, 0.5) },
    baseColor: { value: baseColor },
    coverage: { value: coverage },
    layerHeight: { value: layerHeight },
    fibrous: { value: fibrous }
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

/**
 * The same coverage decision the fragment shader above makes, evaluated on the CPU for a single
 * direction — what tells the app whether a given line of sight actually passes through cloud or
 * through one of the deck's gaps.
 *
 * Needed because a UFO shape is painted on a 2D canvas over this scene, not in it (see
 * SceneRenderer.isScreenPointOccluded): the GPU has no idea it exists and cannot hide it behind a
 * cloud, so the app has to ask "is there cloud in this direction" itself. Reading the rendered
 * pixel back would answer "is it bright there", not "is it cloud"; sampling coverage alone would
 * answer "how much cloud in total", not "any right HERE". Only re-evaluating the field does.
 *
 * Kept in this file, immediately below the GLSL it mirrors, precisely because the two must agree:
 * every constant here has a visible twin a few lines up, and changing one without the other would
 * hide a shape where the sky is plainly clear (or leave it visible through a solid deck).
 */
export class CloudField {
  /** Mirrors the shader's own fbm octave count/gain/lacunarity. */
  private static readonly OCTAVES = 4
  private static readonly GAIN = 0.55
  private static readonly LACUNARITY = 2.03

  private static fract(value: number): number {
    return value - Math.floor(value)
  }

  private static hash3(x: number, y: number, z: number): [number, number, number] {
    const dx = x * 127.1 + y * 311.7 + z * 74.7
    const dy = x * 269.5 + y * 183.3 + z * 246.1
    const dz = x * 113.5 + y * 271.9 + z * 124.6
    return [
      CloudField.fract(Math.sin(dx) * 43758.5453) * 2 - 1,
      CloudField.fract(Math.sin(dy) * 43758.5453) * 2 - 1,
      CloudField.fract(Math.sin(dz) * 43758.5453) * 2 - 1
    ]
  }

  private static noise3D(x: number, y: number, z: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const iz = Math.floor(z)
    const fx = x - ix
    const fy = y - iy
    const fz = z - iz
    const ux = fx * fx * (3 - 2 * fx)
    const uy = fy * fy * (3 - 2 * fy)
    const uz = fz * fz * (3 - 2 * fz)
    const corner = (cx: number, cy: number, cz: number): number => {
      const [hx, hy, hz] = CloudField.hash3(ix + cx, iy + cy, iz + cz)
      return hx * (fx - cx) + hy * (fy - cy) + hz * (fz - cz)
    }
    const mix = (a: number, b: number, t: number): number => a + (b - a) * t
    return mix(
      mix(mix(corner(0, 0, 0), corner(1, 0, 0), ux), mix(corner(0, 1, 0), corner(1, 1, 0), ux), uy),
      mix(mix(corner(0, 0, 1), corner(1, 0, 1), ux), mix(corner(0, 1, 1), corner(1, 1, 1), ux), uy),
      uz
    )
  }

  private static fbm(x: number, y: number, z: number): number {
    let sum = 0
    let amp = CloudField.GAIN
    for (let octave = 0; octave < CloudField.OCTAVES; octave++) {
      sum += CloudField.noise3D(x, y, z) * amp
      x *= CloudField.LACUNARITY
      y *= CloudField.LACUNARITY
      z *= CloudField.LACUNARITY
      amp *= CloudField.GAIN
    }
    return sum
  }

  private static worley(x: number, y: number, z: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const iz = Math.floor(z)
    const fx = x - ix
    const fy = y - iy
    const fz = z - iz
    let minDist = Infinity
    for (let nx = -1; nx <= 1; nx++) {
      for (let ny = -1; ny <= 1; ny++) {
        for (let nz = -1; nz <= 1; nz++) {
          const [px, py, pz] = CloudField.hash3(ix + nx, iy + ny, iz + nz)
          const dx = nx + (px * 0.5 + 0.5) - fx
          const dy = ny + (py * 0.5 + 0.5) - fy
          const dz = nz + (pz * 0.5 + 0.5) - fz
          minDist = Math.min(minDist, dx * dx + dy * dy + dz * dz)
        }
      }
    }
    return Math.sqrt(minDist)
  }

  /**
   * How opaque the deck is along `direction` (a unit vector in the same frame the shader's own
   * vDir uses: +Y up), for a deck `layerHeight` away and a given coverage — 0 through a gap, 1
   * through solid cloud. Returns 0 below the deck's own horizon cutoff, where it isn't drawn.
   */
  static alphaAt(direction: { x: number; y: number; z: number }, layerHeight: number, coverage: number): number {
    if (coverage <= 0) return 0
    const dy = Math.abs(direction.y)
    // The shader's own horizonFade, and the geometry's matching cutoff: nothing is drawn in the
    // last couple of degrees, so nothing can hide anything there either.
    if (dy < 0.026) return 0
    const t = layerHeight / Math.max(dy, 0.04)
    const px = direction.x * t
    const py = direction.y * t
    const pz = direction.z * t
    const wx = px * 0.006
    const wy = py * 0.006
    const wz = pz * 0.006
    const warpedX = px + CloudField.fbm(wx + 12.3, wy + 12.3, wz + 12.3) * 40
    const warpedY = py + CloudField.fbm(wx + 47.1, wy + 47.1, wz + 47.1) * 40
    const warpedZ = pz + CloudField.fbm(wx + 91.7, wy + 91.7, wz + 91.7) * 40
    const shapeFbm = CloudField.fbm(warpedX * 0.014, warpedY * 0.014, warpedZ * 0.014) * 0.5 + 0.5
    const shapeCell = 1 - CloudField.worley(warpedX * 0.011, warpedY * 0.011, warpedZ * 0.011)
    const shape = shapeFbm + (shapeCell - shapeFbm) * 0.4
    const threshold = 1 - coverage
    const smoothstep = (edge0: number, edge1: number, value: number): number => {
      const t2 = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
      return t2 * t2 * (3 - 2 * t2)
    }
    const alpha = smoothstep(threshold - 0.08, threshold + 0.08, shape)
    return alpha + (1 - alpha) * smoothstep(0.82, 1, coverage)
  }
}
