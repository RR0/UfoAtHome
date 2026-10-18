/**
 * The places UFO@home freezes data for (its roads, see build-road-archive.ts; its water, see build-water-archive.ts): the square each published
 * recording's scene can ever build a terrain patch on, and the way a build step reaches the services that answer about them.
 */
import { execFile } from "node:child_process"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"

/** Metres of latitude, and of longitude at the equator — the sphere this project measures with
 * everywhere else (see terrain/GeoProjection.ts). */
const METRES_PER_DEGREE = 111320
/** SceneRenderer's own three, so the square frozen here is the square the scene will ask for. */
const GROUND_RADIUS_M = 900
const EARTH_RADIUS_M = 6_371_000
const MAX_GROUND_VISIBILITY_M = 30_000
/** Frozen a little wider than the scene asks for: the runtime matches by CONTAINMENT, and a patch
 * built a metre further out than this archive reaches would fall through to a live query. */
const MARGIN = 1.05
/** Who is asking, as Overpass's own usage policy expects. */
const USER_AGENT = "UfoAtHome archive build (https://ufoathome.org)"
const run = promisify(execFile)

/** One place a published recording stands on: its id, the box its patches can reach, and the radius of its patch. */
export interface ArchivedPlace {
  id: string
  bounds: { north: number; south: number; east: number; west: number }
  radiusM: number
}

export class ArchivedPlaces {
  /** Said once, the first time the fallback is taken — see fetchOrCurl. */
  private static saidCurl = false

  constructor(private readonly root: string) {}

  /**
   * The square each demo recording's scene will ever build a patch on.
   *
   * Not simply the recording's stated place: a observer MOVES, and the patch is rebuilt every time
   * they have walked a hundred and fifty metres from the last one's centre. Zamora covers eleven
   * hundred, so an archive frozen around his starting point would stop answering halfway through
   * his own drive. Every pose in the track is taken in, and the radius is added to the box they
   * span — which is exactly the ground any of those patches can reach.
   */
  async places(): Promise<ArchivedPlace[]> {
    const dir = join(this.root, "public", "demo-data")
    const places: ArchivedPlace[] = []
    // The observers' own files first: several files stand on the same ground (an interpretation, an instrument), and the place is named for the
    // recording that the first of them is.
    const names = (await readdir(dir)).sort((a, b) => Number(!a.startsWith("observer-")) - Number(!b.startsWith("observer-")) || a.localeCompare(b))
    for (const name of names) {
      if (!name.endsWith(".json") || name.startsWith("case-")) continue
      const recording = JSON.parse(await readFile(join(dir, name), "utf8")) as {
        id?: string
        place?: { lat?: number; lng?: number }[]
        decor?: { kind?: string, eastM?: number, northM?: number, track?: unknown, sizeM?: { widthM?: number, lengthM?: number } }[]
        observerTrack?: { keyframes?: { pose?: { lat?: number; lng?: number; elevationM?: number } }[] }
      }
      const poses = (recording.observerTrack?.keyframes ?? [])
        .map(keyframe => keyframe.pose)
        .filter((pose): pose is { lat: number; lng: number; elevationM?: number } =>
          typeof pose?.lat === "number" && typeof pose?.lng === "number")
      const stated = recording.place?.[0]
      if (typeof stated?.lat === "number" && typeof stated?.lng === "number") poses.push({ lat: stated.lat, lng: stated.lng })
      if (poses.length === 0) continue
      // groundRadiusFor's own rule, at the highest the observer ever gets: the distance to the
      // horizon from up there, held between the eye-level square and what a clear day shows.
      const elevationM = Math.max(0, ...poses.map(pose => pose.elevationM ?? 0))
      const horizonM = Math.sqrt(2 * EARTH_RADIUS_M * elevationM)
      const radiusM = Math.round(MARGIN * Math.max(GROUND_RADIUS_M, Math.min(horizonM, MAX_GROUND_VISIBILITY_M), this.sceneryReachM(recording.decor, poses)))
      const lats = poses.map(pose => pose.lat)
      const lngs = poses.map(pose => pose.lng)
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const dLat = radiusM / METRES_PER_DEGREE
      const dLng = radiusM / (METRES_PER_DEGREE * Math.cos((midLat * Math.PI) / 180))
      places.push({
        id: recording.id ?? name.replace(/\.json$/, ""),
        radiusM,
        bounds: {
          north: Math.max(...lats) + dLat,
          south: Math.min(...lats) - dLat,
          east: Math.max(...lngs) + dLng,
          west: Math.min(...lngs) - dLng
        }
      })
    }
    return places
  }

  /**
   * How wide the patch of ground is for the scenery of a still observer (SceneRenderer.terrainReachFor's own rule): the farthest of what stands on the ground,
   * out to where the patch starts to fade, at most 3 km; nothing for an observer who goes somewhere.
   */
  private sceneryReachM(decor: { kind?: string, eastM?: number, northM?: number, track?: unknown, sizeM?: { widthM?: number, lengthM?: number } }[] | undefined, poses: { lat: number, lng: number }[]): number {
    const spanM = Math.max(...poses.map(pose => Math.hypot((pose.lat - poses[0].lat) * METRES_PER_DEGREE, (pose.lng - poses[0].lng) * METRES_PER_DEGREE * Math.cos(poses[0].lat * Math.PI / 180))))
    if (poses.length > 1 && spanM > 60) return 0
    let reach = 0
    for (const object of decor ?? []) {
      if (object.kind === "aircraft" || object.kind === "observer" || object.track) continue
      const half = Math.max(object.sizeM?.widthM ?? 0, object.sizeM?.lengthM ?? 0) / 2
      reach = Math.max(reach, Math.hypot(object.eastM ?? 0, object.northM ?? 0) + half)
    }
    const wholeShare = 700 / 900
    const needed = Math.ceil(reach / wholeShare / 100) * 100
    return needed > GROUND_RADIUS_M * wholeShare ? Math.min(needed, 3000) : 0
  }

  /**
   * `fetch`, and `curl` when that cannot get out.
   *
   * Node's own fetch does not authenticate to a proxy declared only in the environment, which is
   * how a good many development machines reach the internet — including the one this was written
   * on, and the one it was first run on, both of which answered `TypeError: fetch failed` to every
   * query while `curl` to the same address went straight through. curl reads HTTPS_PROXY and its
   * credentials for itself.
   *
   * A build step may reach for the system's own tools; the RUNTIME provider may not, and does not.
   */
  static fetchOrCurl = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)
    try {
      return await fetch(url, { headers: { "User-Agent": USER_AGENT } })
    } catch {
      if (!ArchivedPlaces.saidCurl) {
        ArchivedPlaces.saidCurl = true
        console.log("(node's fetch cannot get out here — falling back to curl)")
      }
      // 256 MB: a county's every drivable way with its full geometry is a few megabytes, and the
      // default 1 MB would truncate it into a parse error that says nothing about why.
      const { stdout } = await run("curl", ["-s", "--compressed", "--fail", "--max-time", "180", "-A", USER_AGENT, url],
        { maxBuffer: 256 * 1024 * 1024 })
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(stdout)
      } as Response
    }
  }

}
