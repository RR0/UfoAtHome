import { BackSide, Color, ShaderMaterial, SphereGeometry, Vector3 } from "three"

/** Lightweight surface clouds used by the fallback renderer and thin cirrus.
 * VolumetricClouds provides metre-based density integration for thick layers. Both systems
 * sample a world-anchored field; their scene-graph lifecycle is owned by SceneRenderer and
 * LayeredCloudSystem. Lighting follows the observation's Sun and ambient sky.
 */

export interface CloudUniforms {
  [uniform: string]: { value: unknown }
  sunDir: { value: Vector3 }
  sunColor: { value: Color }
  ambientColor: { value: Color }
  baseColor: { value: Color }
  coverage: { value: number }
  opticalDensity: { value: number }
  darkness: { value: number }
  /** How far the deck is from the observer, along the vertical, in this scene's own units — see
   * the shader's own use of it, and SceneRenderer.cloudLayerOffset for how a real cloud base in
   * meters becomes this. Always positive: which SIDE the deck is on is the mesh's business (it
   * gets flipped), not the shading's. */
  layerHeight: { value: number }
  fieldOffset: { value: Vector3 }
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
varying vec3 vWorldDir;

void main() {
  vDir = normalize(position);
  // The direction in the world, from the eye — what an ice display this deck draws is read along
  // (see ICE_HALO_LIGHT_GLSL), exactly as IceHaloEffect's own sphere reads it.
  vWorldDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
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
}

/**
 * The same, band-limited to what the pixel can show. An octave finer than two pixels is not a
 * detail but a flicker: it lands on a pixel at random, and the smallest move of the eye — a step of
 * the witness — redraws the veil differently. Each octave is faded out, to its mean of nought, as
 * its period comes down from four pixels to two, the footprint of a pixel in the noise's own
 * coordinates read off the screen-space derivatives. Only in a fragment shader, and only under
 * uniform control flow, where derivatives exist.
 */
float fbmFiltered(vec3 p) {
  vec3 dx = dFdx(p);
  vec3 dy = dFdy(p);
  float footprint = max(length(dx), length(dy));
  float sum = 0.0;
  float amp = 0.55;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    float shown = 1.0 - smoothstep(0.25, 0.5, footprint * frequency);
    sum += noise3D(p) * amp * shown;
    p *= 2.03;
    frequency *= 2.03;
    amp *= 0.55;
  }
  return sum;
}

// The shape fields are noise, and noise clusters: the water deck's runs from 0.23 to 0.76 with
// nearly everything between 0.33 and 0.67, the ice deck's tighter still. A threshold of 1 - coverage
// on such a field drew NOTHING under a third of cover, a hundredth of the sky at 30%, and half of it
// at 50% by coincidence alone — a recording stating 12% cloud showed a clear sky under three chips
// saying otherwise. The threshold is the field's own quantile instead, so that a coverage IS the
// fraction of sky covered: a logistic fit of the distribution measured over twenty thousand
// directions (see WATER_FIELD_MEAN and the others), 0.5513 being sqrt(3)/pi, what turns a standard
// deviation into a logistic scale.
float coverageThreshold(float coverage, float mean, float spread) {
  float c = clamp(coverage, 0.001, 0.999);
  return mean - spread * 0.5513 * log(c / (1.0 - c));
}`

/** What the water deck's shape field measures, over twenty thousand directions at three layer
 * heights (it does not depend on the height): its mean and standard deviation. What
 * coverageThreshold needs to turn a coverage into the threshold that covers that much sky. */
export const WATER_FIELD_MEAN = 0.495
export const WATER_FIELD_SD = 0.075
/** The same for the ice deck's fibrous field, which is narrower. */
export const ICE_FIELD_MEAN = 0.5
export const ICE_FIELD_SD = 0.047
/** Half the width of the ramp a deck's edge is drawn across, in shape units: the water deck's, and
 * the same fraction of the ice field's narrower spread, so both edges are equally soft relative to
 * their field and a coverage stays the fraction of sky it names (within 4% for ice, measured). */
export const WATER_RAMP = 0.08
export const ICE_RAMP = WATER_RAMP * ICE_FIELD_SD / WATER_FIELD_SD

/** How much ice cloud lies along a given direction, 0 to 1 — the ice deck's own coverage field,
 * pulled out so the halo shader can multiply by it. Mirrors the fibrous branch of the fragment
 * shader below; the two must move together. */
export const CIRRUS_COVER_GLSL = `
float cirrusCoverOf(float shape, float coverage) {
  float threshold = coverageThreshold(coverage, ${ICE_FIELD_MEAN.toFixed(3)}, ${ICE_FIELD_SD.toFixed(3)});
  float present = smoothstep(threshold - 0.10, threshold + 0.10, shape);
  // GRADED, not a mask. A pure threshold saturates to 1 everywhere once the veil is thick — which
  // is exactly the sky a reader tested, 88 per cent cover — and the halo went back to being the
  // perfect circle of a diagram. A veil is not uniform just because it is complete: it has dense
  // fibres and thin lanes, and the display follows them. Keeping the underlying shape in the answer
  // is what makes a halo brighter along one arc than another even under total cover.
  return present * (0.30 + 0.70 * smoothstep(0.25, 0.85, shape));
}
float cirrusCoverAt(vec3 dir, float layerHeight, float coverage, vec3 fieldOffset) {
  if (coverage <= 0.0 || dir.y < 0.0) return 0.0;
  vec3 planePos = dir * (layerHeight / max(dir.y, 0.04)) + fieldOffset;
  vec3 warpPos = planePos * 0.006;
  vec3 warp = vec3(fbm(warpPos + 12.3), fbm(warpPos + 47.1), fbm(warpPos + 91.7)) * 40.0;
  vec3 warpedPos = planePos + warp;
  vec3 drawnOut = vec3(warpedPos.x * 0.0016, warpedPos.y * 0.02, warpedPos.z * 0.045);
  float fibre = fbm(drawnOut) * 0.5 + 0.5;
  float wisp = fbm(drawnOut * 3.1 + 7.0) * 0.5 + 0.5;
  return cirrusCoverOf(fibre * 0.72 + wisp * 0.28, coverage);
}
`

/**
 * The light of an ice display along a direction, from the map IceHaloEffect traced — its whole
 * shading, pulled out so the ice deck can draw the display itself (see IceHaloEffect.hosted) with
 * the veil it has just worked out, rather than the display working the same veil out again.
 */
export const ICE_HALO_LIGHT_GLSL = `
uniform vec3 uSource;
uniform vec3 uUp;
uniform float uStrength;
uniform vec3 uTint;
uniform sampler2D uMap;
uniform float uGain;
vec3 iceHaloLight(vec3 dir, float ice) {
  vec3 up = normalize(uUp);
  vec3 source = normalize(uSource);
  // The map is held in the source's own frame: how far up, and how far round from its
  // bearing. Reading it that way is what lets one traced map serve every direction the
  // witness may be facing and every bearing the Sun may be on.
  float altitude = asin(clamp(dot(dir, up), -1.0, 1.0));
  vec3 sourceLevel = source - up * dot(source, up);
  vec3 dirLevel = dir - up * dot(dir, up);
  float sourceLength = length(sourceLevel);
  float dirLength = length(dirLevel);
  float around = (sourceLength < 1e-4 || dirLength < 1e-4)
    ? 0.0
    : acos(clamp(dot(sourceLevel, dirLevel) / (sourceLength * dirLength), -1.0, 1.0));
  vec2 place = vec2(around / 3.14159265, (altitude + 1.57079633) / 3.14159265);
  vec3 light = texture2D(uMap, place).rgb * uGain * uTint;
  // A little of the veil's own patchiness carried through rather than a hard mask, so the
  // display fades at the edge of a fibre instead of ending on a cut line.
  return light * uStrength * (0.25 + 0.75 * ice);
}
`

const CLOUD_FRAGMENT_SHADER = `
precision highp float;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform vec3 ambientColor;
uniform vec3 baseColor;
uniform float coverage;
uniform float opticalDensity;
uniform float darkness;
varying vec3 vDir;

// How far the flat plane that cloud noise is projected onto sits from the observer — see main()'s
// own comment for why there is a plane at all. A uniform rather than a constant since a recording
// states its own cloud base (Weather.cloudBaseM) and the witness their own altitude: the distance
// between the two is what decides how compressed the deck looks toward the horizon, and a witness
// flying just under a low deck sees something very different from one standing under the same deck
// on the ground.
uniform float layerHeight;
uniform vec3 fieldOffset;
uniform float fibrous;
varying vec3 vWorldDir;
// 1 while this deck draws an ice display itself — see IceHaloEffect.hosted — and the display is up.
uniform float uHaloShown;
// 1 while this deck is blended as PREMULTIPLIED light (see LayeredCloudSystem.hostHalo), which is
// what lets one drawing both lay the veil over what is behind it and add the display's light.
uniform float uPremultiplied;

${CLOUD_NOISE_GLSL}
${CIRRUS_COVER_GLSL}
${ICE_HALO_LIGHT_GLSL}

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
  vec3 planePos = dir * t + fieldOffset;

  // Domain warp: distorts the position each noise layer below actually samples, using a slower,
  // broader noise field of its own. Without this, Worley cells (shapeCell) come out as too-regular,
  // too-round, near-identical-sized ovals — visually indistinguishable from a UFO's own saucer
  // silhouette in this app, which is exactly the wrong thing for a cloud layer to look like. Warping
  // the sample position stretches/bends those cell boundaries into irregular, organic shapes instead.
  vec3 warpPos = planePos * 0.006;
  vec3 warp = vec3(fbm(warpPos + 12.3), fbm(warpPos + 47.1), fbm(warpPos + 91.7)) * 40.0;
  vec3 warpedPos = planePos + warp;

  // The water field is only worked out for a deck that has any water in it. An ice deck mixes it
  // away entirely below (mix at 1 is the second term alone), and it is the dearest part of the
  // shader — two fbm and the 27 cells of the Worley — on every pixel of the sky: 30 to 40% of the
  // cirrus deck's time for nothing on screen.
  float shape = 0.0;
  float detail = 0.0;
  if (fibrous < 1.0) {
    float shapeFbm = fbmFiltered(warpedPos * 0.014) * 0.5 + 0.5;
    float shapeCell = 1.0 - worley(warpedPos * 0.011);
    shape = mix(shapeFbm, shapeCell, 0.4);
    detail = fbmFiltered(warpedPos * 0.031 + 41.0) * 0.5 + 0.5;
  }

  // ICE. Sampled through a strongly anisotropic scale — a twentieth of the frequency along one
  // axis and four times it across — so the same noise comes out as long parallel filaments instead
  // of blobs. No Worley at all: cells are what billowing looks like, and ice does not billow.
  if (fibrous > 0.0) {
    vec3 drawnOut = vec3(warpedPos.x * 0.0016, warpedPos.y * 0.02, warpedPos.z * 0.045);
    // Filtered: its fibres are a few pixels across where the deck is near the horizon, and less.
    float fibre = fbmFiltered(drawnOut) * 0.5 + 0.5;
    float wisp = fbmFiltered(drawnOut * 3.1 + 7.0) * 0.5 + 0.5;
    shape = mix(shape, fibre * 0.72 + wisp * 0.28, fibrous);
    detail = mix(detail, wisp, fibrous);
  }

  // Below coverage's own noise threshold: a broken/patchy ceiling with real sky-colored gaps,
  // exactly like a real transition from scattered to overcast. remap-by-threshold, same technique
  // as the reference skill's own cloudDensity coverage control.
  // Each field its own quantile, and its own ramp. The ice field is narrower than the water one
  // (see ICE_FIELD_SD): read at the water's threshold, a cirrus deck covered 8% of the sky at a
  // stated 12% and 94% at 88%, and its edge was not where the display — masked at the ice's own
  // threshold — was drawn. The ramp is the same fraction of each field's spread (ICE_RAMP), or the
  // water's ±0.08 across so narrow a field pulls every coverage towards a half: 17% at 12%.
  float threshold = mix(
    coverageThreshold(coverage, ${WATER_FIELD_MEAN.toFixed(3)}, ${WATER_FIELD_SD.toFixed(3)}),
    coverageThreshold(coverage, ${ICE_FIELD_MEAN.toFixed(3)}, ${ICE_FIELD_SD.toFixed(3)}),
    fibrous);
  float ramp = mix(${WATER_RAMP.toFixed(4)}, ${ICE_RAMP.toFixed(4)}, fibrous);
  float alpha = smoothstep(threshold - ramp, threshold + ramp, shape);
  // This is what actually guarantees "total overcast, no sky visible" at cloudCover=1: force full
  // opacity everywhere as coverage approaches its max, overriding the noise field's own local value
  // rather than merely biasing it (a pure threshold shift would still leave the occasional fragment
  // below threshold even at coverage=1, since fbm's own range rarely spans a full 0..1).
  // The "force it opaque near full coverage" rule belongs to WATER and is wrong for ice. A water
  // deck at cover 1 is a ceiling; an ice deck at cover 1 is a milky veil you still read the Sun
  // through — which is the commonest halo sky there is, and it must not come out as a white lid.
  alpha = mix(mix(alpha, 1.0, smoothstep(0.82, 1.0, coverage)), alpha, fibrous);
  // A cirrus veil never closes the sky. Even the thickest cirrostratus is something you see the Sun
  // THROUGH — that is the entire reason it can make a halo at all — so an ice deck is held down to
  // a fraction of the opacity a water deck reaches, however completely it covers.
  alpha *= mix(1.0, 0.38, fibrous);
  alpha = 1.0 - pow(max(0.0, 1.0 - alpha), opticalDensity);

  // THE ICE DISPLAY, where this deck carries one: read off the very veil just worked out, where
  // IceHaloEffect's own sphere would have worked the same five fbm out again for every pixel. Same
  // conditions as cirrusCoverAt's (no crystals below the horizon, none in a deck of no cover).
  vec3 halo = vec3(0.0);
  bool haloHere = false;
  if (uHaloShown > 0.5 && coverage > 0.0 && dir.y >= 0.0) {
    float ice = cirrusCoverOf(shape, coverage);
    if (ice > 0.0) {
      haloHere = true;
      halo = iceHaloLight(normalize(vWorldDir), ice);
    }
  }
  // Where the veil is too thin to draw, the display may still be there: the deck then adds its
  // light alone.
  if (alpha < 0.02) {
    if (!haloHere) discard;
    alpha = 0.0;
  }

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
  color *= mix(1.0, mix(0.32, 0.62, fibrous), darkness);

  // Premultiplied, the result is the display's light seen THROUGH the veil, then the veil over
  // what is behind: exactly what the display drawn first and the deck laid over it gave.
  gl_FragColor = uPremultiplied > 0.5 ? vec4(color * alpha + halo * (1.0 - alpha), alpha) : vec4(color, alpha);
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
    opticalDensity: { value: 1 },
    darkness: { value: 0 },
    layerHeight: { value: layerHeight },
    fieldOffset: { value: new Vector3() },
    fibrous: { value: fibrous },
    uHaloShown: { value: 0 },
    uPremultiplied: { value: 0 },
    // Stand-ins until an ice display is hosted, when they are replaced by the display's own.
    uSource: { value: new Vector3(0, 1, 0) },
    uUp: { value: new Vector3(0, 1, 0) },
    uStrength: { value: 0 },
    uTint: { value: new Vector3(1, 1, 1) },
    uMap: { value: null },
    uGain: { value: 0 }
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    // Opaque scene geometry can occlude the shell; the cloud surface itself writes no depth.
    // Phenomena use a separate decor-depth pass and need their own cloud transmission integration.
    depthTest: true,
    side: BackSide
  })
  return { material, uniforms }
}

/** A fresh hemisphere reaching the geometric horizon. Terrain occlusion uses depth testing;
 * trimming the shell above the horizon would leave an artificial clear band under an overcast sky.
 * The projected noise still clamps grazing rays to keep sampling finite; this is a surface
 * approximation, not yet a volumetric cloud layer with atmospheric distance attenuation.
 */
export function buildCloudGeometry(radius: number): SphereGeometry {
  return new SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
}

/**
 * The same coverage decision the fragment shader above makes, evaluated on the CPU for a single
 * direction — what tells the app whether a given line of sight actually passes through cloud or
 * through one of the deck's gaps.
 *
 * Used by SceneRenderer.cloudTransmission for attenuation of celestial bodies. Phenomena now
 * use canvas textures on scene meshes (PhenomenonSystem), rendered in a separate pass against
 * decor depth. Their cloud occlusion still needs integration into that pass; this CPU field does
 * not currently hide them.
 *
 * Kept in this file, immediately below the GLSL it mirrors, precisely because the two must agree:
 * every constant here has a visible twin a few lines up. Diverging fields would attenuate a
 * celestial body in clear sky or leave it bright through an opaque deck.
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

  /** The shader's own coverageThreshold — see CLOUD_NOISE_GLSL for why a coverage is a quantile. */
  static thresholdFor(coverage: number, mean: number, spread: number): number {
    const c = Math.min(0.999, Math.max(0.001, coverage))
    return mean - spread * (Math.sqrt(3) / Math.PI) * Math.log(c / (1 - c))
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
   * through solid cloud. The caller selects the appropriate side of the layer; grazing rays remain covered.
   */
  static alphaAt(direction: { x: number; y: number; z: number }, layerHeight: number, coverage: number, fieldOffset = { x: 0, z: 0 }): number {
    if (coverage <= 0) return 0
    const [warpedX, warpedY, warpedZ] = CloudField.warpedAt(direction, layerHeight, fieldOffset)
    const shapeFbm = CloudField.fbm(warpedX * 0.014, warpedY * 0.014, warpedZ * 0.014) * 0.5 + 0.5
    const shapeCell = 1 - CloudField.worley(warpedX * 0.011, warpedY * 0.011, warpedZ * 0.011)
    const shape = shapeFbm + (shapeCell - shapeFbm) * 0.4
    const threshold = CloudField.thresholdFor(coverage, WATER_FIELD_MEAN, WATER_FIELD_SD)
    const alpha = CloudField.smoothstep(threshold - WATER_RAMP, threshold + WATER_RAMP, shape)
    return alpha + (1 - alpha) * CloudField.smoothstep(0.82, 1, coverage)
  }

  /**
   * The same for an ICE deck: the fibre field the shader draws a cirrus from, with the ice field's
   * own quantile — what the shader's fibrous branch does, before the veil is thinned to what a
   * cirrus lets through (the caller's opacity). A cirrus deck read through the water field was
   * another cloud altogether, holes and all, somewhere the drawn veil was not.
   */
  static iceAlphaAt(direction: { x: number; y: number; z: number }, layerHeight: number, coverage: number, fieldOffset = { x: 0, z: 0 }): number {
    if (coverage <= 0) return 0
    const [warpedX, warpedY, warpedZ] = CloudField.warpedAt(direction, layerHeight, fieldOffset)
    const x = warpedX * 0.0016, y = warpedY * 0.02, z = warpedZ * 0.045
    const fibre = CloudField.fbm(x, y, z) * 0.5 + 0.5
    const wisp = CloudField.fbm(x * 3.1 + 7, y * 3.1 + 7, z * 3.1 + 7) * 0.5 + 0.5
    const threshold = CloudField.thresholdFor(coverage, ICE_FIELD_MEAN, ICE_FIELD_SD)
    return CloudField.smoothstep(threshold - ICE_RAMP, threshold + ICE_RAMP, fibre * 0.72 + wisp * 0.28)
  }

  /** Where along the deck's plane a direction lands, domain-warped as the shader warps it. */
  private static warpedAt(direction: { x: number; y: number; z: number }, layerHeight: number, fieldOffset: { x: number; z: number }): [number, number, number] {
    const dy = Math.abs(direction.y)
    const t = layerHeight / Math.max(dy, 0.04)
    const px = direction.x * t + fieldOffset.x
    const py = direction.y * t
    const pz = direction.z * t + fieldOffset.z
    const wx = px * 0.006
    const wy = py * 0.006
    const wz = pz * 0.006
    return [
      px + CloudField.fbm(wx + 12.3, wy + 12.3, wz + 12.3) * 40,
      py + CloudField.fbm(wx + 47.1, wy + 47.1, wz + 47.1) * 40,
      pz + CloudField.fbm(wx + 91.7, wy + 91.7, wz + 91.7) * 40
    ]
  }

  private static smoothstep(edge0: number, edge1: number, value: number): number {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }
}
