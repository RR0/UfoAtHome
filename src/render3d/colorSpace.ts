import { EyeAdaptation } from "../engine/atmosphere/EyeAdaptation.js"


/**
 * Turning the light a scene computed into the numbers a screen expects.
 *
 * Every material in this project works in LINEAR light — that is the only space in which adding a
 * halo to a sky, or averaging a lens's blur, means anything physical — and a screen expects sRGB,
 * which is that light bent through a curve so that the dark end gets more of the available numbers.
 * three.js applies the curve for you at the moment it draws to the canvas, and NOT when it draws
 * into a render target, which is exactly right: a target is an intermediate, and bending the curve
 * into it would make every later average wrong.
 *
 * What that leaves is this: a pass that renders into a target and then copies it to the canvas with
 * a shader of its own has stepped around the place the curve was going to be applied, and has to
 * apply it itself. Forgetting to is not subtle — a linear value shown as though it were sRGB comes
 * out MUCH too dark, and this project shipped that way for every naked-eye sighting until the
 * depth-of-field pass made it measurable (mean pixel 68 through the pass against 96 without it).
 */
export const SRGB_ENCODE_GLSL = `
vec3 encodeSrgb(vec3 linear) {
  vec3 clamped = max(linear, vec3(0.0));
  vec3 low = clamped * 12.92;
  vec3 high = 1.055 * pow(clamped, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), clamped));
}
`

/**
 * The eye's response, applied once, to the finished picture — see LUMINANCE_GLSL.
 *
 * What the scene draws is LUMINANCE, each pixel's divided by the semi-saturation σ of the eye as it
 * is adapted to this sky (EyeAdaptation.semiSaturation): a surface lit by the Moon, the Moon itself
 * and a street lamp all in one unit, in which light adds up — a halo on a sky, a lamp in a
 * windscreen, a lens's blur, a long exposure — the way photons do. The eye's response
 * R = Lⁿ/(Lⁿ + σⁿ) then needs nothing but that number: R = vⁿ/(vⁿ + 1) for v = L/σ, applied to the
 * pixel's luminance, its colour kept. Before this, every source applied the response to itself and
 * the picture added the results, which is not what light does: a lamp's 8 % reflection in glass
 * came out a grey smudge, where an eye sees it nearly as bright as the lamp.
 *
 * Purkinje's shift is still each source's own, where it was (the sky's): it is folded into the
 * luminance and colour it writes.
 */
export const EYE_RESPONSE_GLSL = `
const float EYE_RESPONSE_EXPONENT = ${EyeAdaptation.RESPONSE_EXPONENT.toFixed(4)};
vec3 respond(vec3 relative) {
  vec3 clamped = clamp(relative, vec3(0.0), vec3(60000.0));
  float y = dot(clamped, vec3(0.2126, 0.7152, 0.0722));
  if (y <= 0.0) return vec3(0.0);
  float power = pow(y, EYE_RESPONSE_EXPONENT);
  float response = power / (power + 1.0);
  vec3 shown = clamped / y * response;
  // A colour too saturated for its brightness to fit on the screen — a cloud lit orange by a Sun a
  // few degrees up — is taken towards the grey of its own brightness until its brightest channel
  // fits, rather than clipped channel by channel, which turned orange flat yellow and lost the
  // shading. Brightness is kept, and hue; only saturation gives, as it does for an eye near
  // the top of its range.
  float top = max(shown.r, max(shown.g, shown.b));
  // At the very top the response rounds to one and there is no room left for any colour: white.
  if (top > 1.0) shown = response >= 0.9999 ? vec3(1.0) : vec3(response) + (shown - vec3(response)) * (1.0 - response) / max(top - response, 1e-6);
  return shown;
}
`

/**
 * The finished picture: the scene's luminance through the eye's response, and over it what is laid
 * on the screen rather than seen in the world — the pictures of the place, the witness's own
 * phenomena, the compass — premultiplied, as three leaves anything blended onto a cleared target.
 * Those are laid on AFTER the response because they are already what an eye sees: a phenomenon half
 * faded over a night sky is half faded on the screen, not a half share of a luminance nobody stated.
 */
export const FINISH_GLSL = `
${SRGB_ENCODE_GLSL}
${EYE_RESPONSE_GLSL}
vec3 finish(vec3 relative, vec4 overlay) {
  return encodeSrgb(respond(relative) * (1.0 - overlay.a) + overlay.rgb);
}
`

/**
 * A picture not yet finished, on its way into a longer exposure: the scene's luminance, and what is
 * laid over it, each as it will be added up — see FINISH_GLSL. Neither is encoded.
 */
export interface UnfinishedFrame {
  scene: import("three").WebGLRenderTarget
  overlay: import("three").WebGLRenderTarget
}

/** What a finishing shader is asked for: the finished picture, or one of its two layers alone. */
export const enum FinishMode {
  Finished = 0,
  Scene = 1,
  Overlay = 2
}

/** The body of a finishing shader's main() once it has `scene` and `overlay` in hand — see FinishMode. */
export const FINISH_BY_MODE_GLSL = `
  if (uMode < 0.5) gl_FragColor = vec4(finish(scene, overlay), 1.0);
  else if (uMode < 1.5) gl_FragColor = vec4(scene, 1.0);
  else gl_FragColor = overlay;
`
