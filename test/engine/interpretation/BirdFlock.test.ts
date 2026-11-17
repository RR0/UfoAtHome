import { describe, expect, test } from "vitest"
import { BirdFlock } from "../../../src/modules/interpretations/birds/BirdFlock.js"
import type { BirdFlockJson } from "../../../src/modules/interpretations/birds/BirdFlock.js"
import { BirdSpecies } from "../../../src/modules/interpretations/birds/BirdSpecies.js"
import { InterpretationRegistry } from "../../../src/modules/interpretations/interpretationSources.js"
import { InterpretationKinds } from "../../../src/modules/interpretations/InterpretationKind.js"

const path: BirdFlockJson["path"] = [
  { t: 0, eastM: -300, northM: 400, altitudeM: 150 },
  { t: 15000, eastM: 0, northM: 500, altitudeM: 160 },
  { t: 30000, eastM: 300, northM: 350, altitudeM: 150 }
]

describe("BirdSpecies", () => {
  test("predicts wingbeat frequencies within the range measured for such birds", () => {
    const hz = (id: string) => BirdSpecies.wingbeatHz(BirdSpecies.byId(id)!)
    expect(hz("herring-gull")).toBeGreaterThan(3)
    expect(hz("herring-gull")).toBeLessThan(4)
    expect(hz("brown-pelican")).toBeGreaterThan(2)
    expect(hz("brown-pelican")).toBeLessThan(3.2)
    // A small plover beats faster than a goose, a goose faster than a pelican.
    expect(hz("american-golden-plover")).toBeGreaterThan(hz("canada-goose"))
    expect(hz("canada-goose")).toBeGreaterThan(hz("american-white-pelican"))
  })

  test("beats faster in thin air", () => {
    const gull = BirdSpecies.byId("herring-gull")!
    expect(BirdSpecies.wingbeatHz(gull, BirdSpecies.airDensityAt(3000))).toBeGreaterThan(BirdSpecies.wingbeatHz(gull))
  })

  test("draws every species as a build of its own size", () => {
    for (const species of BirdSpecies.ALL) {
      const size = BirdSpecies.sizeOf(species)
      expect(size.widthM).toBeCloseTo(species.wingspanM * BirdSpecies.BUILDS[species.build].restM.widthM / BirdSpecies.BUILDS[species.build].wingspanM, 6)
      expect(size.heightM).toBeGreaterThan(0)
    }
  })
})

describe("BirdFlock", () => {
  test("makes one body per bird, drawn as its species' build, casting no shadow", () => {
    const bodies = BirdFlock.bodiesOf({ id: "geese", species: "canada-goose", count: 12, formation: { kind: "v" }, path })
    expect(bodies).toHaveLength(12)
    expect(new Set(bodies.map(body => body.id)).size).toBe(12)
    for (const body of bodies) {
      expect(body.model.id).toBe("ufoathome-bird-goose")
      expect(body.shadow).toBe(false)
      expect(body.ensemble).toBe("geese")
    }
  })

  test("each bird can stand for its own phenomenon, measured apart rather than as one flock", () => {
    const bodies = BirdFlock.bodiesOf({ id: "chain", species: "american-white-pelican", count: 3, formation: { kind: "echelon" }, path, explainsEach: ["o1", "o2"] })
    expect(bodies.map(body => body.explains)).toEqual([["o1"], ["o2"], undefined])
    expect(bodies.every(body => body.ensemble === undefined)).toBe(true)
  })

  test("a single bird is the flock itself", () => {
    const [bird] = BirdFlock.bodiesOf({ id: "gull", species: "herring-gull", path })
    expect(bird.id).toBe("gull")
    expect(bird.ensemble).toBeUndefined()
  })

  test("is the same for the same statement", () => {
    const flock: BirdFlockJson = { id: "f", species: "mallard", count: 8, formation: { kind: "cluster" }, path, seed: 4 }
    expect(JSON.stringify(BirdFlock.bodiesOf(flock))).toBe(JSON.stringify(BirdFlock.bodiesOf({ ...flock })))
  })

  test("a V has its leader ahead and its followers a wingspan apart to each side", () => {
    const species = BirdSpecies.byId("canada-goose")!
    const slots = BirdFlock.slotsOf({ kind: "v", angleDeg: 70 }, 9, species.wingspanM, () => 0.5)
    expect(slots[0]).toEqual({ forwardM: 0, rightM: 0, upM: 0 })
    const right = slots.filter(slot => slot.rightM > 0), left = slots.filter(slot => slot.rightM < 0)
    expect(right).toHaveLength(4)
    expect(left).toHaveLength(4)
    const first = right.reduce((a, b) => Math.abs(a.rightM) < Math.abs(b.rightM) ? a : b)
    expect(first.rightM).toBeCloseTo(species.wingspanM, 6)
    // The arms open at the angle stated: 35° each side of the way they fly.
    expect(Math.atan2(first.rightM, -first.forwardM) * 180 / Math.PI).toBeCloseTo(35, 6)
  })

  test("an echelon has every follower on one side", () => {
    const slots = BirdFlock.slotsOf({ kind: "echelon" }, 6, 1.6, () => 0.5)
    expect(slots.slice(1).every(slot => slot.rightM > 0)).toBe(true)
  })

  test("a crowd keeps its birds apart and is thinner up and down than across", () => {
    let seed = 1
    const random = BirdFlock.randomFrom(seed++)
    const slots = BirdFlock.slotsOf({ kind: "cluster", spacing: 1.5 }, 60, 1, random)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const d = Math.hypot(slots[i].forwardM - slots[j].forwardM, slots[i].rightM - slots[j].rightM, slots[i].upM - slots[j].upM)
        expect(d).toBeGreaterThanOrEqual(0.75 - 1e-9)
      }
    }
    const spread = (key: "forwardM" | "rightM" | "upM") => Math.max(...slots.map(slot => slot[key])) - Math.min(...slots.map(slot => slot[key]))
    expect(spread("upM")).toBeLessThan(spread("rightM"))
    expect(spread("rightM")).toBeLessThan(spread("forwardM"))
  })

  test("follows its path, pointing where it goes and banking into the turn", () => {
    const [bird] = BirdFlock.bodiesOf({ id: "b", species: "herring-gull", path })
    const at = (t: number) => bird.track.find(key => key.t === t)!
    expect(at(0).eastM).toBeCloseTo(-300, 0)
    expect(at(15000).northM).toBeCloseTo(500, 0)
    expect(at(30000).eastM).toBeCloseTo(300, 0)
    // Flying east, then turning right towards the south-east.
    expect(at(15000).attitude!.headingDeg).toBeGreaterThan(70)
    expect(at(15000).attitude!.headingDeg).toBeLessThan(110)
    expect(at(15000).attitude!.rollDeg).toBeGreaterThan(0)
  })

  test("beats its wings at its rate, and in bursts holds them in the gliding pose", () => {
    expect(BirdFlock.beatsAt(2, 3, { kind: "flapping" }, 0)).toBeCloseTo(6, 9)
    const bursts = { kind: "bursts" as const, beats: 5, glideS: 3 }
    // Five beats at 2.5 Hz take two seconds, then three seconds of glide at a whole number.
    expect(BirdFlock.beatsAt(1, 2.5, bursts, 0)).toBeCloseTo(2.5, 9)
    expect(BirdFlock.beatsAt(3, 2.5, bursts, 0)).toBe(5)
    expect(BirdFlock.beatsAt(4.9, 2.5, bursts, 0)).toBe(5)
    expect(BirdFlock.beatsAt(5.4, 2.5, bursts, 0)).toBeCloseTo(6, 9)
  })

  test("a flock that flies itself stays together along its path, its birds apart", () => {
    const bodies = BirdFlock.bodiesOf({ id: "plovers", species: "american-golden-plover", count: 40, formation: { kind: "flock" }, path, seed: 2 })
    expect(bodies).toHaveLength(40)
    for (const t of [10000, 20000, 30000]) {
      const keys = bodies.map(body => body.track.find(key => key.t === t)!)
      const east = keys.reduce((sum, key) => sum + key.eastM!, 0) / keys.length
      const north = keys.reduce((sum, key) => sum + key.northM!, 0) / keys.length
      const spread = Math.max(...keys.map(key => Math.hypot(key.eastM! - east, key.northM! - north)))
      expect(spread).toBeLessThan(60)
      let nearest = Infinity
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        nearest = Math.min(nearest, Math.hypot(keys[i].eastM! - keys[j].eastM!, keys[i].northM! - keys[j].northM!, keys[i].altitudeM! - keys[j].altitudeM!))
      }
      expect(nearest).toBeGreaterThan(0.1)
    }
    const last = bodies.map(body => body.track[body.track.length - 1])
    const east = last.reduce((sum, key) => sum + key.eastM!, 0) / last.length
    expect(east).toBeGreaterThan(200)
  })

  test("a waypoint given as a direction from the origin is put where that line reaches", () => {
    const [point] = BirdFlock.pathOf({ id: "", species: "", path: [{ t: 0, azimuthDeg: 90, altitudeDeg: 30, distanceM: 200, eyeHeightM: 0 }] })
    expect(point.eastM).toBeCloseTo(200 * Math.cos(Math.PI / 6), 6)
    expect(point.northM).toBeCloseTo(0, 6)
    expect(point.upM).toBeCloseTo(100, 6)
  })

  test("is a kind of interpretation, under `birds`", () => {
    const kinds = InterpretationRegistry.kinds()
    const expanded = InterpretationKinds.expand({ bodies: [], birds: [{ id: "g", species: "herring-gull", count: 3, path }] } as never, kinds)
    expect(expanded.bodies).toHaveLength(3)
  })
})

describe("a bird flying as its path asks", () => {
  /** Samples every 100 ms of a bird climbing for 2 s, level for 4 s, then diving for 2 s. */
  const samples = Array.from({ length: 81 }, (_, k) => {
    const t = k * 100
    const upM = t <= 2000 ? 10 + t / 200 : t <= 6000 ? 20 : 20 - (t - 6000) / 200
    return { t, upM }
  })
  const flaps = BirdFlock.flapsAlong(samples, 3, { beats: 2, glideS: 1 }, 0)
  const rising = (from: number, to: number) => flaps[to / 100] - flaps[from / 100]

  test("beats its wings all the way up", () => {
    expect(rising(0, 2000)).toBeCloseTo(6, 0)
  })

  test("goes in bursts and glides on the level, gliding with a whole number of beats", () => {
    const level = rising(2000, 6000)
    expect(level).toBeGreaterThan(2)
    expect(level).toBeLessThan(12)
    const held = samples.filter((sample, k) => sample.t > 2000 && sample.t < 6000 && k > 0 && flaps[k] === flaps[k - 1])
    expect(held.length).toBeGreaterThan(5)
    expect(held.every(sample => Number.isInteger(flaps[sample.t / 100]))).toBe(true)
  })

  test("glides all the way down, once its beat under way is finished", () => {
    expect(rising(6500, 8000)).toBe(0)
    expect(Number.isInteger(flaps[80])).toBe(true)
  })

  test("is computed so by a flock that states it", () => {
    const flock: BirdFlockJson = { id: "gull", species: "herring-gull", formation: { kind: "single" }, flight: { kind: "path", beats: 4, glideS: 1.2 },
      path: [{ t: 0, eastM: 0, northM: 40, altitudeM: 10 }, { t: 3000, eastM: 10, northM: 40, altitudeM: 20 }, { t: 6000, eastM: 20, northM: 40, altitudeM: 4 }] }
    const track = BirdFlock.bodiesOf(flock)[0].track as { t: number, motions: { flap: number } }[]
    const at = (t: number) => track.find(key => key.t >= t)!.motions.flap
    expect(at(2500) - at(500)).toBeGreaterThan(2)
    expect(at(5800) - at(4500)).toBe(0)
  })
})
