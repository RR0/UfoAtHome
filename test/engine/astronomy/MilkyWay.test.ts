import { describe, expect, it } from "vitest"
import { MilkyWay } from "../../../src/engine/astronomy/MilkyWay.js"
import { SurfaceBrightness } from "../../../src/engine/astronomy/SurfaceBrightness.js"

/**
 * The point of these: MilkyWay is told nothing about the Milky Way. It knows an exponential disc of
 * stars, a bulge, a thinner disc of dust, and how to walk a line of sight. Every named feature of
 * the band has to fall out of that walk on its own — and the ones checked here are the ones a
 * witness would describe: a band, brighter toward Sagittarius, split down the middle by something
 * dark.
 */
const galaxy = new MilkyWay()

describe("the band", () => {
  it("is a band: the plane is worth many times the poles", () => {
    // Taken a little off the plane, where the dust has not eaten it — see the rift test below for
    // why the very middle is not the brightest place.
    const inPlane = galaxy.radianceTowards(0, 5)
    const pole = galaxy.radianceTowards(0, 90)
    expect(inPlane / pole).toBeGreaterThan(10)
  })

  it("thins away from the plane rather than stopping at an edge", () => {
    const run = [5, 10, 20, 45, 90].map(b => galaxy.radianceTowards(90, b))
    for (let at = 1; at < run.length; at++) expect(run[at]).toBeLessThan(run[at - 1])
  })

  it("is brighter toward the centre than toward the anticentre, by about the observed three times", () => {
    // At ten degrees up, which is above most of the dust, so this measures the STARS and not the
    // extinction. Three is the figure the bulge's one free amplitude was set by; that it also holds
    // at other latitudes is not something that was arranged.
    const ratio = galaxy.radianceTowards(0, 10) / galaxy.radianceTowards(180, 10)
    expect(ratio).toBeGreaterThan(2.5)
    expect(ratio).toBeLessThan(4.5)
  })
})

describe("the dark rift", () => {
  it("splits the brightest part of the band lengthwise", () => {
    // Straight at the centre of the Galaxy, which is where the stars are: without dust this would
    // be the single brightest direction in the sky. It is not, and what beats it is the same
    // direction a few degrees higher up.
    const throughThePlane = galaxy.radianceTowards(0, 0)
    const justAbove = galaxy.radianceTowards(0, 5)
    expect(throughThePlane).toBeLessThan(justAbove)
    expect(justAbove / throughThePlane).toBeGreaterThan(2)
  })

  it("is a lane and not a general dimming: it closes again away from the centre", () => {
    // Toward the anticentre there is far less Galaxy behind the dust to be hidden, so the same
    // extinction costs proportionally less and the band is not split there. Real observers report
    // exactly this: the rift is a summer sight.
    const centreContrast = galaxy.radianceTowards(0, 5) / galaxy.radianceTowards(0, 0)
    const anticentreContrast = galaxy.radianceTowards(180, 5) / galaxy.radianceTowards(180, 0)
    expect(anticentreContrast).toBeLessThan(centreContrast)
  })
})

describe("the dust, against the three things that were measured", () => {
  /**
   * None of these is met exactly, and none of them can be: the Sun sits in a swept-out cavity the
   * model has no business having, and a window is by definition the clearest hole in a clumpy layer.
   * So each is checked as a BRACKET with the side it has to fall on — which is a stronger statement
   * than an equality would have been, because it says which way a smooth disc is allowed to be
   * wrong.
   */
  it("puts more dust over the galactic poles than the maps do, and not much more", () => {
    // Measured: about 0.05 magnitudes. A smooth disc must be over it — it has no Local Bubble.
    const overThePole = galaxy.extinctionTowards(0, 90)
    expect(overThePole).toBeGreaterThan(0.05)
    expect(overThePole).toBeLessThan(0.11)
  })

  it("is dustier toward the bulge than Baade's Window is, and inside the range quoted around it", () => {
    // Baade's Window, four degrees under the plane at the centre: about 1.5 magnitudes, and it is
    // called a window because it is the clearest thing there. An average cannot beat it.
    const towardTheBulge = galaxy.extinctionTowards(1, -3.9)
    expect(towardTheBulge).toBeGreaterThan(1.5)
    expect(towardTheBulge).toBeLessThan(3.5)
  })

  it("puts the brightest of the band where the sky's own brightest clouds stand", () => {
    // Two to five degrees off the plane, toward the inner Galaxy — the one anchor an eye can check.
    // It is also the one that caught the dust column being too heavy: at 0.14 magnitudes over the
    // pole this ridge sat at 6.25 degrees, out past every real cloud.
    let brightest = 0
    let ridgeAt = 0
    for (let b = -20; b <= 20; b += 0.25) {
      const value = galaxy.radianceTowards(0, b)
      if (value > brightest) {
        brightest = value
        ridgeAt = b
      }
    }
    expect(Math.abs(ridgeAt)).toBeGreaterThanOrEqual(2)
    expect(Math.abs(ridgeAt)).toBeLessThanOrEqual(5)
    expect(ridgeAt).toBeCloseTo(MilkyWay.PEAK_LATITUDE_DEG, 5)
  })

  it("still peaks where the constant written down says it does", () => {
    // PEAK_RADIANCE is written out rather than searched for (see its own comment), so something has
    // to walk the sky and check the model has not moved away from it.
    let brightest = 0
    let at: [number, number] = [0, 0]
    for (let l = 0; l < 360; l += 1) {
      for (let b = -20; b <= 20; b += 0.25) {
        const value = galaxy.radianceTowards(l, b)
        if (value > brightest) {
          brightest = value
          at = [l, b]
        }
      }
    }
    expect(brightest).toBeCloseTo(MilkyWay.PEAK_RADIANCE, 2)
    expect(at[0]).toBeCloseTo(MilkyWay.PEAK_LONGITUDE_DEG, 5)
    expect(at[1]).toBeCloseTo(MilkyWay.PEAK_LATITUDE_DEG, 5)
  })

  it("leaves the anticentre band visibly fainter than Sagittarius, but not out of sight", () => {
    // About two magnitudes between the two, which is what an observer describes: the summer band is
    // the sight, the winter one is still plainly a band. The dust column decides this, and pinning
    // it on the poles alone would have made it fourteen times rather than six.
    const ratio = MilkyWay.PEAK_RADIANCE / galaxy.radianceTowards(180, 0)
    expect(ratio).toBeGreaterThan(3)
    expect(ratio).toBeLessThan(9)
  })
})

describe("what the map is worth", () => {
  const map = (() => {
    galaxy.walk(MilkyWay.LATITUDE_STEPS)
    return galaxy.harvest()
  })()

  it("is finished only once every row has been walked", () => {
    expect(galaxy.done).toBe(true)
    expect(map.width).toBe(MilkyWay.LONGITUDE_STEPS)
    expect(map.height).toBe(MilkyWay.LATITUDE_STEPS)
  })

  it("puts its brightest cloud one magnitude above a dark natural sky", () => {
    let brightest = 0
    for (const value of map.data) brightest = Math.max(brightest, value)
    const anchored = SurfaceBrightness.fromMagPerArcsec2(MilkyWay.PEAK_MAG_PER_ARCSEC2)
    // What is DRAWN is a little under the anchor, because the model's own faintest level was taken
    // out as already belonging to the sky (see harvest). A little, and not most of it: if the floor
    // were a large share of the peak there would be no band to speak of.
    expect(brightest).toBeLessThan(anchored)
    expect(brightest / anchored).toBeGreaterThan(0.85)
    // Roughly twice a 22.0 sky, and no more. This is the number that explains why the band is a
    // famous sight in a desert and an argument in a suburb.
    const overADarkSky = brightest / SurfaceBrightness.fromMagPerArcsec2(22)
    expect(overADarkSky).toBeGreaterThan(1.8)
    expect(overADarkSky).toBeLessThan(3)
  })

  it("leaves the galactic poles at nothing, which is what lets it be added to a sky that already counts them", () => {
    const poleRow = map.height - 1
    let atPole = 0
    for (let column = 0; column < map.width; column++) atPole = Math.max(atPole, map.data[poleRow * map.width + column])
    let brightest = 0
    for (const value of map.data) brightest = Math.max(brightest, value)
    expect(atPole / brightest).toBeLessThan(0.05)
  })

  it("brightens toward the centre along its own rows, without the walk being asked to", () => {
    const row = Math.round(SurfaceBrightness.rowCoordOfLatitude(10) * map.height - 0.5)
    const at = (longitudeDeg: number) => map.data[row * map.width + Math.round((longitudeDeg / 360) * map.width - 0.5)]
    expect(at(0)).toBeGreaterThan(at(90))
    expect(at(90)).toBeGreaterThan(at(180))
    expect(at(270)).toBeGreaterThan(at(180))
  })
})
