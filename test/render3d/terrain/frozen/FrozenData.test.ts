import { afterEach, describe, expect, it, vi } from "vitest"
import { Sighting } from "../../../../src/engine/model/Sighting.js"
import { FrozenGroups } from "../../../../src/engine/model/FrozenData.js"
import { fromSightingJson, toSightingJson } from "../../../../src/engine/persistence/sightingJson.js"
import { FrozenAnnexes } from "../../../../src/render3d/terrain/frozen/FrozenAnnexes.js"
import { FrozenPatches } from "../../../../src/render3d/terrain/frozen/FrozenPatches.js"
import { FrozenElevationProvider, ReliefAnnex } from "../../../../src/render3d/terrain/frozen/ReliefAnnex.js"
import { FrozenImageryProvider, FrozenMapImagery, ImageryAnnex, TileRecorder } from "../../../../src/render3d/terrain/frozen/ImageryAnnex.js"
import { FrozenRoadProvider, type VectorAnnexData } from "../../../../src/render3d/terrain/frozen/VectorAnnex.js"
import { FrozenTerrain } from "../../../../src/render3d/terrain/frozen/FrozenTerrain.js"
import { TerrainFreezer } from "../../../../src/render3d/terrain/frozen/TerrainFreezer.js"
import { FrozenUpperAirProvider } from "../../../../src/engine/traffic/FrozenUpperAirProvider.js"
import type { TerrainProviders } from "../../../../src/render3d/terrain/defaultTerrainProviders.js"
import type { RoadWay } from "../../../../src/render3d/terrain/RoadProvider.js"
import { localMetersToGeo } from "../../../../src/render3d/terrain/GeoProjection.js"
import { ObserverPath } from "../../../../src/engine/place/ObserverPath.js"
import { ObserverMapView } from "../../../../src/render/ObserverMapView.js"

const SILLY = { lat: 49.0789, lng: 2.3273 }
const PATCH = { ...SILLY, radiusM: 900 }

function standing(): Sighting {
  const sighting = Sighting.create(undefined, [SILLY])
  sighting.observerTrack.addKeyframe(0, { ...SILLY, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  sighting.observerTrack.addKeyframe(20_000, { ...SILLY, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  return sighting
}

/** A drive due east, `km` long, in `seconds`. */
function driving(km: number, seconds: number, back = false): Sighting {
  const sighting = Sighting.create(undefined, [SILLY])
  const end = localMetersToGeo(km * 1000, 0, SILLY.lat, SILLY.lng)
  sighting.observerTrack.addKeyframe(0, { ...SILLY, elevationM: 0, headingDeg: 90, pitchDeg: 0, fovDeg: 60 })
  sighting.observerTrack.addKeyframe(seconds * 1000, { lat: end.lat, lng: end.lng, elevationM: 0, headingDeg: 90, pitchDeg: 0, fovDeg: 60 })
  if (back) sighting.observerTrack.addKeyframe(2 * seconds * 1000, { ...SILLY, elevationM: 0, headingDeg: 270, pitchDeg: 0, fovDeg: 60 })
  return sighting
}

function grid(width: number, height: number, bounds = FrozenPatches.boundsOf(PATCH)) {
  const heights = new Float32Array(width * height)
  for (let i = 0; i < heights.length; i++) heights[i] = 80 + i * 0.25
  return { heights, width, height, bounds }
}

afterEach(() => FrozenAnnexes.release())

describe("FrozenGroups", () => {
  it("reads a group from its annex unless everything is live or that group is to be refreshed", () => {
    const relief = { src: "x.relief.zip" }
    expect(FrozenGroups.held({ relief }, "relief")).toBe(relief)
    expect(FrozenGroups.held({ relief, live: true }, "relief")).toBeUndefined()
    expect(FrozenGroups.held({ relief: { ...relief, refresh: true } }, "relief")).toBeUndefined()
    expect(FrozenGroups.held(undefined, "relief")).toBeUndefined()
  })

  it("names each annex after the recording", () => {
    expect(FrozenGroups.annexName("cussac-sighting", "relief")).toBe("cussac-sighting.relief.zip")
    expect(FrozenGroups.annexName("cussac-sighting", "upperAir")).toBe("cussac-sighting.upper-air.json")
    expect(FrozenGroups.annexName("cussac-sighting", "map")).toBe("cussac-sighting.map.zip")
  })

  it("travels in the recording's file", () => {
    const sighting = standing()
    sighting.frozen = { relief: { src: "a.relief.zip", takenOn: "2026-10-20" } }
    expect(fromSightingJson(toSightingJson(sighting)).frozen).toEqual(sighting.frozen)
  })
})

describe("ReliefAnnex", () => {
  it("gives back every height to the bit, holes included", async () => {
    const taken = grid(5, 3)
    taken.heights[4] = Number.NaN
    taken.heights[5] = -9999
    const bytes = await ReliefAnnex.encode({ takenOn: "2026-10-20", attribution: "IGN", patches: [{ ...PATCH, grid: taken }] })
    const { unzipSync } = await import("fflate")
    const read = ReliefAnnex.decode(unzipSync(bytes))
    expect(read.attribution).toBe("IGN")
    expect(read.patches).toHaveLength(1)
    expect(Array.from(read.patches[0].grid.heights)).toEqual(Array.from(taken.heights))
    expect(read.patches[0].grid.bounds).toEqual(taken.bounds)
  })

  it("answers the patch it was taken for, a square inside it, and nothing else", async () => {
    const taken = grid(3, 3)
    const provider = new FrozenElevationProvider(Promise.resolve({ takenOn: "", attribution: "", patches: [{ ...PATCH, grid: taken }] }))
    const same = await provider.getElevationGrid(FrozenPatches.boundsOf(PATCH), { width: 65, height: 65 })
    expect(same.width).toBe(3)
    expect(Array.from(same.heights)).toEqual(Array.from(taken.heights))
    // A copy: the mesh presses river beds into what it is given.
    same.heights[0] = 0
    expect(taken.heights[0]).toBe(80)
    const b = taken.bounds
    const centre = await provider.getElevationGrid(
      { north: (b.north + b.south) / 2, south: (b.north + b.south) / 2, east: (b.east + b.west) / 2, west: (b.east + b.west) / 2 }, { width: 2, height: 2 })
    expect(centre.heights[0]).toBeCloseTo(taken.heights[4], 4)
    await expect(provider.getElevationGrid({ north: 10, south: 9, east: 10, west: 9 }, { width: 2, height: 2 })).rejects.toThrow()
  })
})

describe("ImageryAnnex", () => {
  it("records the tiles a source is served, and serves them again to the same source and nobody else", async () => {
    const live = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })) as unknown as typeof fetch
    const recorder = new TileRecorder(live)
    await recorder.fetch("https://tiles.example/1/2/3")
    expect(recorder.tiles.get("https://tiles.example/1/2/3")?.type).toBe("image/png")
    const bytes = await ImageryAnnex.encode({ takenOn: "2026-10-20", source: "esri-world", attribution: "Esri", patches: [PATCH], tiles: recorder.tiles })
    const { unzipSync } = await import("fflate")
    const read = ImageryAnnex.decode(unzipSync(bytes))
    expect(read.source).toBe("esri-world")
    const replay = FrozenImageryProvider.fetchFrom(read.tiles)
    const served = await replay("https://tiles.example/1/2/3")
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect((await replay("https://tiles.example/9/9/9")).status).toBe(404)
  })
})

describe("FrozenMapImagery", () => {
  it("keeps the ground the map asked its photograph for, and refuses an annex that holds no map", async () => {
    const bounds = ObserverMapView.fitted(ObserverPath.of(standing())!, [])
    const tiles = new Map([["https://tiles.example/1/2/3", { bytes: new Uint8Array([1]), type: "image/jpeg" }]])
    const bytes = await ImageryAnnex.encode({ takenOn: "2026-10-20", source: "esri-world", attribution: "Esri", patches: [], map: { bounds, pixels: 768 }, tiles })
    const { unzipSync } = await import("fflate")
    expect(ImageryAnnex.decode(unzipSync(bytes)).map).toEqual({ bounds, pixels: 768 })
    const noMap = new FrozenMapImagery(Promise.resolve({ takenOn: "", source: "esri-world", attribution: "Esri", patches: [], tiles }), "stated")
    expect(noMap.attribution).toBe("stated")
    await expect(noMap.getImagery()).rejects.toThrow()
  })

  it("is taken of the box the map is fitted to, and of none for a recording that states no place", () => {
    const sighting = driving(1.5, 60)
    expect(TerrainFreezer.mapGround(sighting)).toEqual(ObserverMapView.fitted(ObserverPath.of(sighting)!, []))
    expect(TerrainFreezer.mapGround(Sighting.create(undefined, []))).toBeUndefined()
  })
})

describe("FrozenRoadProvider", () => {
  it("lays the ways of the patch asked for, and none where no patch was taken", async () => {
    const way: RoadWay = { id: "a", surface: "paved", widthM: 6, points: [SILLY, { lat: SILLY.lat + 0.001, lng: SILLY.lng }] }
    const annex: VectorAnnexData<RoadWay> = { version: 1, takenOn: "2026-10-20", attribution: "IGN BD TOPO", contemporary: true, patches: [{ ...PATCH, items: [way] }] }
    const provider = new FrozenRoadProvider(Promise.resolve(annex), "stated")
    expect(provider.attribution).toBe("stated")
    expect(await provider.getRoads(FrozenPatches.boundsOf(PATCH))).toEqual([way])
    expect(provider.attribution).toBe("IGN BD TOPO")
    expect(await provider.getRoads(FrozenPatches.boundsOf({ ...PATCH, lat: 40 }))).toEqual([])
  })
})

describe("FrozenTerrain", () => {
  const live = (): TerrainProviders => ({
    elevation: { getElevationGrid: vi.fn(async () => { throw new Error("asked live") }) },
    imagery: { attribution: "live", getImageryTexture: vi.fn(async () => { throw new Error("asked live") }) }
  })

  it("is the live sources themselves when nothing of the ground is frozen", () => {
    const sources = live()
    expect(FrozenTerrain.providers(undefined, undefined, sources)).toBe(sources)
    expect(FrozenTerrain.providers({ live: true, relief: { src: "a.relief.zip" } }, undefined, sources)).toBe(sources)
  })

  it("reads a frozen group from its annex, asks nobody for it, and builds where the annex was taken", async () => {
    const sources = live()
    const documentUrl = "https://example.org/case/sighting.json"
    FrozenAnnexes.hold(FrozenAnnexes.address("s.relief.zip", documentUrl),
      await ReliefAnnex.encode({ takenOn: "2026-10-20", attribution: "IGN", patches: [{ ...PATCH, grid: grid(3, 3) }] }))
    const network = vi.spyOn(globalThis, "fetch")
    const providers = FrozenTerrain.providers({ relief: { src: "s.relief.zip" } }, documentUrl, sources)
    const answered = await providers.elevation.getElevationGrid(FrozenPatches.boundsOf(PATCH), { width: 65, height: 65 })
    expect(answered.width).toBe(3)
    expect(sources.elevation.getElevationGrid).not.toHaveBeenCalled()
    expect(network).not.toHaveBeenCalled()
    expect(providers.imagery).toBe(sources.imagery)
    await providers.patches!.ready
    const near = localMetersToGeo(120, 40, SILLY.lat, SILLY.lng)
    expect(providers.patches!.nearest(near.lat, near.lng)).toEqual(PATCH)
    network.mockRestore()
  })
})

describe("TerrainFreezer.plan", () => {
  it("is one patch for an observer who stays put", () => {
    expect(TerrainFreezer.plan(standing())).toEqual([PATCH])
  })

  it("follows a drive at the distance the scene builds a new patch at, and does not take the same ground twice on the way back", () => {
    const there = TerrainFreezer.plan(driving(1.5, 60))
    // 150 m between patches over 1.5 km, the first at the start.
    expect(there.length).toBeGreaterThanOrEqual(10)
    expect(there.length).toBeLessThanOrEqual(11)
    expect(TerrainFreezer.plan(driving(1.5, 60, true))).toHaveLength(there.length)
  })

  it("adds the far ring round the patch where a beam the recording claims goes past it, which the scene finds as such and not as the patch", () => {
    const sighting = standing()
    const far = localMetersToGeo(8000, 0, SILLY.lat, SILLY.lng)
    sighting.interpretation = { bodies: [], beams: [{ id: "b", path: [{ ...SILLY, altitudeM: 100 }, { lat: far.lat, lng: far.lng, altitudeM: 100 }], wavelengthNm: 532, powerW: 10 }] }
    const plan = TerrainFreezer.plan(sighting)
    expect(plan).toEqual([PATCH, { ...SILLY, radiusM: 30000, far: true }])
    const index = new FrozenPatches(Promise.resolve(plan))
    return index.ready.then(() => {
      expect(index.nearest(SILLY.lat, SILLY.lng)).toEqual(PATCH)
      expect(index.farRingOf(SILLY.lat, SILLY.lng)).toEqual({ ...SILLY, radiusM: 30000, far: true })
    })
  })
})

describe("FrozenUpperAirProvider", () => {
  it("gives the answer heard for the same request, or for a window holding it, and fails otherwise", async () => {
    const answer = { status: "found" as const, samples: [], source: { id: "om", name: "Open-Meteo", url: "https://x" } }
    const provider = new FrozenUpperAirProvider(Promise.resolve({ version: 1, takenOn: "", attribution: "", answers: [{ ...SILLY, startMs: 1000, endMs: 9000, answer }] }))
    expect(await provider.between(SILLY, 1000, 9000)).toBe(answer)
    expect(await provider.between({ lat: 0, lng: 0 }, 2000, 8000)).toBe(answer)
    expect((await provider.between(SILLY, 0, 20_000)).status).toBe("failed")
  })
})
