/**
 * One-off build step (not part of `build`/`prepublishOnly`) that freezes the water each published recording's ground holds, so no reader's browser
 * has to ask for it: in France the IGN's map, elsewhere OpenStreetMap's Overpass, which is free and donated (see ArchivedWaterProvider, and
 * build-road-archive.ts, which does the same for the roads over the same squares).
 *
 * Run with: npm run build:water   (ONLY=<text> freezes just the recordings whose id contains it, and keeps the other entries)
 *
 * WHAT IS WRITTEN, into public/water/, committed: one file per place, its surfaces and their credit, and an index of the boxes they cover. A place
 * with no water is written too, with none: that is an answer, and the scene asks nobody about it.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { IgnTopoWaterProvider } from "../src/render3d/terrain/providers/IgnTopoWaterProvider.js"
import { OverpassWaterProvider } from "../src/render3d/terrain/providers/OverpassWaterProvider.js"
import type { WaterSurface } from "../src/render3d/terrain/WaterProvider.js"
import { ArchivedPlaces } from "./ArchivedPlaces.js"

/** Between two queries to Overpass: this script is the one place that can afford to give it more than it asks. */
const COURTESY_MS = 5000
/** Past this, a patch gets no water: see SceneRenderer.ROADS_MAX_RADIUS_M. */
const MAX_RADIUS_M = 5000

class WaterArchiveBuilder {
  private readonly root = fileURLToPath(new URL("..", import.meta.url))
  private readonly ign = new IgnTopoWaterProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })
  private readonly osm = new OverpassWaterProvider({ fetchImpl: ArchivedPlaces.fetchOrCurl })

  async build(): Promise<void> {
    const only = process.env.ONLY
    const places = (await new ArchivedPlaces(this.root).places()).filter(place => !only || place.id.includes(only))
    const out = join(this.root, "public", "water")
    await mkdir(out, { recursive: true })
    const entries: { file: string; north: number; south: number; east: number; west: number; about: string }[] = []
    if (only) {
      const kept = JSON.parse(await readFile(join(out, "index.json"), "utf8")) as { entries: typeof entries }
      entries.push(...kept.entries.filter(entry => !entry.about.includes(only)))
    }
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
        console.log(`${place.id}: patch radius ${place.radiusM} m, no water drawn there, skipped`)
        continue
      }
      process.stdout.write(`${place.id} (patch radius ${place.radiusM} m)… `)
      let surfaces: WaterSurface[]
      let attribution: string
      try {
        // The IGN where it draws something; Overpass where it does not (abroad, and the corners of Belgium the box of France takes in).
        surfaces = IgnTopoWaterProvider.covers(bounds) ? await this.ign.getWater(bounds) : []
        attribution = this.ign.attribution
        if (surfaces.length === 0) {
          surfaces = await this.osm.getWater(bounds)
          attribution = this.osm.attribution
          await new Promise(resolve => setTimeout(resolve, COURTESY_MS))
        }
      } catch (error) {
        // A refusal is not a reason to lose the places already frozen: the run can be repeated for the rest.
        console.log(`refused (${String(error)})`)
        continue
      }
      surfaces = WaterArchiveBuilder.clipped(surfaces, bounds)
      const file = `${place.id}.json`
      await writeFile(join(out, file), JSON.stringify({ version: 1, attribution, takenOn: new Date().toISOString().slice(0, 10), about: place.id, surfaces }), "utf8")
      entries.push({ file, ...bounds, about: place.id })
      console.log(`${surfaces.length} surfaces, ${surfaces.reduce((total, surface) => total + surface.rings.reduce((sum, ring) => sum + ring.length, 0), 0)} points`)
    }
    entries.sort((a, b) => a.file.localeCompare(b.file))
    await writeFile(join(out, "index.json"), JSON.stringify({ version: 1, entries }, null, 1), "utf8")
    await ArchivedPlaces.stampVersions(out)
    console.log(`public/water: ${entries.length} places`)
  }

  /**
   * The surfaces cut to the box frozen for: a river or a lake reaches kilometres past it (the one at Valensole is 8718 points, 320 kB), and the
   * scene cuts it to its patch anyway (see WaterSystem.clip). One side of the box after the other (Sutherland and Hodgman), in degrees.
   */
  static clipped(surfaces: WaterSurface[], box: { north: number; south: number; east: number; west: number }): WaterSurface[] {
    type Point = { lat: number, lng: number }
    const sides: { inside: (p: Point) => boolean, cross: (a: Point, b: Point) => Point }[] = [
      { inside: p => p.lng >= box.west, cross: (a, b) => ({ lng: box.west, lat: a.lat + (b.lat - a.lat) * (box.west - a.lng) / (b.lng - a.lng) }) },
      { inside: p => p.lng <= box.east, cross: (a, b) => ({ lng: box.east, lat: a.lat + (b.lat - a.lat) * (box.east - a.lng) / (b.lng - a.lng) }) },
      { inside: p => p.lat >= box.south, cross: (a, b) => ({ lat: box.south, lng: a.lng + (b.lng - a.lng) * (box.south - a.lat) / (b.lat - a.lat) }) },
      { inside: p => p.lat <= box.north, cross: (a, b) => ({ lat: box.north, lng: a.lng + (b.lng - a.lng) * (box.north - a.lat) / (b.lat - a.lat) }) }
    ]
    const clip = (ring: Point[]): Point[] => {
      let points = ring
      for (const side of sides) {
        const kept: Point[] = []
        for (let i = 0; i < points.length; i++) {
          const current = points[i]
          const previous = points[(i + points.length - 1) % points.length]
          if (side.inside(current)) {
            if (!side.inside(previous)) kept.push(side.cross(previous, current))
            kept.push(current)
          } else if (side.inside(previous)) {
            kept.push(side.cross(previous, current))
          }
        }
        points = kept
      }
      // Six decimals of a degree are a decimetre: the map's own precision is metres.
      return points.map(point => ({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) }))
    }
    return surfaces.flatMap(surface => {
      const [outline, ...islands] = surface.rings.map(clip)
      return outline.length >= 3 ? [{ id: surface.id, rings: [outline, ...islands.filter(island => island.length >= 3)] }] : []
    })
  }
}

await new WaterArchiveBuilder().build()
