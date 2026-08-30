import { describe, expect, it } from "vitest"
import { HaloSky, type HaloSkyMap } from "../../../src/engine/atmosphere/HaloSky.js"
import { IceHalos } from "../../../src/engine/atmosphere/IceHalos.js"

/**
 * The point of these: HaloSky is told nothing about halos. It knows a hexagonal prism, Snell's law
 * and Fresnel's, and it draws crystal orientations. Every angle IceHalos derives in closed form has
 * to fall out of that trace independently — and where the two disagreed, it was the closed form
 * that was wrong (see the sundog separation). Two derivations of the same physics agreeing is
 * evidence; one number shared between them would only be a habit.
 */
const RAYS = 400_000

/** Radiance at a place in the sky given as altitude and how far round from the source's bearing. */
function radianceAt(map: HaloSkyMap, altitudeDeg: number, aroundDeg: number): number {
  const around = Math.abs(((aroundDeg + 540) % 360) - 180)
  const column = Math.min(map.width - 1, Math.max(0, Math.floor((around / 180) * map.width)))
  const row = Math.min(map.height - 1, Math.max(0, Math.floor(((altitudeDeg + 90) / 180) * map.height)))
  const at = (row * map.width + column) * 3
  return (map.data[at] + map.data[at + 1] + map.data[at + 2]) / 3
}

/** Radiance at an angular distance from the source, `roll` degrees round from straight above it. */
function radianceFromSource(map: HaloSkyMap, sourceAltitudeDeg: number, separationDeg: number, rollDeg: number): number {
  const height = (sourceAltitudeDeg * Math.PI) / 180
  const separation = (separationDeg * Math.PI) / 180
  const roll = (rollDeg * Math.PI) / 180
  const x = Math.cos(separation) * Math.cos(height) - Math.sin(separation) * Math.cos(roll) * Math.sin(height)
  const y = Math.sin(separation) * Math.sin(roll)
  const z = Math.cos(separation) * Math.sin(height) + Math.sin(separation) * Math.cos(roll) * Math.cos(height)
  const altitude = (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI
  const around = (Math.atan2(y, x) * 180) / Math.PI
  return radianceAt(map, altitude, around)
}

/** How far apart two points of the sky are, given each as an altitude and a bearing from the
 * source — plain spherical trigonometry, written out here so that a claim about where the trace put
 * something is not being checked against the very function that claim is about. */
function separationOf(sourceAltitudeDeg: number, altitudeDeg: number, aroundDeg: number): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const source = toRadians(sourceAltitudeDeg)
  const other = toRadians(altitudeDeg)
  const cosine = Math.sin(source) * Math.sin(other) + Math.cos(source) * Math.cos(other) * Math.cos(toRadians(aroundDeg))
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI
}

/** The brightest anywhere on the small circle at that distance from the source. */
function brightestAt(map: HaloSkyMap, sourceAltitudeDeg: number, separationDeg: number): number {
  let brightest = 0
  for (let roll = 0; roll < 360; roll += 2) {
    brightest = Math.max(brightest, radianceFromSource(map, sourceAltitudeDeg, separationDeg, roll))
  }
  return brightest
}

/** The mean round that same circle — what says a whole RING is there rather than one bright spot. */
function meanAt(map: HaloSkyMap, sourceAltitudeDeg: number, separationDeg: number): number {
  let total = 0
  let count = 0
  for (let roll = 0; roll < 360; roll += 2) {
    total += radianceFromSource(map, sourceAltitudeDeg, separationDeg, roll)
    count++
  }
  return total / count
}

describe("HaloSky, which traces light through crystals and is told no angles at all", () => {
  describe("the rings", () => {
    it("puts the common ring exactly where the refractive index says, with nothing inside it", () => {
      const map = new HaloSky().compute(5, 1, RAYS)
      const radius = IceHalos.halo22().redAngleDeg!
      const inside = meanAt(map, 5, radius - 1.5)
      const onIt = meanAt(map, 5, radius + 0.5)
      // The sharp inner edge is not a look, it is the whole reason a halo is a ring: no ray through
      // a prism is deviated by LESS than the minimum, so the sky inside is empty, and every larger
      // deviation piles up just outside it.
      expect(onIt).toBeGreaterThan(inside * 8)
      // And the ring goes all the way round, unlike the sundogs sitting on it.
      expect(meanAt(map, 5, radius + 0.5)).toBeGreaterThan(meanAt(map, 5, radius + 12) * 3)
    })

    it("puts the second, fainter ring where the ninety-degree faces say, and keeps it fainter", () => {
      const map = new HaloSky().compute(5, 1, RAYS)
      const big = IceHalos.halo46().redAngleDeg!
      expect(big).toBeGreaterThan(45)
      expect(meanAt(map, 5, big + 1)).toBeGreaterThan(meanAt(map, 5, big - 2) * 1.3)
      // Fainter than the common one by a good margin, which is why most people have never seen it
      // and why it is worth having the ratio come from the physics rather than from a choice.
      expect(meanAt(map, 5, big + 1)).toBeLessThan(meanAt(map, 5, IceHalos.halo22().redAngleDeg! + 0.5) / 3)
    })
  })

  describe("the sundogs", () => {
    it("stands them at the source's own altitude, at the separation IceHalos derives", () => {
      // THE CROSS-CHECK THAT FOUND A REAL ERROR. IceHalos used to report the prism's deviation as
      // the separation; the trace put the sundogs a degree and a half closer in, and the trace was
      // right — the deviation is a swing in BEARING, and a circle of altitude is shorter than a
      // great circle.
      const altitude = 30
      const map = new HaloSky().compute(altitude, 1, RAYS)
      const separation = IceHalos.parheliaDistanceDeg(altitude)!
      const swing = IceHalos.parheliaAzimuthDeg(altitude)!
      // The derived swing is the sundog's SUNWARD EDGE, not its middle, and that is the shape of
      // the thing: nothing is deviated by less than the minimum, so a parhelion is cut off hard on
      // the side facing the source and streams away from it on the other. The trace shows exactly
      // that, at exactly the derived angle.
      const justInside = radianceAt(map, altitude, swing - 1)
      const justOutside = radianceAt(map, altitude, swing + 1.2)
      expect(justOutside).toBeGreaterThan(justInside * 8)
      expect(justOutside).toBeGreaterThan(radianceAt(map, altitude, swing + 8) * 4)
      // And it stands at the source's own height, not above or below it.
      expect(justOutside).toBeGreaterThan(radianceAt(map, altitude + 2.5, swing + 1.2) * 8)
      // That places it `separation` from the source measured ACROSS THE SKY — the number an
      // observer with a protractor writes down, and the one IceHalos now reports. Restated here
      // from the traced position rather than taken from the same function, since agreeing with
      // itself is what the old code did.
      expect(separationOf(altitude, altitude, swing)).toBeCloseTo(separation, 6)
      // A sundog is far brighter than the ring it sits beside: the thing that makes a witness
      // report two objects flanking the Sun rather than a ring round it.
      expect(justOutside).toBeGreaterThan(radianceFromSource(map, altitude, separation, 0) * 5)
    })

    it("has none at all once the source is too high for the skew ray to escape", () => {
      const above = IceHalos.PARHELIA_MAX_SUN_ALTITUDE_DEG + 5
      const map = new HaloSky().compute(above, 1, RAYS)
      const ring = IceHalos.halo22().redAngleDeg!
      // The ring is still there; nothing on it stands out at the source's own height any more.
      expect(brightestAt(map, above, ring + 0.5)).toBeLessThan(meanAt(map, above, ring + 0.5) * 4)
    })
  })

  describe("the arc near the zenith, and its impossible twin", () => {
    it("puts it at the altitude the top-face refraction gives, and only under 32 degrees", () => {
      const altitude = 15
      const map = new HaloSky().compute(altitude, 1, RAYS)
      const arc = IceHalos.circumzenithalAltitudeDeg(altitude)!
      expect(arc).toBeGreaterThan(altitude + 40)
      const onIt = radianceAt(map, arc, 0)
      expect(onIt).toBeGreaterThan(radianceAt(map, arc - 4, 0) * 2)
      expect(onIt).toBeGreaterThan(radianceAt(map, arc + 4, 0) * 2)
    })

    it("has none of it above the limit, which is a property of ice and not a rule written down", () => {
      const limit = 90 - IceHalos.PLATE_END_FACE_LIMIT_DEG
      expect(limit).toBeGreaterThan(31)
      expect(limit).toBeLessThan(33)
      expect(IceHalos.circumzenithalAltitudeDeg(limit + 5)).toBeUndefined()
    })
  })

  describe("the forms that reflection makes, which carry no colour", () => {
    it("stands a shaft of light above a low source, out of plates that are not quite level", () => {
      // The pillar, and it is nobody's formula: it is the source's own image smeared up and down by
      // crystals whose faces are a few degrees off horizontal. Which is why it wants a MIDDLING
      // alignment — plates lying perfectly flat give a point, not a shaft.
      const altitude = 3
      const map = new HaloSky().compute(altitude, 0.55, RAYS)
      const above = radianceAt(map, altitude + 7, 0)
      // Far brighter than the same distance away to the side, which is what makes it a shaft and
      // not a glow.
      expect(above).toBeGreaterThan(radianceFromSource(map, altitude, 7, 90) * 6)
      // And it carries no colour of its own: a reflection bends no wavelength away from another.
      const at = (Math.min(map.height - 1, Math.floor((((altitude + 7) + 90) / 180) * map.height)) * map.width) * 3
      const [red, green, blue] = [map.data[at], map.data[at + 1], map.data[at + 2]]
      expect(Math.abs(red - blue) / Math.max(red, green, blue)).toBeLessThan(0.25)
    })

    it("runs a circle right round the sky at the source's own height", () => {
      // The parhelic circle, off the vertical faces of level plates — the form that makes a witness
      // say the light "followed" them, since it reaches all the way round behind.
      const altitude = 25
      const map = new HaloSky().compute(altitude, 0.95, RAYS)
      for (const around of [70, 110, 150]) {
        const onIt = radianceAt(map, altitude, around)
        expect(onIt).toBeGreaterThan(radianceAt(map, altitude + 3, around) * 3)
        expect(onIt).toBeGreaterThan(radianceAt(map, altitude - 3, around) * 3)
      }
    })
  })

  describe("what the crystals were doing, which no record holds", () => {
    it("leaves nothing but the rings when they tumble", () => {
      const altitude = 30
      const tumbling = new HaloSky().compute(altitude, 0, RAYS)
      const aligned = new HaloSky().compute(altitude, 1, RAYS)
      const swing = IceHalos.parheliaAzimuthDeg(altitude)!
      const ring = IceHalos.halo22().redAngleDeg!
      // The ring survives — it is what randomly turned crystals make.
      expect(meanAt(tumbling, altitude, ring + 0.5)).toBeGreaterThan(meanAt(tumbling, altitude, ring - 1.5) * 4)
      // The sundogs do not: with the plates tumbling there is no bright spot standing on the ring
      // at all, only the ring. That is the answer to why the same sky shows a bare ring one hour
      // and a display of six forms the next.
      const separation = IceHalos.parheliaDistanceDeg(altitude)!
      expect(radianceAt(aligned, altitude, swing + 1.2)).toBeGreaterThan(meanAt(aligned, altitude, separation) * 5)
      expect(radianceAt(tumbling, altitude, swing + 1.2)).toBeLessThan(meanAt(tumbling, altitude, separation) * 2)
    })

    it("traces the same sky twice, so scrubbing back shows what was there before", () => {
      const first = new HaloSky().compute(12, 0.7, 40_000)
      const second = new HaloSky().compute(12, 0.7, 40_000)
      expect([...second.data.slice(0, 3000)]).toEqual([...first.data.slice(0, 3000)])
    })

    it("builds the same display in batches as in one go", () => {
      // What lets a scene pay for a display over several frames instead of stopping dead for it.
      const whole = new HaloSky().compute(12, 0.7, 40_000)
      const inPieces = new HaloSky()
      inPieces.begin(12, 0.7)
      for (let batch = 0; batch < 4; batch++) inPieces.trace(10_000)
      expect([...inPieces.harvest().data.slice(0, 3000)]).toEqual([...whole.data.slice(0, 3000)])
    })
  })
})
