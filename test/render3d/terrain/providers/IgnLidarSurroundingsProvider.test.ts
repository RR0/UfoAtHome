import { describe, expect, it, vi } from "vitest"
import { SurroundingsUnavailableError } from "../../../../src/render3d/terrain/SurroundingsProvider.js"
import { IgnLidarSurroundingsProvider } from "../../../../src/render3d/terrain/providers/IgnLidarSurroundingsProvider.js"
import { Scene } from "../Scene.js"
import { GREEN, ROOF, SAINT_LO, Survey } from "./IgnSurvey.js"

describe("IgnLidarSurroundingsProvider (the laser alone)", () => {
  it("asks for the height model and the classification of the same square, latitude first", async () => {
    const fetchImpl = new Survey(40).fetch()
    await new IgnLidarSurroundingsProvider({ fetchImpl }).getSurroundings(SAINT_LO, 10)
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call => new URL(String(call[0]))).filter(url => url.searchParams.get("SERVICE") === "WMS" && url.searchParams.get("LAYERS")!.includes("LIDAR"))
    expect(urls.map(url => url.searchParams.get("LAYERS")).sort()).toEqual(["IGNF_LIDAR-HD_CLASS", "IGNF_LIDAR-HD_MNH_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93"])
    expect(urls[0].searchParams.get("BBOX")).toBe(urls[1].searchParams.get("BBOX"))
    const [south, west, north, east] = urls[0].searchParams.get("BBOX")!.split(",").map(Number)
    // WMS 1.3.0 gives the axes of EPSG:4326 as latitude then longitude.
    expect(south).toBeLessThan(SAINT_LO.lat)
    expect(north).toBeGreaterThan(SAINT_LO.lat)
    expect(west).toBeLessThan(SAINT_LO.lng)
    expect(east).toBeGreaterThan(SAINT_LO.lng)
    // Half a metre a pixel: 20 m across is 40 pixels.
    expect(urls[0].searchParams.get("WIDTH")).toBe("40")
  })

  it("takes a tree where the classification says plant and a building where it says roof, never the one for the other", async () => {
    // 100 pixels of 0.5 m. A tree 8 m east of the middle, and a house of the same height 8 m west.
    const survey = new Survey(100).block(66, 46, 8, 12, GREEN).block(18, 40, 16, 12, ROOF)
    const { trees, buildings } = await new IgnLidarSurroundingsProvider({ fetchImpl: survey.fetch() }).getSurroundings(SAINT_LO, 25)
    expect(trees).toHaveLength(1)
    expect(trees[0].eastM).toBeGreaterThan(3)
    expect(trees[0].heightM).toBeCloseTo(12, 0)
    expect(buildings).toHaveLength(1)
    expect(buildings[0].eastM).toBeLessThan(-3)
    expect(buildings[0].heightM).toBeCloseTo(12, 0)
  })

  it("tells a place the survey does not cover from a place with no tree", async () => {
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: new Survey(40, -9999).fetch() }).getSurroundings(SAINT_LO, 10))
      .rejects.toMatchObject({ reason: "no-coverage" })
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: new Survey(40, 0).fetch() }).getSurroundings(SAINT_LO, 10)).resolves.toMatchObject(Scene.of([], []))
  })

  it("does not ask for what it cannot cover", async () => {
    const fetchImpl = new Survey(40).fetch()
    const provider = new IgnLidarSurroundingsProvider({ fetchImpl })
    // A box round France, which is only a first filter: Brussels is inside it, and it is the survey that answers "nothing here".
    expect(provider.covers(40.4, -3.7)).toBe(false)
    expect(provider.covers(40.7, -74)).toBe(false)
    await expect(provider.getSurroundings({ lat: 40.4, lng: -3.7 }, 10)).rejects.toBeInstanceOf(SurroundingsUnavailableError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("says the service is unreachable when it does not answer, or answers something else", async () => {
    const down = vi.fn(async () => { throw new Error("offline") }) as unknown as typeof fetch
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: down }).getSurroundings(SAINT_LO, 10)).rejects.toMatchObject({ reason: "unreachable" })
    const html = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode("<html>busy</html>").buffer }) as Response) as unknown as typeof fetch
    await expect(new IgnLidarSurroundingsProvider({ fetchImpl: html }).getSurroundings(SAINT_LO, 10)).rejects.toMatchObject({ reason: "unreachable" })
  })

  it("says plainly that its trees and buildings are those of the survey, not of the recording's day", () => {
    const provider = new IgnLidarSurroundingsProvider()
    expect(provider.contemporary).toBe(true)
    expect(provider.attribution).toContain("IGN")
  })
})
