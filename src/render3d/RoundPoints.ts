import type { PointsMaterial } from "three"

/**
 * Makes a point sprite round instead of square.
 *
 * A GL point is a QUAD, so an untextured PointsMaterial fills it corner to corner and every star in
 * the sky comes out a little rectangle. Nothing about a star is square: it is a point source, far
 * below one pixel across, and everything anybody can see of it is the spreading of that point — in
 * the eye, in a lens, in the atmosphere. That spread is radial, so the honest shape is a round core
 * fading outwards. The same reasoning as the meteor ribbon's own width (see MeteorSystem): the disc
 * is glare, and the glare is what is being drawn, not the star.
 *
 * Done in the shader rather than with a texture on purpose — no canvas to raster, nothing to fetch
 * or dispose, and it keeps working anywhere a shader can be compiled at all.
 *
 * Its own class so the patch can be tested without a WebGL context, which is the only place this
 * could go wrong quietly: the injection hangs off one exact line of three.js's points shader, and
 * if a future version words that line differently the replacement would simply do nothing and every
 * star would go back to being a square with nobody the wiser. ANCHOR is checked against the
 * installed three.js by this class's own test for exactly that reason.
 */
export class RoundPoints {
  /** The line of three.js's own points fragment shader this hooks into. */
  static readonly ANCHOR = "vec4 diffuseColor = vec4( diffuse, opacity );"

  /** Where the falloff begins and ends, as a fraction of the point's half-width: a solid core out
   * to 0.18, fading to nothing at the inscribed circle. The core is kept wide enough that the
   * faintest stars stay a visible dot rather than a smudge of almost-nothing. */
  private static readonly CORE = 0.18
  private static readonly RIM = 0.5

  static apply(material: PointsMaterial): void {
    material.transparent = true
    // The falloff is alpha, so these must not write depth or they would punch holes in whatever
    // is drawn after them at the same distance.
    material.depthWrite = false
    material.onBeforeCompile = shader => {
      shader.fragmentShader = RoundPoints.patch(shader.fragmentShader)
    }
  }

  /** The patched fragment shader. Returns the source untouched when the anchor is absent — a sky
   * of squares is a poor result, but a shader that fails to compile is a black one. */
  static patch(fragmentShader: string): string {
    return fragmentShader.replace(
      RoundPoints.ANCHOR,
      `float distanceFromCentre = length( gl_PointCoord - vec2( 0.5 ) );
       // Outside the inscribed circle there is no star at all — this is what kills the corners.
       if ( distanceFromCentre > ${RoundPoints.RIM.toFixed(2)} ) discard;
       float glare = 1.0 - smoothstep( ${RoundPoints.CORE.toFixed(2)}, ${RoundPoints.RIM.toFixed(2)}, distanceFromCentre );
       vec4 diffuseColor = vec4( diffuse, opacity * glare );`
    )
  }
}
