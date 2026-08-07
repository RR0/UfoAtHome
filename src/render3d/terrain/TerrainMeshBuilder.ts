// Named imports only — see SceneRenderer.ts's own top-of-file comment on why (tree-shaking).
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Mesh, MeshLambertMaterial } from "three"
import type { ElevationProvider } from "./ElevationProvider.js"
import type { ImageryProvider } from "./ImageryProvider.js"
import type { GeoBounds } from "./GeoBounds.js"
import { geoToLocalMeters, localMetersToGeo } from "./GeoProjection.js"

const TERRAIN_SEGMENTS = 64
const GRID_SIZE = TERRAIN_SEGMENTS + 1 // 65 — odd, so the center vertex lands exactly on the observer
const IMAGERY_RESOLUTION = 512

/** Full color out to this radius, fading to fully transparent by FADE_END — both kept well inside
 * the guaranteed provider coverage (a 3x3 tile grid sized so a single tile already covers the
 * requested span — see TileMath.chooseZoomForTileEdge — gives roughly 1.5 tile-widths of real data
 * from center in the worst case, well beyond FADE_END here), so the patch always blends into
 * SceneRenderer's existing flat haze disc rather than showing a hard edge or running past real data.
 * FADE_END matches GROUND_RADIUS (SceneRenderer.ts) deliberately, not a smaller "safe" value: an
 * earlier, much smaller radius left most of a typical camera's *visible* ground area — especially
 * with an upward-pitched gaze, where most of the frame's ground band is actually far away, not
 * close underfoot — showing the flat disc instead of real terrain far more than the data shortage
 * alone required. */
const FULL_OPACITY_RADIUS_M = 700
const FADE_END_RADIUS_M = 900

/** Must match SceneRenderer's own flat groundMesh.position.y — real ground level, world y=0 (see
 * buildGround's own doc comment) — so the terrain patch meets the existing disc at the same height
 * right where they overlap (at the observer's own position, where the patch's own elevation offset
 * is exactly 0 — see the `y = TERRAIN_BASE_Y + ...` below). */
const TERRAIN_BASE_Y = 0
/** A small nudge above the flat disc — purely conceptual/cosmetic now that the material's own
 * depthTest:false (see below) is what actually keeps the two from z-fighting; kept mainly so the
 * patch is never numerically exactly coplanar with the disc even in a future where something re-
 * enables depth testing. */
const TERRAIN_Y_OFFSET = 0.01

export interface TerrainBuildResult {
  mesh: Mesh
  attribution: string
}

function boundsAroundObserver(observerLat: number, observerLng: number, radiusM: number): GeoBounds {
  return {
    north: localMetersToGeo(0, -radiusM, observerLat, observerLng).lat,
    south: localMetersToGeo(0, radiusM, observerLat, observerLng).lat,
    east: localMetersToGeo(radiusM, 0, observerLat, observerLng).lng,
    west: localMetersToGeo(-radiusM, 0, observerLat, observerLng).lng
  }
}

/**
 * Builds a location-accurate, relief-displaced, photo-textured ground patch around
 * (observerLat, observerLng) — see SceneRenderer.setTerrainOrigin(), which swaps this in place of
 * (on top of) the existing flat haze disc once built. Depends only on the ElevationProvider/
 * ImageryProvider interfaces, never a concrete provider class — see defaultTerrainProviders.ts for
 * the single place that picks which ones are actually used.
 */
export async function buildTerrainMesh(
  observerLat: number,
  observerLng: number,
  providers: { elevation: ElevationProvider; imagery: ImageryProvider }
): Promise<TerrainBuildResult> {
  const bounds = boundsAroundObserver(observerLat, observerLng, FADE_END_RADIUS_M)
  const resolution = { width: GRID_SIZE, height: GRID_SIZE }
  const [elevationGrid, imageryTexture] = await Promise.all([
    providers.elevation.getElevationGrid(bounds, resolution),
    providers.imagery.getImageryTexture(bounds, { width: IMAGERY_RESOLUTION, height: IMAGERY_RESOLUTION })
  ])

  const centerIndex = Math.floor(GRID_SIZE / 2)
  const observerElevation = elevationGrid.heights[centerIndex * GRID_SIZE + centerIndex]

  const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
  const uvs = new Float32Array(GRID_SIZE * GRID_SIZE * 2)
  const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 4)

  for (let row = 0; row < GRID_SIZE; row++) {
    const tRow = row / (GRID_SIZE - 1) // 0 = north edge, 1 = south edge
    const lat = bounds.north + (bounds.south - bounds.north) * tRow
    for (let col = 0; col < GRID_SIZE; col++) {
      const tCol = col / (GRID_SIZE - 1) // 0 = west edge, 1 = east edge
      const lng = bounds.west + (bounds.east - bounds.west) * tCol
      const { x, z } = geoToLocalMeters(lat, lng, observerLat, observerLng)
      const elevation = elevationGrid.heights[row * GRID_SIZE + col]
      const y = TERRAIN_BASE_Y + TERRAIN_Y_OFFSET + (elevation - observerElevation)

      const i = row * GRID_SIZE + col
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      uvs[i * 2] = tCol
      uvs[i * 2 + 1] = tRow

      // Chebyshev (box) distance, not Euclidean: the patch is a SQUARE of real, successfully-
      // fetched data out to FADE_END_RADIUS_M on every side (see boundsAroundObserver) — a radial
      // (circular) fade would needlessly hide the ~21% of that square outside its inscribed circle
      // (the four corners), which is exactly what a viewer sees as random flat-disc patches poking
      // through valid terrain depending on camera heading. Box distance fades uniformly right up to
      // the patch's own true edge on all four sides instead, using data that was already fetched.
      const distance = Math.max(Math.abs(x), Math.abs(z))
      const alpha = 1 - clamp((distance - FULL_OPACITY_RADIUS_M) / (FADE_END_RADIUS_M - FULL_OPACITY_RADIUS_M), 0, 1)
      colors[i * 4] = 1
      colors[i * 4 + 1] = 1
      colors[i * 4 + 2] = 1
      colors[i * 4 + 3] = alpha
    }
  }

  const indices = new Uint16Array(TERRAIN_SEGMENTS * TERRAIN_SEGMENTS * 6)
  let idx = 0
  for (let row = 0; row < TERRAIN_SEGMENTS; row++) {
    for (let col = 0; col < TERRAIN_SEGMENTS; col++) {
      const a = row * GRID_SIZE + col
      const b = a + 1
      const c = a + GRID_SIZE
      const d = c + 1
      indices[idx++] = a
      indices[idx++] = c
      indices[idx++] = b
      indices[idx++] = b
      indices[idx++] = c
      indices[idx++] = d
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(positions, 3))
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2))
  geometry.setAttribute("color", new BufferAttribute(colors, 4))
  geometry.setIndex(new BufferAttribute(indices, 1))
  // A hand-built BufferGeometry carries no normal attribute unless asked — unlike every Three.js
  // primitive geometry elsewhere in this renderer, which already includes one. Required for real
  // per-pixel shading/shadows now that this is lit (see the material below), and a nice side
  // effect for free: the real relief now visibly self-shades (a slope facing the Sun reads
  // brighter than one facing away), not just flat-colored by its own photo texture.
  geometry.computeVertexNormals()

  const texture = new CanvasTexture(imageryTexture.source)
  texture.flipY = false // our uv.v=0 is already the raster's own top (north) row — see the loop above

  const material = new MeshLambertMaterial({
    map: texture,
    // Neutral (not day/night-tinted) — color grading now comes entirely from SceneRenderer's real
    // lights actually lighting this material, see updateCelestialLight's own doc comment on why
    // baking the same tint into both the material and the light would double-darken every night
    // scene.
    color: new Color(1, 1, 1),
    vertexColors: true,
    transparent: true,
    fog: true,
    // The flat disc and this patch are meant to LAYER (patch drawn over disc, blended only by the
    // vertex-alpha fade above), not spatially compete for the same depth — at their true distances
    // (hundreds of meters) the WebGL depth buffer's precision is far too coarse to reliably tell
    // "patch, offset by a few meters of real relief" apart from "disc, exactly flat" apart, which
    // without this caused real, confirmed-good terrain to lose the depth test and vanish in large,
    // clean-edged patches wherever local relief happened to sit close to the disc's own flat plane
    // — not a data or fetch problem, a depth-precision one. See renderOrder below for the other half
    // of the fix (SceneRenderer sets it higher than groundMesh's default so this draws afterward).
    // Unrelated to (and doesn't interfere with) real-time shadow mapping — that's a separate depth
    // pass from each light's own point of view, not the main camera depth test this disables.
    depthTest: false
  })

  const mesh = new Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true
  return { mesh, attribution: providers.imagery.attribution }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
