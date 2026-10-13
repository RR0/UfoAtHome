/**
 * Freezes the surroundings of a place, as a published recording's scenery: asks the IGN's surveys (LiDAR HD and BD TOPO) for what stands within a
 * radius of the place, turns each tree, building, bridge and span of line into the decor object the editor would have taken from the same survey
 * (see SurveyedDecor), and writes them with where they came from.
 *
 *   node --import tsx scripts/fetch-surroundings.ts <out.json> <lat> <lng> [radiusM] [--along <recording.json>]
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

  async main(args: string[]): Promise<void> {
    const along = args.indexOf("--along")
    const recording = along >= 0 ? args[along + 1] : undefined
    const [out, lat, lng, radius] = along >= 0 ? args.filter((_, i) => i !== along && i !== along + 1) : args
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
