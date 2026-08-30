import { describe, expect, it } from "vitest"
import { skyColorForPosition } from "../../src/render3d/skyColors.js"

/** How bright a sky colour reads, in the crude way an eye weights the three primaries. */
function brightness(colour: readonly [number, number, number]): number {
  return 0.21 * colour[0] + 0.72 * colour[1] + 0.07 * colour[2]
}

describe("the glow the Sun leaves on the horizon after it has set", () => {
  const towardTheSun = (altitude: number, sunAltitude: number) => skyColorForPosition(altitude, 0, 0, sunAltitude)
  const awayFromIt = (altitude: number, sunAltitude: number) => skyColorForPosition(altitude, 180, 0, sunAltitude)

  it("is far brighter toward the Sun's bearing than behind the witness", () => {
    // What was missing: the sky went uniformly dark at sunset, with no sign of which way the Sun had
    // gone. It used to blend toward the horizon colour OF THAT SAME INSTANT, which is a colour the
    // horizon already had — so there was nothing to see.
    // With the Sun still ON the horizon the difference is a difference of COLOUR rather than of
    // brightness — the air toward it is lit by a Sun a few degrees higher, so it is whiter, not
    // brighter. The brightening is what happens once the Sun has gone.
    expect(towardTheSun(5, 0)).not.toEqual(awayFromIt(5, 0))
    expect(brightness(towardTheSun(5, -2))).toBeGreaterThan(brightness(awayFromIt(5, -2)) * 1.5)
    expect(brightness(towardTheSun(5, -6))).toBeGreaterThan(brightness(awayFromIt(5, -6)) * 2.5)
  })

  it("outlasts the Sun by the whole of twilight, and then goes", () => {
    // A reader asked for exactly this: a glow that stays a while as the Sun goes on down. Strongest
    // just under the horizon, still plainly there at civil twilight's end, gone by nautical.
    const contrast = (sunAltitude: number) =>
      brightness(towardTheSun(5, sunAltitude)) / Math.max(1e-6, brightness(awayFromIt(5, sunAltitude)))
    expect(contrast(-2)).toBeGreaterThan(contrast(2))
    expect(contrast(-6)).toBeGreaterThan(3)
    expect(contrast(-14)).toBeLessThan(1.5)
  })

  it("lies along the horizon rather than washing the whole dome", () => {
    // A slanting path through the lowest air is what makes the colour; a line of sight tilted up
    // leaves that air almost at once. Spread evenly up the sky it reads as a tint, not a sunset.
    // What the glow ADDS at each height, not how bright the sky is there: the dome has its own
    // top-to-bottom gradient, and comparing across it would be measuring that instead.
    const addedAt = (altitude: number) =>
      brightness(towardTheSun(altitude, -3)) - brightness(awayFromIt(altitude, -3))
    expect(addedAt(2)).toBeGreaterThan(addedAt(20) * 3)
    expect(addedAt(2)).toBeGreaterThan(addedAt(40) * 8)
  })

  it("leaves a full daylight sky alone", () => {
    expect(towardTheSun(5, 30)).toEqual(awayFromIt(5, 30))
  })
})
