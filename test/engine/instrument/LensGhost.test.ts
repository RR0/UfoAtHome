import { describe, expect, it } from "vitest"
import { Instruments } from "../../../src/engine/instrument/Instrument.js"
import { LensGhosts } from "../../../src/engine/instrument/LensGhost.js"

describe("LensGhosts", () => {
  it("gives an eye, and binoculars an eye looks through, no ghosts", () => {
    expect(LensGhosts.of(Instruments.byId("eye"))).toEqual([])
    expect(LensGhosts.of({ category: "binoculars" })).toEqual([])
  })

  it("gives a phone its mirrored ghost, and a camera its string of them", () => {
    const phone = LensGhosts.of(Instruments.byId("phone-landscape"))
    expect(phone).toBe(LensGhosts.PHONE)
    expect(phone[0].scale).toBe(-1)
    expect(LensGhosts.of(Instruments.byId("slr-35mm-50"))).toBe(LensGhosts.CAMERA)
  })

  it("keeps an instrument's own ghosts", () => {
    const own = [{ scale: -0.5, share: 1e-3, blur: 0.01 }]
    expect(LensGhosts.of({ category: "camera", ghosts: own })).toBe(own)
  })

  it("puts a ghost on the line through the centre, mirrored for a negative scale", () => {
    expect(LensGhosts.positionOf({ scale: -1, share: 1e-3, blur: 0.01 }, { x: -0.4, y: -0.2 })).toEqual({ x: 0.4, y: 0.2 })
    expect(LensGhosts.positionOf({ scale: 0.5, share: 1e-3, blur: 0.01 }, { x: -0.4, y: 0.2 })).toEqual({ x: -0.2, y: 0.1 })
  })

  it("keeps every ghost a small share of the light", () => {
    for (const ghost of [...LensGhosts.PHONE, ...LensGhosts.CAMERA]) {
      expect(ghost.share).toBeGreaterThan(0)
      expect(ghost.share).toBeLessThan(0.01)
      expect(ghost.scale).not.toBe(0)
    }
  })
})

describe("LensGhosts.optics", () => {
  const phone = Instruments.byId("phone-landscape")
  const slr = Instruments.byId("slr-35mm-50")

  it("lays nothing over an eye's picture, whatever is said of the glass", () => {
    expect(LensGhosts.optics(Instruments.byId("eye"), undefined, { glass: "windscreen", dirt: 1 }, undefined)).toBe(LensGhosts.NONE)
  })

  it("widens the ghosts of the glass as the aperture opens, and shapes them by the blades once stopped down", () => {
    const open = LensGhosts.optics(slr, 2, undefined, undefined)
    const closed = LensGhosts.optics(slr, 11, undefined, undefined)
    expect(open.ghosts[0].blur).toBeGreaterThan(closed.ghosts[0].blur)
    expect(open.blades).toBe(0)
    expect(closed.blades).toBe(slr.apertureBlades)
    // A phone has no blades: round always.
    expect(LensGhosts.optics(phone, undefined, undefined, undefined).blades).toBe(0)
  })

  it("adds the ghost of a filter, or the twin of a pane, further off for a windscreen", () => {
    expect(LensGhosts.optics(slr, undefined, { glass: "filter" }, undefined).ghosts.some(ghost => ghost.cause === "filter" && ghost.scale === -1)).toBe(true)
    const pane = (glass: "window" | "windscreen") => LensGhosts.optics(phone, undefined, { glass }, undefined).ghosts.find(ghost => ghost.cause === "glass")!
    expect(pane("window").scale).toBe(1)
    expect(pane("windscreen").offset![1]).toBeGreaterThan(pane("window").offset![1])
  })

  it("scatters a halo round every light for what is on the glass, taking its light off the light", () => {
    const optics = LensGhosts.optics(phone, undefined, { condensation: 0.5, dirt: 0.5 }, undefined)
    const halos = optics.ghosts.filter(ghost => LensGhosts.scatters(ghost))
    expect(halos.length).toBeGreaterThan(0)
    expect(optics.scattered).toBeCloseTo(halos.reduce((sum, ghost) => sum + ghost.share, 0), 9)
    expect(LensGhosts.optics(phone, undefined, undefined, undefined).scattered).toBe(0)
  })

  it("wets the glass with the rain falling, unless sheltered or told otherwise", () => {
    const rain = { precipitationType: "rain" as const, precipitationIntensity: 0.5 }
    expect(LensGhosts.optics(phone, undefined, undefined, rain).drops).toBeGreaterThan(0)
    expect(LensGhosts.optics(phone, undefined, { sheltered: true }, rain).drops).toBe(0)
    expect(LensGhosts.optics(phone, undefined, { drops: 0 }, rain).drops).toBe(0)
    expect(LensGhosts.dropsFrom({ precipitationType: "hail", precipitationIntensity: 1 })).toBe(0)
    expect(LensGhosts.dropsFrom({ precipitationType: "snow", precipitationIntensity: 1 })).toBeLessThan(LensGhosts.dropsFrom({ precipitationType: "rain", precipitationIntensity: 1 }))
  })

  it("finds the light of a ghost back where it came from", () => {
    const ghost = { scale: 1, share: 1e-3, blur: 0.01, offset: [0.01, 0.02] as [number, number] }
    const light = { x: 0.3, y: -0.4 }
    const back = LensGhosts.sourceOf(ghost, LensGhosts.positionOf(ghost, light))
    expect(back.x).toBeCloseTo(light.x, 9)
    expect(back.y).toBeCloseTo(light.y, 9)
  })
})

describe("LensGhosts.impactRate", () => {
  const rain = { precipitationType: "rain" as const, precipitationIntensity: 0.6 }

  it("wets a lens looking up more than one looking level, and a pane facing the wind more than one with its back to it", () => {
    const level = LensGhosts.impactRate(rain, undefined, { headingDeg: 0, pitchDeg: 0 })
    const up = LensGhosts.impactRate(rain, undefined, { headingDeg: 0, pitchDeg: 60 })
    expect(up).toBeGreaterThan(level)
    const facing = LensGhosts.impactRate(rain, "window", { headingDeg: 0, pitchDeg: 0, windFromDeg: 0, windSpeedMS: 8 })
    const away = LensGhosts.impactRate(rain, "window", { headingDeg: 180, pitchDeg: 0, windFromDeg: 0, windSpeedMS: 8 })
    expect(facing).toBeGreaterThan(away)
  })

  it("wets a windscreen leaning back more than an upright window", () => {
    const window = LensGhosts.impactRate(rain, "window", { headingDeg: 0, pitchDeg: 0 })
    expect(LensGhosts.impactRate(rain, "windscreen", { headingDeg: 0, pitchDeg: 0 })).toBeGreaterThan(window)
  })

  it("lands nothing in a dry sky, and nothing new on drops that are stated", () => {
    expect(LensGhosts.impactRate({ precipitationType: "none", precipitationIntensity: 0 }, undefined, { headingDeg: 0, pitchDeg: 90 })).toBe(0)
    expect(LensGhosts.optics(Instruments.byId("phone-landscape"), undefined, { drops: 0.5 }, rain).impactRate).toBe(0)
  })
})
