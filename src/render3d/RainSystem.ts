import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Points, ShaderMaterial, Vector2, Vector3 } from "three"

/**
 * GPU-driven rain streaks — ported from the technique at
 * https://github.com/fromtheghost/rain-demo (itself the demo for
 * https://medium.com/antaeus-ar/cheap-beautiful-rain-in-three-js-9b62bbeabbf3), adapted to this
 * project's conventions: the reference downloads a pre-drawn streak PNG, this project draws its
 * texture procedurally instead (see getRainStreakTexture, matching every other texture in
 * SceneRenderer.ts — no image assets).
 *
 * Why a custom ShaderMaterial and not the plain PointsMaterial+CanvasTexture approach used for
 * clouds/snow/hail: a Points sprite is always a camera-facing square with no per-particle rotation,
 * so the previous rain attempt (a texture-only streak baked into a square) still read as short flat
 * blobs, not the sharp elongated streaks of the reference. Two things a plain PointsMaterial simply
 * cannot do are what make the difference:
 *  - GPU-side vertical recycling via `mod(position.y - uTime*overallSpeed*aSpeed, height)` in the
 *    vertex shader — every particle's fall is a pure function of elapsed time, not a per-frame CPU
 *    position mutation with a manual "if past the ground, reset" branch. This also makes rain immune
 *    to the dt-overshoot sync bug found in the CPU-driven snow/hail path (see SceneRenderer's own
 *    updatePrecipitation comment) — there's no per-frame threshold check to desync, mod() is
 *    well-defined for any dt. Critically, `overallSpeed` here is NOT a real-world m/s figure — see
 *    RainSystemConfig.overallSpeed's own comment for why the recycle animation's rate is deliberately
 *    decoupled from real rain physics (an earlier version drove this directly from real terminal
 *    velocity and the result read as unmistakably too slow, especially for light rain).
 *  - UV squash in the fragment shader (`uv.x = 0.5 + (uv.x-0.5)*uUvSquash`), driven every frame by
 *    how much the camera is looking up/down — without it, a witness looking steeply up or down would
 *    see every streak's texture rendered at full un-squashed width, reading as fat vertical bars
 *    instead of thin rain.
 *
 * The GPU-recycling/UV-squash half of this is rain-only (real snowflakes/hailstones are round, not
 * streaked, so there's no shape a shader-only trick would add there) — but the depth-cue treatment
 * below (near-camera defocus + distance haze) is shared conceptually with the CPU snow/hail pool's
 * own small ShaderMaterial in SceneRenderer.ts (buildPrecipitationMaterial), since every falling
 * particle needs the same real depth cues regardless of type.
 *
 * Depth cues (near defocus + distance haze): without this, every particle at every distance rendered
 * equally sharp and equally saturated, which read as flat/artificial once actually compared side by
 * side — real vision has two distinct, physically different depth effects that both apply here:
 *  - A witness's eyes are very unlikely to be focused at arm's length on individual raindrops (they're
 *    watching a UFO, typically far away) — anything within a few meters of the camera should read as
 *    genuinely out-of-focus, the same real optical defocus that makes extreme foreground blur in any
 *    photo. `uNearFocusDistance` is the world-space distance at which this reaches zero.
 *  - Real atmospheric haze increases smoothly with distance (unlike lens defocus, it has no "in-focus
 *    band" — it's monotonic), blending distant objects toward the sky/ambient color and reducing their
 *    contrast. `uHazeDistance` is the distance at which this reaches its full strength.
 * Both are approximated the same cheap way here (spread the point's on-screen footprint + dim it
 * proportionally) rather than true post-process blur (mixing neighboring screen pixels), which would
 * need a multi-pass EffectComposer pipeline (three.js's own real depth-of-field is `BokehPass`) —
 * out of scope here since it would blur the whole scene (sky/terrain/stars), not just precipitation,
 * for a real architecture/bundle-size cost this project doesn't otherwise need.
 */

export interface RainSystemConfig {
  /** Particle pool size — cheap regardless of count since a GPU-recycled Points draw call's cost is
   * dominated by the draw call itself, not vertex count. */
  count: number
  /** Real-world-scale radius (meters) of the cylindrical rain volume — deliberately tight/close to
   * the camera (unlike the CPU precipitation volume's own much larger radius, see
   * PRECIPITATION_RADIUS_M in SceneRenderer.ts): a small, camera-hugging volume is what reads as a
   * real downpour; rain thinly spread over a huge disc reads as scattered dots, which is exactly
   * what the first, CPU-based rain attempt looked like. */
  radiusM: number
  heightM: number
  /** World Y a particle's wrapped fall cycle bottoms out at — matches groundMesh.position.y, same
   * convention as PRECIPITATION_RESPAWN_Y_MIN. */
  bottomYM: number
  /** World-units-per-second the wrap-recycle cycle actually runs at, before per-particle jitter (see
   * aSpeed in buildRainSystem) — deliberately NOT the same number as any real-world rain physics
   * value (contrast SceneRenderer's own rainFallSpeedMPerS, true m/s, used only for speedStreak
   * below). A raindrop's real terminal velocity (1-9 m/s) divided into this system's necessarily
   * small `heightM` gives a multi-second recycle cycle that reads as sluggish on screen — real rain
   * doesn't look slow because you're not tracking one drop's whole fall, you're seeing thousands of
   * different drops sweep past in the time any single one would take. A convincing GPU-recycled
   * illusion needs its own much faster cycle rate, decoupled from real per-drop physics, the same
   * way a film's persistence-of-motion illusion doesn't require frames to literally move at the
   * depicted subject's real speed. Tuned by eye, not derived from a formula. */
  overallSpeed: number
  color: Color
  opacity: number
  /** How many of `count` particles are actually drawn (`geometry.setDrawRange(0, visibleCount)`) —
   * this, not opacity, is what should track weather.precipitationIntensity: a light drizzle has
   * *fewer visible drops*, not the same density rendered more faintly. Must be <= count. */
  visibleCount: number
  /** 0-1 — how much of the point sprite's vertical footprint the streak texture fills, standing in
   * for real motion blur: on an actual long-exposure photo, a fast-falling drop draws a long streak
   * and a slow one a short one, because the streak length is literally `speed * shutterTime`. A
   * fixed-length texture can't reproduce that on its own, so this compresses/expands the sampled
   * UV.y range around the center — see FRAGMENT_SHADER's own comment for the mechanism (same trick
   * as uUvSquash, just the other axis). Deliberately driven by the *real* fallSpeedMPerS
   * (SceneRenderer's own rainFallSpeedMPerS), not by overallSpeed above — the streak's shape should
   * still reflect true rain physics (a storm's bigger/faster drops draw longer streaks) even though
   * the underlying recycle animation itself runs at its own, unrelated, faster rate for legibility. */
  speedStreak: number
  /** Base on-screen streak size in pixels at 1 world unit of camera distance — see uPixelSize's own
   * comment on the `gl_PointSize = uPixelSize / -mvPosition.z` perspective-scaling formula. */
  pixelSize: number
  /** Deterministic seed for the initial per-particle layout (position/fall-speed jitter/phase) —
   * same reproducibility goal as every other procedural layout in this renderer (star jitter, cloud
   * pool positions). */
  seed: number
  /** World-space camera distance at which near-camera defocus reaches zero — see this module's own
   * doc comment on the two depth cues. Below this distance a streak spreads/dims progressively. */
  nearFocusDistanceM: number
  /** World-space camera distance at which atmospheric haze reaches full strength — see this module's
   * own doc comment. Beyond this distance a streak is maximally blended toward uHazeColor. */
  hazeDistanceM: number
  /** Real current ambient sky/horizon color (SceneRenderer's own baseFogColor) — what distant
   * particles blend toward, refreshed every frame by the caller since the sky's own color changes
   * continuously through the sighting's time-of-day. */
  hazeColor: Color
}

export interface RainUniforms {
  // Index signature so this satisfies ShaderMaterial's own `{ [uniform: string]: IUniform<any> }`
  // uniforms type — the explicit properties below stay individually typed for callers.
  [uniform: string]: { value: unknown }
  uTime: { value: number }
  uOverallSpeed: { value: number }
  uPixelSize: { value: number }
  uOpacity: { value: number }
  uColor: { value: Color }
  uUvSquash: { value: number }
  uSpeedStreak: { value: number }
  uWindOffset: { value: Vector2 }
  /** The drop's own velocity in metres per second — sideways from the wind, downward from the
   * fall. What LEANS the streak: see the vertex shader's vSlant. */
  uDropVelocity: { value: Vector3 }
  /** Viewport width over height, so the lean can be measured where it is seen — in pixels. */
  uAspect: { value: number }
  uHeight: { value: number }
  uBottomY: { value: number }
  uHalfWidth: { value: number }
  uTexture: { value: CanvasTexture }
  uNearFocusDistance: { value: number }
  uHazeDistance: { value: number }
  uHazeColor: { value: Color }
}

export interface RainSystem {
  points: Points
  uniforms: RainUniforms
}

// Tuning for the depth-cue effect (see this module's own doc comment) — fixed, not exposed as
// uniforms, since they're stylistic constants rather than per-weather-condition values (unlike
// nearFocusDistanceM/hazeDistanceM/hazeColor, which genuinely vary by volume scale and time of day).
const MAX_BLUR_PIXELS = 18.0
const HAZE_STRENGTH = 0.55
const BLUR_OPACITY_FALLOFF = 0.5

const VERTEX_SHADER = `
attribute float aSpeed;
uniform float uTime;
uniform float uOverallSpeed;
uniform float uPixelSize;
uniform float uHeight;
uniform float uBottomY;
uniform float uHalfWidth;
uniform vec2 uWindOffset;
uniform vec3 uDropVelocity;
uniform float uAspect;
uniform float uNearFocusDistance;
uniform float uHazeDistance;
varying float vNearBlur;
varying float vHaze;
varying float vSlant;

void main() {
  // uOverallSpeed*aSpeed, not a real-world m/s value — see RainSystemConfig.overallSpeed's own
  // comment on why the recycle animation's own rate is deliberately unrelated to real rain physics.
  float wrappedY = mod(position.y - uTime * uOverallSpeed * aSpeed, uHeight) + uBottomY;
  // Wraps horizontally too (a torus, not a bounded box) so a continuously-growing wind offset never
  // needs its own respawn/reset logic — any offset magnitude wraps back into [-uHalfWidth, uHalfWidth].
  float driftedX = mod(position.x + uWindOffset.x + uHalfWidth, uHalfWidth * 2.0) - uHalfWidth;
  float driftedZ = mod(position.z + uWindOffset.y + uHalfWidth, uHalfWidth * 2.0) - uHalfWidth;
  vec4 mvPosition = modelViewMatrix * vec4(driftedX, wrappedY, driftedZ, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float dist = max(1.0, -mvPosition.z);
  // Near-camera optical defocus: 1 right at the camera, fading to 0 by uNearFocusDistance — a
  // witness's eyes aren't focused at arm's length on individual raindrops.
  vNearBlur = clamp(1.0 - dist / uNearFocusDistance, 0.0, 1.0);
  // Distance haze: 0 close in, ramping to 1 by uHazeDistance — real atmospheric haze, monotonic
  // (unlike defocus, there's no "in-focus band", it just keeps increasing with distance). Does NOT
  // add to gl_PointSize below — real haze dims/desaturates a distant object, it doesn't enlarge it;
  // only vNearBlur (real optical defocus, which genuinely does spread a too-close point into a
  // bigger, softer disc) should. Feeding vHaze into size too meant a distant, hazy streak could
  // randomly end up as big or bigger than a closer, sharper one, purely from perspective/dt noise —
  // a real, caught bug (a user directly noticed "darker/farther streaks equal-or-bigger than
  // lighter/closer ones"), not just a stylistic overcorrection.
  vHaze = clamp(dist / uHazeDistance, 0.0, 1.0);
  // Where this drop is actually going, as an angle ON SCREEN.
  //
  // The wind already carried the whole field sideways (uWindOffset above), but each streak stayed
  // bolt upright while doing it — rain blowing across the frame drawn as if it fell straight down.
  // A streak is the drop's own path over the exposure, so it has to point along the drop's
  // velocity: down from the fall, sideways from the wind.
  //
  // Projected rather than computed from the wind angle alone, because how slanted it LOOKS depends
  // on where the witness is facing. Rain driven straight at them leans hardly at all; the same rain
  // seen from the side leans its full angle. Taking the difference between this drop and a point
  // one second along its own velocity, both through the projection, gets that for free — and the
  // aspect ratio converts the two clip-space axes into the pixels the angle is measured in.
  vec4 aheadClip = projectionMatrix * (modelViewMatrix * vec4(driftedX + uDropVelocity.x, wrappedY + uDropVelocity.y, driftedZ + uDropVelocity.z, 1.0));
  vec2 here = gl_Position.xy / max(gl_Position.w, 0.0001);
  vec2 ahead = aheadClip.xy / max(aheadClip.w, 0.0001);
  vec2 travel = vec2((ahead.x - here.x) * uAspect, ahead.y - here.y);
  // Straight down is the texture's own orientation, so that is the zero.
  vSlant = length(travel) < 1e-6 ? 0.0 : atan(travel.x, -travel.y);
  gl_PointSize = uPixelSize / dist + vNearBlur * ${MAX_BLUR_PIXELS.toFixed(1)};
}
`

const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uUvSquash;
uniform float uSpeedStreak;
uniform vec3 uHazeColor;
varying float vNearBlur;
varying float vHaze;
varying float vSlant;

void main() {
  // A point sprite is always axis-aligned and cannot be rotated, but its texture lookup can:
  // turning the coordinates by the opposite angle leans the streak drawn inside it. This is what
  // makes wind visible on a drop — the field was already being carried sideways (uWindOffset),
  // while every streak in it stayed bolt upright.
  vec2 centered = gl_PointCoord - 0.5;
  float slantCos = cos(vSlant);
  float slantSin = sin(vSlant);
  vec2 uv = vec2(centered.x * slantCos - centered.y * slantSin, centered.x * slantSin + centered.y * slantCos) + 0.5;
  // Squashes sampled UV.x toward the texture's own center column — at a steep camera pitch this
  // keeps the streak reading as a normal-width drop instead of the full-width bar you'd get from
  // sampling the (already very thin) streak texture undistorted at a near-face-on angle.
  uv.x = 0.5 + (uv.x - 0.5) * uUvSquash;
  // Stands in for real motion blur: dividing by a SMALLER uSpeedStreak (slow fall speed) expands
  // the sampled UV.y range beyond [0,1] for pixels away from the point's center, which — since the
  // texture clamps to its own fully-transparent edge outside [0,1] — crops the visible streak down
  // to a short mark near the center instead of the full pre-baked length. uSpeedStreak=1 (fast)
  // samples the texture undistorted, showing the whole streak.
  uv.y = 0.5 + (uv.y - 0.5) / uSpeedStreak;
  vec4 tex = texture2D(uTexture, uv);
  // Distance haze blends color toward the real ambient sky color (atmospheric perspective); near
  // defocus doesn't change color, only spreads+dims (see vertex shader's own gl_PointSize term) —
  // both dim the alpha so a maximally blurred/hazy drop doesn't stay as visually "solid" as a sharp
  // one right in the middle distance.
  vec3 color = mix(uColor, uHazeColor, vHaze * ${HAZE_STRENGTH.toFixed(2)});
  float blur = max(vNearBlur, vHaze);
  gl_FragColor = vec4(color, tex.a * uOpacity * (1.0 - blur * ${BLUR_OPACITY_FALLOFF.toFixed(2)}));
}
`

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

/**
 * How much of the streak's length each rounded end takes — the drop's own radius against the
 * distance it fell while the shutter was open.
 */
const STREAK_CAP_FRACTION = 0.14
/**
 * The width of the blur every image of a point has, in texture pixels. Sets how wide the streak
 * reads: it is a hairline, and the reference project's own drop is a 2-3 px line on a 512 px
 * canvas — an early version of this texture ramped its opacity across nearly half the canvas and
 * rendered as a fat blurry column instead.
 */
const STREAK_SIGMA_PX = 4.5

let sharedRainStreakTexture: CanvasTexture | undefined

/**
 * A thin, blurred vertical hairline baked into a square canvas — proportioned after the reference
 * project's own `rainDrop.png` (a ~2-3px-wide soft line on a 512px-wide canvas, i.e. under 1% of the
 * width, tapered to transparent at both ends), not this project's earlier, much fatter streak
 * texture (which read as a short blob rather than a hairline once actually seen at typical viewing
 * distance). Procedurally drawn rather than downloaded, per this project's "no image assets, hand-
 * rolled canvas textures" convention (see SceneRenderer's own getCloudPuffTexture/
 * createCompassLabelTexture).
 */
export function getRainStreakTexture(): CanvasTexture {
  if (sharedRainStreakTexture) return sharedRainStreakTexture
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const image = context.createImageData(size, size)
  const centerX = size / 2
  // The streak is a drop swept along a line, so its outline is a capsule: a segment with a
  // hemisphere at each end. Both ends are therefore round for free — the taper is not a fade
  // painted onto a bar, it is the drop's own shape at the two instants the exposure caught it
  // starting and finishing.
  const capTop = size * STREAK_CAP_FRACTION
  const capBottom = size - capTop
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance to the capsule's axis — the segment itself in the middle, its endpoints beyond.
      const dx = x + 0.5 - centerX
      const dy = y + 0.5 < capTop ? y + 0.5 - capTop : y + 0.5 > capBottom ? y + 0.5 - capBottom : 0
      const distance = Math.hypot(dx, dy)
      // And a Gaussian of that distance, which is what a point spread function IS: no real image
      // has a hard edge, because no lens and no eye focuses a point to a point. It is also why the
      // drop's own geometric profile is not used directly — the chord through a sphere,
      // sqrt(1 - u²), has an infinite slope at the rim and would draw the very hard edge this is
      // meant to be rid of.
      const alpha = Math.exp(-(distance * distance) / (2 * STREAK_SIGMA_PX * STREAK_SIGMA_PX))
      const offset = (y * size + x) * 4
      image.data[offset] = 255
      image.data[offset + 1] = 255
      image.data[offset + 2] = 255
      image.data[offset + 3] = Math.round(255 * Math.min(1, alpha))
    }
  }
  context.putImageData(image, 0, 0)
  sharedRainStreakTexture = new CanvasTexture(canvas)
  return sharedRainStreakTexture
}
/** Builds the rain Points/geometry/ShaderMaterial — see this module's own doc comment for why a
 * custom shader, and each RainSystemConfig field's comment for the tuning rationale. Every particle
 * stores its pre-wrap Y (uniformly spread through one fall cycle so the field doesn't visibly "start"
 * all at the top the instant rain turns on, same reasoning as the CPU precipitation pool's own
 * initial spread) and a small per-particle fall-speed jitter (aSpeed, 0.85-1.15x) so the whole field
 * doesn't fall in a single visibly rigid sheet. */
export function buildRainSystem(config: RainSystemConfig): RainSystem {
  const random = mulberry32(config.seed)
  const positions = new Float32Array(config.count * 3)
  const speeds = new Float32Array(config.count)
  const halfWidth = config.radiusM
  for (let i = 0; i < config.count; i++) {
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * config.radiusM // sqrt: uniform area density, not center-biased
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = random() * config.heightM
    positions[i * 3 + 2] = Math.sin(angle) * radius
    // Per-particle jitter factor only (±15%) — the actual world-units/second rate is
    // uOverallSpeed*aSpeed, computed in the vertex shader, not baked in here.
    speeds[i] = 0.85 + random() * 0.3
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(positions, 3))
  geometry.setAttribute("aSpeed", new BufferAttribute(speeds, 1))
  // Density (how many drops are visible), not opacity, is what should track intensity — see
  // RainSystemConfig.visibleCount's own comment.
  geometry.setDrawRange(0, config.visibleCount)

  const uniforms: RainUniforms = {
    uTime: { value: 0 },
    uOverallSpeed: { value: config.overallSpeed },
    uPixelSize: { value: config.pixelSize },
    uOpacity: { value: config.opacity },
    uColor: { value: config.color },
    uUvSquash: { value: 1 },
    uSpeedStreak: { value: config.speedStreak },
    uWindOffset: { value: new Vector2(0, 0) },
    uDropVelocity: { value: new Vector3(0, -1, 0) },
    uAspect: { value: 1 },
    uHeight: { value: config.heightM },
    uBottomY: { value: config.bottomYM },
    uHalfWidth: { value: halfWidth },
    uTexture: { value: getRainStreakTexture() },
    uNearFocusDistance: { value: config.nearFocusDistanceM },
    uHazeDistance: { value: config.hazeDistanceM },
    uHazeColor: { value: config.hazeColor }
  }

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    // fog:false isn't a valid ShaderMaterial option (fog integration needs explicit shader code, not
    // a flag) — irrelevant here anyway since rain's radiusM is far inside scene.fog's near bound
    // (180), the same reasoning that made the CPU precipitation pool's own fog:false currently
    // harmless-but-correct.
    depthTest: true
  })

  const points = new Points(geometry, material)
  // Bypasses three.js's frustum-culling bounding-sphere check, which is computed from the raw
  // (pre-wrap) BufferGeometry positions — since the vertex shader relocates every particle via
  // mod() far outside that original bounding volume, an accurate cull box doesn't really exist, and
  // an approximate one risks the whole field popping out of view at some camera angles. The pool is
  // small/cheap enough that always drawing it isn't a real cost (mirrors the reference project's own
  // identical `frustumCulled = false`).
  points.frustumCulled = false

  return { points, uniforms }
}
