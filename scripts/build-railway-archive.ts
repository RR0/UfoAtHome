/**
 * One-off build step (not part of `build`/`prepublishOnly`) that freezes the railways each published recording's ground holds, so no reader's
 * browser has to ask for them: in France the IGN's map, elsewhere OpenStreetMap's Overpass, which is free and donated (see ArchivedRailwayProvider,
 * and build-water-archive.ts, which does the same for the water over the same squares). The IGN's lines are named from OpenStreetMap, with the
 * services that run on them (see OsmRailwayNames): the map names none.
 *
 * Run with: npm run build:railways   (ONLY=<text> freezes just the recordings whose id contains it, and keeps the other entries)
 *
 * WHAT IS WRITTEN, into public/railways/, committed: one file per place, its lines and their credit, and an index of the boxes they cover. A place
 * with no line is written too, with none: that is an answer, and the scene asks nobody about it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { IgnTopoRailwayProvider } from "../src/render3d/terrain/providers/IgnTopoRailwayProvider.js"
import { OsmRailwayNames } from "../src/render3d/terrain/providers/OsmRailwayNames.js"
import { OverpassRailwayProvider } from "../src/render3d/terrain/providers/OverpassRailwayProvider.js"
import type { RailwayLine } from "../src/render3d/terrain/RailwayProvider.js"
import { ArchivedPlaces } from "./ArchivedPlaces.js"

/** Between two queries to Overpass: this script is the one place that can afford to give it more than it asks. */
const COURTESY_MS = 5000
/** Past this, a patch gets no railways: see SceneRenderer.ROADS_MAX_RADIUS_M. */
const MAX_RADIUS_M = 5000

class RailwayArchiveBuilder {
  private readonly root = fileURLToPath(new URL("..", import.meta.url))
  private readonly ign = new IgnTopoRailwayProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })
  private readonly osm = new OverpassRailwayProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })
  private readonly names = new OsmRailwayNames({ fetchImpl: ArchivedPlaces.fetchOrCurl })

  async build(): Promise<void> {
    const only = process.env.ONLY
    const places = (await new ArchivedPlaces(this.root).places()).filter(place => !only || place.id.includes(only))
    const out = join(this.root, "public", "railways")
    await mkdir(out, { recursive: true })
    const entries: { file: string; north: number; south: number; east: number; west: number; about: string }[] = []
    const previous = (JSON.parse(await readFile(join(out, "index.json"), "utf8").catch(() => "{\"entries\":[]}")) as { entries: typeof entries }).entries
    if (only) entries.push(...previous.filter(entry => !entry.about.includes(only)))
    const seen = new Set<string>()
    for (const place of places) {
      const bounds = place.bounds
      const key = [bounds.north, bounds.south, bounds.east, bounds.west].map(n => n.toFixed(4)).join(",")
      if (seen.has(key)) {
        console.log(`${place.id}: same ground as one already frozen`)
        continue
      }
      seen.add(key)
      if (place.radiusM > MAX_RADIUS_M) {
        console.log(`${place.id}: patch radius ${place.radiusM} m, no railways drawn there, skipped`)
        continue
      }
      process.stdout.write(`${place.id} (patch radius ${place.radiusM} m)… `)
      let lines: RailwayLine[]
      let attribution: string
      try {
        // The IGN where it draws something; Overpass where it does not (abroad, and Belgium, which the box of France takes in).
        lines = IgnTopoRailwayProvider.covers(bounds) ? await this.ign.getRailways(bounds) : []
        attribution = this.ign.attribution
        if (lines.length === 0) {
          lines = await this.osm.getRailways(bounds)
          attribution = this.osm.attribution
          await new Promise(resolve => setTimeout(resolve, COURTESY_MS))
        }
      } catch (error) {
        // A refusal is not a reason to lose the places already frozen: the run can be repeated for the rest. Nor this place's own last freeze, which
        // the index kept pointing at (dropped, its scene would ask the live services, which a published scene never does).
        const kept = previous.find(entry => entry.about === place.id)
        if (kept) entries.push(kept)
        console.log(`refused (${String(error).slice(0, 200)})${kept ? ", its last freeze kept" : ""}`)
        continue
      }
      lines = RailwayArchiveBuilder.within(lines, bounds)
      if (attribution === this.ign.attribution && lines.length > 0) {
        // The map's sections name nothing: OpenStreetMap says which line each is, its voltage and the services that run on it.
        try {
          lines = await this.names.named(lines, bounds)
          attribution = `${attribution}; names and services © OpenStreetMap contributors`
          await new Promise(resolve => setTimeout(resolve, COURTESY_MS))
        } catch (error) {
          process.stdout.write(`(no names: ${String(error)}) `)
        }
      }
      const file = `${place.id}.json`
      await writeFile(join(out, file), JSON.stringify({ version: 1, attribution, takenOn: new Date().toISOString().slice(0, 10), about: place.id, lines }), "utf8")
      entries.push({ file, ...bounds, about: place.id })
      console.log(`${lines.length} sections, ${lines.reduce((total, line) => total + line.points.length, 0)} points`)
    }
    entries.sort((a, b) => a.file.localeCompare(b.file))
    await writeFile(join(out, "index.json"), JSON.stringify({ version: 1, entries }, null, 1), "utf8")
    await ArchivedPlaces.stampVersions(out)
    console.log(`public/railways: ${entries.length} places`)
  }

  /**
   * Only the sections that reach into the box, whole: a section the WFS gives for a box may stretch far past it, but it is a few points, and cut
   * at the box's edge it would lose the end where it meets the ground (see RailwaySystem.groundEnds). Coordinates to six decimals of a degree
   * (a decimetre), the altitudes to a decimetre: the map's own precision is metres.
   */
  static within(lines: RailwayLine[], box: { north: number; south: number; east: number; west: number }): RailwayLine[] {
    return lines
      .filter(line => {
        const lats = line.points.map(point => point.lat)
        const lngs = line.points.map(point => point.lng)
        return Math.max(...lats) >= box.south && Math.min(...lats) <= box.north && Math.max(...lngs) >= box.west && Math.min(...lngs) <= box.east
      })
      .map(line => ({
        ...line,
        points: line.points.map(point => ({
          lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)),
          ...(point.altitudeM !== undefined ? { altitudeM: Number(point.altitudeM.toFixed(1)) } : {})
        }))
      }))
  }
}

await new RailwayArchiveBuilder().build()
