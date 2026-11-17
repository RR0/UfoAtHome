import { describe, expect, test } from "vitest"
import { Obstacles } from "../../src/modules/interpretations/Obstacles.js"
import { SkyLantern } from "../../src/modules/interpretations/lanterns/SkyLantern.js"
import type { LanternLaunchJson } from "../../src/modules/interpretations/lanterns/SkyLantern.js"
import { BirdFlock } from "../../src/modules/interpretations/birds/BirdFlock.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

const building = (eastM: number, northM: number, widthM: number, lengthM: number, heightM: number, headingDeg = 0) =>
  ({ id: `b${eastM},${northM}`, kind: "building", eastM, northM, headingDeg, sizeM: { widthM, lengthM, heightM } }) as unknown as DecorObject
const sized = (object: DecorObject) => object.sizeM as { widthM: number, lengthM: number, heightM: number }

describe("the solid decor what is computed moves among", () => {
  test("says the nearest way out of a box, turned as the building is", () => {
    const obstacles = Obstacles.of([building(0, 0, 20, 10, 30)], sized)
    // Facing north: 20 m across (east-west), 10 m along (north-south). Just inside the east wall.
    const east = obstacles.inside(9, 0, 5)!
    expect(east.nx).toBeCloseTo(1, 6)
    expect(east.depthM).toBeCloseTo(1, 6)
    expect(obstacles.inside(11, 0, 5)).toBeUndefined()
    expect(obstacles.inside(0, 0, 31)).toBeUndefined()
    // Turned to face east, its long side runs north-south.
    expect(Obstacles.of([building(0, 0, 20, 10, 30, 90)], sized).inside(0, 9, 5)!.ny).toBeCloseTo(1, 6)
  })

  test("leaves out what moves and what is no wall, and is the same set for the same decor", () => {
    const decor = [building(0, 0, 10, 10, 10), { id: "car", kind: "vehicle", eastM: 0, northM: 0 } as unknown as DecorObject]
    expect(Obstacles.of(decor, sized).boxes).toHaveLength(1)
    expect(Obstacles.of([...decor], sized)).toBe(Obstacles.of(decor, sized))
    expect(Obstacles.of([], sized).signature).toBe("")
  })

  describe("a lantern", () => {
    // Let go 15 m west of a 40 m tower, the wind blowing it east, towards it.
    const launch: LanternLaunchJson = {
      id: "l", site: { eastM: -15, northM: 0 }, releases: [{ t: 0, seed: 1 }], wind: { towardDeg: 90, speedMS: 3 },
      turbulence: { horizontalMS: 0, verticalMS: 0, timescaleS: 10 }
    }
    const tower = Obstacles.of([building(0, 0, 10, 10, 40)], sized)

    test("slides up the wall the wind pushes it against, and goes on once above the roof", () => {
      const free = SkyLantern.trajectory(launch, launch.releases![0])
      expect(free.some(sample => Math.abs(sample.x) < 5 && Math.abs(sample.y) < 5 && sample.z < 40)).toBe(true)
      const kept = SkyLantern.trajectory(launch, launch.releases![0], SkyLantern.SAMPLE_MS, tower)
      expect(kept.every(sample => !(Math.abs(sample.x) < 5 && Math.abs(sample.y) < 5 && sample.z < 40))).toBe(true)
      // Still carried east once over it.
      expect(kept[kept.length - 1].x).toBeGreaterThan(50)
    })

    test("rests on the roof it comes down onto", () => {
      // Let go on the roof itself, with too little heat to rise: it stays on it.
      const onRoof: LanternLaunchJson = { ...launch, site: { eastM: 0, northM: 0, altitudeM: 41 }, wind: undefined, releases: [{ t: 0, seed: 1, lantern: { insideExcessK: 10 } }] }
      const path = SkyLantern.trajectory(onRoof, onRoof.releases![0], SkyLantern.SAMPLE_MS, tower)
      expect(Math.min(...path.map(sample => sample.z))).toBeGreaterThan(39.9)
    })
  })

  test("a flock that flies itself goes round or over the buildings across its path, none of its birds through them", () => {
    const block = Obstacles.of([building(0, 0, 30, 30, 25), building(0, 60, 30, 30, 25), building(0, -60, 30, 30, 25)], sized)
    const flock = { id: "f", species: "american-golden-plover", count: 80, formation: { kind: "flock" as const },
      path: [{ t: 0, eastM: -200, northM: 0, altitudeM: 15 }, { t: 25000, eastM: 200, northM: 0, altitudeM: 15 }], seed: 2 }
    const through = (bodies: ReturnType<typeof BirdFlock.bodiesOf>) => bodies.flatMap(body => body.track)
      .filter(key => block.inside(key.eastM!, key.northM!, key.altitudeM!) !== undefined).length
    expect(through(BirdFlock.bodiesOf(flock))).toBeGreaterThan(0)
    const avoiding = BirdFlock.bodiesOf(flock, block)
    expect(through(avoiding)).toBe(0)
    // And still gets where its path goes.
    const last = avoiding.map(body => body.track[body.track.length - 1].eastM!)
    expect(last.reduce((sum, east) => sum + east, 0) / last.length).toBeGreaterThan(150)
  })
})
