import { vi } from "vitest"
import { TiffFixture } from "../TiffFixture.js"

export const SAINT_LO = { lat: 49.10489, lng: -1.075382 }
export const GREEN = [70, 150, 60, 255]
export const GROUND = [207, 150, 70, 255]
export const ROOF = [180, 20, 20, 255]

/** The vectors of the map a place has, by layer, as a WFS answers in GeoJSON. */
export type Vectors = Partial<Record<"construction_lineaire" | "troncon_de_route" | "ligne_electrique" | "batiment", unknown[]>>

/** What the service answers for a square of `size` pixels: heights, the picture of what each pixel is, and the vectors of the map. */
export class Survey {
  readonly heights: number[]
  readonly pictures: number[]
  vectors: Vectors = {}
  /** The map does not answer. */
  mapDown = false

  constructor(readonly size: number, fill = 0) {
    this.heights = new Array(size * size).fill(fill)
    this.pictures = new Array(size * size).fill(0).flatMap(() => GROUND)
  }

  /** A square block of `side` pixels at (x, y) of this height, of this kind of thing. */
  block(x: number, y: number, side: number, height: number, picture: number[]): this {
    for (let j = y; j < y + side; j++) {
      for (let i = x; i < x + side; i++) {
        this.heights[j * this.size + i] = height
        this.pictures.splice((j * this.size + i) * 4, 4, ...picture)
      }
    }
    return this
  }

  /** The fetch of a service that answers each layer of this survey, and records what it was asked. */
  fetch(): typeof fetch {
    return vi.fn(async (url: string) => {
      const parameters = new URL(url).searchParams
      if (parameters.get("SERVICE") === "WFS") {
        if (this.mapDown) return { ok: false, status: 503, json: async () => ({}) } as Response
        const layer = (parameters.get("TYPENAMES") ?? "").replace("BDTOPO_V3:", "") as keyof Vectors
        return { ok: true, status: 200, json: async () => ({ features: this.vectors[layer] ?? [] }) } as Response
      }
      const layer = parameters.get("LAYERS") ?? ""
      const body = layer.includes("CLASS") ? TiffFixture.bytes(this.size, this.size, 4, this.pictures) : TiffFixture.floats(this.size, this.size, this.heights)
      return { ok: true, status: 200, arrayBuffer: async () => body } as Response
    }) as unknown as typeof fetch
  }
}

/** A LineString feature from points given as metres east and north of the test place, longitude then latitude as the map has them. */
export function line(properties: Record<string, unknown>, ...points: [number, number][]): unknown {
  const metres = 111320
  return {
    type: "Feature", properties,
    geometry: { type: "LineString", coordinates: points.map(([east, north]) => [SAINT_LO.lng + east / (metres * Math.cos(SAINT_LO.lat * Math.PI / 180)), SAINT_LO.lat + north / metres]) }
  }
}


/** A building outline from a ring of points given as metres east and north of the test place, closed, as the map writes a MultiPolygon. */
export function outline(properties: Record<string, unknown>, ...ring: [number, number][]): unknown {
  const metres = 111320
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]]
  return {
    type: "Feature", properties,
    geometry: {
      type: "MultiPolygon",
      coordinates: [[closed.map(([east, north]) => [SAINT_LO.lng + east / (metres * Math.cos(SAINT_LO.lat * Math.PI / 180)), SAINT_LO.lat + north / metres])]]
    }
  }
}
