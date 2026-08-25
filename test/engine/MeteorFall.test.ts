import { describe, expect, it } from "vitest"
import { MeteorFall } from "../../src/engine/astronomy/MeteorFall.js"

const perseidNight = { ratePerHour: 68, durationMs: 3_600_000, velocityKmS: 59, seed: 12345 }

describe("MeteorFall", () => {
  it("gives the same sky every time, which is what lets a recording be paused and re-exposed", () => {
    const once = MeteorFall.schedule(perseidNight)
    const twice = MeteorFall.schedule(perseidNight)
    expect(twice).toEqual(once)
    // And a different recording gets a different sky.
    expect(MeteorFall.schedule({ ...perseidNight, seed: 999 })).not.toEqual(once)
  })

  it("drops about as many as the rate says", () => {
    // 68 an hour over an hour.
    expect(MeteorFall.schedule(perseidNight).length).toBe(68)
    // Half an hour, half as many.
    expect(MeteorFall.schedule({ ...perseidNight, durationMs: 1_800_000 }).length).toBe(34)
  })

  it("treats a fraction of a meteor as a chance of one, not as none", () => {
    // The case that actually matters: 68 an hour over twenty seconds is 0.38 of a meteor, so a
    // short reconstruction should USUALLY show nothing and occasionally show one. Rounding that to
    // zero would quietly promise that a shower never produces anything in twenty seconds.
    let withOne = 0
    for (let seed = 0; seed < 200; seed++) {
      if (MeteorFall.schedule({ ...perseidNight, durationMs: 20_000, seed }).length > 0) withOne++
    }
    expect(withOne).toBeGreaterThan(40)
    expect(withOne).toBeLessThan(120)
  })

  it("drops nothing at all when nothing is falling", () => {
    expect(MeteorFall.schedule({ ...perseidNight, ratePerHour: 0 })).toEqual([])
    expect(MeteorFall.schedule({ ...perseidNight, durationMs: 0 })).toEqual([])
  })

  it("gives a fast shower shorter trails than a slow one", () => {
    const leonids = MeteorFall.schedule({ ...perseidNight, velocityKmS: 71 })
    const draconids = MeteorFall.schedule({ ...perseidNight, velocityKmS: 20 })
    const mean = (list: { durationMs: number }[]) => list.reduce((sum, m) => sum + m.durationMs, 0) / list.length
    expect(mean(leonids)).toBeLessThan(mean(draconids))
  })

  it("never starts a meteor at its own radiant, where it would have no apparent motion", () => {
    for (const meteor of MeteorFall.schedule(perseidNight)) {
      expect(meteor.fromRadiantDeg).toBeGreaterThanOrEqual(5)
      expect(meteor.lengthDeg).toBeGreaterThan(0)
    }
  })

  it("draws streaks of the length a shower meteor really has", () => {
    // The trap this guards: a plausible-looking formula gave trails of a couple of degrees, which
    // render as a dozen pixels — a speck rather than the streak anybody would call a meteor.
    const wellOffRadiant = MeteorFall.schedule(perseidNight).filter(m => m.fromRadiantDeg > 40)
    const mean = wellOffRadiant.reduce((sum, m) => sum + m.lengthDeg, 0) / wellOffRadiant.length
    expect(mean).toBeGreaterThan(8)
    expect(mean).toBeLessThan(30)
  })

  it("makes most of them faint, as the sky does", () => {
    const meteors = MeteorFall.schedule(perseidNight)
    const bright = meteors.filter(m => m.brightness > 0.5).length
    expect(bright / meteors.length).toBeLessThan(0.3)
  })

  it("shows one only while it is falling, and says how far along it is", () => {
    const meteors = MeteorFall.schedule(perseidNight)
    const first = meteors[0]
    expect(MeteorFall.aliveAt(meteors, first.t - 1)).not.toContainEqual(expect.objectContaining({ meteor: first }))
    const atStart = MeteorFall.aliveAt(meteors, first.t).find(a => a.meteor === first)
    const atEnd = MeteorFall.aliveAt(meteors, first.t + first.durationMs).find(a => a.meteor === first)
    expect(atStart?.progress).toBeCloseTo(0, 6)
    expect(atEnd?.progress).toBeCloseTo(1, 6)
    expect(MeteorFall.aliveAt(meteors, first.t + first.durationMs + 1).find(a => a.meteor === first)).toBeUndefined()
  })

  it("is ordered in time, so a player can walk it", () => {
    const meteors = MeteorFall.schedule(perseidNight)
    for (let i = 1; i < meteors.length; i++) expect(meteors[i].t).toBeGreaterThanOrEqual(meteors[i - 1].t)
  })
})
