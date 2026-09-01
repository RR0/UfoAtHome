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
