/**
 * Every layer of the scene a pass draws on its own, in one place so that no two of them share a number.
 *
 * A camera set to a layer draws everything on it, whoever put it there. The Sun's dazzle and the bodies once shared layer 4: the
 * dazzle is drawn onto the picture resampled from the cube of a wide field (over some 65°, see EquidistantProjectionPass) through the
 * eye's own rectilinear camera, and every body of an interpretation came out a second time beside itself, where that camera puts it
 * rather than where the picture's projection did — a dozen pixels apart at 70°, further towards the edges, and only while the Sun was
 * up. Layer 0 is the scene itself, on which everything is by default.
 */
export const RenderLayers = {
  /** The decor's solid parts, so that they alone can be drawn into the depth the phenomena are tested against (see SceneRenderer.renderPhenomenaPass). */
  decorDepth: 1,
  /** The observer's own phenomena (see PhenomenonSystem). */
  phenomenon: 2,
  /** The pictures of the place laid over the scene (see ReferenceSystem). */
  reference: 3,
  /** Every part of a body, for its silhouette to be cut out of the pictures of the place (see SceneRenderer.renderBodiesOverReferences). */
  bodyOver: 4,
  /** The compass, drawn with the overlays (see SceneRenderer.renderHudPass). */
  hud: 5,
  /** The foreground, for the small picture the point sources are hidden by (see PointLayerPass). */
  pointOccluder: 6,
  /** The clouds, for the same small picture (see PointLayerPass). */
  pointCloud: 7,
  /** The Sun's dazzle alone, drawn onto a picture resampled from the cube (see SceneRenderer.renderDazzleOnResample). */
  dazzle: 8
} as const
