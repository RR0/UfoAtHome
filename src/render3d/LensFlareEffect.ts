import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from "three"

/**
 * The Sun's dazzle — a full-screen additive-blended quad, first ported from Anderson Mancini's vanilla-Three.js lens flare
 * (https://github.com/ektogamat/lensflare-threejs-vanilla), of which only what is optics is left: the VEILING GLARE round a bright source
 * (see glare: the light its own disc scatters on its way through an eye or a lens, an inverse square in the angle from it), the STAR of
 * diffraction that the straight blades of an aperture put on it (none through an eye, which has none), and the shimmer of that glare.
 *
 * The rest of that effect is gone: the ghost trail, hexagons, streaks and starburst it drew round the Sun alone, whatever its lens, were a
 * look. The ghosts a lens throws are drawn for every light alike, the Sun among them, from the picture's own light and from what that lens
 * is (see GhostPass and LensGhost).
 */
export interface LensFlareUniforms {
  // Index signature so this satisfies ShaderMaterial's own `{ [uniform: string]: IUniform<any> }`
  // uniforms type — same convention as RainSystem.ts's RainUniforms/CloudSystem.ts's CloudUniforms.
  [uniform: string]: { value: unknown }
  uTime: { value: number }
  uResolution: { value: Vector2 }
  uLensPosition: { value: Vector2 }
  /** How many spikes the aperture's blades put on the dazzle: 0 for a round opening, an eye's. */
  uStarPoints: { value: number }
  /** The tangent of half the vertical field the camera is actually rendering with — what turns a
   * point of the frame back into the direction it looks along, and so a screen distance into the
   * real angle veiling glare is a function of. */
  uTanHalfFov: { value: number }
  /** 1 when the frame drawn into is the EQUIDISTANT one (a field too wide for a pinhole, drawn through
   * the cube — see EquidistantProjectionPass), where a point of the frame is a direction by angle and
   * uHalfFovRad is its scale; 0 for the rectilinear frame, read through uTanHalfFov. */
  uEquidistant: { value: number }
  uHalfFovRad: { value: number }
  /** The source's own angular radius, degrees: inside its disc there is no angle to divide by. */
  uSourceRadiusDeg: { value: number }
  /** The SQUARE of the angle, in degrees, at which the veil reaches full white — so the blazing
   * core's radius is its square root. Scaled by how much of the Sun's light actually arrives. */
  uVeilStrength: { value: number }
  /** The dazzle's own colour and strength: the source's atmospheric tint, times the cloud it
   * shines through, times the reader's own intensity dial. */
  uDazzleColour: { value: Color }
  /** Whether the dazzle's pattern turns: off, a real Sun's does not. */
  uAnimated: { value: boolean }
}

export interface LensFlareSystem {
  mesh: Mesh
  uniforms: LensFlareUniforms
}

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

// Renamed to this codebase's u-prefixed uniforms; visibility is the mesh's (SceneRenderer adds and hides it), never a branch leaving
// gl_FragColor unwritten, which is undefined rather than nothing.
const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec2 uLensPosition;
uniform vec2 uResolution;
uniform float uStarPoints;
uniform float uTanHalfFov;
uniform float uEquidistant;
uniform float uHalfFovRad;
uniform float uSourceRadiusDeg;
uniform float uVeilStrength;
uniform vec3 uDazzleColour;
uniform bool uAnimated;
varying vec2 vUv;

float rand(float n){return fract(sin(n) * 43758.5453123);}

float noise(float p){
    float fl = floor(p);
    float fc = fract(p);
    return mix(rand(fl),rand(fl + 1.0), fc);
}

vec2 rotateUV(vec2 uv, float rotation)
{
    return vec2(
        cos(rotation) * uv.x + sin(rotation) * uv.y,
        cos(rotation) * uv.y - sin(rotation) * uv.x
    );
}

// THE DAZZLE ITSELF, and the one part of this shader that is not a look.
//
// A bright light does not grow. What grows around it is VEILING GLARE: a fixed small fraction of
// its flux scattered sideways on its way through the eye — off the cornea, the lens, the fibres of
// the vitreous — or, in a camera, off every air-glass surface in the barrel. Stiles and Crawford
// measured it in the 1930s and it has been re-measured ever since, and what they found is an
// INVERSE SQUARE in the angle from the source: the veil at two degrees is a quarter of the veil at
// one. Nothing else in this file mattered as much as getting that exponent right. What was here
// before fell off as 1/θ, whose tail is so much fatter that the Sun read as a white ball six
// degrees across in broad daylight — which is what a reader saw and said was too big.
//
// The angle is a REAL angle between two lines of sight, not a screen distance: the same dazzle has
// to be the same number of degrees wide whatever the field of view and whichever projection the
// recording was made through, exactly as the halo ring is (see IceHaloEffect). Inside the source's
// own disc there is no angle left to divide by, so it is held there.
//
// uVeilStrength is the square of the angle at which the veil reaches full white — so the radius of
// the blazing core is sqrt(strength), and it shrinks as the SQUARE ROOT of the Sun's brightness.
// A hundredfold weaker Sun makes a tenfold smaller blaze, which is the whole shape of a sunset.
// Which way the eye is looking at this point of the frame. The frame this shader draws into is
// always the RECTILINEAR one the camera renders (an equidistant recording resamples it afterwards,
// which is why reading an angle off pixel distances here was wrong by half again at the edges) — so
// a point of it is a direction through a pinhole, and the angle between two of them is exact under
// both projections.
vec3 lookAt(vec2 p)
{
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    if (uEquidistant > 0.5) {
        vec2 angle = vec2(2.0 * p.x * aspect, 2.0 * p.y * aspect) * uHalfFovRad;
        float theta = length(angle);
        if (theta < 1e-6) return vec3(0.0, 0.0, -1.0);
        return vec3(angle / theta * sin(theta), -cos(theta));
    }
    return normalize(vec3(2.0 * p.x * uTanHalfFov * aspect, 2.0 * p.y * aspect * uTanHalfFov, -1.0));
}

float glare(vec2 uv, vec2 pos)
{
    vec2 main = uAnimated ? rotateUV(uv-pos, uTime * 0.1) : uv-pos;
    float ang = atan(main.y, main.x) * uStarPoints;
    float theta = max(degrees(acos(clamp(dot(lookAt(uv), lookAt(pos)), -1.0, 1.0))), uSourceRadiusDeg);
    float veil = uVeilStrength / (theta * theta);
    // The aperture's spikes ride on the veil rather than being drawn on top of it — they ARE the
    // same scattered light, gathered along the directions the blade edges diffract it into. With no
    // blades uStarPoints is zero, the angle collapses and this is exactly 1: a round dazzle.
    return veil * (1.0 + 0.45 * sin(ang));
}

void main()
{
    vec2 uv = vUv;
    vec2 myUV = uv - 0.5;
    myUV.y *= uResolution.y / uResolution.x;
    vec2 pos = uLensPosition * 0.5;
    pos.y *= uResolution.y / uResolution.x;
    // The veil, with its star, and its shimmer close round the source.
    float ang = atan(myUV.x - pos.x, myUV.y - pos.y);
    float shimmer = .3 / (length(myUV - pos) * 16.0 + 1.0);
    shimmer *= sin(noise(sin(ang * 3.9 - (uAnimated ? uTime : 0.0) * 0.3) * uStarPoints)) * .2;
    // Straight through, in fractions of white: glare() already answers how much of full white is veiling this pixel, so multiplying it
    // by anything but the source's own colour would undo the calibration. The colour carries it all, and the alpha is one: additive
    // blending multiplies colour by alpha, which would square the dazzle.
    gl_FragColor = vec4((glare(myUV, pos) + shimmer) * uDazzleColour, 1.0);
}
`

/** The dazzle's defaults: `uLensPosition`/`uResolution`/`uTime` are live values SceneRenderer overwrites every frame (see
 * updateLensFlarePosition), and the rest are set from the instrument and the Sun. */
export function buildLensFlare(): LensFlareSystem {
  const uniforms: LensFlareUniforms = {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uLensPosition: { value: new Vector2(0, 0) },
    // NONE by default, and that is not a neutral choice: it is what an eye sees. The star on a
    // bright light is diffraction at the straight edges of an aperture's blades, an eye has no
    // blades, and this project's own default instrument is an eye (see Instrument.ts) —
    // SceneRenderer.setInstrument sets the real count for anything that does have a lens.
    uStarPoints: { value: 0 },
    uTanHalfFov: { value: Math.tan(Math.PI / 6) },
    uEquidistant: { value: 0 },
    uHalfFovRad: { value: Math.PI / 6 },
    uSourceRadiusDeg: { value: 0.265 },
    uVeilStrength: { value: 0 },
    uDazzleColour: { value: new Color(1, 1, 1) },
    uAnimated: { value: false }
  }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    fog: false,
    name: "LensFlareShader"
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  // Draws as a fixed screen-space overlay (the vertex shader ignores the camera entirely — see
  // VERTEX_SHADER), so ordinary frustum culling would be meaningless and could wrongly skip it.
  mesh.frustumCulled = false
  mesh.renderOrder = 20
  return { mesh, uniforms }
}
