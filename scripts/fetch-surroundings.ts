/**
 * Freezes the surroundings of a place, as a published recording's scenery: asks the IGN's surveys (LiDAR HD and BD TOPO) for what stands within a
 * radius of the place, turns each tree, building, bridge and span of line into the decor object the editor would have taken from the same survey
 * (see SurveyedDecor), and writes them with where they came from.
 *
 *   node --import tsx scripts/fetch-surroundings.ts <out.json> <lat> <lng> [radiusM] [--along <recording.json>] [--wood <azimuthDeg>,<distanceM>]...
 *
 * The laser's trees are asked for within 150 m of a place only (a square of half a kilometre holds thousands, and a scene draws a few hundred). A wood
 * further than that, the one an account stands before, is asked for with `--wood`: one more window of laser, centred that far from the place towards that
 * azimuth, its trees added (the nearest to the window's centre, as everywhere), what two windows both saw counted once.
 *
 * With `--along`, the radius applies at every place the recording's observer goes through (see SurroundingsCorridor), not only where it starts:
 * a witness driving three kilometres sees the buildings of the whole three, and the scenery is asked for as many as the path is long. Objects are in
 * metres from the first place, the observer's place at the start of the recording.
 *
 * No street lamps are asked for: whether a town's lamps are lit at the hour of a recording is the recording's to say, and a frozen scene should not light a night it cannot vouch for.
 *
 * The result is the survey of the day it is run, with the days the services say they were flown or drawn (`dates`): a recording that carries it says so in its
 * sources, and the scenery stays what it was when frozen, so that a recording does not change under its readers when the IGN's data does.
 *
 * Names of the generic objects are in English ("Tree 3", "Bridge (Rue de Carentan)"); what the survey names is as it names it. A recording's
 * generator translates the generic ones.
 */
import { execFile } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { promisify } from "node:util"
import { IgnLidarSurroundingsProvider } from "../src/render3d/terrain/providers/IgnLidarSurroundingsProvider.js"
import { IgnLidarTopoSurroundingsProvider } from "../src/render3d/terrain/providers/IgnLidarTopoSurroundingsProvider.js"
import { readFile } from "node:fs/promises"
import { SurroundingsCorridor } from "../src/render3d/terrain/SurroundingsCorridor.js"
import { SurveyedDecor } from "../src/render3d/terrain/SurveyedDecor.js"
import type { SurveyedKind } from "../src/render3d/terrain/SurveyedDecor.js"

const run = promisify(execFile)

class SurroundingsFetch {
  private static readonly KIND_NAMES: Record<SurveyedKind, string> = { tree: "Tree", building: "Building", bridge: "Bridge", wire: "Overhead line", streetlight: "Streetlight" }

  /** `curl`, because node's own fetch does not authenticate to a proxy declared only in the environment (see build-road-archive.ts). */
  private static readonly curlFetch = async (input: RequestInfo | URL): Promise<Response> => {
    const { stdout } = await run("curl", ["-s", "--fail", "--retry", "3", "-m", "120", "-A", "UfoAtHome-build", String(input)], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 })
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.byteLength),
      json: async () => JSON.parse(stdout.toString("utf8"))
    } as Response
  }

  private static readonly METRES_PER_DEGREE = 111320
  private static readonly SAME_TREE_M = 1.5

  /** The trees of laser windows `distance` metres from the place towards `azimuth`, in metres from the place, added to what is planted. */
  private async addWoods(planted: { id: string, kind: string, eastM: number, northM: number }[], centre: { lat: number, lng: number }, woods: number[][]): Promise<void> {
    const lidar = new IgnLidarSurroundingsProvider({ fetchImpl: SurroundingsFetch.curlFetch })
    const seen = new Set(planted.filter(object => object.kind === "tree").map(tree => `${Math.round(tree.eastM / SurroundingsFetch.SAME_TREE_M)},${Math.round(tree.northM / SurroundingsFetch.SAME_TREE_M)}`))
    for (const [azimuth, distance] of woods) {
      const east = distance * Math.sin(azimuth * Math.PI / 180)
      const north = distance * Math.cos(azimuth * Math.PI / 180)
      const window = { lat: centre.lat + north / SurroundingsFetch.METRES_PER_DEGREE, lng: centre.lng + east / (SurroundingsFetch.METRES_PER_DEGREE * Math.cos(centre.lat * Math.PI / 180)) }
      const found = await lidar.getSurroundings(window, 150)
      const trees = SurveyedDecor.of(lidar.id, found, { kept: [], kindName: () => "Tree" }).planted.filter(object => object.kind === "tree")
      let added = 0
      for (const tree of trees) {
        tree.eastM = Math.round((tree.eastM + east) * 10) / 10
        tree.northM = Math.round((tree.northM + north) * 10) / 10
        const key = `${Math.round(tree.eastM / SurroundingsFetch.SAME_TREE_M)},${Math.round(tree.northM / SurroundingsFetch.SAME_TREE_M)}`
        if (seen.has(key)) continue
        seen.add(key)
        tree.id = `${lidar.id}-wood-${planted.length}`
        planted.push(tree)
        added++
      }
      console.log(`wood at ${azimuth} deg, ${distance} m: ${added} trees`)
    }
  }

  async main(args: string[]): Promise<void> {
    const along = args.indexOf("--along")
    const recording = along >= 0 ? args[along + 1] : undefined
    const woods = args.flatMap((arg, i) => arg === "--wood" ? [args[i + 1].split(",").map(Number)] : [])
    const rest = args.filter((arg, i) => arg !== "--wood" && args[i - 1] !== "--wood")
    const alongAt = rest.indexOf("--along")
    const [out, lat, lng, radius] = alongAt >= 0 ? rest.filter((_, i) => i !== alongAt && i !== alongAt + 1) : rest
    if (!out || !lat || !lng) throw new Error("usage: fetch-surroundings.ts <out.json> <lat> <lng> [radiusM] [--along <recording.json>]")
    const centre = { lat: Number(lat), lng: Number(lng) }
    const radiusM = radius ? Number(radius) : 100
    const provider = new IgnLidarTopoSurroundingsProvider({ fetchImpl: SurroundingsFetch.curlFetch })
    let found
    if (recording) {
      const track = JSON.parse(await readFile(recording, "utf8")).observerTrack?.keyframes ?? []
      const path = [centre, ...track.map((keyframe: { pose: { lat?: number, lng?: number } }) => keyframe.pose).filter((pose: { lat?: number, lng?: number }) => typeof pose.lat === "number" && typeof pose.lng === "number")]
      const stops = SurroundingsCorridor.stops(path, radiusM)
      console.log(`${stops.length} places along a path of ${track.length} poses`)
      found = await SurroundingsCorridor.fetch(provider, stops, radiusM, { treesPerStop: 60, concurrency: 2 })
    } else {
      found = await provider.getSurroundings(centre, radiusM)
    }
    const { planted } = SurveyedDecor.of(provider.id, found, { kept: [], kindName: kind => SurroundingsFetch.KIND_NAMES[kind] })
    if (woods.length > 0) await this.addWoods(planted, centre, woods)
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, JSON.stringify({
      version: 1,
      provider: { id: provider.id, name: provider.name, attribution: provider.attribution, creditUrl: provider.creditUrl },
      centre,
      radiusM,
      fetchedOn: new Date().toISOString().slice(0, 10),
      // The days the services give for what they drew from (see SurveyDates): the laser flight, the photograph, the map.
      dates: found.dates,
      decor: planted
    }, null, 1) + "\n", "utf8")
    const count = (kind: string): number => planted.filter(object => object.kind === kind).length
    console.log(`${out}: trees ${count("tree")}, buildings ${count("building")}, bridges ${count("bridge")}, lines ${count("wire")}`)
  }
}

await new SurroundingsFetch().main(process.argv.slice(2))
