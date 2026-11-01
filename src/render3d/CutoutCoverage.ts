import { ShaderChunk } from "three"

/**
 * Keeps a cut-out texture (the leaves of a tree, drawn as cards whose texture says where a leaf is and where not) as covered from afar as
 * it is from close by.
 *
 * Such a texture is cut at an alpha of a half: a leaf where it is more, nothing where it is less. Seen from afar it is read from its smaller
 * copies (its mipmaps), each an average of four texels of the one above, and a leaf a texel wide among gaps averages to a quarter, then a
 * sixteenth: under the half, cut. A crown that is full at ten metres thinned out with distance into a few dark specks with the sky and the
 * pole behind it showing through (a fir by Lenin Avenue, Chelyabinsk). The alpha is raised with the copy it is read from, by a quarter per
 * level (Ben Golus, "Anti-aliased alpha test: the esoteric alpha to coverage", 2017): the gaps stay gaps up close, and a crown stays a crown
 * afar.
 *
 * Done in three's own chunk, once for the page, as the air is (see AerialFog.install): every cut-out texture has the same trouble.
 */
export class CutoutCoverage {
  /** How much the alpha is raised per level of mipmap it is read from (Golus's figure). */
  static readonly PER_LEVEL = 0.25

  private static installed = false

  static install(): void {
    if (CutoutCoverage.installed) return
    CutoutCoverage.installed = true
    ShaderChunk.alphatest_fragment = `
      #if defined( USE_ALPHATEST ) && defined( USE_MAP )
        {
          vec2 texel = vMapUv * vec2( textureSize( map, 0 ) );
          vec2 across = dFdx( texel );
          vec2 up = dFdy( texel );
          float level = max( 0.0, 0.5 * log2( max( dot( across, across ), dot( up, up ) ) ) );
          diffuseColor.a *= 1.0 + level * ${CutoutCoverage.PER_LEVEL.toFixed(2)};
        }
      #endif
      ${ShaderChunk.alphatest_fragment}`
  }
}
