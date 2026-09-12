/**
 * A street-level picture somebody took near the witness's spot, as Panoramax serves it.
 *
 * Panoramax (IGN and OpenStreetMap France) is the one street-level imagery this project can lay
 * over a scene: its catalogue is open, its API answers any origin, its pictures are served with the
 * header WebGL needs to read them, and every picture states where it was taken from and which way
 * it looked — which is a registration already made. Google's covers more roads, and its terms keep
 * its pictures inside its own viewers; Mapillary's would do, behind a token.
 */
export interface StreetPicture {
  id: string
  lat: number
  lng: number
  /** From the witness's spot, metres, and which way from it. */
  distanceM: number
  bearingDeg: number
  /** Which way the picture's centre looked, degrees clockwise from north, when the camera said. */
  azimuthDeg?: number
  /** Whether it is a full turn (an equirectangular 360° camera) or an ordinary photograph. */
  panorama: boolean
  /** ISO date-time it was taken at. */
  takenAt: string
  /** The picture itself, at a size a scene can carry, and the full-size one. */
  src: string
  srcFull?: string
  /** Who took it and on what terms, and where that is stated. */
  credit: string
  creditUrl: string
}

/** How Panoramax's own STAC search answers — the fields this project reads, nothing more. */
interface PanoramaxFeature {
  id: string
  geometry: { coordinates: [number, number] }
  properties: {
    datetime?: string
    "view:azimuth"?: number
    "pers:interior_orientation"?: { field_of_view?: number }
    license?: string
    providers?: { name?: string }[]
  }
  assets: Record<string, { href?: string }>
}

const EARTH_RADIUS_M = 6_371_000
const DEG_TO_RAD = Math.PI / 180

export class PanoramaxPictures {

  static readonly API = "https://api.panoramax.xyz/api"
  static readonly CREDIT = "Panoramax"
  static readonly CREDIT_URL = "https://panoramax.fr/"

  constructor(private readonly fetchJson: (url: string) => Promise<unknown> = url => fetch(url).then(response => {
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    return response.json()
  })) {}

  /** The pictures taken within `radiusM` of a spot, nearest first. */
  async nearby(lat: number, lng: number, radiusM = 300, limit = 50): Promise<StreetPicture[]> {
    const dLat = radiusM / 111_320
    const dLng = radiusM / (111_320 * Math.cos(lat * DEG_TO_RAD))
    const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map(value => value.toFixed(6)).join(",")
    const answer = await this.fetchJson(`${PanoramaxPictures.API}/search?bbox=${bbox}&limit=${limit}`) as { features?: PanoramaxFeature[] }
    const pictures = (answer.features ?? []).map(feature => this.picture(feature, lat, lng))
      .filter((picture): picture is StreetPicture => picture !== undefined && picture.distanceM <= radiusM)
    return pictures.sort((a, b) => a.distanceM - b.distanceM)
  }

  private picture(feature: PanoramaxFeature, lat: number, lng: number): StreetPicture | undefined {
    const [pictureLng, pictureLat] = feature.geometry.coordinates
    const src = feature.assets.sd?.href ?? feature.assets.hd?.href
    if (!src) return undefined
    const { distanceM, bearingDeg } = PanoramaxPictures.offset(lat, lng, pictureLat, pictureLng)
    const properties = feature.properties
    const fov = properties["pers:interior_orientation"]?.field_of_view
    const producers = (properties.providers ?? []).map(provider => provider.name).filter((name): name is string => !!name)
    const license = properties.license ?? "CC-BY-SA-4.0"
    return {
      id: feature.id,
      lat: pictureLat,
      lng: pictureLng,
      distanceM,
      bearingDeg,
      azimuthDeg: properties["view:azimuth"],
      panorama: fov !== undefined && fov >= 360,
      takenAt: properties.datetime ?? "",
      src,
      srcFull: feature.assets.hd?.href,
      credit: `${PanoramaxPictures.CREDIT}${producers.length ? ` — ${producers.join(", ")}` : ""} (${license})`,
      creditUrl: `${PanoramaxPictures.API.replace(/\/api$/, "")}/#focus=pic&pic=${feature.id}`
    }
  }

  /** Metres and bearing from one spot to another — the flat approximation, exact enough within
   * the few hundred metres this is asked about. */
  static offset(fromLat: number, fromLng: number, toLat: number, toLng: number): { distanceM: number; bearingDeg: number } {
    const north = (toLat - fromLat) * DEG_TO_RAD * EARTH_RADIUS_M
    const east = (toLng - fromLng) * DEG_TO_RAD * EARTH_RADIUS_M * Math.cos(((fromLat + toLat) / 2) * DEG_TO_RAD)
    return { distanceM: Math.hypot(east, north), bearingDeg: ((Math.atan2(east, north) / DEG_TO_RAD) + 360) % 360 }
  }
}
