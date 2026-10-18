/**
 * One-off build step (not part of `build`/`prepublishOnly`) that freezes the roads each published
 * recording stands on, so no reader's browser ever has to ask Overpass for them.
 *
 * Run with: npm run build:roads
 *
 * WHY. Overpass is free, donated, and it says so. The first page carrying several scenes fired one
 * query per scene and was answered 429, then 504, then a rate limit on the address that had asked.
 * A case dossier on rr0.org is read by people who never asked about roads, and the answer for one
 * recording's ground is the same every time — so the same rule this project applies to every other
 * borrowed source (the 3D models, the orbital elements): take a copy, keep the credit with it, and
 * serve it from somewhere that will last.
 *
 * WHAT IS ASKED FOR. Each recording's own place, over the square its scene builds a terrain patch
 * on: GROUND_RADIUS around the observer, which is 900 m at eye level and grows with the observer's
 * altitude the way SceneRenderer.groundRadiusFor does. One query per place, in sequence, with a
 * wait between them — the whole point is to be a considerate client once rather than a thoughtless
 * one forever.
 *
 * WHAT IS WRITTEN, into public/roads/, committed: ufoathome.org is built from the repository and
 * serves the archive at /roads/ to every page embedding a scene, the way it serves /models and
 * /tle. One file per place, plus an index of the boxes they cover — the runtime matches by
 * CONTAINMENT (see ArchivedRoadProvider), so a patch is answered by any archived square that holds
 * it whole.
 *
 * Roads move. An archive taken today is today's network, which is not the night of the account —
 * every file says so in `contemporary`, and the player draws a contemporary road faint and credits
 * it as a survey of today (see RoadSystem).
 */
import { readFile, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { IgnTopoRoadProvider } from "../src/render3d/terrain/providers/IgnTopoRoadProvider.js"
import { OverpassRoadProvider } from "../src/render3d/terrain/providers/OverpassRoadProvider.js"
import type { RoadWay } from "../src/render3d/terrain/RoadProvider.js"
import { ArchivedPlaces } from "./ArchivedPlaces.js"

/** Metres of latitude, and of longitude at the equator — the sphere this project measures with
 * everywhere else (see terrain/GeoProjection.ts). */
const METRES_PER_DEGREE = 111320
/** Between two queries. Overpass asks for a few seconds between requests from one address, and
 * this script is the one place that can afford to give it more than that. */
const COURTESY_MS = 5000
/** Past this, a patch gets no roads at all — see SceneRenderer.ROADS_MAX_RADIUS_M. A observer in an
 * aircraft sees thirty kilometres of ground, on which individual carriageways are hairlines nobody
 * reported, and asking Overpass for a county's every street to draw them would be a rudeness in
 * exchange for a mess. */
const MAX_RADIUS_M = 5000

class RoadArchiveBuilder {
  private readonly root = fileURLToPath(new URL("..", import.meta.url))
  private readonly provider = new OverpassRoadProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })
  /** France is frozen from the IGN's map, which names its roads and answers, rather than from the donated Overpass (see RegionalRoadProvider). */
  private readonly ign = new IgnTopoRoadProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })

  async build(): Promise<void> {
    // ONLY=<text>: freeze just the recordings whose id contains it, and keep every other entry of the
    // index as it is. A new demo needs its own ground archived, not a second query (and a new
    // `takenOn`) for every place already frozen.
    const only = process.env.ONLY
    const places = (await new ArchivedPlaces(this.root).places()).filter(place => !only || place.id.includes(only))
    const out = join(this.root, "public", "roads")
    await mkdir(out, { recursive: true })
    const entries: { file: string; north: number; south: number; east: number; west: number; about: string }[] = []
    if (only) {
      const kept = JSON.parse(await readFile(join(out, "index.json"), "utf8")) as { entries: typeof entries }
      entries.push(...kept.entries.filter(entry => !entry.about.includes(only)))
    }
    const seen = new Set<string>()
    for (const place of places) {
      const bounds = place.bounds
      // Several recordings can stand on the same ground — the sky tests all do. One file each
      // would be the same bytes under different names, and one more query for each of them.
      const key = [bounds.north, bounds.south, bounds.east, bounds.west].map(n => n.toFixed(4)).join(",")
      if (seen.has(key)) {
        console.log(`${place.id}: same ground as one already frozen`)
        continue
      }
      seen.add(key)
      const acrossKm = ((bounds.north - bounds.south) * METRES_PER_DEGREE / 1000).toFixed(1)
      if (place.radiusM > MAX_RADIUS_M) {
        console.log(`${place.id}: ${acrossKm} km of ground — too much to draw roads on, skipped`)
        continue
      }
      if (process.env.PRINT_QUERIES) {
        // For the machine that cannot reach Overpass itself: the id and the box, one per line, to
        // be fetched by any other means and saved as scripts/data/roads/<id>.overpass.json.
        console.log(`${place.id}\t${bounds.south},${bounds.west},${bounds.north},${bounds.east}`)
        continue
      }
      process.stdout.write(`${place.id}: ${acrossKm} km of ground (patch radius ${place.radiusM} m)… `)
      let ways: RoadWay[]
      const inFrance = IgnTopoRoadProvider.covers(bounds)
      try {
        ways = inFrance ? await this.ign.getRoads(bounds) : await this.waysFor(place.id, bounds)
      } catch (error) {
        // A refusal here is not a reason to lose the places already frozen: the index is written
        // with what did come back, and the run can be repeated for the rest.
        console.log(`refused (${String(error)})`)
        continue
      }
      const file = `${place.id}.json`
      await writeFile(join(out, file), JSON.stringify({
        version: 1,
        attribution: inFrance ? this.ign.attribution : this.provider.attribution,
        contemporary: inFrance ? this.ign.contemporary : this.provider.contemporary,
        takenOn: new Date().toISOString().slice(0, 10),
        about: place.id,
        ways
      }), "utf8")
      entries.push({ file, ...bounds, about: place.id })
      console.log(`${ways.length} ways, ${RoadArchiveBuilder.pointsIn(ways)} points`)
      await new Promise(resolve => setTimeout(resolve, COURTESY_MS))
    }
    entries.sort((a, b) => a.file.localeCompare(b.file))
    await writeFile(join(out, "index.json"), JSON.stringify({ version: 1, entries }, null, 1), "utf8")
    console.log(`public/roads: ${entries.length} places`)
  }

  /**
   * The ways for one box, from a raw Overpass answer saved beside this script if there is one, and
   * from the service itself otherwise.
   *
   * The cache exists for the same reason build-tle-archive reads a local copy of somebody else's
   * archive: a machine that cannot reach Overpass directly (a proxy that node's own fetch will not
   * authenticate to, an offline run) can still build the archive from answers fetched by any other
   * means. Save one as `scripts/data/roads/<id>.overpass.json` — the raw JSON, exactly as the
   * service returns it.
   */
  private async waysFor(id: string, bounds: { north: number; south: number; east: number; west: number }): Promise<RoadWay[]> {
    const cached = join(this.root, "scripts", "data", "roads", `${id}.overpass.json`)
    try {
      const raw = await readFile(cached, "utf8")
      process.stdout.write("(saved answer) ")
      return this.provider.waysFrom(JSON.parse(raw))
    } catch {
      // No saved answer for this place: ask.
    }
    return this.provider.getRoads(bounds)
  }

  private static pointsIn(ways: RoadWay[]): number {
    return ways.reduce((total, way) => total + way.points.length, 0)
  }
}

await new RoadArchiveBuilder().build()
