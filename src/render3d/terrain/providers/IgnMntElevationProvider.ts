import type { GeoBounds } from "../GeoBounds.js"
import type { ElevationGrid, ElevationHints, ElevationProvider } from "../ElevationProvider.js"
import { GeoTiffRaster } from "../GeoTiffRaster.js"
import { geoToLocalMeters } from "../GeoProjection.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import { RouteFollowing } from "../RouteFollowing.js"
import type { GeoPoint } from "../RouteFollowing.js"

/** A place on a picture, in metres east of its west edge and south of its north edge. */
interface Point2 {
  x: number
  y: number
}

export interface IgnMntElevationProviderOptions {
  fetchImpl?: typeof fetch
  /** Mainly for tests, and for pointing at a mirror. */
  wmsEndpoint?: string
  wfsEndpoint?: string
  /** How long the service is waited for, ms: a slow answer is worth less than the worldwide relief that is there already. */
  timeoutMs?: number
  /** The widest window a vertex is averaged over, metres (see sample). 0 reads the picture at the vertex alone, which is what aliases. */
  maxWindowM?: number
}

/**
 * The ground of France as the IGN measured it: the bare-earth model of the LiDAR HD survey (a point every metre, trees and roofs taken out) and,
 * where the laser has not flown yet, the RGE ALTI (the same metre-grid model from the older survey, which covers the whole country).
 *
 * Measured against it at Saint-Lô, Maffliers and Silly-le-Long, the worldwide relief (see AwsTerrariumElevationProvider, from SRTM) is a metre or two
 * off near the observer and five to twenty metres off where there is forest or a road on an embankment: SRTM is a model of the SURFACE, so the
 * canopy lifts it, and it is fifteen metres to the pixel, so an embankment is smoothed away. A building stood on it flies or sinks by as much.
 *
 * The service is asked for one picture of the square, at four metres to the pixel, which is already finer than the mesh the scene builds from it
 * (one vertex every 28 m): a picture a hundred times larger would buy nothing. A vertex is read from it by bilinear interpolation between pixel centres.
 * What the picture does not hold (the laser's holes, a border) is -9999 in it: a few vertices are filled from their neighbours, many are not a ground
 * this provider can answer for, and it says so, for another to answer (see FirstElevationThatAnswers).
 */
export class IgnMntElevationProvider implements ElevationProvider {
  private static readonly WMS = "https://data.geopf.fr/wms-r/wms"
  /** In the order they are tried: the laser's bare earth, then the older survey's grid. */
  static readonly LAYERS = ["IGNF_LIDAR-HD_MNT_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93", "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"]
  private static readonly METRES_PER_PIXEL = 4
  private static readonly METRES_PER_DEGREE = 111320
  private static readonly CLASS_LAYER = "IGNF_LIDAR-HD_CLASS"
  private static readonly SURFACE_LAYER = "IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"
  /** The yellow of the classification's own key for a bridge deck. */
  private static readonly DECK = [240, 240, 0]
  /** And the colour of a point the laser did not class, which is what the ends of a deck are. */
  private static readonly NO_CLASS = [0, 0, 0]
  private static readonly DECK_END_PIXELS = 3
  /** How far each side of a section carried over the ground its deck is laid from the map (see layRouteDecks): a carriageway and its verges. */
  private static readonly DECK_HALF_WIDTH_M = 8
  /** How far past each end of it the deck is laid, and its approach read. */
  private static readonly DECK_APPROACH_M = 10
  /** Past this length a deck is a viaduct's, not straight. */
  private static readonly DECK_STRAIGHT_MAX_M = 200
  private static readonly MIN_PIXELS = 8
  private static readonly MAX_PIXELS = 700
  /**
   * Below this a value is no ground: the service's −9999, and what it makes of it when it shrinks a picture over a hole, a mix of the two. France's
   * lowest ground is a couple of metres under the sea; it was −9000, which let those mixes through as wells kilometres deep.
   */
  private static readonly NO_DATA_BELOW = -100
  /** Past this many metres to the pixel, a picture is coarse (see getElevationGrid). */
  private static readonly COARSE_METRES_PER_PIXEL = 20
  /** The share of vertices over no data that is still filled from the neighbours: more, and the layer does not cover the place. */
  /** A request of this many vertices a side is a mesh's; fewer is a point or two. */
  private static readonly MESH_FROM_VERTICES = 33
  private static readonly FINE_SPACING_M = 7
  private static readonly MAX_SEGMENTS = 256
  private static readonly MAX_HOLE_SHARE = 0.05
  private static readonly DEFAULT_TIMEOUT_MS = 12_000
  private static readonly MAX_WINDOW_M = 50

  private readonly fetchImpl: typeof fetch
  private readonly wms: string
  private readonly timeoutMs: number
  private readonly maxWindowM: number
  private readonly geoplatform: IgnGeoplatform

  constructor(options: IgnMntElevationProviderOptions = {}) {
    // Bound, as AwsTerrariumElevationProvider's is: an unbound fetch loses the `this` it needs once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.wms = options.wmsEndpoint ?? IgnMntElevationProvider.WMS
    this.timeoutMs = options.timeoutMs ?? IgnMntElevationProvider.DEFAULT_TIMEOUT_MS
    this.maxWindowM = options.maxWindowM ?? IgnMntElevationProvider.MAX_WINDOW_M
    this.geoplatform = new IgnGeoplatform({ fetchImpl: this.fetchImpl, wmsEndpoint: this.wms, wfsEndpoint: options.wfsEndpoint })
  }

  async getElevationGrid(bounds: GeoBounds, resolution: { width: number, height: number }, hints?: ElevationHints): Promise<ElevationGrid> {
    const centre = { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 }
    if (!IgnGeoplatform.covers(centre.lat, centre.lng)) throw new Error("The IGN's relief covers France only")
    const widthM = Math.abs(geoToLocalMeters(centre.lat, bounds.east, centre.lat, bounds.west).x)
    const heightM = Math.abs(geoToLocalMeters(bounds.north, centre.lng, bounds.south, centre.lng).z)
    resolution = this.finer(resolution, widthM, heightM)
    const spacingM = { x: widthM / Math.max(1, resolution.width - 1), y: heightM / Math.max(1, resolution.height - 1) }
    // The picture reaches past the square by the width of the window a vertex is averaged over, so that the vertices on the edge have all of theirs.
    const marginM = { x: Math.min(spacingM.x, this.maxWindowM), y: Math.min(spacingM.y, this.maxWindowM) }
    const fetched: GeoBounds = {
      south: bounds.south - marginM.y / IgnMntElevationProvider.METRES_PER_DEGREE, north: bounds.north + marginM.y / IgnMntElevationProvider.METRES_PER_DEGREE,
      west: bounds.west - marginM.x / (IgnMntElevationProvider.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180)),
      east: bounds.east + marginM.x / (IgnMntElevationProvider.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180))
    }
    const pixels = (extentM: number): number => Math.min(IgnMntElevationProvider.MAX_PIXELS,
      Math.max(IgnMntElevationProvider.MIN_PIXELS, Math.ceil(extentM / IgnMntElevationProvider.METRES_PER_PIXEL)))
    const size = { width: pixels(widthM + 2 * marginM.x), height: pixels(heightM + 2 * marginM.y) }
    const metresPerPixel = { x: (widthM + 2 * marginM.x) / size.width, y: (heightM + 2 * marginM.y) / size.height }
    let failure: unknown = new Error("No layer of the IGN's relief answered")
    // A coarse picture (the far ring round a patch, tens of kilometres) is asked of the older survey first: the laser's metre is lost at that scale,
    // and where it has not flown yet the service mixes its no-data into the heights it shrinks, which came back as wells hundreds of metres deep.
    const coarse = Math.max(metresPerPixel.x, metresPerPixel.y) > IgnMntElevationProvider.COARSE_METRES_PER_PIXEL
    for (const layer of coarse ? [...IgnMntElevationProvider.LAYERS].reverse() : IgnMntElevationProvider.LAYERS) {
      try {
        const raster = await this.heights(fetched, size, layer)
        if (layer === IgnMntElevationProvider.LAYERS[0]) await this.layBridgeDecks(raster, fetched, size, hints?.route)
        const heights = this.sample(raster, resolution, bounds, fetched, metresPerPixel, spacingM)
        if (heights) return { heights, width: resolution.width, height: resolution.height, bounds }
        failure = new Error(`${layer} does not cover this place`)
      } catch (error) {
        failure = error
      }
    }
    throw failure
  }

  /**
   * The grid this answers with: as fine as asked, and for a mesh (a request of a few dozen vertices a side, not a point or two) as fine as the picture allows
   * up to a vertex every seven metres. The mesh the scene asked for, a vertex every 28 m, cannot hold a road: measured on the motorway at Silly-le-Long it
   * stood 2 m under the road on average and buckled by metres along it, because a road on an embankment is thirty metres across and the mesh's cell was as
   * wide. At seven metres the same road is within 15 cm (rms) of the laser's. The vertex count is odd, as the scene's is (the centre one is the observer).
   */
  private finer(asked: { width: number, height: number }, widthM: number, heightM: number): { width: number, height: number } {
    if (asked.width < IgnMntElevationProvider.MESH_FROM_VERTICES || asked.height < IgnMntElevationProvider.MESH_FROM_VERTICES) return asked
    const segments = (extentM: number, askedVertices: number): number => {
      const wanted = Math.ceil(extentM / IgnMntElevationProvider.FINE_SPACING_M)
      const even = Math.max(askedVertices - 1, Math.min(IgnMntElevationProvider.MAX_SEGMENTS, wanted))
      return even % 2 === 0 ? even : even + 1
    }
    return { width: segments(widthM, asked.width) + 1, height: segments(heightM, asked.height) + 1 }
  }

  private async raster(bounds: GeoBounds, size: { width: number, height: number }, layer: string): Promise<GeoTiffRaster> {
    const query = new URLSearchParams({
      SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetMap", LAYERS: layer, STYLES: "", CRS: "EPSG:4326",
      // WMS 1.3.0 gives the axes of EPSG:4326 in its own order: latitude first.
      BBOX: [bounds.south, bounds.west, bounds.north, bounds.east].map(v => v.toFixed(6)).join(","),
      WIDTH: String(size.width), HEIGHT: String(size.height), FORMAT: "image/geotiff"
    })
    const response = await this.fetchImpl(`${this.wms}?${query}`, { signal: AbortSignal.timeout(this.timeoutMs) })
    if (!response.ok) throw new Error(`The IGN's relief answered ${response.status}`)
    return GeoTiffRaster.parse(await response.arrayBuffer())
  }

  /** A picture of heights, one value a pixel, in the layout this reads. */
  private async heights(bounds: GeoBounds, size: { width: number, height: number }, layer: string): Promise<GeoTiffRaster> {
    const raster = await this.raster(bounds, size, layer)
    if (raster.samples !== 1 || !(raster.values instanceof Float32Array)) throw new Error("The IGN's relief came in a layout this does not read")
    return raster
  }

  /**
   * Puts the deck of a bridge where the ground is, for the observer who drives on it.
   *
   * The laser takes a bridge out of the bare-earth model: under a road that crosses another it is the other road, or the ditch, that the model holds, eight
   * metres under the one the observer drives on. A scene on that ground has the observer dive into a trench at every overpass, and what the road
   * is drawn on, and the vehicles on it, with him. The laser's own classification says where it saw a deck (it is yellow in the picture of it), and the surface
   * model holds the deck's height there: the ground is raised to it, over the width of the deck and no further.
   *
   * But only for the deck of a road the observer's route goes along. At a crossing the deck is over the other road, and the observer who drives that other one
   * goes UNDER it: raised there, the ground would climb six metres under the bridge and drop again, a roller coaster. Which of the two he drives is not in
   * the heights, and is in his route and in the map, which says of each road section whether it is carried over the ground. Without a route (an observer who
   * stands still) no deck is laid, and the ground is the bare earth's. A viaduct over a wide valley leaves a dam a deck wide across it, which the mesh could
   * not have drawn as a valley either.
   *
   * Never a reason to fail: without the map, the classification or the surface, the ground stays the bare earth's.
   */
  private async layBridgeDecks(ground: GeoTiffRaster, bounds: GeoBounds, size: { width: number, height: number }, route?: readonly GeoPoint[]): Promise<void> {
    if (!route || route.length < 2) return
    if (!(ground.values instanceof Float32Array) || !ground.values.some(height => height > IgnMntElevationProvider.NO_DATA_BELOW)) return
    try {
      const carrying = (await this.geoplatform.elevatedRoadLines({ west: bounds.west, south: bounds.south, east: bounds.east, north: bounds.north }))
        .filter(line => RouteFollowing.follows(route, line))
      if (carrying.length === 0) return
      const bare = Float32Array.from(ground.values)
      await this.layClassifiedDecks(ground, bounds, size, carrying)
      this.layRouteDecks(ground, bare, bounds, carrying)
    } catch {
      // The bare earth is still a ground.
    }
  }

  /**
   * The decks the laser saw (see layBridgeDecks), at the height of the surface model, over their whole width. Patchy: the classification calls a deck
   * only part of its pixels (at Silly-le-Long, the RN2 over the railway: one in three, the rest unclassified or ground), and the surface model of the
   * LiDAR HD answered one request in two in October 2026 (400 LayerNotDefined, 502): what layRouteDecks lays does not depend on either.
   */
  private async layClassifiedDecks(ground: GeoTiffRaster, bounds: GeoBounds, size: { width: number, height: number }, carrying: readonly (readonly GeoPoint[])[]): Promise<void> {
    try {
      const classes = await this.raster(bounds, size, IgnMntElevationProvider.CLASS_LAYER)
      if (classes.samples < 3 || classes.width !== ground.width || classes.height !== ground.height) return
      const colour = (i: number, [r, g, b]: number[]): boolean =>
        classes.values[i * classes.samples] === r && classes.values[i * classes.samples + 1] === g && classes.values[i * classes.samples + 2] === b
      const width = ground.width
      const height = ground.height
      const deck = new Uint8Array(width * height)
      let found = false
      for (let i = 0; i < deck.length; i++) {
        if (colour(i, IgnMntElevationProvider.DECK)) { deck[i] = 1; found = true }
      }
      if (!found) return
      // The two ends of a deck, where the laser saw the abutments and not the deck, are in the picture as pixels of no class: those next to a deck are the deck's.
      const reach = IgnMntElevationProvider.DECK_END_PIXELS
      const ends: number[] = []
      for (let i = 0; i < deck.length; i++) {
        if (deck[i] !== 1) continue
        const x = i % width
        const y = (i - x) / width
        for (let dy = -reach; dy <= reach; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const j = ny * width + nx
            if (deck[j] === 0 && colour(j, IgnMntElevationProvider.NO_CLASS)) ends.push(j)
          }
        }
      }
      for (const j of ends) deck[j] = 1
      // The decks that carry the road the observer is on: those a section of it, carried over the ground, passes over.
      const onRoute = this.paint(carrying, bounds, width, height)
      const laid = this.touching(deck, onRoute, width, height)
      if (laid.every(flag => flag === 0)) return
      const surface = await this.heights(bounds, size, IgnMntElevationProvider.SURFACE_LAYER)
      if (surface.width !== width || surface.height !== height) return
      for (let i = 0; i < laid.length; i++) {
        if (laid[i] === 0) continue
        const top = surface.values[i]
        if (Number.isFinite(top) && top > IgnMntElevationProvider.NO_DATA_BELOW && top > ground.values[i]) ground.values[i] = top
      }
    } catch {
      // The road's own deck is still laid.
    }
  }

  /**
   * The deck under the road the observer drives, from the map alone: along each section carried over the ground (joined end to end, a bridge the map
   * cuts in two being one), DECK_HALF_WIDTH_M each side and DECK_APPROACH_M past each end, a straight slope between the ground of the two approaches,
   * wherever the bare earth stands lower. WHY: the RN2 over the railway at Silly-le-Long, a cutting 7.6 m deep under two sections of 27 m, came out of
   * the classified decks as patches, and the mesh's average of them and of the hole as a dip, a bump and a dip (half a metre to a metre) where the
   * road is level. A deck between abutments is straight, and the hole under it reaches under the abutments, which is why it is laid past them.
   * Not a viaduct (longer than DECK_STRAIGHT_MAX_M), whose deck is curved: the surface model's alone.
   */
  private layRouteDecks(ground: GeoTiffRaster, bare: Float32Array, bounds: GeoBounds, carrying: readonly (readonly GeoPoint[])[]): void {
    const { width, height } = ground
    const latitude = (bounds.north + bounds.south) / 2
    const metresX = (bounds.east - bounds.west) * IgnMntElevationProvider.METRES_PER_DEGREE * Math.cos(latitude * Math.PI / 180)
    const metresY = (bounds.north - bounds.south) * IgnMntElevationProvider.METRES_PER_DEGREE
    const pixelX = metresX / width
    const pixelY = metresY / height
    const toMetres = (point: GeoPoint): Point2 => ({
      x: (point.lng - bounds.west) / (bounds.east - bounds.west) * metresX, y: (bounds.north - point.lat) / (bounds.north - bounds.south) * metresY
    })
    const bareAt = (x: number, y: number): number | undefined => {
      const col = Math.floor(x / pixelX)
      const row = Math.floor(y / pixelY)
      if (col < 0 || row < 0 || col >= width || row >= height) return undefined
      const value = bare[row * width + col]
      return Number.isFinite(value) && value > IgnMntElevationProvider.NO_DATA_BELOW ? value : undefined
    }
    const half = IgnMntElevationProvider.DECK_HALF_WIDTH_M
    const approach = IgnMntElevationProvider.DECK_APPROACH_M
    // The ground of an approach: the highest of the road at the end and along the approach past it, which is on the embankment and not in the hole.
    const approachHeight = (end: Point2, inner: Point2): number | undefined => {
      const length = Math.hypot(end.x - inner.x, end.y - inner.y) || 1
      const out = { x: (end.x - inner.x) / length, y: (end.y - inner.y) / length }
      const heights = [0, approach / 2, approach].map(d => bareAt(end.x + out.x * d, end.y + out.y * d)).filter((value): value is number => value !== undefined)
      return heights.length > 0 ? Math.max(...heights) : undefined
    }
    for (const chain of IgnMntElevationProvider.chains(carrying.map(line => line.map(toMetres)))) {
      const along = [0]
      for (let i = 1; i < chain.length; i++) along.push(along[i - 1] + Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y))
      const length = along[along.length - 1]
      if (length < 1 || length > IgnMntElevationProvider.DECK_STRAIGHT_MAX_M) continue
      const start = approachHeight(chain[0], chain[1])
      const end = approachHeight(chain[chain.length - 1], chain[chain.length - 2])
      if (start === undefined || end === undefined) continue
      const reach = half + approach
      const fromCol = Math.max(0, Math.floor((Math.min(...chain.map(p => p.x)) - reach) / pixelX))
      const toCol = Math.min(width - 1, Math.ceil((Math.max(...chain.map(p => p.x)) + reach) / pixelX))
      const fromRow = Math.max(0, Math.floor((Math.min(...chain.map(p => p.y)) - reach) / pixelY))
      const toRow = Math.min(height - 1, Math.ceil((Math.max(...chain.map(p => p.y)) + reach) / pixelY))
      for (let row = fromRow; row <= toRow; row++) {
        for (let col = fromCol; col <= toCol; col++) {
          const nearest = IgnMntElevationProvider.nearestAlong(chain, along, { x: (col + 0.5) * pixelX, y: (row + 0.5) * pixelY })
          if (nearest.distance > half || nearest.s < -approach || nearest.s > length + approach) continue
          const deck = start + (end - start) * Math.min(1, Math.max(0, nearest.s / length))
          const i = row * width + col
          if (!(bare[i] >= deck)) ground.values[i] = deck
        }
      }
    }
  }

  /** Lines joined where an end of one is an end of another, to a metre. */
  private static chains(lines: Point2[][]): Point2[][] {
    const pending = lines.filter(line => line.length >= 2).map(line => [...line])
    const out: Point2[][] = []
    const meets = (a: Point2, b: Point2): boolean => Math.hypot(a.x - b.x, a.y - b.y) <= 1
    while (pending.length > 0) {
      let chain = pending.shift()!
      let grown = true
      while (grown) {
        grown = false
        for (let k = 0; k < pending.length; k++) {
          const line = pending[k]
          const head = chain[0]
          const tail = chain[chain.length - 1]
          if (meets(tail, line[0])) chain = [...chain, ...line.slice(1)]
          else if (meets(tail, line[line.length - 1])) chain = [...chain, ...[...line].reverse().slice(1)]
          else if (meets(head, line[line.length - 1])) chain = [...line.slice(0, -1), ...chain]
          else if (meets(head, line[0])) chain = [...[...line].reverse().slice(0, -1), ...chain]
          else continue
          pending.splice(k, 1)
          grown = true
          break
        }
      }
      out.push(chain)
    }
    return out
  }

  /** How far along a line (its first and last segments drawn on past its ends) the point nearest to `point` is, and how far it is from it. */
  private static nearestAlong(chain: Point2[], along: number[], point: Point2): { s: number, distance: number } {
    let best = { s: 0, distance: Infinity }
    for (let k = 0; k < chain.length - 1; k++) {
      const a = chain[k]
      const b = chain[k + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const length2 = dx * dx + dy * dy
      if (length2 < 1e-9) continue
      let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2
      if (k > 0) t = Math.max(0, t)
      if (k < chain.length - 2) t = Math.min(1, t)
      const distance = Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t))
      if (distance < best.distance) best = { s: along[k] + t * Math.sqrt(length2), distance }
    }
    return best
  }

  /** The pixels the lines pass through, and their neighbours: lines drawn on the picture. */
  private paint(lines: readonly (readonly GeoPoint[])[], bounds: GeoBounds, width: number, height: number): Uint8Array {
    const painted = new Uint8Array(width * height)
    const toX = (lng: number): number => (lng - bounds.west) / (bounds.east - bounds.west) * width
    const toY = (lat: number): number => (bounds.north - lat) / (bounds.north - bounds.south) * height
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const x0 = toX(line[i].lng)
        const y0 = toY(line[i].lat)
        const x1 = toX(line[i + 1].lng)
        const y1 = toY(line[i + 1].lat)
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
        for (let s = 0; s <= steps; s++) {
          const cx = Math.floor(x0 + (x1 - x0) * s / steps)
          const cy = Math.floor(y0 + (y1 - y0) * s / steps)
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const x = cx + dx
              const y = cy + dy
              if (x >= 0 && y >= 0 && x < width && y < height) painted[y * width + x] = 1
            }
          }
        }
      }
    }
    return painted
  }

  /** The pixels of `mask` that belong to a whole piece (touching, corner to corner too) of it that `marks` touches somewhere. */
  private touching(mask: Uint8Array, marks: Uint8Array, width: number, height: number): Uint8Array {
    const kept = new Uint8Array(mask.length)
    const seen = new Uint8Array(mask.length)
    for (let start = 0; start < mask.length; start++) {
      if (mask[start] === 0 || seen[start] === 1) continue
      const piece: number[] = []
      const stack = [start]
      seen[start] = 1
      let touched = false
      while (stack.length > 0) {
        const at = stack.pop() as number
        piece.push(at)
        if (marks[at] === 1) touched = true
        const x = at % width
        const y = (at - x) / width
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
            const next = ny * width + nx
            if (mask[next] === 1 && seen[next] === 0) { seen[next] = 1; stack.push(next) }
          }
        }
      }
      if (touched) for (const at of piece) kept[at] = 1
    }
    return kept
  }

  /**
   * The heights at the vertices of the grid the scene asks for, or nothing where the picture holds too little of them.
   *
   * A vertex is the weighted mean of the pixels round it, not the value of the pixel at it. The picture holds a metre-wide embankment, a bridge deck, a
   * ditch; the mesh holds a vertex every 28 m and joins them with straight lines. Reading the picture AT the vertices let each of those features through
   * or not by where the grid happened to fall: a road on an embankment was sampled up on one vertex and down on the next (a track that bucks like an
   * off-road one, on a motorway), and a bridge deck seen by one vertex stood in the ground as a spike. A tent as wide as the spacing is what a straight
   * line between vertices reproduces: it keeps the relief the mesh can draw (a hill, a valley, the lie of a slope) and drops what it cannot.
   */
  private sample(raster: GeoTiffRaster, resolution: { width: number, height: number }, bounds: GeoBounds, fetched: GeoBounds,
    metresPerPixel: { x: number, y: number }, spacingM: { x: number, y: number }): Float32Array | undefined {
    const { width, height } = resolution
    const heights = new Float32Array(width * height)
    const known = new Uint8Array(width * height)
    const reachX = Math.min(spacingM.x, this.maxWindowM) / metresPerPixel.x
    const reachY = Math.min(spacingM.y, this.maxWindowM) / metresPerPixel.y
    let holes = 0
    for (let row = 0; row < height; row++) {
      // Between pixel centres: a pixel is a square whose value belongs to its middle.
      const lat = bounds.north + (bounds.south - bounds.north) * (height === 1 ? 0.5 : row / (height - 1))
      const y = (fetched.north - lat) / (fetched.north - fetched.south) * raster.height - 0.5
      for (let col = 0; col < width; col++) {
        const lng = bounds.west + (bounds.east - bounds.west) * (width === 1 ? 0.5 : col / (width - 1))
        const x = (lng - fetched.west) / (fetched.east - fetched.west) * raster.width - 0.5
        const value = reachX > 1 || reachY > 1 ? this.tent(raster, x, y, Math.max(1, reachX), Math.max(1, reachY)) : this.bilinear(raster, x, y)
        const i = row * width + col
        if (value === undefined) holes++
        else { heights[i] = value; known[i] = 1 }
      }
    }
    if (holes === width * height || holes / (width * height) > IgnMntElevationProvider.MAX_HOLE_SHARE) return undefined
    this.fill(heights, known, width, height)
    return heights
  }

  /** The mean of the pixels within `reach` of a point, weighted by a tent that falls to nothing at that distance; nothing where under half of the weight has data. */
  private tent(raster: GeoTiffRaster, x: number, y: number, reachX: number, reachY: number): number | undefined {
    let sum = 0
    let weights = 0
    let total = 0
    const y0 = Math.max(0, Math.ceil(y - reachY))
    const y1 = Math.min(raster.height - 1, Math.floor(y + reachY))
    const x0 = Math.max(0, Math.ceil(x - reachX))
    const x1 = Math.min(raster.width - 1, Math.floor(x + reachX))
    for (let py = y0; py <= y1; py++) {
      const wy = 1 - Math.abs(py - y) / reachY
      if (wy <= 0) continue
      for (let px = x0; px <= x1; px++) {
        const w = wy * (1 - Math.abs(px - x) / reachX)
        if (w <= 0) continue
        total += w
        const value = raster.at(px, py)
        if (!Number.isFinite(value) || value < IgnMntElevationProvider.NO_DATA_BELOW) continue
        sum += w * value
        weights += w
      }
    }
    return total > 0 && weights >= total * 0.5 ? sum / weights : undefined
  }

  /** The value between four pixels, or nothing where any of them has no data (a vertex half over the laser's hole is not a height). */
  private bilinear(raster: GeoTiffRaster, x: number, y: number): number | undefined {
    const x0 = Math.max(0, Math.min(raster.width - 1, Math.floor(x)))
    const y0 = Math.max(0, Math.min(raster.height - 1, Math.floor(y)))
    const x1 = Math.min(raster.width - 1, x0 + 1)
    const y1 = Math.min(raster.height - 1, y0 + 1)
    const fx = Math.max(0, Math.min(1, x - x0))
    const fy = Math.max(0, Math.min(1, y - y0))
    const h00 = raster.at(x0, y0)
    const h10 = raster.at(x1, y0)
    const h01 = raster.at(x0, y1)
    const h11 = raster.at(x1, y1)
    for (const h of [h00, h10, h01, h11]) if (!Number.isFinite(h) || h < IgnMntElevationProvider.NO_DATA_BELOW) return undefined
    const top = h00 + (h10 - h00) * fx
    const bottom = h01 + (h11 - h01) * fx
    return top + (bottom - top) * fy
  }

  /** Each vertex without a height takes the mean of those around it, from the known ones outward, until none is left. */
  private fill(heights: Float32Array, known: Uint8Array, width: number, height: number): void {
    let remaining = known.reduce((n, k) => n + (k ? 0 : 1), 0)
    while (remaining > 0) {
      const found: [number, number][] = []
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const i = row * width + col
          if (known[i]) continue
          let sum = 0
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = row + dr
              const c = col + dc
              if (r < 0 || c < 0 || r >= height || c >= width || !known[r * width + c]) continue
              sum += heights[r * width + c]
              count++
            }
          }
          if (count > 0) found.push([i, sum / count])
        }
      }
      if (found.length === 0) return
      for (const [i, value] of found) { heights[i] = value; known[i] = 1 }
      remaining -= found.length
    }
  }
}
